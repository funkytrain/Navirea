/**
 * Incidents Management Module
 * Gestiona todas las incidencias del servicio (puertas, WC, etc.)
 */

// Variables para long press en puertas/WC
let doorHoldTimer = null;
let doorHoldTriggered = false;
let doorTapStartPosition = null;

// Duración del long press (debe coincidir con DOOR_LONG_PRESS_DURATION de script.js)
const DOOR_LONG_PRESS_DURATION = 500;

// Umbral de tap rápido para activar incidencia (aumentado para reducir activaciones accidentales)
const DOOR_TAP_THRESHOLD = 200;

// Distancia máxima de movimiento permitida para considerar un tap válido (en píxeles)
const DOOR_MOVE_THRESHOLD = 10;

/**
 * Genera la clave única para una incidencia
 * @param {string} coachId - ID del coche
 * @param {string} elementId - ID del elemento (puerta, WC, etc.)
 * @returns {string} Clave única
 */
function getIncidentKey(coachId, elementId) {
    // Para tren 470: incluir variante en la key
    if (window.state.selectedTrain === "470") {
        const variant = window.state.coach470Variants[coachId] || "A";
        return `${coachId}-${variant}-${elementId}`;
    }
    return `${coachId}-${elementId}`;
}

/**
 * Activa/desactiva una incidencia
 * @param {string} coachId - ID del coche
 * @param {string} elementId - ID del elemento
 * @param {string} elementType - Tipo de elemento ('door' o 'wc')
 */
function toggleIncident(coachId, elementId, elementType) {
    const key = getIncidentKey(coachId, elementId);

    if (window.state.incidents[key]) {
        // Ya existe, borrar
        delete window.state.incidents[key];
    } else {
        // Crear nueva incidencia
        window.state.incidents[key] = {
            type: elementType,
            broken: true,
            note: ""
        };
    }

    window.saveData();
    window.render();
}

/**
 * Abre el modal para añadir una nota a una incidencia
 * @param {string} coachId - ID del coche
 * @param {string} elementId - ID del elemento
 * @param {string} elementType - Tipo de elemento
 * @param {string} elementLabel - Etiqueta del elemento para mostrar
 */
