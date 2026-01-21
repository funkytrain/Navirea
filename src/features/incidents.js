/**
 * Incidents Management Module
 * Gestiona todas las incidencias del servicio (puertas, WC, etc.)
 */

// Variables para long press en puertas/WC
let doorHoldTimer = null;
let doorHoldTriggered = false;

// Duración del long press (debe coincidir con DOOR_LONG_PRESS_DURATION de script.js)
const DOOR_LONG_PRESS_DURATION = 500;

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
        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();
    }

    if (!document.querySelector('.modal-overlay')) {
        window.unlockBodyScroll();
    }
}

/**
 * Formatea el label de una incidencia para mostrar
 * @param {string} label - Label original
 * @param {string} key - Clave de la incidencia
 * @returns {string} Label formateado
 */
function formatIncidentLabel(label, key) {
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
    } else if (label.startsWith('WC-')) {
        // Es un grupo de WC (ej: "WC-A")
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

            label = formatIncidentLabel(label, key);

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

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    window.lockBodyScroll();
}

/**
 * Cierra el panel de incidencias
 * @param {Event} event - Evento de cierre
 */
function closeIncidentsPanel(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();
    }

    if (!document.querySelector('.modal-overlay')) {
        window.unlockBodyScroll();
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

            label = formatIncidentLabel(label, k);

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

    // Registrar inicio del tap
    event.currentTarget._tapStart = Date.now();

    doorHoldTriggered = false;
    clearTimeout(doorHoldTimer);

    doorHoldTimer = setTimeout(() => {
        doorHoldTriggered = true;
        if (navigator.vibrate) navigator.vibrate(40);

        // Long press: abrir modal para nota
        openIncidentNote(coachId, elementId, elementType, elementLabel);
    }, DOOR_LONG_PRESS_DURATION);
}

/**
 * Maneja el fin del press en puertas/WC
 * @param {Event} event - Evento del release
 */
function handleDoorRelease(event) {
    event.stopPropagation();

    clearTimeout(doorHoldTimer);

    if (!doorHoldTriggered) {
        // Tap simple: solo activar si fue RÁPIDO (menos de 100ms)
        const button = event.currentTarget;
        const elementId = button.dataset.doorId || button.dataset.wcId;
        const elementType = button.dataset.doorId ? 'door' : 'wc';

        const tapDuration = Date.now() - (button._tapStart || 0);

        if (elementId && tapDuration < 100) {
            event.preventDefault();

            toggleIncident(window.state.selectedCoach, elementId, elementType);

            // Mantener scroll
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;
            window.isLongPressActive = false;
            window.render();
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
            });
        }
    }

    doorHoldTriggered = false;
}

/**
 * Maneja la cancelación del press en puertas/WC
 * @param {Event} event - Evento de cancelación
 */
function handleDoorCancel(event) {
    clearTimeout(doorHoldTimer);
    doorHoldTriggered = false;

    // Limpiar timestamp
    if (event && event.currentTarget) {
        delete event.currentTarget._tapStart;
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
    handleDoorRelease,
    handleDoorCancel
};

// Aliases para compatibilidad con código existente
window.toggleIncident = toggleIncident;
window.openIncidentNote = openIncidentNote;
window.openIncidentsPanel = openIncidentsPanel;
window.closeIncidentsPanel = closeIncidentsPanel;
window.removeIncident = removeIncident;
window.clearAllIncidents = clearAllIncidents;
window.handleDoorPress = handleDoorPress;
window.handleDoorRelease = handleDoorRelease;
window.handleDoorCancel = handleDoorCancel;
