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
    const typeLabel = elementType === 'door' ? 'Puerta' : 'WC';
    if (window.pushUndo) window.pushUndo(`Toggle incidencia ${typeLabel} ${elementId}`);

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
    window.AppState.notify();
}

/**
 * Abre el modal para añadir una nota a una incidencia
 * @param {string} coachId - ID del coche
 * @param {string} elementId - ID del elemento
 * @param {string} elementType - Tipo de elemento
 * @param {string} elementLabel - Etiqueta del elemento para mostrar
 * @param {boolean} fromPanel - Si se abre desde el panel de incidencias
 */
function openIncidentNote(coachId, elementId, elementType, elementLabel, fromPanel) {
    const key = getIncidentKey(coachId, elementId);
    const incident = window.state.incidents[key] || { type: elementType, broken: true, note: "" };

    const onSave = fromPanel
        ? `window.Incidents.saveIncidentNoteFromPanel('${coachId}', '${elementId}', '${elementType}', '${key}')`
        : `window.Incidents.saveIncidentNote('${coachId}', '${elementId}', '${elementType}')`;

    const onCancel = fromPanel
        ? `window.Incidents.closeIncidentNoteFromPanel()`
        : `window.Incidents.closeIncidentNote()`;

    const onOverlay = fromPanel
        ? `window.Incidents.closeIncidentNoteFromPanel(event)`
        : `window.Incidents.closeIncidentNote(event)`;

    const modalHTML = `
        <div class="modal-overlay incident-note-overlay" onclick="${onOverlay}">
            <div class="modal about-modal incident-note-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Nota: ${elementLabel}</h3>
                        <button class="close-btn" onclick="${onCancel}">
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
                            onclick="${onSave}">
                        Guardar
                    </button>
                    <button class="clear-btn" onclick="${onCancel}">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    if (!fromPanel) {
        window.resetCoachDoubleTap();
        window.lockBodyScroll();
    }

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setTimeout(() => {
        const textarea = document.getElementById('incident-note-textarea');
        if (textarea) textarea.focus();
    }, 100);
}

/**
 * Guarda la nota de una incidencia (desde long press en plantilla)
 */
function saveIncidentNote(coachId, elementId, elementType) {
    const textarea = document.getElementById('incident-note-textarea');
    const note = textarea ? textarea.value.trim() : "";

    const key = getIncidentKey(coachId, elementId);
    if (window.pushUndo) window.pushUndo(`Nota incidencia ${elementId}`);

    if (!window.state.incidents[key]) {
        window.state.incidents[key] = { type: elementType, broken: true, note: note };
    } else {
        window.state.incidents[key].note = note;
    }

    window.saveData();
    closeIncidentNote();
    window.AppState.notify();
}

/**
 * Guarda la nota desde el panel de incidencias y actualiza el panel sin cerrarlo
 */
function saveIncidentNoteFromPanel(coachId, elementId, elementType, key) {
    const textarea = document.getElementById('incident-note-textarea');
    const note = textarea ? textarea.value.trim() : "";

    if (window.pushUndo) window.pushUndo(`Nota incidencia ${elementId}`);

    if (!window.state.incidents[key]) {
        window.state.incidents[key] = { type: elementType, broken: true, note: note };
    } else {
        window.state.incidents[key].note = note;
    }

    window.saveData();
    closeIncidentNoteFromPanel();
    refreshIncidentsPanel();
    window.AppState.notify();
}

/**
 * Cierra el modal de nota abierto desde el panel (sin cerrar el panel)
 */
function closeIncidentNoteFromPanel(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.incident-note-overlay');
        if (overlay) overlay.remove();
    }
}

/**
 * Cierra el modal de nota de incidencia
 * @param {Event} event - Evento de cierre
 */
function closeIncidentNote(event) {
    if (!event || event.target === event.currentTarget) {
        // Guardar scroll antes de cerrar
        const scrollToRestore = window.savedScrollPosition || 0;

        const overlay = document.querySelector('.incident-note-overlay');
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
 * Genera el HTML de un item de incidencia para el panel
 */
function renderIncidentItemHTML(key, data) {
    const parts = key.split('-');
    const skipVariant = window.state.selectedTrain === "470" && parts.length > 2;
    let label = skipVariant ? parts.slice(2).join('-') : parts.slice(1).join('-');
    label = formatIncidentLabel(label, key, data);

    const typeLabel = data.type === 'door' ? '🚪' : '🚽';

    // Reconstruir coachId y elementId para la nota
    const coachId = parts[0];
    const elementId = skipVariant ? parts.slice(2).join('-') : parts.slice(1).join('-');

    const noteBtn = `<button class="incident-note-btn" title="${data.note ? 'Editar nota' : 'Añadir nota'}"
        onclick="window.Incidents.openIncidentNoteFromPanel('${coachId}', '${elementId}', '${data.type}', '${label.replace(/'/g, '\\\'')}')"
        >${data.note ? '📝' : '✏️'}</button>`;

    return `
        <div class="incident-item" data-key="${key}">
            <div class="incident-item-main">
                <span>${typeLabel} ${label}</span>
                ${data.note ? `<small class="incident-note-preview">${data.note}</small>` : ''}
            </div>
            <div class="incident-item-actions">
                ${noteBtn}
                <button class="incident-remove-btn" onclick="window.Incidents.removeIncident('${key}')">×</button>
            </div>
        </div>
    `;
}

/**
 * Genera el HTML agrupado de todas las incidencias para el panel
 */
function buildIncidentsPanelHTML() {
    const byCoach = {};
    Object.keys(window.state.incidents).forEach(key => {
        const parts = key.split('-');
        let groupKey = parts[0];
        if (window.state.selectedTrain === "470" && parts.length > 2) {
            groupKey = `${parts[0]} (Variante ${parts[1]})`;
        }
        if (!byCoach[groupKey]) byCoach[groupKey] = [];
        byCoach[groupKey].push({ key, data: window.state.incidents[key] });
    });

    let html = '';
    Object.keys(byCoach).sort().forEach(coachId => {
        html += `<div class="incidents-group"><h4 style="margin: 0.5rem 0; font-weight: 600;">${coachId}</h4>`;
        byCoach[coachId].forEach(({ key, data }) => {
            html += renderIncidentItemHTML(key, data);
        });
        html += `</div>`;
    });
    return html;
}

/**
 * Refresca el contenido del panel de incidencias sin cerrarlo
 */
function refreshIncidentsPanel() {
    const contentDiv = document.querySelector('.about-content');
    if (contentDiv) contentDiv.innerHTML = buildIncidentsPanelHTML();

    const titleElement = document.querySelector('.modal-title');
    const incidentCount = Object.keys(window.state.incidents).length;
    if (titleElement) titleElement.textContent = `Incidencias registradas (${incidentCount})`;
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

    const incidentsHTML = buildIncidentsPanelHTML();

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

    if (Object.keys(window.state.incidents).length === 0) {
        closeIncidentsPanel();
        window.AppState.notify();
        return;
    }

    refreshIncidentsPanel();
    window.AppState.notify();
}

/**
 * Borra todas las incidencias
 */
function clearAllIncidents() {
    if (confirm('¿Seguro que quieres borrar todas las incidencias?')) {
        window.state.incidents = {};
        window.saveData();
        closeIncidentsPanel();
        window.AppState.notify();
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
                    if (window.pushUndo) window.pushUndo(`Toggle incidencia WC bloque`);
                    delete window.state.incidents[existingGroupKey];
                } else {
                    // No existe, crear una nueva incidencia de grupo
                    if (window.pushUndo) window.pushUndo(`Toggle incidencia WC bloque`);
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
            window.AppState.notify();
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

/**
 * Devuelve true si hay una incidencia activa para el elemento dado.
 * El formato de la key es un detalle interno del módulo.
 * @param {string} coachId
 * @param {string} elementId
 * @returns {boolean}
 */
function hasIncident(coachId, elementId) {
    const key = getIncidentKey(coachId, elementId);
    return !!window.state.incidents[key];
}

/**
 * Devuelve true si el wcId dado pertenece a algún bloque de incidencia de WC.
 * Evita que el renderer lea window.state.incidents directamente.
 * @param {string} wcId
 * @returns {boolean}
 */
function isWCInIncidentBlock(wcId) {
    return Object.values(window.state.incidents).some(
        inc => inc.type === 'wc' && inc.wcIds && inc.wcIds.includes(wcId)
    );
}

// Exportar funciones al scope global
window.Incidents = {
    // Interfaz de dominio (profunda — key format oculta)
    hasIncident,
    isWCInIncidentBlock,
    toggle: toggleIncident,
    setNote: (coachId, elementId, elementType, note) => {
        const key = getIncidentKey(coachId, elementId);
        if (window.pushUndo) window.pushUndo(`Nota incidencia ${elementId}`);
        if (!window.state.incidents[key]) {
            window.state.incidents[key] = { type: elementType, broken: true, note };
        } else {
            window.state.incidents[key].note = note;
        }
        window.saveData();
        window.AppState.notify();
    },
    getAll: () => ({ ...window.state.incidents }),
    getWCGroup: (coachId, wcId) => getContiguousWCBlock(coachId, wcId),

    // Interfaz UI (necesaria para handlers inline en el DOM generado)
    toggleIncident,
    openIncidentNote,
    openIncidentNoteFromPanel: (coachId, elementId, elementType, elementLabel) =>
        openIncidentNote(coachId, elementId, elementType, elementLabel, true),
    saveIncidentNote,
    saveIncidentNoteFromPanel,
    closeIncidentNote,
    closeIncidentNoteFromPanel,
    openIncidentsPanel,
    closeIncidentsPanel,
    removeIncident,
    clearAllIncidents,
    handleDoorPress,
    handleDoorMove,
    handleDoorRelease,
    handleDoorCancel
};

// Aliases para compatibilidad con código existente (handlers inline en HTML generado)
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