function openIncidentNote(coachId, elementId, elementType, elementLabel) {
    const key = getIncidentKey(coachId, elementId);
    const incident = window.state.incidents[key] || { type: elementType, broken: true, note: "" };

    const modalHTML = `
        <div class="modal-overlay" onclick="window.Incidents.closeIncidentNote(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Incidencia: ${elementLabel}</h3>
                        <button class="close-btn" onclick="window.Incidents.closeIncidentNote()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="about-content">
                    <textarea
                        id="incident-note-textarea"
                        class="service-notes-textarea"
                        placeholder="Describe la incidencia..."
                        style="min-height: 150px;"
                    >${incident.note || ""}</textarea>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" style="background-color: #4f46e5;"
                            onclick="window.Incidents.saveIncidentNote('${coachId}', '${elementId}', '${elementType}')">
                        Guardar
                    </button>
                    <button class="clear-btn" onclick="window.Incidents.closeIncidentNote()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    // Resetear estado de doble tap al abrir modal
    window.resetCoachDoubleTap();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    window.lockBodyScroll();

    setTimeout(() => {
        const textarea = document.getElementById('incident-note-textarea');
        if (textarea) textarea.focus();
    }, 100);
}

/**
 * Guarda la nota de una incidencia
 * @param {string} coachId - ID del coche
 * @param {string} elementId - ID del elemento
 * @param {string} elementType - Tipo de elemento
 */
function saveIncidentNote(coachId, elementId, elementType) {
    const textarea = document.getElementById('incident-note-textarea');
    const note = textarea ? textarea.value : "";

    const key = getIncidentKey(coachId, elementId);

    if (!window.state.incidents[key]) {
        window.state.incidents[key] = {
            type: elementType,
            broken: true,
            note: note
        };
    } else {
        window.state.incidents[key].note = note;
    }

    window.saveData();
    closeIncidentNote();
    window.render();
}

/**
 * Cierra el modal de nota de incidencia
 * @param {Event} event - Evento de cierre
 */
function closeIncidentNote(event) {
    if (!event || event.target === event.currentTarget) {
        // Guardar scroll antes de cerrar
        const scrollToRestore = window.savedScrollPosition || 0;

        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();

        if (!document.querySelector('.modal-overlay')) {
            window.unlockBodyScroll();
            // Restaurar scroll a la posición guardada
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollToRestore);
            });
        }
    }
}

/**
 * Formatea el label de una incidencia para mostrar
 * @param {string} label - Label original
 * @param {string} key - Clave de la incidencia
 * @param {Object} incident - Datos de la incidencia
 * @returns {string} Label formateado
 */
function formatIncidentLabel(label, key, incident) {
    // Mejorar formato del label
    if (label.includes('D') && (label.includes('-L') || label.includes('-R'))) {
        // Es una puerta (ej: "D1-L" o "D2-R")
        const doorMatch = label.match(/D(\d+)-(L|R)/);
        if (doorMatch) {
            const doorNum = doorMatch[1];
            const side = window.getDoorSideText(doorMatch[2]);
            return `Puerta ${doorNum} - ${side}`;
        }
    } else if (label === 'PMR-WC') {
        return 'Baño PMR';
    } else if (label.startsWith('WC-BLOCK-')) {
        // Es un bloque de WC (incidencia agrupada)
        const wcCount = incident?.wcIds ? incident.wcIds.length : 0;
        return `Bloque de WC (${wcCount} unidades)`;
    } else if (label.startsWith('WC-')) {
        // Es un grupo de WC con ID personalizado (ej: "WC-A")
        return `Grupo de WC ${label.replace('WC-', '')}`;
    } else if (label.startsWith('WC')) {
        // WC individual
        return `WC ${label.replace('WC', '')}`;
    }
    return label;
}

/**
 * Abre el panel de resumen de incidencias
 */
function openIncidentsPanel() {
    const incidentCount = Object.keys(window.state.incidents).length;

    if (incidentCount === 0) {
        alert('No hay incidencias registradas actualmente.');
        return;
    }

    // Agrupar por coche (y variante para 470)
    const byCoach = {};
    Object.keys(window.state.incidents).forEach(key => {
        const parts = key.split('-');
        let groupKey = parts[0]; // coachId

        // Para 470: agrupar por coche-variante
        if (window.state.selectedTrain === "470" && parts.length > 2) {
            groupKey = `${parts[0]} (Variante ${parts[1]})`;
        }

        if (!byCoach[groupKey]) byCoach[groupKey] = [];
        byCoach[groupKey].push({ key, data: window.state.incidents[key] });
    });

    let incidentsHTML = '';
    Object.keys(byCoach).sort().forEach(coachId => {
        incidentsHTML += `
            <div class="incidents-group">
                <h4 style="margin: 0.5rem 0; font-weight: 600;">${coachId}</h4>
        `;
        byCoach[coachId].forEach(({ key, data }) => {
            const parts = key.split('-');
            // Para 470: saltar la variante (parts[1])
            const skipVariant = window.state.selectedTrain === "470" && parts.length > 2;
            let label = skipVariant ? parts.slice(2).join('-') : parts.slice(1).join('-');

            label = formatIncidentLabel(label, key, data);

            const typeLabel = data.type === 'door' ? '🚪' : '🚽';
            incidentsHTML += `
                <div class="incident-item">
                    <span>${typeLabel} ${label}</span>
                    ${data.note ? `<small style="color: #6b7280;">${data.note}</small>` : ''}
                    <button class="incident-remove-btn" onclick="window.Incidents.removeIncident('${key}')">×</button>
                </div>
            `;
        });
        incidentsHTML += `</div>`;
    });

    const modalHTML = `
        <div class="modal-overlay" onclick="window.Incidents.closeIncidentsPanel(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Incidencias registradas (${incidentCount})</h3>
                        <button class="close-btn" onclick="window.Incidents.closeIncidentsPanel()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="about-content" style="max-height: 400px; overflow-y: auto;">
                    ${incidentsHTML}
                </div>
                <div class="modal-footer">
                    <button class="clear-btn delete-btn" onclick="window.Incidents.clearAllIncidents()">
                        Borrar todas las incidencias
                    </button>
                    <button class="clear-btn" onclick="window.Incidents.closeIncidentsPanel()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    // Resetear estado de doble tap al abrir modal
    window.resetCoachDoubleTap();

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    window.lockBodyScroll();
}

/**
 * Cierra el panel de incidencias
 * @param {Event} event - Evento de cierre
 */
function closeIncidentsPanel(event) {
    if (!event || event.target === event.currentTarget) {
        // Guardar scroll antes de cerrar
        const scrollToRestore = window.savedScrollPosition || 0;

        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();

        if (!document.querySelector('.modal-overlay')) {
            window.unlockBodyScroll();
            // Restaurar scroll a la posición guardada
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollToRestore);
            });
        }
    }
}

/**
 * Elimina una incidencia específica
 * @param {string} key - Clave de la incidencia
 */
function removeIncident(key) {
    delete window.state.incidents[key];
    window.saveData();

    const incidentCount = Object.keys(window.state.incidents).length;

    if (incidentCount === 0) {
        // Si no quedan incidencias, cerrar el panel
        closeIncidentsPanel();
        window.render();
        return;
    }

    // Reagrupar por coche
    const byCoach = {};
    Object.keys(window.state.incidents).forEach(k => {
        const parts = k.split('-');
        let groupKey = parts[0];

        if (window.state.selectedTrain === "470" && parts.length > 2) {
            groupKey = `${parts[0]} (Variante ${parts[1]})`;
        }

        if (!byCoach[groupKey]) byCoach[groupKey] = [];
        byCoach[groupKey].push({ key: k, data: window.state.incidents[k] });
    });

    // Actualizar solo el contenido del panel
    let incidentsHTML = '';
    Object.keys(byCoach).sort().forEach(coachId => {
        incidentsHTML += `
            <div class="incidents-group">
                <h4 style="margin: 0.5rem 0; font-weight: 600;">${coachId}</h4>
        `;
        byCoach[coachId].forEach(({ key: k, data }) => {
            const parts = k.split('-');
            const skipVariant = window.state.selectedTrain === "470" && parts.length > 2;
            let label = skipVariant ? parts.slice(2).join('-') : parts.slice(1).join('-');

            label = formatIncidentLabel(label, k, data);

            const typeLabel = data.type === 'door' ? '🚪' : '🚽';
            incidentsHTML += `
                <div class="incident-item">
                    <span>${typeLabel} ${label}</span>
                    ${data.note ? `<small style="color: #6b7280;">${data.note}</small>` : ''}
                    <button class="incident-remove-btn" onclick="window.Incidents.removeIncident('${k}')">×</button>
                </div>
            `;
        });
        incidentsHTML += `</div>`;
    });

    // Actualizar el contenido del modal
    const contentDiv = document.querySelector('.about-content');
    if (contentDiv) {
        contentDiv.innerHTML = incidentsHTML;
    }

    // Actualizar el título con el nuevo contador
    const titleElement = document.querySelector('.modal-title');
    if (titleElement) {
        titleElement.textContent = `Incidencias registradas (${incidentCount})`;
    }

    // Re-renderizar la plantilla para actualizar visual
    window.render();
}

/**
 * Borra todas las incidencias
 */
function clearAllIncidents() {
    if (confirm('¿Seguro que quieres borrar todas las incidencias?')) {
        window.state.incidents = {};
        window.saveData();
        closeIncidentsPanel();
        window.render();
    }
}

/**
 * Maneja el inicio del press en puertas/WC
 * @param {string} coachId - ID del coche
 * @param {string} elementId - ID del elemento
 * @param {string} elementType - Tipo de elemento
 * @param {string} elementLabel - Etiqueta del elemento
 * @param {Event} event - Evento del press
 */
function handleDoorPress(coachId, elementId, elementType, elementLabel, event) {
    event.stopPropagation();

    // Registrar inicio del tap y posición inicial
    event.currentTarget._tapStart = Date.now();

    // Guardar posición inicial del touch/mouse
    const touch = event.touches ? event.touches[0] : event;
    doorTapStartPosition = {
        x: touch.clientX,
        y: touch.clientY
    };

    // Marcar que no ha habido movimiento significativo aún
    event.currentTarget._hasMoved = false;

    doorHoldTriggered = false;
    clearTimeout(doorHoldTimer);

    doorHoldTimer = setTimeout(() => {
        // Solo activar long press si no hubo movimiento significativo
        if (!event.currentTarget._hasMoved) {
            doorHoldTriggered = true;
            if (navigator.vibrate) navigator.vibrate(40);

            // Long press: abrir modal para nota
            openIncidentNote(coachId, elementId, elementType, elementLabel);
        }
    }, DOOR_LONG_PRESS_DURATION);
}

/**
 * Detecta movimiento durante el press en puertas/WC
 * @param {Event} event - Evento del movimiento
 */
function handleDoorMove(event) {
    if (!doorTapStartPosition) return;

    const touch = event.touches ? event.touches[0] : event;
    const deltaX = Math.abs(touch.clientX - doorTapStartPosition.x);
    const deltaY = Math.abs(touch.clientY - doorTapStartPosition.y);

    // Si el movimiento supera el umbral, marcar como movido y cancelar long press
    if (deltaX > DOOR_MOVE_THRESHOLD || deltaY > DOOR_MOVE_THRESHOLD) {
        event.currentTarget._hasMoved = true;
        clearTimeout(doorHoldTimer);
    }
}

/**
 * Encuentra todos los WC contiguos en un bloque
 * @param {string} coachId - ID del coche
 * @param {string} wcId - ID del WC clickeado
 * @returns {Array} Array de IDs de WC en el bloque contiguo
 */
function getContiguousWCBlock(coachId, wcId) {
    // Obtener el layout del coche actual
    const trainModel = window.trainModels[window.state.selectedTrain];
    if (!trainModel || !trainModel.coaches) return [wcId];

    const coach = trainModel.coaches.find(c => c.id === coachId);
    if (!coach || !coach.layout) return [wcId];

    // Si el wcId tiene formato con guión (WC-A, WC-B), buscar TODAS las posiciones con ese mismo valor
    if (wcId.includes('-')) {
        const allMatchingWCs = [];
        coach.layout.forEach((section) => {
            if (section.type === 'seats' && section.positions) {
                section.positions.forEach((row) => {
                    row.forEach((seat) => {
                        if (String(seat) === wcId) {
                            allMatchingWCs.push(wcId);
                        }
                    });
                });
            }
        });

        // Si encontramos múltiples WCs con el mismo ID, retornar array con ese ID repetido
        // Esto hará que todos se marquen juntos
        if (allMatchingWCs.length > 0) {
            console.log(`[getContiguousWCBlock] ${wcId} encontrado ${allMatchingWCs.length} veces - es un grupo predefinido`);
            return allMatchingWCs;
        }
    }

    // Para WCs sin ID con guión, buscar bloques contiguos
    const wcPositions = [];
    let wcCounter = 0;

    coach.layout.forEach((section, sectionIndex) => {
        if (section.type === 'seats' && section.positions) {
            section.positions.forEach((row, rowIndex) => {
                row.forEach((seat, colIndex) => {
                    if (String(seat).includes('WC')) {
                        wcCounter++;
                        const generatedId = String(seat).includes("-") ? String(seat) : `WC${wcCounter}`;
                        wcPositions.push({
                            sectionIndex,
                            rowIndex,
                            colIndex,
                            id: seat,
                            generatedId: generatedId
                        });
                    }
                });
            });
        }
    });

    console.log('[getContiguousWCBlock] Todas las posiciones de WC:', wcPositions);

    // Encontrar el WC clickeado usando el wcId generado
    const clickedWC = wcPositions.find(wc => wc.generatedId === wcId);

    console.log('[getContiguousWCBlock] WC clickeado encontrado:', clickedWC);

    if (!clickedWC) {
        console.log('[getContiguousWCBlock] ❌ No se encontró el WC clickeado');
        return [wcId];
    }

    // Encontrar WCs contiguos (misma fila o filas adyacentes, columnas adyacentes)
    const blockWCs = [clickedWC];
    const checked = new Set([`${clickedWC.sectionIndex}-${clickedWC.rowIndex}-${clickedWC.colIndex}`]);

    // Función recursiva para encontrar WCs adyacentes
    const findAdjacent = (wc) => {
        wcPositions.forEach(otherWC => {
            const key = `${otherWC.sectionIndex}-${otherWC.rowIndex}-${otherWC.colIndex}`;
            if (checked.has(key)) return;

            // Verificar si es adyacente (misma sección, fila adyacente o misma fila con columna adyacente)
            const sameSection = wc.sectionIndex === otherWC.sectionIndex;
            const rowDiff = Math.abs(wc.rowIndex - otherWC.rowIndex);
            const colDiff = Math.abs(wc.colIndex - otherWC.colIndex);

            // Adyacente si está en la misma sección y:
            // - Misma fila, columna adyacente
            // - Fila adyacente, misma columna o columna adyacente
            const isAdjacent = sameSection && (
                (rowDiff === 0 && colDiff <= 1) ||
                (rowDiff === 1 && colDiff <= 1)
            );

            if (isAdjacent) {
                checked.add(key);
                blockWCs.push(otherWC);
                findAdjacent(otherWC); // Recursivo para encontrar más
            }
        });
    };

    findAdjacent(clickedWC);

    // Extraer los IDs generados de los WCs en el bloque
    const wcIds = blockWCs.map(wc => wc.generatedId);

    console.log('[getContiguousWCBlock] WC clickeado:', wcId);
    console.log('[getContiguousWCBlock] Bloque contiguo encontrado:', wcIds);
    console.log('[getContiguousWCBlock] Posiciones del bloque:', blockWCs.map(wc => `[${wc.rowIndex},${wc.colIndex}]`));

    return wcIds.length > 0 ? wcIds : [wcId];
}

/**
 * Maneja el fin del press en puertas/WC
 * @param {Event} event - Evento del release
 */
function handleDoorRelease(event) {
    event.stopPropagation();

    clearTimeout(doorHoldTimer);

    if (!doorHoldTriggered) {
        // Tap simple: solo activar si fue RÁPIDO y sin movimiento significativo
        const button = event.currentTarget;
        const elementId = button.dataset.doorId || button.dataset.wcId;
        const elementType = button.dataset.doorId ? 'door' : 'wc';

        const tapDuration = Date.now() - (button._tapStart || 0);
        const hasMoved = button._hasMoved || false;

        // Solo activar si el tap fue rápido Y no hubo movimiento (scroll)
        if (elementId && tapDuration < DOOR_TAP_THRESHOLD && !hasMoved) {
            event.preventDefault();

            // Si es un WC, marcar todo el bloque contiguo
            if (elementType === 'wc') {
                const wcBlock = getContiguousWCBlock(window.state.selectedCoach, elementId);

                console.log('[handleDoorRelease] Bloque WC detectado:', wcBlock);

                // Buscar si existe una incidencia de grupo que incluya alguno de estos WCs
                let existingGroupKey = null;
                Object.keys(window.state.incidents).forEach(key => {
                    const incident = window.state.incidents[key];
                    if (incident.type === 'wc' && incident.wcIds) {
                        // Es una incidencia de grupo, verificar si contiene algún WC de nuestro bloque
                        if (incident.wcIds.some(id => wcBlock.includes(id))) {
                            existingGroupKey = key;
                        }
                    }
                });

                console.log('[handleDoorRelease] Incidencia de grupo existente?', existingGroupKey);

                if (existingGroupKey) {
                    // Ya existe una incidencia para este bloque, eliminarla
                    delete window.state.incidents[existingGroupKey];
                } else {
                    // No existe, crear una nueva incidencia de grupo
                    // Usar el primer WC del bloque como ID representativo
                    const groupId = wcBlock.length > 1 ? `WC-BLOCK-${wcBlock[0]}` : wcBlock[0];

                    console.log('[handleDoorRelease] Creando incidencia de grupo:', groupId);

                    // Crear UNA SOLA incidencia para todo el bloque
                    const groupKey = getIncidentKey(window.state.selectedCoach, groupId);
                    window.state.incidents[groupKey] = {
                        type: 'wc',
                        broken: true,
                        note: "",
                        wcIds: wcBlock // Guardar todos los IDs del bloque
                    };
                }
            } else {
                // Para puertas, comportamiento normal
                toggleIncident(window.state.selectedCoach, elementId, elementType);
            }

            // Mantener scroll
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;
            window.saveData();
            window.isLongPressActive = false;
            window.render();
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
            });
        }
    }

    doorHoldTriggered = false;
    doorTapStartPosition = null;
}

/**
 * Maneja la cancelación del press en puertas/WC
 * @param {Event} event - Evento de cancelación
 */
function handleDoorCancel(event) {
    clearTimeout(doorHoldTimer);
    doorHoldTriggered = false;
    doorTapStartPosition = null;

    // Limpiar timestamp y flag de movimiento
    if (event && event.currentTarget) {
        delete event.currentTarget._tapStart;
        delete event.currentTarget._hasMoved;
    }
}

// Exportar funciones al scope global
window.Incidents = {
    getIncidentKey,
    toggleIncident,
    openIncidentNote,
    saveIncidentNote,
    closeIncidentNote,
    openIncidentsPanel,
    closeIncidentsPanel,
    removeIncident,
    clearAllIncidents,
    handleDoorPress,
    handleDoorMove,
    handleDoorRelease,
    handleDoorCancel
};

// Aliases para compatibilidad con código existente
window.getIncidentKey = getIncidentKey;
window.toggleIncident = toggleIncident;
window.openIncidentNote = openIncidentNote;
window.saveIncidentNote = saveIncidentNote;
window.closeIncidentNote = closeIncidentNote;
window.openIncidentsPanel = openIncidentsPanel;
window.closeIncidentsPanel = closeIncidentsPanel;
window.removeIncident = removeIncident;
window.clearAllIncidents = clearAllIncidents;
window.handleDoorPress = handleDoorPress;
window.handleDoorMove = handleDoorMove;
window.handleDoorRelease = handleDoorRelease;
window.handleDoorCancel = handleDoorCancel;
