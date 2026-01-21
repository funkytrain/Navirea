// ============================================
// CARGA DE DATOS DESDE JSON
// ============================================
let trainModels = {};
let stops = [];
let trainNumbers = {};
let trainRoutes = {};
let stationScreens = {};

// Helper para verificar si los datos están cargados
function isDataLoaded() {
    return Object.keys(trainModels).length > 0 &&
           stops.length > 0 &&
           Object.keys(trainNumbers).length > 0;
}

// Función para cargar datos JSON
async function loadJSONData() {
    try {
        // Cargar datos de paradas
        const stopsResponse = await fetch('data/stops.json');
        stops = await stopsResponse.json();

        // Cargar números de tren
        const trainNumbersResponse = await fetch('data/train-numbers.json');
        trainNumbers = await trainNumbersResponse.json();

        // Cargar rutas de tren
        const trainRoutesResponse = await fetch('data/train-routes.json');
        trainRoutes = await trainRoutesResponse.json();

        // Cargar pantallas de estación
        const stationScreensResponse = await fetch('data/station-screens.json');
        stationScreens = await stationScreensResponse.json();

        // Cargar modelos de trenes
        const trainIds = ['463', '464', '465', '449', '470'];
        for (const id of trainIds) {
            const response = await fetch(`data/trains/train-${id}.json`);
            const trainData = await response.json();
            trainModels[id] = trainData;
        }

        console.log('✅ Datos cargados correctamente desde JSON');
        console.log('📊 Trenes disponibles:', Object.keys(trainModels));
        console.log('📍 Paradas cargadas:', stops.length);
        return true;
    } catch (error) {
        console.error('❌ Error cargando datos JSON:', error);
        return false;
    }
}

// Función para determinar si un coche es el primero o último visualmente
function getCoachPosition(coachId) {
    // Verificar si ya está en cache
    if (state.coachPositions && state.coachPositions[coachId]) {
        return state.coachPositions[coachId];
    }

    const currentTrain = trainModels[state.selectedTrain];
    if (!currentTrain || !currentTrain.coaches) {
        return { isFirst: false, isLast: false };
    }

    const coaches = currentTrain.coaches;
    const index = coaches.findIndex(c => c.id === coachId);

    const result = {
        isFirst: index === 0,
        isLast: index === coaches.length - 1
    };

    // Guardar en cache
    if (!state.coachPositions) {
        state.coachPositions = {};
    }
    state.coachPositions[coachId] = result;

    return result;
}

// Función para obtener la etiqueta de cabina según dirección
function getCabinaLabel(coachId) {
    const direction = state.trainDirection[coachId] || "up";
    const position = getCoachPosition(coachId);

    // Con flecha hacia arriba: CABEZA al inicio, COLA al final
    // Con flecha hacia abajo: COLA al inicio, CABEZA al final
    if (direction === "up") {
        if (position.isFirst) return "CABEZA";
        if (position.isLast) return "COLA";
    } else {
        if (position.isFirst) return "COLA";
        if (position.isLast) return "CABEZA";
    }

    return "CABINA"; // fallback (no debería usarse)
}

// Función para obtener el símbolo de flecha del pasillo
function getAisleArrow(coachId) {
    const direction = state.trainDirection[coachId] || "up";
    const isRotated = state.rotateSeats;

    // Si está rotado, invertimos la flecha visualmente
    if (isRotated) {
        return direction === "up" ? "↓" : "↑";
    }

    return direction === "up" ? "↑" : "↓";
}

// Obtener paradas disponibles para filtrar
function getAvailableStopsForFilter() {
    if (!state.trainNumber || !trainRoutes[state.trainNumber]) return [];

    const route = trainRoutes[state.trainNumber];

    if (!state.currentStop) {
        return route; // Todas disponibles si no hay parada actual
    }

    const currentIndex = route.indexOf(state.currentStop);
    if (currentIndex === -1) return route;

    // Solo paradas desde la actual hasta el final
    return route.slice(currentIndex);
}

// Obtener asientos que se bajan en una parada específica
function getSeatsForStop(stopName) {
    const seats = [];
    Object.keys(state.seatData).forEach(key => {
        const seatInfo = state.seatData[key];
        if (seatInfo && seatInfo.stop && seatInfo.stop.full === stopName) {
            const parts = key.split('-');
            const coachId = parts[0];
            const seatNum = parts.length === 3 ? parts[2] : parts[1];
            seats.push({ coach: coachId, seat: seatNum, info: seatInfo });
        }
    });
    return seats;
}

// Obtener asientos en un tramo
function getSeatsInRoute(fromStop, toStop) {
    if (!state.trainNumber || !trainRoutes[state.trainNumber]) return [];

    const route = trainRoutes[state.trainNumber];
    const fromIndex = route.indexOf(fromStop);
    const toIndex = route.indexOf(toStop);

    // validación: ambos en ruta y from antes que to
    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) return [];

    const seats = [];

    Object.keys(state.seatData).forEach(key => {
        const seatInfo = state.seatData[key];
        if (seatInfo && seatInfo.stop) {
            const stopIndex = route.indexOf(seatInfo.stop.full);
            // Incluir asientos cuya parada está dentro del tramo
            if (stopIndex >= fromIndex && stopIndex <= toIndex) {
                const parts = key.split('-');
                const coachId = parts[0];
                const seatNum = parts.length === 3 ? parts[2] : parts[1];
                seats.push({ coach: coachId, seat: seatNum, info: seatInfo });
            }
        }
    });

    return seats;
}

// Obtener información de un asiento
function getSeatInfo(seatNumber) {
    // Buscar en todos los coches
    const keys = Object.keys(state.seatData);
    const foundKey = keys.find(key => {
        const parts = key.split('-');
        // Para 470: C1-A-12 → partes[2] es el número
        // Para otros: C1-12 → partes[1] es el número
        const num = parts.length === 3 ? parts[2] : parts[1];
        return num === String(seatNumber);
    });

    if (!foundKey) return null;

    const parts = foundKey.split('-');
    const coachId = parts[0];
    const seatNum = parts.length === 3 ? parts[2] : parts[1];

    return {
        coach: coachId,
        seat: seatNum,
        data: state.seatData[foundKey]
    };
}

// Aplicar filtro visual
function applyFilterHighlight(seatKeys) {
    filterState.active = true;
    filterState.data = seatKeys;
    render();
}

// Limpiar filtro visual
function clearFilterHighlight() {
    filterState.active = false;
    filterState.type = null;
    filterState.data = null;
    render();
}

function openStopFilter() {
    toggleFiltersMenu();

    const availableStops = getAvailableStopsForFilter();
    if (availableStops.length === 0) {
        alert('No hay paradas disponibles para filtrar');
        return;
    }

    // Crear modal interactivo
    const modal = `
        <div class="modal-overlay" onclick="closeFilterInputModal(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Filtrar por parada de bajada</h3>
                        <button class="close-btn" onclick="closeFilterInputModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="filter-input-content">
                    <label class="filter-input-label">Introduce el nombre de la parada:</label>
                    <div style="position: relative;">
                        <input 
                            type="text" 
                            id="stop-filter-input" 
                            class="filter-text-input"
                            placeholder="Escribe para buscar..."
                            oninput="updateStopFilterSuggestions(this.value)"
                            autocomplete="off"
                        />
                        <div id="stop-suggestions" class="filter-suggestions hidden"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeFilterInputModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    setTimeout(() => {
        const inp = document.getElementById('stop-filter-input');
        if (inp) inp.focus();
    }, 50);
    lockBodyScroll();
}

function updateStopFilterSuggestions(query) {
    const availableStops = getAvailableStopsForFilter();
    const suggestions = availableStops.filter(stop =>
        stop.toLowerCase().includes(query.toLowerCase())
    );

    const container = document.getElementById('stop-suggestions');

    if (query && suggestions.length > 0) {
        container.innerHTML = suggestions.slice(0, 5).map(stop => `
            <button class="suggestion-item" onclick="selectStopForFilter('${stop}')">
                ${stop}
            </button>
        `).join('');
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function selectStopForFilter(stopName) {
    closeFilterInputModal();

    const seats = getSeatsForStop(stopName);

    if (seats.length === 0) {
        alert(`No hay asientos con destino a ${stopName}`);
        return;
    }

    // Preguntar si quiere resaltar con modal personalizado
    showConfirmModal(
        `Se encontraron ${seats.length} asiento(s) con destino a ${stopName}\n\n` +
        `¿Deseas resaltarlos visualmente en la plantilla?`,
        () => {
            // Si acepta
            const seatKeys = seats.map(s => getSeatKey(s.coach, s.seat));
            filterState.type = 'stop';
            applyFilterHighlight(seatKeys);
            showStopFilterResults(stopName, seats);
        },
        () => {
            // Si cancela, solo mostrar resultados sin resaltar
            showStopFilterResults(stopName, seats);
        }
    );
}

function openRouteFilter() {
    toggleFiltersMenu();

    const availableStops = getAvailableStopsForFilter();
    if (availableStops.length < 2) {
        alert('No hay suficientes paradas disponibles');
        return;
    }

    // Crear modal para parada inicial
    const modal = `
        <div class="modal-overlay" onclick="closeFilterInputModal(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Filtrar por tramo recorrido</h3>
                        <button class="close-btn" onclick="closeFilterInputModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="filter-input-content">
                    <label class="filter-input-label">Introduce la parada inicial:</label>
                    <div style="position: relative;">
                        <input 
                            type="text" 
                            id="route-from-input" 
                            class="filter-text-input"
                            placeholder="Escribe para buscar..."
                            oninput="updateRouteFromSuggestions(this.value)"
                            autocomplete="off"
                        />
                        <div id="route-from-suggestions" class="filter-suggestions hidden"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeFilterInputModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    setTimeout(() => {
        const inp = document.getElementById('route-from-input');
        if (inp) inp.focus();
    }, 50);
    lockBodyScroll();
}

function updateRouteFromSuggestions(query) {
    const availableStops = getAvailableStopsForFilter();
    const suggestions = availableStops.filter(stop =>
        stop.toLowerCase().includes(query.toLowerCase())
    );

    const container = document.getElementById('route-from-suggestions');

    if (query && suggestions.length > 0) {
        container.innerHTML = suggestions.slice(0, 5).map(stop => `
            <button class="suggestion-item" onclick="selectRouteFromStop('${stop}')">
                ${stop}
            </button>
        `).join('');
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function selectRouteFromStop(fromStop) {
    closeFilterInputModal();

    // Ahora pedir parada final
    const modal = `
        <div class="modal-overlay" onclick="closeFilterInputModal(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Filtrar por tramo recorrido</h3>
                        <button class="close-btn" onclick="closeFilterInputModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="filter-input-content">
                    <p style="margin-bottom: 1rem; color: #4f46e5; font-weight: 500;">Desde: ${fromStop}</p>
                    <label class="filter-input-label">Introduce la parada final:</label>
                    <div style="position: relative;">
                        <input 
                            type="text" 
                            id="route-to-input" 
                            class="filter-text-input"
                            placeholder="Escribe para buscar..."
                            oninput="updateRouteToSuggestions(this.value, '${fromStop}')"
                            autocomplete="off"
                        />
                        <div id="route-to-suggestions" class="filter-suggestions hidden"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeFilterInputModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    setTimeout(() => {
        const inp = document.getElementById('route-to-input');
        if (inp) inp.focus();
    }, 50);
    lockBodyScroll();
}

function updateRouteToSuggestions(query, fromStop) {
    const availableStops = getAvailableStopsForFilter();
    const suggestions = availableStops.filter(stop =>
        stop.toLowerCase().includes(query.toLowerCase())
    );

    const container = document.getElementById('route-to-suggestions');

    if (query && suggestions.length > 0) {
        container.innerHTML = suggestions.slice(0, 5).map(stop => `
            <button class="suggestion-item" onclick="selectRouteToStop('${fromStop}', '${stop}')">
                ${stop}
            </button>
        `).join('');
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

function selectRouteToStop(fromStop, toStop) {
    closeFilterInputModal();

    const seats = getSeatsInRoute(fromStop, toStop);

    if (seats.length === 0) {
        alert(`No hay viajeros en el tramo ${fromStop} - ${toStop}`);
        return;
    }

    showConfirmModal(
        `Se encontraron ${seats.length} viajero(s) en el tramo\n` +
        `${fromStop} → ${toStop}\n\n` +
        `¿Deseas resaltarlos visualmente en la plantilla?`,
        () => {
            // Si acepta
            const seatKeys = seats.map(s => getSeatKey(s.coach, s.seat));
            filterState.type = 'route';
            applyFilterHighlight(seatKeys);
            showRouteFilterResults(fromStop, toStop, seats);
        },
        () => {
            // Si cancela, solo mostrar resultados
            showRouteFilterResults(fromStop, toStop, seats);
        }
    );
}

function openSeatFilter() {
    toggleFiltersMenu();

    const modal = `
        <div class="modal-overlay" onclick="closeFilterInputModal(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Filtrar por asiento</h3>
                        <button class="close-btn" onclick="closeFilterInputModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="filter-input-content">
                    <label class="filter-input-label">Introduce el número de asiento:</label>
                    <input 
                        type="text" 
                        id="seat-filter-input" 
                        class="filter-text-input"
                        placeholder="Ej: 42"
                        onkeypress="if(event.key==='Enter') searchSeatFilter()"
                    />
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" style="background-color: #4f46e5;" onclick="searchSeatFilter()">Buscar</button>
                    <button class="clear-btn" onclick="closeFilterInputModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    setTimeout(() => {
        const inp = document.getElementById('seat-filter-input');
        if (inp) inp.focus();
    }, 50);
    lockBodyScroll();
}

function searchSeatFilter() {
    const input = document.getElementById('seat-filter-input');
    const seatNum = input.value.trim();

    if (!seatNum) return;

    closeFilterInputModal();

    const seatInfo = getSeatInfo(seatNum);

    if (!seatInfo) {
        alert(`No se encontró información para el asiento ${seatNum}`);
        return;
    }

    showSeatFilterResults(seatInfo);
}

// ===== FUNCIÓN GENÉRICA PARA CERRAR MODALES =====
function closeGenericModal(modalSelector, event) {
    if (!event || event.target === event.currentTarget) {
        // Guardar scroll antes de cerrar
        const scrollToRestore = savedScrollPosition;

        const modal = document.querySelector(modalSelector)?.closest('.modal-overlay');
        if (!modal) {
            // Si no encuentra con closest, buscar directamente
            const directModal = document.querySelector(modalSelector);
            if (directModal) directModal.remove();
        } else {
            modal.remove();
        }

        // Si ya no queda ningún overlay, devolvemos el scroll del body
        if (!document.querySelector('.modal-overlay')) {
            unlockBodyScroll();
            // Restaurar scroll a la posición guardada
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollToRestore);
            });
        }
    }
}

function closeFilterInputModal(event) {
    closeGenericModal('.about-modal', event);
}

function showConfirmModal(message, onConfirm, onCancel) {
    const modal = `
        <div class="modal-overlay" onclick="closeConfirmModal(false, event)">
            <div class="modal confirm-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">Confirmar</h3>
                </div>
                <div class="confirm-content">
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="modal-footer confirm-footer">
                    <button class="confirm-btn cancel-btn" onclick="closeConfirmModal(false)">
                        Cancelar
                    </button>
                    <button class="confirm-btn accept-btn" onclick="closeConfirmModal(true)">
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);

    // Guardar callbacks
    window._confirmCallbacks = { onConfirm, onCancel };
    lockBodyScroll();
}

function closeConfirmModal(accepted, event) {
    if (event && event.target !== event.currentTarget) return;

    const modal = document.querySelector('.confirm-modal')?.closest('.modal-overlay');
    if (modal) {
        modal.remove();

        const callbacks = window._confirmCallbacks;
        if (callbacks) {
            if (accepted && callbacks.onConfirm) {
                callbacks.onConfirm();
            } else if (!accepted && callbacks.onCancel) {
                callbacks.onCancel();
            }
            window._confirmCallbacks = null;
        }
    }

    // 👇 IMPORTANTE: si ya no queda ningún overlay, devolver el scroll del body
    if (!document.querySelector('.modal-overlay')) {
        unlockBodyScroll();
    }
}

function showStopFilterResults(stopName, seats) {
    // Agrupar por coche
    const byCoach = {};
    seats.forEach(s => {
        if (!byCoach[s.coach]) byCoach[s.coach] = [];
        byCoach[s.coach].push(s.seat);
    });

    let details = '';
    Object.keys(byCoach).sort().forEach(coach => {
        details += `\n${coach}: ${byCoach[coach].sort((a, b) => {
            const numA = parseInt(String(a).replace(/\D/g, ''));
            const numB = parseInt(String(b).replace(/\D/g, ''));
            return numA - numB;
        }).join(', ')}`;
    });

    const modal = `
        <div class="modal-overlay" onclick="closeFilterModal(event)">
            <div class="modal filter-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">Asientos con destino a ${stopName}</h3>
                    <button class="close-btn" onclick="closeFilterModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="filter-results">
                    <p><strong>Total: ${seats.length} asiento(s)</strong></p>
                    <pre>${details}</pre>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeFilterModal()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    lockBodyScroll();
}

function showRouteFilterResults(fromStop, toStop, seats) {
    const byCoach = {};
    seats.forEach(s => {
        if (!byCoach[s.coach]) byCoach[s.coach] = [];
        byCoach[s.coach].push(s.seat);
    });

    let details = '';
    Object.keys(byCoach).sort().forEach(coach => {
        details += `\n${coach}: ${byCoach[coach].sort((a, b) => {
            const numA = parseInt(String(a).replace(/\D/g, ''));
            const numB = parseInt(String(b).replace(/\D/g, ''));
            return numA - numB;
        }).join(', ')}`;
    });

    const modal = `
        <div class="modal-overlay" onclick="closeFilterModal(event)">
            <div class="modal filter-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">Viajeros en tramo</h3>
                    <p style="font-size: 0.9rem; margin-top: 0.5rem;">${fromStop} → ${toStop}</p>
                    <button class="close-btn" onclick="closeFilterModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="filter-results">
                    <p><strong>Total: ${seats.length} viajero(s)</strong></p>
                    <pre>${details}</pre>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeFilterModal()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    lockBodyScroll();
}

function showSeatFilterResults(seatInfo) {
    const { coach, seat, data } = seatInfo;

    let info = `Coche: ${coach}\nAsiento: ${seat}\n\n`;

    if (data.stop) {
        info += `Destino: ${data.stop.full}\n`;
    } else {
        info += `Sin destino asignado\n`;
    }

    if (data.enlace) info += `✓ Enlace\n`;
    if (data.seguir) info += `✓ Seguir por aquí\n`;
    if (data.comentario) info += `\nComentario:\n${data.comentario}\n`;
    if (data.historial && data.historial.length > 0) {
        info += `\nHistorial: ${data.historial.join(' → ')}`;
    }

    const modal = `
        <div class="modal-overlay" onclick="closeFilterModal(event)">
            <div class="modal filter-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">Información del asiento ${seat}</h3>
                    <button class="close-btn" onclick="closeFilterModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="filter-results">
                    <pre>${info}</pre>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" style="background-color: #4f46e5;" onclick="navigateToSeat('${coach}', '${seat}')">Mostrar</button>
                    <button class="clear-btn" onclick="closeFilterModal()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    lockBodyScroll();
}

/* -----------------------
   NUEVOS FILTROS: Enlaces y Por comentario
   + Modal tipo lista que se mantiene abierto mientras navegas.
   + Botones Ir / Anterior / Siguiente para recorrer resultados.
   ----------------------- */

// Estado temporal para la lista actualmente mostrada en el overlay
let _currentFilterList = [];      // array de seatKeys: ['C1-12', 'C2-3', ...]
let _currentFilterIndex = -1;     // índice del asiento actualmente enfocado en la lista

// Helper: obtener seatKey (ya existe en tu código, pero lo usamos así)
function seatKeyToParts(key) {
    const [coach, seat] = key.split('-');
    return { coach, seat };
}

// Centrar y marcar visualmente un asiento (no cierra overlays)
function scrollSeatIntoViewAndFlash(seatKey) {
    const { coach, seat } = seatKeyToParts(seatKey);

    // Cambiar al coche (si procede) y renderizar
    state.selectedCoach = coach;
    render();

    // Esperar a que el DOM se actualice y buscar el asiento
    setTimeout(() => {
        // Buscar entre .seat del coche actual (igual lógica que navigateToSeat)
        const seats = document.querySelectorAll('.seat');
        let target = null;

        seats.forEach(s => {
            const txt = s.textContent.trim();
            const cleanTxt = txt.replace(/[^\d]/g, '');
            const cleanSeat = String(seat).replace(/[^\d]/g, '');
            if (cleanTxt === cleanSeat || txt.includes(String(seat))) {
                target = s;
            }
        });

        if (!target) return;

// ❌ Desactivamos scroll automático
// target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Añadir clase temporal para destacar
        target.classList.add('focus-seat');
        // Quitar la clase después de 1400ms
        setTimeout(() => {
            target.classList.remove('focus-seat');
        }, 1400);

        // además aseguramos que el asiento también queda marcado por el filtro
        if (filterState) {
            filterState.active = true;
            filterState.data = _currentFilterList.slice();
            filterState.type = filterState.type || 'custom';
        }
    }, 120);
}

// Navegar a un índice concreto de la lista mostrada en el overlay
function navigateToFilterIndex(index) {
    if (!Array.isArray(_currentFilterList) || _currentFilterList.length === 0) return;

    // Normalizar índice en rango circular
    if (index < 0) index = _currentFilterList.length - 1;
    if (index >= _currentFilterList.length) index = 0;

    _currentFilterIndex = index;
    const key = _currentFilterList[_currentFilterIndex];

    // Mantener overlay abierto: NO llamamos a closeFilterModal()
    // Solo centramos y pintamos el asiento y actualizamos estado de filtro
    filterState.active = true;
    filterState.data = _currentFilterList.slice();
    filterState.type = filterState.type || 'custom';
    filterState.highlightIndex = _currentFilterIndex; // opcional para uso visual
    render(); // para que aplique clases 'filtered-seat'
    scrollSeatIntoViewAndFlash(key);

    // Actualizar contador dentro del modal (si existe)
    const counter = document.getElementById('filter-list-counter');
    if (counter) counter.textContent = `${_currentFilterIndex + 1} / ${_currentFilterList.length}`;
}

// Función llamada por los botones "Ir" del modal (no cierra modal)
function onFilterListGo(index) {
    navigateToFilterIndex(index);
}

// Función para abrir un modal tipo lista (genérico)
// type: 'links' | 'comments' u otro identificador
// items: array de objetos { key: 'C1-12', coach: 'C1', seat: '12', extra: 'texto comentario' }
function showFilterListModal(type, items) {
    // Normalizar lista de keys
    _currentFilterList = items.map(i => i.key);
    _currentFilterIndex = (_currentFilterList.length > 0) ? 0 : -1;
    filterState.type = type;
    filterState.active = true;
    filterState.data = _currentFilterList.slice();

    const modal = `
<div class="modal-overlay filter-input-modal" onclick="closeFilterInputModal(event)">
    <div class="modal about-modal" onclick="event.stopPropagation()">
        
        <div class="modal-header">
            <div class="modal-header-top">
                <h3 class="modal-title">
                    ${type === 'links' ? 'Enlaces' : 'Con comentario'}
                </h3>
                <button class="close-btn" onclick="closeFilterInputModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>

        <div class="filter-input-content">
            ${
        items.length === 0
            ? `<div style="color:#777; padding:1rem; text-align:center;">No hay asientos que mostrar.</div>`
            : `<div class="filter-list-container">
                        ${items.map((it, i) => `
                            <div class="filter-list-row">
                                <div class="filter-list-seat">
                                    <strong>${it.coach}</strong> – ${it.seat}
                                    ${it.extra ? `<div class="filter-extra">${escapeHtml(it.extra)}</div>` : ''}
                                </div>
                                <div class="filter-list-actions">
                                    <button class="icon-btn small red" onclick="onFilterListGo(${i})" title="Ir">
                                        <svg viewBox="0 0 24 24" width="16" height="16"
                                             stroke="currentColor" fill="none" stroke-width="2">
                                            <polyline points="9 6 15 12 9 18"></polyline>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>`
    }
        </div>

        <div class="modal-footer">
            <button class="clear-btn" onclick="closeFilterInputModal()">Cerrar</button>
        </div>

    </div>
</div>
`;

    document.body.insertAdjacentHTML('beforeend', modal);
    lockBodyScroll();

    // Inicial: si hay elementos, centrar el primero
    if (_currentFilterList.length > 0) {
        navigateToFilterIndex(0);
    }
}

// Utilidades para escape de HTML (por seguridad al inyectar en modal)
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
}

/* ---------- Funciones específicas que llaman a showFilterListModal() ---------- */

// Abrir filtro "Enlaces" (asientos con flag .enlace)
function openLinksFilter() {
    toggleFiltersMenu();
    const items = [];

    Object.keys(state.seatData).forEach(key => {
        const info = state.seatData[key];
        if (info && info.enlace) {
            const parts = key.split('-');
            const coachId = parts[0];
            const seatNum = parts.length === 3 ? parts[2] : parts[1];

            items.push({ key, coach: coachId, seat: seatNum, extra: info.stop ? `Destino: ${info.stop.full}` : '' });
        }
    });

    if (items.length === 0) {
        alert('No hay asientos marcados como enlace');
        return;
    }

    showFilterListModal('links', items);
}

// Abrir filtro "Por comentario" (asientos con comentarioFlag o comentario)
function openCommentsFilter() {
    toggleFiltersMenu();
    const items = [];

    Object.keys(state.seatData).forEach(key => {
        const info = state.seatData[key];
        if (info && (info.comentarioFlag || info.comentario)) {
            const parts = key.split('-');
            const coachId = parts[0];
            const seatNum = parts.length === 3 ? parts[2] : parts[1];
            items.push({ key, coach: coachId, seat: seatNum, extra: info.comentario || '' });
        }
    });

    if (items.length === 0) {
        alert('No hay asientos con comentario');
        return;
    }

    showFilterListModal('comments', items);
}

/* ---------- Reexportar funciones al window para que el HTML pueda usarlas ---------- */
window.openLinksFilter = openLinksFilter;
window.openCommentsFilter = openCommentsFilter;
window.onFilterListGo = onFilterListGo;
window.navigateToFilterIndex = navigateToFilterIndex;

function navigateToSeat(coachId, seatNum) {
    // Cerrar modal de filtro
    closeFilterModal();

    // Cambiar al coche correcto
    state.selectedCoach = coachId;

    // Re-renderizar para mostrar el coche
    render();

    // Esperar a que se renderice el DOM
    setTimeout(() => {
        // Buscar el asiento en el DOM
        const seats = document.querySelectorAll('.seat');
        let targetSeat = null;

        seats.forEach(seat => {
            const seatText = seat.textContent.trim();
            // Comparar solo números (eliminar PMR-, abreviaturas, etc.)
            const cleanSeatText = seatText.replace(/[^\d]/g, '');
            const cleanSeatNum = String(seatNum).replace(/[^\d]/g, '');

            if (cleanSeatText === cleanSeatNum || seatText.includes(String(seatNum))) {
                targetSeat = seat;
            }
        });

        if (targetSeat) {
            // Hacer scroll hasta el asiento
            targetSeat.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Añadir clase para parpadeo
            targetSeat.classList.add('seat-highlight');

            // Quitar la clase después de 3 segundos
            setTimeout(() => {
                targetSeat.classList.remove('seat-highlight');
            }, 3000);
        }
    }, 300);
}

function closeFilterModal(event) {
    closeGenericModal('.filter-modal', event);
}

// Toggle del menú de filtros
function toggleFiltersMenu() {
    const menu = document.getElementById('filters-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

function toggleCopyMode() {
    state.copyMode = !state.copyMode;

    let bannerText = state.copyMode ? "Copiado activado" : "Copiado desactivado";

    // Si está activando y hay datos copiados, mostrar resumen
    if (state.copyMode && lastCopiedSeatData) {
        const stopName = lastCopiedSeatData.stop ? lastCopiedSeatData.stop.abbr : "?";
        const flags = [];
        if (lastCopiedSeatData.enlace) flags.push("Enlace");
        if (lastCopiedSeatData.seguir) flags.push("Seguir");
        if (lastCopiedSeatData.comentarioFlag) flags.push("Comentario");

        const flagsText = flags.length > 0 ? ` (${flags.join(", ")})` : "";
        bannerText = `Copiado: ${stopName}${flagsText}`;
    }

    showCopyBanner(bannerText);
    render();
}

function showCopyBanner(text) {
    const banner = document.createElement("div");
    banner.className = "copy-banner";
    banner.textContent = text;
    document.body.appendChild(banner);

    setTimeout(() => banner.classList.add("show"), 10);
    setTimeout(() => banner.classList.remove("show"), 900);
    setTimeout(() => banner.remove(), 1200);
}

// Estado de la aplicación
let state = {
    selectedTrain: "463",
    selectedCoach: "C1",
    seatData: {},
    selectedSeat: null,
    searchQuery: "",
    trainDirection: {},
    darkMode: false,
    trainNumber: null,
    rotateSeats: false,
    currentStop: null,
    currentStopSearch: '',
    headerCollapsed: false,
    coachPositions: {},
    copyMode: false,
    serviceNotes: "",
    incidents: {},
    customTrains: {},
    coach470Variants: {
        "C1": "A",
        "C2": "A",
        "C3": "A"
    }
};

let isModalOpen = false;

// Obtener todos los trenes (predeterminados + personalizados)
function getAllTrains() {
    return { ...trainModels, ...state.customTrains };
}

let _currentScreen = "arrivals";
// Variables para doble tap en botones de coche 470
let coachTapTimer = null;
let coachLastTapTime = 0;
let coachLastTappedId = null;
// Última información copiada (para el modo copiar) - ahora copia TODO
let lastCopiedSeatData = null;

// Estado para filtros
let filterState = {
    active: false,
    type: null, // 'stop', 'route', 'seat'
    data: null
};

// Variables para long tap en asientos
let seatHoldTimer = null;
let seatHoldTriggered = false;
// Variables para detectar scroll vs tap
let touchStartX = 0;
let touchStartY = 0;
let isScrolling = false;

// Variables para mantener scroll del modal
// NOTA: También existe en src/utils/modal-helpers.js pero se necesita aquí
let modalScrollPosition = 0;

// Obtener clave del asiento
function getSeatKey(coachId, seatNum) {
    // 🔴 NUEVO: Para el 470, incluir la variante en la key
    if (state.selectedTrain === "470") {
        const variant = state.coach470Variants[coachId] || "A";
        return `${coachId}-${variant}-${String(seatNum)}`;
    }
    return `${coachId}-${String(seatNum)}`;
}

// Obtener layout del coche actual (con soporte para variantes del 470)
function getCurrentCoachLayout(coach) {
    if (state.selectedTrain === "470" && coach.variants) {
        const variant = state.coach470Variants[coach.id] || "A";
        return coach.variants[variant].layout;
    }
    return coach.layout;
}

function updateSeat(coachId, seatNum, stop) {
    const key = getSeatKey(coachId, String(seatNum));

    if (!state.seatData[key]) {
        state.seatData[key] = {};
    }

    // Guardar la parada en el asiento
    state.seatData[key].stop = stop;

    // 🔴 NUEVO: Guardar TODA la información del asiento (no solo la parada)
    lastCopiedSeatData = {
        stop: stop,
        enlace: state.seatData[key].enlace || false,
        seguir: state.seatData[key].seguir || false,
        comentarioFlag: state.seatData[key].comentarioFlag || false,
        comentario: state.seatData[key].comentario || ""
    };
    state.lastCopiedSeatData = { ...lastCopiedSeatData };

    saveData();

    // Cerrar modal
    state.selectedSeat = null;
    state.searchQuery = "";

    // IMPORTANTE: Guardar scroll ANTES de unlock
    const scrollToRestore = savedScrollPosition;

    unlockBodyScroll();
    render();

    // Restaurar el scroll que teníamos guardado del modal
    requestAnimationFrame(() => {
        window.scrollTo(0, scrollToRestore);
    });
}

function updateSeatFromList(abbr) {
    const stop = stops.find((s) => s.abbr === abbr);
    if (stop && state.selectedSeat) {
        updateSeat(state.selectedSeat.coach, state.selectedSeat.num, stop);

        // ❌ NO usar closeModal() (provoca scroll)
        // ✅ Cerrar modal sin mover pantalla
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();

        // Quitar estado del seat seleccionado
        state.selectedSeat = null;
    }
}

// Borrar asiento
function clearSeat(coachId, seatNum) {
    const key = getSeatKey(coachId, String(seatNum));
    const seatInfo = state.seatData[key];

    if (seatInfo) {
        // 🔴 NUEVO: Añadir parada actual al historial antes de borrar
        if (seatInfo.stop && seatInfo.stop.full) {
            if (!seatInfo.historial) {
                seatInfo.historial = [];
            }
            // Evitar duplicados
            if (!seatInfo.historial.includes(seatInfo.stop.full)) {
                seatInfo.historial.push(seatInfo.stop.full);
            }
        }

        // Borrar parada, flags y comentarios
        delete seatInfo.stop;
        delete seatInfo.enlace;
        delete seatInfo.seguir;
        delete seatInfo.comentarioFlag;
        delete seatInfo.comentario;

        // Si no queda historial, eliminar la key completamente
        if (!seatInfo.historial || seatInfo.historial.length === 0) {
            delete state.seatData[key];
        }
    }

// Capturar scroll antes de operaciones
    const scrollBeforeClear = window.scrollY || document.documentElement.scrollTop;

    saveData();
    state.selectedSeat = null;
    unlockBodyScroll();
    render();

// Restaurar scroll después
    requestAnimationFrame(() => {
        window.scrollTo(0, scrollBeforeClear);
    });

// Restaurar scroll DESPUÉS de render
    requestAnimationFrame(() => {
        window.scrollTo(0, currentScroll);
    });
}

function toggleFlag(coachId, seatNum, flagName) {
    const key = getSeatKey(coachId, seatNum);
    if (!state.seatData[key]) {
        state.seatData[key] = {};
    }
    state.seatData[key][flagName] = !state.seatData[key][flagName];

// Si desmarca comentarioFlag, borrar el comentario
    if (flagName === "comentarioFlag" && !state.seatData[key][flagName]) {
        delete state.seatData[key].comentario;
    }

    saveData();

// NO renderizar si estamos en medio de un long press
    if (seatHoldTimer) {
        return;
    }

    // 🔴 NUEVO: Si estamos en modo copia, actualizar la información copiada
    if (state.copyMode && lastCopiedSeatData) {
        lastCopiedSeatData[flagName] = state.seatData[key][flagName];
        state.lastCopiedSeatData = { ...lastCopiedSeatData };
    }

    saveData();
// Si hay modal abierto, guardar su scroll
    if (state.selectedSeat) {
        saveModalScrollPosition();
    } else {
        // Si no hay modal, guardar scroll de página
        const pageScroll = window.scrollY || document.documentElement.scrollTop;
        window._pageScrollBeforeRender = pageScroll;
    }

    render();

// Restaurar scroll apropiado
    if (state.selectedSeat) {
        restoreModalScrollPosition();
    } else if (window._pageScrollBeforeRender !== undefined) {
        requestAnimationFrame(() => {
            window.scrollTo(0, window._pageScrollBeforeRender);
        });
    }
}

function updateComment(coachId, seatNum, comment) {
    const key = getSeatKey(coachId, seatNum);
    if (!state.seatData[key]) {
        state.seatData[key] = {};
    }
    state.seatData[key].comentario = comment;

    // 🔴 NUEVO: Si estamos en modo copia, actualizar la información copiada
    if (state.copyMode && lastCopiedSeatData) {
        lastCopiedSeatData.comentario = comment;
        state.lastCopiedSeatData = { ...lastCopiedSeatData };
    }

    saveData();
}

function deleteComment(coachId, seatNum) {
    const key = getSeatKey(coachId, seatNum);
    if (state.seatData[key]) {
        delete state.seatData[key].comentario;
        state.seatData[key].comentarioFlag = false;
    }
    saveData();

    // Guardar posición del scroll antes de renderizar
    saveModalScrollPosition();
    render();
    // Restaurar posición del scroll después de renderizar
    restoreModalScrollPosition();
}

function toggleDirection(coachId) {
    // Obtener dirección actual del coche seleccionado
    const current = state.trainDirection[coachId] || "up";
    const newDirection = current === "up" ? "down" : "up";

    // Aplicar la misma dirección a TODOS los coches del tren actual
    const currentTrain = trainModels[state.selectedTrain];
    currentTrain.coaches.forEach(coach => {
        state.trainDirection[coach.id] = newDirection;
    });

    localStorage.setItem(
        `train${state.selectedTrain}Direction`,
        JSON.stringify(state.trainDirection)
    );
    render();
}

// Obtener texto del lado de la puerta según rotación
function getDoorSideText(side) {
    // side puede ser "L" (Left) o "R" (Right)
    // Si los asientos están rotados, invertimos los nombres
    if (state.rotateSeats) {
        return side === 'L' ? 'Derecha' : 'Izquierda';
    } else {
        return side === 'L' ? 'Izquierda' : 'Derecha';
    }
}

function selectTrain(trainId) {
    if (trainModels[trainId]) {
        state.selectedTrain = trainId;

        // 🔴 NUEVO: Manejar correctamente el primer coche
        const firstCoach = trainModels[trainId].coaches[0];
        state.selectedCoach = firstCoach.id;

        state.seatData = {};
        state.trainDirection = {};
        state.selectedSeat = null;
        state.searchQuery = "";
        state.coachPositions = {};
        state.incidents = {};

        localStorage.setItem("selectedTrain", trainId);

        // Cargar datos del nuevo tren
        const saved = localStorage.getItem(`train${trainId}Data`);
        if (saved) {
            try {
                state.seatData = JSON.parse(saved);
            } catch (e) {
                console.error("Error loading data");
            }
        }

        const savedDirection = localStorage.getItem(`train${trainId}Direction`);
        if (savedDirection) {
            try {
                state.trainDirection = JSON.parse(savedDirection);
            } catch (e) {
                console.error("Error loading direction");
            }
        }

// 🔴 NUEVO: Cargar variantes del 470 si es ese tren
        if (trainId === "470") {
            const saved470Variants = localStorage.getItem('coach470Variants');
            if (saved470Variants) {
                try {
                    state.coach470Variants = JSON.parse(saved470Variants);
                } catch (e) {
                    console.error("Error loading 470 variants");
                    // Valores por defecto si hay error
                    state.coach470Variants = {
                        "C1": "A",
                        "C2": "A",
                        "C3": "A"
                    };
                }
            } else {
                // Inicializar con valores por defecto
                state.coach470Variants = {
                    "C1": "A",
                    "C2": "A",
                    "C3": "A"
                };
            }

            // 🔴 NUEVO: Migrar datos antiguos sin variante a formato con variante
            const newSeatData = {};
            Object.keys(state.seatData).forEach(key => {
                // Si la key no tiene variante (formato antiguo: C1-12)
                if (key.match(/^C\d+-\d+/) || key.match(/^C\d+-[A-Z0-9]+$/)) {
                    const parts = key.split('-');
                    if (parts.length === 2) {
                        const [coach, seat] = parts;
                        // Migrar a variante A por defecto
                        const newKey = `${coach}-A-${seat}`;
                        newSeatData[newKey] = state.seatData[key];
                    } else {
                        // Ya tiene formato con variante
                        newSeatData[key] = state.seatData[key];
                    }
                } else {
                    // Mantener otras keys sin cambios
                    newSeatData[key] = state.seatData[key];
                }
            });
            state.seatData = newSeatData;
            saveData(); // Guardar la migración
        }

        render();
    }
    // Reiniciar backup automático para el nuevo tren
    startAutoBackup();
    // Cerrar el menú después de cambiar de tren
    setTimeout(() => {
        const selector = document.getElementById('train-selector');
        if (selector && !selector.classList.contains('hidden')) {
            selector.classList.add('hidden');
        }
    }, 50);
}

function toggleTrainSelector() {
    const selector = document.getElementById("train-selector");
    if (selector) {
        selector.classList.toggle("hidden");
    }
}

function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    localStorage.setItem("darkMode", state.darkMode);
    document.body.classList.toggle("dark-mode", state.darkMode);
    render(); // 🔥 Esto vuelve a pintar el header con el nuevo icono
}

function toggleSeatRotation() {
    // Cambiar el estado
    state.rotateSeats = !state.rotateSeats;
    localStorage.setItem("rotateSeats", state.rotateSeats);

    // Aplicar o quitar clase visual
    const container = document.querySelector('.seats-container');
    if (container) {
        container.classList.toggle('rotated', state.rotateSeats);
    }

    // Volver a renderizar (esto actualizará las flechas)
    render();
}

function showTrainNumberPrompt() {
    const currentNumber = state.trainNumber || '';
    const input = prompt('Introduce el número de tren:', currentNumber);

    if (input === null) return; // canceló

    const trimmed = input.trim();
    if (trimmed === '') {
        alert('Por favor, introduce un número de tren válido');
        return;
    }

    // Si el número es distinto del actual, mostrar confirmación
    if (trimmed !== state.trainNumber) {
        // Verificar si está en la lista
        const isKnown = trainNumbers[trimmed];

        let confirmMessage = `¿Cambiar al tren número ${trimmed}?\n\n`;
        confirmMessage += '⚠️ ESTO BORRARÁ:\n';
        confirmMessage += '• Todos los asientos registrados\n';
        confirmMessage += '• Notas del servicio\n';
        confirmMessage += '• Incidencias\n';
        confirmMessage += '• Parada actual\n';
        confirmMessage += '• Direcciones del tren\n';
        confirmMessage += '• Backups automáticos\n\n';

        if (!isKnown) {
            confirmMessage += '⚠️ Este número no está en la lista.\n';
            confirmMessage += '(No se aplicará esquina doblada automáticamente)\n\n';
        }

        confirmMessage += '¿Continuar?';

        if (!confirm(confirmMessage)) return;

        // --- BORRAR TODOS LOS DATOS ---
        state.seatData = {};
        state.trainDirection = {};
        state.serviceNotes = "";
        state.incidents = {};
        state.currentStop = null; // 👈 BORRAR PARADA ACTUAL
        lastCopiedSeatData = null;
        state.lastCopiedSeatData = null;

        // Eliminar de localStorage
        try {
            localStorage.removeItem(`train${state.selectedTrain}Data`);
            localStorage.removeItem(`train${state.selectedTrain}Direction`);
            localStorage.removeItem(`train${state.selectedTrain}Notes`);
            localStorage.removeItem(`train${state.selectedTrain}Incidents`);
            localStorage.removeItem(`train${state.selectedTrain}CopiedData`);
            localStorage.removeItem('currentStop'); // 👈 BORRAR PARADA ACTUAL
            localStorage.removeItem(`autoBackups_${state.selectedTrain}`);
        } catch (e) {
            console.warn('Error al eliminar datos de localStorage', e);
        }

        // Guardar estado limpio
        saveData();
    }

    // Actualizar número de tren
    state.trainNumber = trimmed;
    try {
        localStorage.setItem('trainNumber', trimmed);
    } catch (e) {
        console.warn('No se pudo guardar trainNumber en localStorage', e);
    }

    // Re-renderizar
    render();
}

function getTrainFinalStops() {
    if (!state.trainNumber) return [];
    return trainNumbers[state.trainNumber] || [];
}

function applyCurrentStopChange(stopName, route, stopIndex) {
    // Guardar parada actual
    state.currentStop = stopName;
    localStorage.setItem('currentStop', stopName);

    // Obtener todas las paradas hasta la actual (inclusive)
    const stopsToDelete = route.slice(0, stopIndex + 1);

    // Recorrer todos los asientos y borrar los que tengan paradas anteriores
    let deletedCount = 0;
    Object.keys(state.seatData)
        .forEach(key => {
            const seatInfo = state.seatData[key];
            if (seatInfo && seatInfo.stop) {
                if (stopsToDelete.includes(seatInfo.stop.full)) {
                    // Guardar en historial antes de borrar
                    if (!seatInfo.historial) {
                        seatInfo.historial = [];
                    }
                    // 🔴 NUEVO: Evitar duplicados en el historial
                    if (!seatInfo.historial.includes(seatInfo.stop.full)) {
                        seatInfo.historial.push(seatInfo.stop.full);
                    }

                    // Borrar parada y flags (mantener comentarios por ahora)
                    delete seatInfo.stop;
                    delete seatInfo.enlace;
                    delete seatInfo.seguir;
                    // Mantener: comentario, comentarioFlag, historial

                    deletedCount++;
                }
            }
        });

    saveData();
    state.currentStopSearch = '';
    render();

    alert(`Parada actual: ${stopName}\n${deletedCount} asiento(s) liberado(s)`);
}

function setCurrentStop(stopName) {
    if (!state.trainNumber || !trainRoutes[state.trainNumber]) {
        alert('Primero debes seleccionar un número de tren válido');
        return;
    }

    const route = trainRoutes[state.trainNumber];
    const stopIndex = route.indexOf(stopName);

    if (stopIndex === -1) {
        alert('Esta parada no está en la ruta del tren ' + state.trainNumber);
        return;
    }

    // Calcular cuántos asientos se liberarán
    const stopsToDelete = route.slice(0, stopIndex + 1);
    let seatsToDelete = 0;

    Object.keys(state.seatData).forEach(key => {
        const seatInfo = state.seatData[key];
        if (seatInfo && seatInfo.stop && stopsToDelete.includes(seatInfo.stop.full)) {
            seatsToDelete++;
        }
    });

    // Verificar si estamos yendo hacia una parada anterior
    const previousStop = state.currentStop || null;
    const isGoingBackwards = previousStop && route.indexOf(previousStop) > stopIndex;

    // Construir mensaje de confirmación
    let confirmMessage = `¿Cambiar parada actual a "${stopName}"?\n\n`;

    if (isGoingBackwards) {
        confirmMessage += `⚠️ Esta parada es ANTERIOR a la actual ("${previousStop}").\n\n`;
    }

    if (seatsToDelete > 0) {
        confirmMessage += `Se liberarán ${seatsToDelete} asiento(s) de paradas anteriores.\n\n`;
    } else {
        confirmMessage += `No se liberarán asientos.\n\n`;
    }

    confirmMessage += '¿Continuar?';

    // Mostrar confirmación SIEMPRE
    showConfirmModal(
        confirmMessage,
        () => {
            // ACEPTAR → aplicar el cambio
            applyCurrentStopChange(stopName, route, stopIndex);
        },
        () => {
            // CANCELAR → no hacer nada
            state.currentStopSearch = '';
            render();
        }
    );
}

function getCurrentRoute() {
    if (!state.trainNumber) return [];
    return trainRoutes[state.trainNumber] || [];
}

function filterCurrentStops() {
    const query = state.currentStopSearch.toLowerCase();
    const route = getCurrentRoute();
    return route.filter(stop => stop.toLowerCase()
        .includes(query));
}

function updateCurrentStopSearch(value) {
    state.currentStopSearch = value;

    // Buscar el contenedor del selector
    const container = document.querySelector('.current-stop-selector');
    if (!container) return;

    // Eliminar dropdown anterior si existe
    const oldDropdown = container.querySelector('.current-stop-dropdown');
    if (oldDropdown) {
        oldDropdown.remove();
    }

    // Si hay texto y resultados, crear nuevo dropdown
    const filtered = filterCurrentStops();
    if (value && filtered.length > 0) {
        const dropdownHTML = `
            <div class="current-stop-dropdown">
                ${filtered.slice(0, 5).map(stop => `
                    <button class="stop-option" onclick="setCurrentStop('${stop}')">
                        ${stop}
                    </button>
                `).join('')}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', dropdownHTML);
        const dd = container.querySelector('.current-stop-dropdown');
        if (dd) {
            // Bloquea propagación normal
            dd.addEventListener(
                'wheel',
                (e) => {
                    // Lógica para evitar scroll “de fuga” al llegar al borde
                    const atTop = dd.scrollTop === 0;
                    const atBottom =
                        dd.scrollHeight - dd.clientHeight === Math.ceil(dd.scrollTop);

                    if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
                        e.preventDefault();      // Evitar desplazamiento de fondo
                    }
                    e.stopPropagation();
                },
                { passive: false }
            );

            dd.addEventListener(
                'touchmove',
                (e) => {
                    const atTop = dd.scrollTop === 0;
                    const atBottom =
                        dd.scrollHeight - dd.clientHeight === Math.ceil(dd.scrollTop);

                    const touch = e.touches[0];
                    const deltaY = (dd._lastTouchY || touch.clientY) - touch.clientY;
                    dd._lastTouchY = touch.clientY;

                    if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
                        e.preventDefault();
                    }
                    e.stopPropagation();
                },
                { passive: false }
            );
        }


    }
}

function toggleHeaderCollapse() {
    state.headerCollapsed = !state.headerCollapsed;
    localStorage.setItem('headerCollapsed', state.headerCollapsed);
    render();
}

function openAbout() {
    const aboutHTML = `
        <div class="modal-overlay" onclick="closeAbout(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Acerca de</h3>
                        <button class="close-btn" onclick="closeAbout()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="about-content">
                    <p><strong>Navirea v1.0</strong></p>
                    <p>Creado por Adrián Fernández,</p>
<p>y publicado bajo la licencia MIT.</p>
                    <p>Dudas o sugerencias a:<br><a href="mailto:plantillatren@gmail.com">plantillatren@gmail.com</a></p>
                    <br>
                    <p><b>Proyecto no oficial ni afiliado con ADIF o RENFE, con propósito educacional. Las pantallas de las estaciones muestran contenido servido directamente por ADIF. Marca, logotipos y datos mostrados en el panel son propiedad de ADIF.</b></p>
                    <p><b>El Manual Técnico Ferroviario es un proyecto creado por José Luis Domínguez y Juan Pablo Romero.</b></p>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeAbout()">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', aboutHTML);
    lockBodyScroll();
}

// Abrir modal de README / Guía de uso
function openReadmeModal() {
    const readmeContent = `
# 📘 Guía Completa de Uso – Navirea

Navirea es una herramienta diseñada para ayudar a los interventores a gestionar la ocupación del tren, el seguimiento del recorrido y las incidencias del servicio de forma clara, rápida y visual.

---

## 🚆 1. Vista general

- Distribución real del tren: coches, pasillos, PMR, mesas.
- Indicador de **dirección del tren** (con opción de invertirla).
- Barra superior con herramientas principales.
- Plantilla táctil desplazable.
- Menú “Más opciones” con funciones avanzadas.

---

## 🟦 2. Selección del tren

- Selecciona el modelo (463, 464, 465, 470, 499).
- Introduce el número de venta.
- La plantilla se cargará automáticamente.

### 🔧 Variantes (serie 470)

- Doble pulsación en el botón del coche → seleccionar variante adecuada.

---

## 🟩 3. Gestión básica de asientos

### 🎫 Marcar asiento como ocupado

- Toca un asiento libre.
- Introduce la parada final.
- Guarda.

### ⚡ Asignación rápida (pulsación larga)

- Mantén pulsado un asiento libre → asigna la *última parada* automáticamente.

### 🔁 Modificar parada

- Tocar → cambiar parada final.

### 🧹 Liberar asiento (4 formas)

- Tocar → “Liberar”.
- Cambiar la parada actual.
- Botón de liberado rápido.
- Pulsación larga → borrado rápido.

---

## 🔎 4. Herramientas avanzadas

### ✨ Copiado rápido

- Activar interruptor.
- Marcar primer asiento.
- Los siguientes copiarán destino, enlace, comentario y destacado.

### 🔗 Enlace

- Tocar → activar “Enlace”.

### ⭐ Seguir por aquí

- Destaca un asiento importante.

### 📝 Notas

- Tocar asiento.
- Pulsar “Comentario”.
- Escribir y guardar.

### 🕘 Historial del asiento

- Ver cambios recientes y usos anteriores.

---

## 🛤️ 5. Parada actual del tren

- Introducir la parada actual.
- Navirea libera automáticamente viajeros que bajan ahí.
- Se muestra cuántos asientos se liberarán.

---

## 💼 6. Gestión del servicio

### ⚠️ Incidencias

Registrar fallos de: WC, puertas, megafonía, PMR, equipos eléctricos…

### 📒 Notas del servicio

Notas internas del turno.

### ⏱ Pantallas de estaciones en tiempo real

Consultar retrasos, conexiones, horarios actualizados.

### 🔧 Manual Técnico Ferroviario

Guía externa para resolver:
- Climatización  
- Puertas  
- Megafonía  
- WC  
- Problemas eléctricos  

---

## 🌓 7. Opciones de visualización

### 🌙 Modo nocturno

Reduce brillo y contraste.

### 🔄 Girar plantilla

Ideal si trabajas en sentido contrario al tren.

---

## 🔧 8. Filtros y búsqueda

- Filtrar por parada final.
- Filtrar por tramo.
- Filtrar por enlace.
- Filtrar por notas.
- Buscar asiento → la pantalla se desplaza al asiento y lo resalta.

---

## 📊 9. Ocupación por coche

- Mantener pulsado un coche → ver:
  - % de ocupación  
  - Asientos libres  
  - Asientos ocupados  

---

## 📤 10. Guardado y trabajo en equipo

### 💾 Guardar JSON

Guardar estado completo del tren.

### 📲 Compartir QR

Transferir el estado a otro interventor.

### 🔄 Backup automático

Navirea recuerda siempre el último estado.

---

## 🎯 11. Consejos prácticos

- Usa **copiado rápido** para grupos.  
- Marca **enlace** cuanto antes.  
- Mantén actualizada la **parada actual**.  
- Usa “Seguir por aquí” en viajeros relevantes.  
- Filtra por parada al acercarte a estaciones grandes.  
- Gira la plantilla si estás orientado al contrario.  
- Consulta el **Manual Técnico Ferroviario** ante incidencias.  
- Guarda estado antes del relevo.

FIN DE LA GUÍA.
    `;

    const modalHTML = `
        <div class="modal-overlay readme-overlay" onclick="closeReadmeModal(event)">
            <div class="modal readme-modal" onclick="event.stopPropagation()">
                <div class="modal-header readme-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">📖 Guía de uso</h3>
                        <button class="close-btn" onclick="closeReadmeModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="readme-content" id="readme-content">
                    ${parseMarkdown(readmeContent)}
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    lockBodyScroll();
}

// Abrir Manual Técnico embebido
function openManualTecnico() {
    const modalHTML = `
        <div class="modal-overlay manual-overlay" onclick="closeManualTecnico(event)">
            <div class="modal manual-modal" onclick="event.stopPropagation()">
                <div class="modal-header manual-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">📚 Manual Técnico de Trenes</h3>
                        <button class="close-btn" onclick="closeManualTecnico()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="manual-content">
                    <iframe 
                        src="https://manualtreneszgz.netlify.app/" 
                        class="manual-iframe"
                        title="Manual Técnico de Trenes"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        loading="lazy">
                    </iframe>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    lockBodyScroll();
}

// Cerrar Manual Técnico
function closeManualTecnico(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.manual-overlay');
        if (overlay) overlay.remove();
    }

    if (!document.querySelector('.modal-overlay')) {
        unlockBodyScroll();
    }
}

// Cerrar modal de README
function closeReadmeModal(event) {
    closeGenericModal('.readme-overlay', event);
}


function closeAbout(event) {
    closeGenericModal('.about-modal', event);
}

function openServiceNotes() {
    const notesHTML = `
        <div class="modal-overlay" onclick="closeServiceNotes(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Notas del servicio</h3>
                        <button class="close-btn" onclick="closeServiceNotes()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="about-content">
                    <textarea 
                        id="service-notes-textarea"
                        class="service-notes-textarea"
                        placeholder="Escribe aquí tus notas sobre el servicio..."
                        oninput="updateServiceNotes(this.value)"
                    >${state.serviceNotes || ""}</textarea>
                </div>
                <div class="modal-footer">
                    ${state.serviceNotes ? `
                        <button class="clear-btn delete-btn" onclick="clearServiceNotes()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 4px;">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Borrar notas
                        </button>
                    ` : ''}
                    <button class="clear-btn" onclick="closeServiceNotes()">Cerrar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', notesHTML);
    lockBodyScroll();

    // Enfocar el textarea
    setTimeout(() => {
        const textarea = document.getElementById('service-notes-textarea');
        if (textarea) textarea.focus();
    }, 100);
}

function updateServiceNotes(value) {
    state.serviceNotes = value;
    saveData();

    // Actualizar header para mostrar/ocultar badge
    const headerElement = document.querySelector('.header');
    if (headerElement) {
        const notesBtn = headerElement.querySelector('[onclick="openServiceNotes()"]');
        if (notesBtn) {
            if (value && value.trim()) {
                notesBtn.classList.add('has-notes');
                if (!notesBtn.querySelector('.notes-badge')) {
                    notesBtn.insertAdjacentHTML('beforeend', '<span class="notes-badge"></span>');
                }
            } else {
                notesBtn.classList.remove('has-notes');
                const badge = notesBtn.querySelector('.notes-badge');
                if (badge) badge.remove();
            }
        }
    }
}

function clearServiceNotes() {
    if (confirm('¿Seguro que quieres borrar todas las notas del servicio?')) {
        state.serviceNotes = "";
        saveData();
        closeServiceNotes();
        render(); // Actualizar para quitar el badge
    }
}

function closeServiceNotes(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();
    }

    if (!document.querySelector('.modal-overlay')) {
        unlockBodyScroll();
    }
}

// Obtener clave de incidencia
function getIncidentKey(coachId, elementId) {
    // Para tren 470: incluir variante en la key
    if (state.selectedTrain === "470") {
        const variant = state.coach470Variants[coachId] || "A";
        return `${coachId}-${variant}-${elementId}`;
    }
    return `${coachId}-${elementId}`;
}

// Toggle incidencia (marcar/desmarcar)
function toggleIncident(coachId, elementId, elementType) {
    const key = getIncidentKey(coachId, elementId);

    if (state.incidents[key]) {
        // Ya existe, borrar
        delete state.incidents[key];
    } else {
        // Crear nueva incidencia
        state.incidents[key] = {
            type: elementType,
            broken: true,
            note: ""
        };
    }

    saveData();
    render();
}

// Abrir modal para añadir nota a incidencia
function openIncidentNote(coachId, elementId, elementType, elementLabel) {
    const key = getIncidentKey(coachId, elementId);
    const incident = state.incidents[key] || { type: elementType, broken: true, note: "" };

    const modalHTML = `
        <div class="modal-overlay" onclick="closeIncidentNote(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Incidencia: ${elementLabel}</h3>
                        <button class="close-btn" onclick="closeIncidentNote()">
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
                            onclick="saveIncidentNote('${coachId}', '${elementId}', '${elementType}')">
                        Guardar
                    </button>
                    <button class="clear-btn" onclick="closeIncidentNote()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    lockBodyScroll();

    setTimeout(() => {
        const textarea = document.getElementById('incident-note-textarea');
        if (textarea) textarea.focus();
    }, 100);
}

// Guardar nota de incidencia
function saveIncidentNote(coachId, elementId, elementType) {
    const textarea = document.getElementById('incident-note-textarea');
    const note = textarea ? textarea.value : "";

    const key = getIncidentKey(coachId, elementId);

    if (!state.incidents[key]) {
        state.incidents[key] = {
            type: elementType,
            broken: true,
            note: note
        };
    } else {
        state.incidents[key].note = note;
    }

    saveData();
    closeIncidentNote();
    render();
}

// Cerrar modal de nota de incidencia
function closeIncidentNote(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();
    }

    if (!document.querySelector('.modal-overlay')) {
        unlockBodyScroll();
    }
}

// Abrir panel de incidencias (resumen)
function openIncidentsPanel() {
    const incidentCount = Object.keys(state.incidents).length;

    if (incidentCount === 0) {
        alert('No hay incidencias registradas actualmente.');
        return;
    }

    // Agrupar por coche
// Agrupar por coche (y variante para 470)
    const byCoach = {};
    Object.keys(state.incidents).forEach(key => {
        const parts = key.split('-');
        let groupKey = parts[0]; // coachId

        // Para 470: agrupar por coche-variante
        if (state.selectedTrain === "470" && parts.length > 2) {
            groupKey = `${parts[0]} (Variante ${parts[1]})`;
        }

        if (!byCoach[groupKey]) byCoach[groupKey] = [];
        byCoach[groupKey].push({ key, data: state.incidents[key] });
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
            const skipVariant = state.selectedTrain === "470" && parts.length > 2;
            let label = skipVariant ? parts.slice(2).join('-') : parts.slice(1).join('-');

// Mejorar formato del label
            if (label.includes('D') && (label.includes('-L') || label.includes('-R'))) {
                // Es una puerta (ej: "D1-L" o "D2-R")
                const doorMatch = label.match(/D(\d+)-(L|R)/);
                if (doorMatch) {
                    const doorNum = doorMatch[1];
                    const side = getDoorSideText(doorMatch[2]); // 👈 USA LA FUNCIÓN
                    label = `Puerta ${doorNum} - ${side}`;
                }
            } else if (label === 'PMR-WC') {
                label = 'Baño PMR';
            } else if (label.startsWith('WC')) {
                // WC individual
                label = `WC ${label.replace('WC', '')}`;
            }
            const typeLabel = data.type === 'door' ? '🚪' : '🚽';
            incidentsHTML += `
                <div class="incident-item">
                    <span>${typeLabel} ${label}</span>
                    ${data.note ? `<small style="color: #6b7280;">${data.note}</small>` : ''}
                    <button class="incident-remove-btn" onclick="removeIncident('${key}')">×</button>
                </div>
            `;
        });
        incidentsHTML += `</div>`;
    });

    const modalHTML = `
        <div class="modal-overlay" onclick="closeIncidentsPanel(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Incidencias registradas (${incidentCount})</h3>
                        <button class="close-btn" onclick="closeIncidentsPanel()">
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
                    <button class="clear-btn delete-btn" onclick="clearAllIncidents()">
                        Borrar todas las incidencias
                    </button>
                    <button class="clear-btn" onclick="closeIncidentsPanel()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    lockBodyScroll();
}

// Cerrar panel de incidencias
function closeIncidentsPanel(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();
    }

    if (!document.querySelector('.modal-overlay')) {
        unlockBodyScroll();
    }
}

// Eliminar una incidencia específica
function removeIncident(key) {
    delete state.incidents[key];
    saveData();

    // 🔴 NO cerrar el panel, solo refrescar su contenido
    const incidentCount = Object.keys(state.incidents).length;

    if (incidentCount === 0) {
        // Si no quedan incidencias, cerrar el panel
        closeIncidentsPanel();
        render();
        return;
    }

    // Reagrupar por coche
    const byCoach = {};
    Object.keys(state.incidents).forEach(k => {
        const [coachId] = k.split('-');
        if (!byCoach[coachId]) byCoach[coachId] = [];
        byCoach[coachId].push({ key: k, data: state.incidents[k] });
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
            const skipVariant = state.selectedTrain === "470" && parts.length > 2;
            let label = skipVariant ? parts.slice(2).join('-') : parts.slice(1).join('-');

            // Mejorar formato del label
            if (label.includes('D') && (label.includes('-L') || label.includes('-R'))) {
                const doorMatch = label.match(/D(\d+)-(L|R)/);
                if (doorMatch) {
                    const doorNum = doorMatch[1];
                    const side = getDoorSideText(doorMatch[2]); // 👈 USA LA FUNCIÓN
                    label = `Puerta ${doorNum} - ${side}`;
                }
            } else if (label.startsWith('WC-')) {
                // Es un grupo de WC (ej: "WC-A")
                label = `Grupo de WC ${label.replace('WC-', '')}`;
            } else if (label === 'PMR-WC') {
                label = 'Baño PMR';
            } else if (label.startsWith('WC')) {
                // WC individual
                label = `WC ${label.replace('WC', '')}`;
            }

            const typeLabel = data.type === 'door' ? '🚪' : '🚽';
            incidentsHTML += `
                <div class="incident-item">
                    <span>${typeLabel} ${label}</span>
                    ${data.note ? `<small style="color: #6b7280;">${data.note}</small>` : ''}
                    <button class="incident-remove-btn" onclick="removeIncident('${k}')">×</button>
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
    render();
}

// Borrar todas las incidencias
function clearAllIncidents() {
    if (confirm('¿Seguro que quieres borrar todas las incidencias?')) {
        state.incidents = {};
        saveData();
        closeIncidentsPanel();
        render();
    }
}

// Variables para long press en puertas/WC
let doorHoldTimer = null;
let doorHoldTriggered = false;

function handleDoorPress(coachId, elementId, elementType, elementLabel, event) {
    // NO prevenir el evento por defecto para permitir scroll
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

function handleDoorRelease(event) {
    event.stopPropagation();

    clearTimeout(doorHoldTimer);

    if (!doorHoldTriggered) {
        // Tap simple: solo activar si fue RÁPIDO (menos de 200ms)
        const button = event.currentTarget;
        const elementId = button.dataset.doorId || button.dataset.wcId;
        const elementType = button.dataset.doorId ? 'door' : 'wc';

        const tapDuration = Date.now() - (button._tapStart || 0);

        if (elementId && tapDuration < 100) {
            event.preventDefault(); // Solo prevenir si vamos a activar

            toggleIncident(state.selectedCoach, elementId, elementType);

            // Mantener scroll
            const scrollPosition = window.scrollY || document.documentElement.scrollTop;
            isLongPressActive = false;
            render();
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollPosition);
            });
        }
    }

    doorHoldTriggered = false;
    delete event.currentTarget._tapStart; // Limpiar
}

function handleDoorCancel(event) {
    clearTimeout(doorHoldTimer);
    doorHoldTriggered = false;

    // Limpiar timestamp
    if (event && event.currentTarget) {
        delete event.currentTarget._tapStart;
    }
}

function exportTurn() {
    const turnData = {
        trainModel: state.selectedTrain,
        seatData: state.seatData,
        trainDirection: state.trainDirection,
        serviceNotes: state.serviceNotes || "",  // 👈 AÑADIR
        incidents: state.incidents || {},        // 👈 AÑADIR
        trainNumber: state.trainNumber || null,  // 👈 AÑADIR (útil para contexto)
        currentStop: state.currentStop || null,  // 👈 AÑADIR (útil para contexto)
        exportDate: new Date().toISOString(),
        trainName: trainModels[state.selectedTrain].name,
        // 🔴 NUEVO: Si es tren 470, incluir variantes
        ...(state.selectedTrain === "470" && {
            coach470Variants: state.coach470Variants
        })
    };

    const dataStr = JSON.stringify(turnData, null, 2);
    const dataBlob = new Blob([dataStr], {
        type: "application/json"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);

    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(date.getHours()).padStart(2, "0")}-${String(
        date.getMinutes()
    ).padStart(2, "0")}`;

    // 🔴 MEJORAR: Incluir número de tren en el nombre si existe
    const trainNumPart = state.trainNumber ? `-${state.trainNumber}` : '';
    link.download = `turno-${state.selectedTrain}${trainNumPart}-${dateStr}-${timeStr}.json`;

    link.click();

    URL.revokeObjectURL(link.href);
}

function importTurn() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const turnData = JSON.parse(event.target.result);

                // Verificar que el archivo sea válido
                if (!turnData.trainModel || !trainModels[turnData.trainModel]) {
                    alert(
                        "Archivo de turno no válido o modelo de tren no reconocido"
                    );
                    return;
                }

                // Preparar mensaje de confirmación con detalles
                const trainName = turnData.trainName || turnData.trainModel;
                const exportDate = turnData.exportDate ?
                    new Date(turnData.exportDate).toLocaleString("es-ES") :
                    "desconocida";

                const trainNum = turnData.trainNumber ? `\nNúmero de tren: ${turnData.trainNumber}` : '';
                const currentStop = turnData.currentStop ? `\nParada actual: ${turnData.currentStop}` : '';
                const notesPreview = turnData.serviceNotes ? '\n✓ Incluye notas del servicio' : '';
                const incidentsCount = turnData.incidents ? Object.keys(turnData.incidents).length : 0;
                const incidentsPreview = incidentsCount > 0 ? `\n✓ Incluye ${incidentsCount} incidencia(s)` : '';

                if (
                    confirm(
                        `¿Importar turno del ${trainName}?` +
                        `\nFecha de exportación: ${exportDate}` +
                        trainNum +
                        currentStop +
                        notesPreview +
                        incidentsPreview +
                        `\n\nEsto reemplazará los datos actuales de este tren.`
                    )
                ) {
                    // Cambiar al tren correcto si es necesario
                    if (state.selectedTrain !== turnData.trainModel) {
                        state.selectedTrain = turnData.trainModel;
                        state.selectedCoach =
                            trainModels[turnData.trainModel].coaches[0].id;
                        localStorage.setItem(
                            "selectedTrain",
                            turnData.trainModel
                        );
                    }

                    // Importar datos de asientos
                    state.seatData = turnData.seatData || {};

                    // Importar direcciones del tren
                    state.trainDirection = turnData.trainDirection || {};

                    // 🔴 NUEVO: Importar notas del servicio
                    state.serviceNotes = turnData.serviceNotes || "";

                    // 🔴 NUEVO: Importar incidencias
                    state.incidents = turnData.incidents || {};

                    // 🔴 NUEVO: Importar número de tren si existe
                    if (turnData.trainNumber) {
                        state.trainNumber = turnData.trainNumber;
                        localStorage.setItem('trainNumber', turnData.trainNumber);
                    }

                    // 🔴 NUEVO: Importar parada actual si existe
                    if (turnData.currentStop) {
                        state.currentStop = turnData.currentStop;
                        localStorage.setItem('currentStop', turnData.currentStop);
                    }

                    // 🔴 NUEVO: Si es tren 470, importar variantes
                    if (turnData.trainModel === "470" && turnData.coach470Variants) {
                        state.coach470Variants = turnData.coach470Variants;
                        localStorage.setItem('coach470Variants', JSON.stringify(turnData.coach470Variants));
                    }

                    // Guardar todo en localStorage
                    localStorage.setItem(
                        `train${state.selectedTrain}Data`,
                        JSON.stringify(state.seatData)
                    );
                    localStorage.setItem(
                        `train${state.selectedTrain}Direction`,
                        JSON.stringify(state.trainDirection)
                    );
                    localStorage.setItem(
                        `train${state.selectedTrain}Notes`,
                        state.serviceNotes
                    );
                    localStorage.setItem(
                        `train${state.selectedTrain}Incidents`,
                        JSON.stringify(state.incidents)
                    );

                    // Recargar vista
                    render();

                    alert("Turno importado correctamente");
                }
            } catch (error) {
                alert(
                    "Error al leer el archivo. Asegúrate de que sea un archivo de turno válido."
                );
                console.error("Error importing turn:", error);
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

// Borrar todos los datos
function clearAllData() {
    if (confirm("¿Seguro que quieres borrar todos los datos?")) {
        // limpiar datos en memoria
        state.seatData = {};
        state.coachPositions = {};
        state.currentStop = null;
        state.serviceNotes = "";
        state.incidents = {};

        // guardar en localStorage
        saveData();

        // eliminar entradas específicas
        localStorage.removeItem('currentStop');
        localStorage.removeItem(`train${state.selectedTrain}Notes`);
        localStorage.removeItem(`train${state.selectedTrain}Incidents`);
        localStorage.removeItem(`train${state.selectedTrain}CopiedData`);

        // 👈 NUEVO: Borrar backups automáticos
        localStorage.removeItem(`autoBackups_${state.selectedTrain}`);

        // refrescar UI
        render();

        alert('Todos los datos han sido borrados, incluyendo backups automáticos.');
    }
}

// Filtrar paradas
function getFilteredStops() {
    const query = state.searchQuery.toLowerCase();

    // Si hay número de tren, filtrar solo las paradas de esa ruta
    let availableStops = stops;
    if (state.trainNumber && trainRoutes[state.trainNumber]) {
        const routeStops = trainRoutes[state.trainNumber];
        availableStops = stops.filter(stop => routeStops.includes(stop.full));
    }

    const filtered = availableStops.filter(
        (stop) =>
            stop.full.toLowerCase().includes(query) ||
            stop.abbr.toLowerCase().includes(query)
    );

// Ordenar SIEMPRE siguiendo el orden de trainRoutes
    const route = trainRoutes[state.trainNumber] || [];
    filtered.sort((a, b) => {
        return route.indexOf(a.full) - route.indexOf(b.full);
    });

    return filtered;

}

// Renderizar header
function renderHeader() {
    // Verificar si los datos están cargados
    if (!isDataLoaded() || !trainModels[state.selectedTrain]) {
        return `<div class="header"><div class="header-main">Cargando datos...</div></div>`;
    }

    const currentTrain = trainModels[state.selectedTrain];
    const currentCoach = currentTrain.coaches.find(
        (c) => c.id === state.selectedCoach
    );

    return `
        <div class="header ${state.headerCollapsed ? 'collapsed' : ''}">
            ${!state.headerCollapsed ? `
                <div class="header-main">
                    <div class="header-row-1">
                        <div class="header-left">
    <svg class="train-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="6" width="16" height="12" rx="2"/>
        <path d="M4 11h16M12 6v5"/>
        <circle cx="9" cy="16" r="1"/>
        <circle cx="15" cy="16" r="1"/>
    </svg>
<div class="header-title-group">
    <button class="title train-selector-btn" onclick="toggleTrainSelector()">
        <span class="train-name">${currentTrain.name}</span>
        ${(() => {
        const { percentage } = getTotalTrainOccupancy();
        let occClass = 'occ-low';
        if (percentage > 80) occClass = 'occ-high';
        else if (percentage > 50) occClass = 'occ-mid';
        return `<span class="train-occupancy-badge ${occClass}">${percentage}%</span>`;
    })()}
        <span class="train-selector-arrow">▼</span>
    </button>
        <div id="train-selector" class="train-selector-dropdown hidden">
            ${Object.entries(trainModels)
        .map(
            ([id, train]) => `
                <button
                    class="train-option ${
                state.selectedTrain === id ? "active" : ""
            }"
                    onclick="selectTrain('${id}'); toggleTrainSelector();"
                >
                    ${train.name}
                </button>
            `
        )
        .join("")}
        </div>
    </div>

${state.trainNumber ? `
    <div style="position: relative; display: flex; align-items: center; gap: 0.5rem;">

        <!-- 🔘 Interruptor Copiado rápido -->
        <button class="copy-toggle-btn" onclick="toggleCopyMode()" title="Copiado rápido">
            <div class="copy-switch ${state.copyMode ? 'on' : ''}">
                <div class="copy-switch-handle"></div>
            </div>
        </button>

        <!-- Botón Filtros (tu botón original) -->
        <button class="filters-btn" onclick="toggleFiltersMenu()" title="Filtros">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
        </button>
<!-- Botón Pantallas -->
<button class="screens-btn" onclick="openScreensModal()" title="Pantallas de estación">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <rect x="7" y="18" width="10" height="2" rx="1" />
    </svg>
</button>

        <div id="filters-menu" class="filters-dropdown hidden">
            <button class="filter-option" onclick="openStopFilter()">
                Por parada de bajada
            </button>
            <button class="filter-option" onclick="openRouteFilter()">
                Por tramo recorrido
            </button>
            <button class="filter-option" onclick="openSeatFilter()">
                Por asiento
            </button>
                <button class="filter-option" onclick="openLinksFilter()">
        Por Enlaces
    </button>
    <button class="filter-option" onclick="openCommentsFilter()">
        Por comentario
    </button>
        </div>
    </div>
` : ''}
</div>

<div class="header-right">
    ${filterState.active ? `
        <button class="filter-clear-pill" onclick="clearFilterHighlight()" title="Limpiar filtro">
            ×
        </button>
    ` : ''}
    ${state.trainNumber ? `
        <button class="train-number-display" onclick="showTrainNumberPrompt()">
            Nº ${state.trainNumber}
        </button>
    ` : ''}
</div>
                    </div>

                    ${state.trainNumber && trainRoutes[state.trainNumber] ? `
                        <div class="current-stop-row">
                            <div class="current-stop-selector">
                                <label class="current-stop-label">Parada actual:</label>
                                <input
                                    type="text"
                                    class="current-stop-input"
                                    placeholder="${state.currentStop || 'Seleccionar...'}"
                                    value="${state.currentStopSearch}"
                                    oninput="updateCurrentStopSearch(this.value)"
                                    onfocus="this.select()"
                                />
                                ${state.currentStopSearch && filterCurrentStops().length > 0 ? `
                                    <div class="current-stop-dropdown">
                                        ${filterCurrentStops().slice(0, 5).map(stop => `
                                            <button class="stop-option" onclick="setCurrentStop('${stop}')">
                                                ${stop}
                                            </button>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}

<div class="header-actions">
    <button class="action-btn" onclick="openServiceNotes()" title="Notas del servicio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        ${state.serviceNotes && state.serviceNotes.trim() ? '<span class="notes-badge"></span>' : ''}
    </button>
    
    <button class="action-btn ${Object.keys(state.incidents).length > 0 ? 'has-incidents' : ''}" 
            onclick="openIncidentsPanel()" 
            title="Incidencias">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        ${Object.keys(state.incidents).length > 0 ? `<span class="incident-badge">${Object.keys(state.incidents).length}</span>` : ''}
    </button>
    
    <button class="action-btn" onclick="toggleDarkMode()" title="Modo nocturno">
        ${state.darkMode ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `}
    </button>
    
    <button class="action-btn rotation-btn ${state.rotateSeats ? 'rotated' : ''}" 
            onclick="toggleSeatRotation()" 
            title="Invertir disposición de asientos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M19 9l-7 7-7-7" />
        </svg>
    </button>
    <button class="action-btn delete-btn" onclick="clearAllData()" title="Borrar todos los datos">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
</button>
    <button class="action-btn more-options-btn" onclick="toggleMoreOptions()" title="Más opciones">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="19" r="1"/>
        </svg>
    </button>
    
<div id="more-options-menu" class="more-options-dropdown hidden">
    <button class="more-option" onclick="toggleShareSubmenu(); event.stopPropagation();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Compartir turno
        <span class="submenu-arrow">›</span>
    </button>
    
    <div id="share-submenu" class="submenu hidden">
        <button class="more-option submenu-item" onclick="generateQRCode(); toggleMoreOptions();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Por código QR
        </button>
        <button class="more-option submenu-item" onclick="exportTurn(); toggleMoreOptions();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Por archivo JSON
        </button>
    </div>
    
    <button class="more-option" onclick="toggleImportSubmenu(); event.stopPropagation();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Importar turno
        <span class="submenu-arrow">›</span>
    </button>
    
    <div id="import-submenu" class="submenu hidden">
        <button class="more-option submenu-item" onclick="scanQRCode(); toggleMoreOptions();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Escanear QR
        </button>
        <button class="more-option submenu-item" onclick="importTurn(); toggleMoreOptions();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
            </svg>
            Desde archivo JSON
        </button>
    </div>
    
    <button class="more-option" onclick="openBackupsPanel(); toggleMoreOptions();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
            <circle cx="7" cy="12" r="2"/>
        </svg>
        Backups automáticos
    </button>
    <button class="more-option" onclick="openManualTecnico(); toggleMoreOptions();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        Manual Técnico de Trenes
    </button>
    <button class="more-option" onclick="openAbout(); toggleMoreOptions();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12" y2="8"/>
        </svg>
        Acerca de
    </button>
    
    <button class="more-option" onclick="openReadmeModal(); toggleMoreOptions();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Guía de uso
    </button>
</div>
</div>
                </div>
            ` : ''}

            <div class="coach-selector-row">
                <button class="header-collapse-btn" onclick="toggleHeaderCollapse()" title="${state.headerCollapsed ? 'Expandir' : 'Colapsar'} header">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${state.headerCollapsed ?
        '<polyline points="6 9 12 15 18 9"/>' :
        '<polyline points="18 15 12 9 6 15"/>'
    }
                    </svg>
                </button>
                <div class="coach-selector">
                 ${currentTrain.coaches
        .map((coach) => {
            // ------------- CALCULAR OCUPACIÓN -------------
            const coachId = coach.id;

            // claves de asientos que pertenecen a este coche
            const seatKeys = Object.keys(state.seatData || {})
                .filter(k => k.startsWith(`${coachId}-`));

            // 🔴 NUEVO: Obtener layout correcto (con soporte para variantes)
            const coachLayout = getCurrentCoachLayout(coach);

            // total de asientos reales en este coche
            const totalSeats = coachLayout
                .flatMap(block => block.type === "seats" ? block.positions : [])
                .flat()
                .filter(n => typeof n === "number").length;

            // asientos ocupados (que tienen parada asignada)
            const occupiedSeats = seatKeys.filter(k => state.seatData[k]?.stop).length;

            const occPercent = totalSeats > 0
                ? Math.round((occupiedSeats / totalSeats) * 100)
                : 0;

            // determinar clase de ocupación
            let occClass = "";
            if (occPercent <= 35) occClass = "occ-low";
            else if (occPercent <= 70) occClass = "occ-mid";
            else occClass = "occ-high";

            // ------------- DEVUELVE EL BOTÓN -------------
            return `
    <button
        class="coach-btn ${occClass} ${
                state.selectedCoach === coach.id ? "active" : ""
            }"
        data-coach-id="${coach.id}"
    >
        ${coach.id}
    </button>`;
        })
        .join("")}
                </div>
            </div>
        </div>
    `;
}

// Renderizar asientos
function renderSeats() {
    // Verificar si los datos están cargados
    if (!isDataLoaded() || !trainModels[state.selectedTrain]) {
        return `<div style="text-align: center; padding: 2rem;">Cargando asientos...</div>`;
    }

    const currentTrain = trainModels[state.selectedTrain];
    const currentCoach = currentTrain.coaches.find(
        (c) => c.id === state.selectedCoach
    );

    const firstCoach = currentTrain.coaches[0].id;
    const lastCoach = currentTrain.coaches[currentTrain.coaches.length - 1].id;

    let html = "";

    html += '<div class="seats-layout">';

    // CABEZA/COLA al inicio
    if (currentCoach.id === firstCoach) {
        const label = getCabinaLabel(currentCoach.id);
        html += `<div class="cabina-label">${label}</div>`;
    }

    const coachLayout = getCurrentCoachLayout(currentCoach);
    let doorCounter = 1;
    coachLayout.forEach((section) => {
        if (section.type === "pmr-bathroom") {
            const label = section.label || "BAÑO PMR";
            const pmrId = "PMR-WC";
            const pmrKey = getIncidentKey(state.selectedCoach, pmrId);
            const pmrActive = state.incidents[pmrKey] ? 'incident-active' : '';

            html += `
        <button class="pmr-bathroom ${pmrActive}" 
                style="height: ${section.height}px"
                data-wc-id="${pmrId}"
                onmousedown="handleDoorPress('${state.selectedCoach}', '${pmrId}', 'wc', 'Baño PMR', event)"
                onmouseup="handleDoorRelease(event)"
                onmouseleave="handleDoorCancel(event)"
                ontouchstart="handleDoorPress('${state.selectedCoach}', '${pmrId}', 'wc', 'Baño PMR', event)"
                ontouchend="handleDoorRelease(event)"
                ontouchcancel="handleDoorCancel(event)">
            ${label}
        </button>
    `;
            return;
        }
        if (section.type === "space") {
            // Determinar si es puerta
            const isDoor = section.isDoor !== undefined
                ? section.isDoor
                : (section.height >= DOOR_HEIGHT_THRESHOLD);

            // Verificar si el coche tiene puertas deshabilitadas
            const coachHasDoors = !currentCoach.noDoors;

            if (isDoor && coachHasDoors) {
                // Renderizar como puerta con lados clickables
                const doorNum = doorCounter++;
                const leftId = `D${doorNum}-L`;
                const rightId = `D${doorNum}-R`;
                const leftKey = getIncidentKey(state.selectedCoach, leftId);
                const rightKey = getIncidentKey(state.selectedCoach, rightId);
                const leftActive = state.incidents[leftKey] ? 'incident-active' : '';
                const rightActive = state.incidents[rightKey] ? 'incident-active' : '';

// 🔴 NUEVO: Calcular labels según rotación
                const leftLabel = `Puerta ${doorNum} - ${getDoorSideText('L')}`;
                const rightLabel = `Puerta ${doorNum} - ${getDoorSideText('R')}`;

                html += `
        <div class="door-space" style="height: ${section.height}px">
            <button class="door-side door-left ${leftActive}" 
                    data-door-id="${leftId}"
                    onmousedown="handleDoorPress('${state.selectedCoach}', '${leftId}', 'door', '${leftLabel}', event)"
                    onmouseup="handleDoorRelease(event)"
                    onmouseleave="handleDoorCancel(event)"
                    ontouchstart="handleDoorPress('${state.selectedCoach}', '${leftId}', 'door', '${leftLabel}', event)"
                    ontouchend="handleDoorRelease(event)"
                    oontouchcancel="handleDoorCancel(event)">
                <span class="door-label">P${doorNum}</span>
            </button>
            <div class="door-center"></div>
            <button class="door-side door-right ${rightActive}" 
                    data-door-id="${rightId}"
                    onmousedown="handleDoorPress('${state.selectedCoach}', '${rightId}', 'door', '${rightLabel}', event)"
                    onmouseup="handleDoorRelease(event)"
                    onmouseleave="handleDoorCancel()"
                    ontouchstart="handleDoorPress('${state.selectedCoach}', '${rightId}', 'door', '${rightLabel}', event)"
                    ontouchend="handleDoorRelease(event)"
                    ontouchcancel="handleDoorCancel()">
                <span class="door-label">P${doorNum}</span>
            </button>
        </div>
    `;
            } else {
                // Renderizar como espacio normal
                html += `<div class="space" style="height: ${section.height}px"></div>`;
            }
        } else {
            html += '<div class="seat-group">';
            section.positions.forEach((row) => {
                html += '<div class="seat-row">';
                row.forEach((seatNum, index) => {
                    if (seatNum === null) {
                        // Solo mostrar flecha si es el elemento central (índice 2 en array de 5)
                        const isCentralAisle = (row.length === 5 && index === 2);
                        if (isCentralAisle) {
                            const arrow = getAisleArrow(currentCoach.id);
                            html += `<div class="seat empty-space aisle-arrow">${arrow}</div>`;
                        } else {
                            // Espacio vacío normal sin flecha
                            html += '<div class="seat empty-space"></div>';
                        }
                    } else if (String(seatNum).includes("WC")) {
                        // WC ahora soporta IDs personalizados (ej: "WC-A", "WC-B") para agrupar
                        // Si es solo "WC" sin ID, se trata individualmente
                        const wcId = String(seatNum).includes("-") ? String(seatNum) : `WC${index + 1}`;
                        const wcKey = getIncidentKey(state.selectedCoach, wcId);
                        const wcActive = state.incidents[wcKey] ? 'incident-active' : '';

                        // Label para mostrar
                        const wcLabel = String(seatNum).includes("-") ? "WC" : String(seatNum);

                        html += `
        <button class="seat special-wc ${wcActive}" 
                data-wc-id="${wcId}"
                onmousedown="handleDoorPress('${state.selectedCoach}', '${wcId}', 'wc', 'WC', event)"
                onmouseup="handleDoorRelease(event)"
                onmouseleave="handleDoorCancel(event)"
                ontouchstart="handleDoorPress('${state.selectedCoach}', '${wcId}', 'wc', 'WC', event)"
                ontouchend="handleDoorRelease(event)"
                ontouchcancel="handleDoorCancel(event)">
            ${wcLabel}
        </button>
    `;
                    } else if (seatNum === "EQ" || seatNum === "MIN" || seatNum === "MESA") {
                        // Otros elementos especiales no clickeables
                        html += `<div class="seat special-non-clickable">${seatNum}</div>`;
                    } else {
                        const key = getSeatKey(state.selectedCoach, seatNum);
                        const seatInfo = state.seatData[key];

                        let seatClass = '';
                        let seatStyle = '';
                        let label = seatNum;
                        let isFinalStop = false;

// Aplicar filtro visual si está activo
                        let isFiltered = false;

                        if (filterState.active && filterState.data) {
                            isFiltered = filterState.data.includes(key);
                        }

// Si el asiento está filtrado, ponerlo en rojo
                        if (isFiltered) {
                            seatClass = 'filtered-seat';
                        } else if (seatInfo) {
                            // Recopilar colores activos
                            const colors = [];
                            if (seatInfo.stop) colors.push('#22c55e');
                            if (seatInfo.enlace) colors.push('#3b82f6');
// aceptar tanto comentarioFlag como comentario (texto)
                            if (seatInfo.comentarioFlag || seatInfo.comentario) colors.push('#f97316');
                            if (seatInfo.seguir) colors.push('#eab308');


                            // Verificar si es parada final según el número de tren
                            const finalStopsForTrain = getTrainFinalStops();
                            // Ajuste de paradas finales "efectivas" por número de tren
                            const effectiveFinalStops = {
                                "18021": "Vitoria Gasteiz",
                                "18071": "Vitoria Gasteiz",
                                "18079": "Castejón",
                                "18073": "Castejón"
                            };

                            const effectiveFinalStop = effectiveFinalStops[state.trainNumber] || finalStopsForTrain[0];
                            isFinalStop = seatInfo.stop && seatInfo.stop.full === effectiveFinalStop;

                            if (colors.length > 1) {
                                // Crear degradado dividido
                                const percentage = 100 / colors.length;
                                const gradientStops = colors.map((color, index) => {
                                    const start = index * percentage;
                                    const end = (index + 1) * percentage;
                                    return `${color} ${start}%, ${color} ${end}%`;
                                })
                                    .join(', ');

                                seatStyle = `background: linear-gradient(to right, ${gradientStops});`;
                                seatClass = 'multi-color';
                            } else if (colors.length === 1) {
                                // Un solo color
                                if (seatInfo.comentarioFlag || seatInfo.comentario) {
                                    seatClass = 'orange';
                                } else if (seatInfo.enlace) {
                                    seatClass = 'blue';
                                } else if (seatInfo.seguir) {
                                    seatClass = 'yellow';
                                } else if (seatInfo.stop) {
                                    seatClass = 'occupied';
                                }
                            }
                        }

                        const isPMR = String(seatNum).includes("PMR");
                        const displayNum = isPMR ?
                            String(seatNum).replace("PMR-", "") :
                            seatNum;

                        if (seatInfo && seatInfo.stop) {
                            label = `${seatInfo.stop.abbr}<br><small style="font-size:0.6rem;">${displayNum}</small>`;
                        }

                        const pmrClass = isPMR ? "pmr-seat" : "";
                        const finalStopClass = isFinalStop ? 'final-stop' : '';
                        // Determinar clase de filtro
                        const filterClass = (filterState.active && !isFiltered) ? 'filtered-out' : '';

                        html += `
    <button
        class="seat ${seatClass} ${pmrClass} ${finalStopClass} ${filterClass}"
        style="${seatStyle}"
        onmousedown="handleSeatPress('${state.selectedCoach}', '${seatNum}', event)"
        onmousemove="handleSeatMove('${state.selectedCoach}', '${seatNum}', event)"
        onmouseup="handleSeatRelease('${state.selectedCoach}', '${seatNum}', event)"
        onmouseleave="handleSeatCancel()"
        ontouchstart="handleSeatPress('${state.selectedCoach}', '${seatNum}', event)"
        ontouchmove="handleSeatMove('${state.selectedCoach}', '${seatNum}', event)"
        ontouchend="handleSeatRelease('${state.selectedCoach}', '${seatNum}', event)"
        ontouchcancel="handleSeatCancel()"
    >
        ${label}
    </button>
`;
                    }
                });
                html += "</div>"; // seat-row
            });
            html += "</div>"; // seat-group
        }
    });

    // CABEZA/COLA al final
    if (currentCoach.id === lastCoach) {
        const label = getCabinaLabel(currentCoach.id);
        html += `<div class="cabina-label">${label}</div>`;
    }

    html += "</div>"; // seats-layout

    return html;
}

function scrollCoachToBottom() {
    const layout = document.querySelector('.seats-layout');
    if (!layout) return;

    // Fondo del bloque de asientos
    const bottom = layout.offsetTop + layout.offsetHeight;
    const target = Math.max(0, bottom - window.innerHeight);

    window.scrollTo({
        top: target,
        behavior: 'smooth'
    });
}

// Renderizar modal
function renderModal() {
    if (!state.selectedSeat) return "";

    const key = getSeatKey(state.selectedSeat.coach, state.selectedSeat.num);
    const currentStop = state.seatData[key]?.stop;
    const filteredStops = getFilteredStops();

    // Ruta completa y parada actual del tren
    const route = trainRoutes[state.trainNumber] || [];
    const currentRouteStop = state.currentStop || null;
    const currentRouteIndex = currentRouteStop ? route.indexOf(currentRouteStop) : -1;

    return `
        <div class="modal-overlay" 
             onclick="closeModal(event)"
             onmousedown="handleModalOverlayInteraction(event)"
             ontouchstart="handleModalOverlayInteraction(event)"
             ontouchend="closeModal(event)">
            <div class="modal"
                 onclick="event.stopPropagation()"
                 onmousedown="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Asiento ${
        state.selectedSeat.num
    } - ${state.selectedSeat.coach}</h3>
                    </div>
                    ${
        state.seatData[key]?.historial && state.seatData[key].historial.length > 0
            ? `
                        <div class="seat-history">
                            Asiento liberado en: ${state.seatData[key].historial.join(' → ')}
                        </div>`
            : ""
    }
                    <button class="close-btn" onclick="closeModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                ${
        currentStop
            ? `<div class="current-stop">Se baja en: ${currentStop.full}</div>`
            : ""
    }
                <div class="checkbox-group">
                    <div class="checkbox-item">
                        <input
                            type="checkbox"
                            id="enlace-check"
                            ${state.seatData[key]?.enlace ? "checked" : ""}
                            onchange="toggleFlag('${state.selectedSeat.coach}', '${state.selectedSeat.num}', 'enlace'); render();"
                        />
                        <label for="enlace-check">Enlace</label>
                    </div>
                    <div class="checkbox-item">
                        <input
                            type="checkbox"
                            id="comentario-check"
                            ${state.seatData[key]?.comentarioFlag ? "checked" : ""}
                            onchange="toggleFlag('${state.selectedSeat.coach}', '${state.selectedSeat.num}', 'comentarioFlag'); render();"
                        />
                        <label for="comentario-check">Comentario</label>
                    </div>
                    ${
        state.seatData[key]?.comentarioFlag
            ? `
                        <div class="comment-box">
                            <textarea
                                class="comment-input"
                                rows="3"
                                placeholder="Escribe un comentario."
                                oninput="saveModalScrollPosition(); updateComment('${state.selectedSeat.coach}', '${state.selectedSeat.num}', this.value)"
                                onfocus="saveModalScrollPosition()"
                            >${state.seatData[key]?.comentario || ""}</textarea>
                            <button class="delete-comment-btn" onclick="deleteComment('${state.selectedSeat.coach}', '${state.selectedSeat.num}')">
                                Borrar comentario
                            </button>
                        </div>
                    `
            : ""
    }
                    <div class="checkbox-item">
                        <input
                            type="checkbox"
                            id="seguir-check"
                            ${state.seatData[key]?.seguir ? "checked" : ""}
                            onchange="toggleFlag('${state.selectedSeat.coach}', '${state.selectedSeat.num}', 'seguir'); render();"
                        />
                        <label for="seguir-check">Seguir por aquí</label>
                    </div>
                </div>
                <div class="modal-search">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Buscar parada."
                        value="${state.searchQuery}"
                        oninput="updateSearch(this.value)"
                        readonly onfocus="this.removeAttribute('readonly')"
                    />
                </div>
<div class="modal-list">
    ${filteredStops
        .map((stop) => {
            const stopIndex = route.indexOf(stop.full);
            const isPassed =
                currentRouteIndex !== -1 &&
                stopIndex !== -1 &&
                stopIndex < currentRouteIndex;
            const isCurrent =
                currentRouteIndex !== -1 &&
                stopIndex === currentRouteIndex;

            return `
                <button
                    class="stop-item ${isPassed ? 'passed' : ''} ${isCurrent ? 'current' : ''}"
                    ${isCurrent ? 'id="current-stop-item"' : ''}
                    onclick="updateSeatFromList('${stop.abbr}')"
                >
                    <span class="stop-name">${stop.full}</span>
                    <span class="stop-abbr">${stop.abbr}</span>
                </button>
            `;
        })
        .join("")}
</div>

                ${
        currentStop
            ? `
                <div class="modal-footer">
                    <button class="clear-btn" onclick="clearSeat('${state.selectedSeat.coach}', '${state.selectedSeat.num}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Liberar asiento
                    </button>
                </div>
                `
            : ""
    }
            </div>
        </div>
    `;
}

// Renderizar todo
function render() {
    // --- evitar flash en modo oscuro durante el render inicial ---
    const body = document.body;
    body.style.transition = "none";

    // reactivar transición tras el primer frame (una vez pintado)
    requestAnimationFrame(() => {
        body.style.transition = "";
    });
    // Aplicar modo oscuro al body
    document.body.classList.toggle("dark-mode", state.darkMode);
    const app = document.getElementById("app");
    app.innerHTML = `
    ${renderHeader()}
    <div class="seats-container ${state.rotateSeats ? 'rotated' : ''}">
            ${renderSeats()}
            <div class="legend">
    <div class="legend-content">
        <div class="legend-item">
            <div class="legend-box free"></div>
            <span>Libre</span>
        </div>
        <div class="legend-item">
            <div class="legend-box checked"></div>
            <span>Revisado</span>
        </div>
        <div class="legend-item">
            <div class="legend-box blue"></div>
            <span>Enlace</span>
        </div>
        <div class="legend-item">
            <div class="legend-box orange"></div>
            <span>Comentario</span>
        </div>
        <div class="legend-item">
            <div class="legend-box yellow"></div>
            <span>Continuar</span>
        </div>
<div class="legend-item">
            <div class="legend-box checked final-stop-legend"></div>
            <span>Fin trayecto</span>
        </div>
<div class="direction-control">
    <button class="direction-btn-bottom" onclick="toggleDirection('${state.selectedCoach}')" title="Cambiar dirección del tren">
        <div class="direction-icon">${state.trainDirection[state.selectedCoach] === 'down' ? '↓' : '↑'}</div>
        <div class="direction-label">Dirección del tren</div>
    </button>
</div>
    </div>
</div>
        </div>
        ${renderModal()}
    `;
    // Restaurar scroll del modal si existe
    if (state.selectedSeat) {
        restoreModalScrollPosition();
    } else {
        // Si cerramos el modal, resetear la posición guardada
        modalScrollPosition = 0;
    }
}

function scrollToCurrentStop() {
    // Esperar a que el DOM esté listo
    requestAnimationFrame(() => {
        const currentStopElement = document.getElementById('current-stop-item');
        const modalList = document.querySelector('.modal-list');

        if (currentStopElement && modalList) {
            // Calcular posición para centrar el elemento
            const elementTop = currentStopElement.offsetTop;
            const elementHeight = currentStopElement.offsetHeight;
            const listHeight = modalList.clientHeight;

            // Ajuste: restar altura de ~2 elementos para subir el centrado
            const offsetAdjustment = elementHeight * 2; // Altura aproximada de 2 paradas

            // Centrar el elemento en la lista con ajuste
            const scrollPosition = elementTop - (listHeight / 2) + (elementHeight / 2) - offsetAdjustment;

            // Hacer scroll suave
            modalList.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior: 'smooth'
            });
        }
    });
}

// NOTA: También existe en src/utils/modal-helpers.js pero se necesita aquí
function saveModalScrollPosition() {
    const modalList = document.querySelector('.modal-list');
    if (modalList) {
        modalScrollPosition = modalList.scrollTop;
    }
}

function restoreModalScrollPosition() {
    // Usar requestAnimationFrame para asegurar que el DOM está actualizado
    requestAnimationFrame(() => {
        const modalList = document.querySelector('.modal-list');
        if (modalList && modalScrollPosition > 0) {
            modalList.scrollTop = modalScrollPosition;
        }
    });
}

// ========== SCROLL HELPERS MOVIDOS A src/utils/modal-helpers.js ==========
// Las funciones de scroll guards ahora se cargan desde el módulo externo

// Función helper para prevenir interacciones en overlay
function handleModalOverlayInteraction(e) {
    // Solo actuar si el click/touch es directamente en el overlay
    if (e.target.classList.contains('modal-overlay')) {
        e.preventDefault();
    }
}

// Funciones globales para eventos
function selectCoach(coachId) {
    const previousCoach = state.selectedCoach;
    state.selectedCoach = coachId;

    render();

    // Solo hacer scroll al fondo SI hemos cambiado realmente de coche
    if (previousCoach !== coachId) {
        requestAnimationFrame(() => {
            scrollCoachToBottom();
        });
    }
    // Si es el mismo coche → no tocamos el scroll (conserva la posición actual)
}

function selectSeat(coach, num) {
    // Guardar scroll actual antes de abrir modal
    savedScrollPosition = window.scrollY || document.documentElement.scrollTop;

    // 🔴 NUEVO: Copiar TODA la información del asiento
    if (state.copyMode && lastCopiedSeatData) {
        const key = getSeatKey(coach, num);
        const seatInfo = state.seatData[key];

        // Solo aplicar si el asiento está vacío (sin parada activa)
        if (!seatInfo || !seatInfo.stop) {
            // Crear o actualizar con toda la información copiada
            if (!state.seatData[key]) {
                state.seatData[key] = {};
            }

            // Copiar toda la información
            state.seatData[key].stop = lastCopiedSeatData.stop;
            state.seatData[key].enlace = lastCopiedSeatData.enlace;
            state.seatData[key].seguir = lastCopiedSeatData.seguir;
            state.seatData[key].comentarioFlag = lastCopiedSeatData.comentarioFlag;
            state.seatData[key].comentario = lastCopiedSeatData.comentario;

            saveData();
            render();
            return;
        }
    }

    state.selectedSeat = { coach, num };
    state.searchQuery = "";
    isModalOpen = true;
    lockBodyScroll();
    render();

    // Hacer scroll a la parada actual
    scrollToCurrentStop();
}

// MOVIDO A src/utils/modal-helpers.js
// Ver: setupModalListScrollGuards(), removeModalScrollGuards()
// Ver: setupModalOverlayScrollBlock(), removeModalOverlayScrollBlock()

function handleSeatPress(coach, num, event) {
    const key = getSeatKey(coach, num);
    if (filterState.active && filterState.data && !filterState.data.includes(key)) {
        return;
    }

    const seatInfo = state.seatData[key];

    // Guardar posición inicial del toque
    if (event.type === 'touchstart') {
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isScrolling = false;
    } else if (event.type === 'mousedown') {
        touchStartX = event.clientX;
        touchStartY = event.clientY;
        isScrolling = false;
    }

    seatHoldTriggered = false;
    clearTimeout(seatHoldTimer);

    // Iniciar timer para long press
    seatHoldTimer = setTimeout(() => {
        if (!isScrolling) {
            const scrollBeforeLongPress = window.scrollY || document.documentElement.scrollTop;
            seatHoldTriggered = true;
            if (navigator.vibrate) navigator.vibrate(40);

            const key = getSeatKey(coach, num);
            const seatInfo = state.seatData[key];

            // 🔴 NUEVO: Verificar si tiene PARADA ACTIVA (no solo datos en general)
            const hasActiveStop = seatInfo && seatInfo.stop;

            // 🔴 Long press: solo borrar si tiene parada ACTIVA
            if (hasActiveStop) {
                // Guardar TODO lo que tenía el asiento antes de borrarlo
                const previousData = {
                    stop: seatInfo.stop ? seatInfo.stop.full : null,
                    enlace: seatInfo.enlace || false,
                    seguir: seatInfo.seguir || false,
                    comentarioFlag: seatInfo.comentarioFlag || false,
                    comentario: seatInfo.comentario || "",
                    historial: seatInfo.historial ? [...seatInfo.historial] : []
                };

                // 🔴 NUEVO: Añadir parada actual al historial antes de borrar
                if (seatInfo.stop && seatInfo.stop.full) {
                    if (!seatInfo.historial) {
                        seatInfo.historial = [];
                    }
                    // Evitar duplicados en el historial
                    if (!seatInfo.historial.includes(seatInfo.stop.full)) {
                        seatInfo.historial.push(seatInfo.stop.full);
                    }
                }

                // 🔴 NUEVO: Borrar parada, flags Y comentarios (mantener solo historial)
                delete seatInfo.stop;
                delete seatInfo.enlace;
                delete seatInfo.seguir;
                delete seatInfo.comentarioFlag;
                delete seatInfo.comentario;
                // Mantener SOLO: historial

                // 🔴 NUEVO: Si después de borrar no queda nada útil, eliminar la key
                if (!seatInfo.historial || seatInfo.historial.length === 0) {
                    delete state.seatData[key];
                }

                saveData();

// Capturar scroll antes de render
                const scrollPosition = window.scrollY || document.documentElement.scrollTop;

                render();

// Restaurar scroll después de render
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPosition);
                });

// Guardar datos completos para deshacer
                state.undoData = {
                    coach,
                    num,
                    data: previousData
                };

                showUndoBanner(
                    `Parada eliminada: ${previousData.stop}`,
                    () => {
                        const undo = state.undoData;
                        if (!undo) return;

                        const key = getSeatKey(undo.coach, undo.num);

                        // Restaurar COMPLETO
                        state.seatData[key] = {
                            stop: undo.data.stop
                                ? stops.find(s => s.full === undo.data.stop)
                                : null,
                            enlace: undo.data.enlace,
                            seguir: undo.data.seguir,
                            comentarioFlag: undo.data.comentarioFlag,
                            comentario: undo.data.comentario,
                            historial: [...undo.data.historial]
                        };

                        saveData();
                        render();

                        state.undoData = null;
                    }
                );
            }
            else {
                // 🔴 NO tiene parada activa

                // Primero verificar si tiene SOLO checkboxes/comentario (sin parada)
                const hasOnlyMetadata = seatInfo && (
                    seatInfo.enlace ||
                    seatInfo.seguir ||
                    seatInfo.comentarioFlag ||
                    seatInfo.comentario
                );

                if (hasOnlyMetadata) {
                    // BORRAR checkboxes y comentarios
                    const previousData = {
                        enlace: seatInfo.enlace || false,
                        seguir: seatInfo.seguir || false,
                        comentarioFlag: seatInfo.comentarioFlag || false,
                        comentario: seatInfo.comentario || "",
                        historial: seatInfo.historial ? [...seatInfo.historial] : []
                    };

                    delete seatInfo.enlace;
                    delete seatInfo.seguir;
                    delete seatInfo.comentarioFlag;
                    delete seatInfo.comentario;

                    // Si no queda historial, eliminar key completa
                    if (!seatInfo.historial || seatInfo.historial.length === 0) {
                        delete state.seatData[key];
                    }

                    saveData();

                    // Capturar scroll antes de render
                    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
                    isLongPressActive = false;
                    render();
                    requestAnimationFrame(() => {
                        window.scrollTo(0, scrollPosition);
                    });

                    showUndoBanner(
                        `Información borrada del asiento ${num}`,
                        () => {
                            const key = getSeatKey(coach, num);
                            if (!state.seatData[key]) {
                                state.seatData[key] = {};
                            }
                            state.seatData[key].enlace = previousData.enlace;
                            state.seatData[key].seguir = previousData.seguir;
                            state.seatData[key].comentarioFlag = previousData.comentarioFlag;
                            state.seatData[key].comentario = previousData.comentario;
                            if (previousData.historial && previousData.historial.length > 0) {
                                state.seatData[key].historial = previousData.historial;
                            }
                            saveData();

                            const scrollPos = window.scrollY || document.documentElement.scrollTop;
                            render();
                            requestAnimationFrame(() => {
                                window.scrollTo(0, scrollPos);
                            });
                        }
                    );

                    // IMPORTANTE: Salir aquí para no continuar con asignar parada
                    return;
                }

                // Si llegamos aquí: NO tiene parada NI metadata → Asignar parada final del tren

                // 🚫 Si el modo copiado rápido está activo → copiar toda la información
                if (state.copyMode && lastCopiedSeatData) {
                    const key = getSeatKey(coach, num);

                    if (!state.seatData[key]) {
                        state.seatData[key] = {};
                    }

                    // Copiar toda la información
                    state.seatData[key].stop = lastCopiedSeatData.stop;
                    state.seatData[key].enlace = lastCopiedSeatData.enlace;
                    state.seatData[key].seguir = lastCopiedSeatData.seguir;
                    state.seatData[key].comentarioFlag = lastCopiedSeatData.comentarioFlag;
                    state.seatData[key].comentario = lastCopiedSeatData.comentario;

                    saveData();
                    render();
                    return;
                }

                // Obtener parada final del tren
                const route = state.trainNumber && trainRoutes[state.trainNumber];

                if (route && route.length > 0) {
                    let finalStopName = route[route.length - 1];

                    // Ajustes de parada efectiva
                    if (finalStopName === 'Miranda') {
                        finalStopName = 'Vitoria Gasteiz';
                    } else if (finalStopName === 'Logroño') {
                        finalStopName = 'Castejón';
                    }

                    const stopObj = stops.find(s => s.full === finalStopName);

                    if (stopObj) {
                        // Capturar scroll ANTES de cualquier operación
                        const scrollPosition = window.scrollY || document.documentElement.scrollTop;

                        // Asignar parada sin abrir modal
                        const key = getSeatKey(coach, num);

                        if (!state.seatData[key]) {
                            state.seatData[key] = {};
                        }

                        state.seatData[key].stop = stopObj;

                        // Guardar datos copiados
                        lastCopiedSeatData = {
                            stop: stopObj,
                            enlace: state.seatData[key].enlace || false,
                            seguir: state.seatData[key].seguir || false,
                            comentarioFlag: state.seatData[key].comentarioFlag || false,
                            comentario: state.seatData[key].comentario || ""
                        };
                        state.lastCopiedSeatData = { ...lastCopiedSeatData };

                        saveData();

                        if (navigator.vibrate) {
                            navigator.vibrate(30);
                        }

                        // Renderizar y restaurar scroll
                        render();
                        requestAnimationFrame(() => {
                            window.scrollTo(0, scrollPosition);
                        });
                    }
                }
            }
        }
    }, SEAT_LONG_PRESS_DURATION);
}

function handleSeatMove(coach, num, event) {
    // Calcular distancia del movimiento
    let currentX, currentY;

    if (event.type === 'touchmove') {
        const touch = event.touches[0];
        currentX = touch.clientX;
        currentY = touch.clientY;
    } else if (event.type === 'mousemove') {
        currentX = event.clientX;
        currentY = event.clientY;
    } else {
        return;
    }

    const deltaX = Math.abs(currentX - touchStartX);
    const deltaY = Math.abs(currentY - touchStartY);

    // Si el movimiento supera el umbral, es scroll
    if (deltaX > 18 || deltaY > 18) {
        isScrolling = true;
        clearTimeout(seatHoldTimer);
        seatHoldTriggered = false;
        // NO prevenir aquí - dejar que el scroll funcione naturalmente
    }
}

function handleSeatRelease(coach, num, event) {
    clearTimeout(seatHoldTimer);

    // Si NO fue long press Y NO estamos haciendo scroll, abrir modal
    if (!seatHoldTriggered && !isScrolling) {
        // Solo prevenir si vamos a abrir el modal
        event.preventDefault();
        selectSeat(coach, num);
    }

    // Resetear estados
    seatHoldTriggered = false;
    isScrolling = false;
}

function handleSeatCancel() {
    clearTimeout(seatHoldTimer);
    seatHoldTriggered = false;
    isScrolling = false;
}

function closeModal(event) {
    if (!event || event.target === event.currentTarget) {
        unlockBodyScroll();

        state.selectedSeat = null;
        state.searchQuery = "";
        modalScrollPosition = 0;
        isModalOpen = false;

        render();

        // ←←← RESTAURAR SCROLL DESPUÉS DE CERRAR
        requestAnimationFrame(() => {
            window.scrollTo(0, savedScrollPosition);
        });
    }
}

function showUndoBanner(message, onUndo) {
    const banner = document.createElement('div');
    banner.className = 'undo-banner';
    banner.innerHTML = `
        <span>${message}</span>
        <button class="undo-btn">Deshacer</button>
    `;

    document.body.appendChild(banner);

    const timeout = setTimeout(() => {
        banner.style.animation = 'undoBannerFadeOut 0.35s ease forwards';
        setTimeout(() => banner.remove(), 350);
    }, 5000);

    banner.querySelector('.undo-btn').addEventListener('click', () => {
        clearTimeout(timeout);
        banner.style.animation = 'undoBannerFadeOut 0.35s ease forwards';
        setTimeout(() => banner.remove(), 350);
        onUndo();
    });
}

// --- Swipe down para cerrar modal con rebote ---

// NOTA: También existe en src/utils/modal-helpers.js pero se necesita aquí
let modalSwipeStartY = 0;
let modalSwipeDeltaY = 0;
let modalSwipeActive = false;

function modalSwipeStart(event) {
    if (!event.touches || event.touches.length === 0) return;

    // Solo activamos el swipe si el gesto empieza en el header del modal
    const header = event.target.closest('.modal-header');
    if (!header) {
        modalSwipeActive = false;
        return;
    }

    modalSwipeActive = true;
    const touch = event.touches[0];
    modalSwipeStartY = touch.clientY;
    modalSwipeDeltaY = 0;

    const modal = document.querySelector('.modal');
    if (modal) {
        modal.style.transition = 'none';
        modal.style.animation = '';
    }
}

function modalSwipeMove(event) {
    if (!modalSwipeActive || !event.touches || event.touches.length === 0) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - modalSwipeStartY;

    // Solo nos interesa si se mueve hacia abajo
    if (deltaY <= 0) {
        modalSwipeDeltaY = 0;
        return;
    }

    modalSwipeDeltaY = deltaY;

    const modal = document.querySelector('.modal');
    if (modal) {
        const limited = Math.min(deltaY, 200); // límite para que no se vaya a Cuenca
        modal.style.transform = `translateY(${limited}px)`;
    }
}

function modalSwipeEnd(event) {
    if (!modalSwipeActive) return;
    modalSwipeActive = false;

    const modal = document.querySelector('.modal');
    if (!modal) {
        modalSwipeDeltaY = 0;
        return;
    }

    // Si hemos arrastrado suficiente, cerramos el modal deslizando hacia abajo
    if (modalSwipeDeltaY > MODAL_SWIPE_CLOSE_THRESHOLD) {
        // Guardar posición de scroll ANTES de la animación
        const scrollToRestore = savedScrollPosition;

        modal.style.transition = 'transform 0.2s ease-out';
        modal.style.transform = 'translateY(100%)';

        // Una vez termina la animación, cerramos de verdad
        setTimeout(() => {
            modal.style.transition = '';
            modal.style.transform = '';
            // Cerrar el overlay padre
            const overlay = modal.closest('.modal-overlay');
            if (overlay) overlay.remove();

            // Desbloquear scroll si era necesario
            if (!document.querySelector('.modal-overlay')) {
                unlockBodyScroll();
                // Restaurar scroll a la posición guardada
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollToRestore);
                });
            }
        }, 200);
    } else {
        // No llega al umbral → animación de rebote
        modal.style.transition = '';
        modal.style.setProperty('--modal-swipe-distance', `${modalSwipeDeltaY}px`);
        modal.style.animation = 'modalReturnBounce 0.25s ease-out';

        modal.addEventListener(
            'animationend',
            () => {
                modal.style.animation = '';
                modal.style.transform = '';
                modal.style.removeProperty('--modal-swipe-distance');
            },
            { once: true }
        );
    }

    modalSwipeDeltaY = 0;
}

// ===== DELEGACIÓN GLOBAL PARA MODAL SWIPE =====
// Detectar si el touch empieza en un modal
document.addEventListener('touchstart', function(e) {
    const modal = e.target.closest('.modal');
    if (modal) {
        modalSwipeStart(e);
        e.stopPropagation();
    }
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    if (modalSwipeActive) {
        modalSwipeMove(e);
    }
}, { passive: true });

document.addEventListener('touchend', function(e) {
    if (modalSwipeActive) {
        modalSwipeEnd(e);
    }
}, { passive: true });

document.addEventListener('touchcancel', function(e) {
    if (modalSwipeActive) {
        modalSwipeEnd(e);
    }
}, { passive: true });

function updateSearch(value) {
    state.searchQuery = value;
    // Solo actualizar la lista de paradas, no todo
    const modalList = document.querySelector(".modal-list");
    if (modalList) {
        const filteredStops = getFilteredStops();
        modalList.innerHTML = filteredStops
            .map(
                (stop) => `
            <button
                class="stop-item"
                onclick="updateSeatFromList('${stop.abbr}')"
            >
                <span class="stop-name">${stop.full}</span>
                <span class="stop-abbr">${stop.abbr}</span>
            </button>
        `
            )
            .join("");
    }
}

// --- Swipe lateral en la plantilla + cambio de coche con fade --- //
let __touchStartX = 0, __touchStartY = 0, __touchStartTime = 0;

function __getAdjacentCoachId(direction) {
    // Nos basamos en el orden visual de los botones .coach-btn
    const btns = Array.from(document.querySelectorAll('.coach-btn'));
    const i = btns.findIndex(b => b.classList.contains('active'));
    if (i === -1) return null;
    const nextIndex = direction === 'next' ? i + 1 : i - 1;
    const targetBtn = btns[nextIndex];
    return targetBtn ? targetBtn.textContent.trim() : null;
}

function __changeCoachWithFade(direction) {
    const targetId = __getAdjacentCoachId(direction);
    if (!targetId) return;

    const seatMap = document.querySelector('.seats-layout');
    if (seatMap) {
        // Fade out actual
        seatMap.classList.add('fade-out');

        setTimeout(() => {
            // Cambiar de coche (tu función pública ya expuesta)
            selectCoach(targetId);

            // Tras render, quitar fade en el nuevo contenedor
            requestAnimationFrame(() => {
                const newSeatMap = document.querySelector('.seats-layout');
                if (newSeatMap) {
                    // forzamos reflow para asegurar transición
                    void newSeatMap.offsetWidth;
                    newSeatMap.classList.remove('fade-out');
                }
            });
        }, 150); // Igual a .15s del CSS
    } else {
        // Fallback si no se encontró el contenedor
        selectCoach(targetId);
    }
}

function enableSeatmapSwipe() {
    const seatMap = document.querySelector('.seats-layout');
    if (!seatMap || seatMap.dataset.swipeBound === '1') return; // evitas duplicados
    seatMap.dataset.swipeBound = '1';

    seatMap.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0];
        __touchStartX = t.clientX;
        __touchStartY = t.clientY;
        __touchStartTime = Date.now();
    }, { passive: true });

    seatMap.addEventListener('touchend', (e) => {
        const t = e.changedTouches[0];
        const dx = t.clientX - __touchStartX;
        const dy = t.clientY - __touchStartY;
        const dt = Date.now() - __touchStartTime;

        const isHorizontal = Math.abs(dx) >= __SWIPE_X_THRESHOLD && Math.abs(dy) <= __SWIPE_Y_MAX;
        const isFastEnough = dt <= __SWIPE_TIME_MAX;

        if (isHorizontal && isFastEnough) {
            if (dx < 0) __changeCoachWithFade('next'); // swipe izquierda -> siguiente coche
            else __changeCoachWithFade('prev');        // swipe derecha -> coche anterior
        }
    });
}
// --- fin swipe + fade --- //

// --- PRESIONADO LARGO EN BOTONES DE COCHE (versión corregida) ---
let coachHoldTimer = null;
let coachHoldTriggered = false;

function enableCoachLongPress() {
    const buttons = document.querySelectorAll(".coach-btn");

    buttons.forEach(btn => {
        const coachId = btn.dataset.coachId || btn.textContent.trim().replace(/[ABC]$/, ''); // Extraer ID sin variante

        // 🔴 DOBLE TAP para 470
        if (state.selectedTrain === "470") {
            btn.addEventListener("click", (e) => {
                const now = Date.now();

                // Cerrar selector existente antes de procesar
                const existingSelector = document.querySelector('.variant-selector-popup');
                if (existingSelector) {
                    existingSelector.remove();
                }

                // Si es doble tap (mismo botón, menos de 300ms)
                if (coachLastTappedId === coachId && (now - coachLastTapTime) < COACH_DOUBLE_TAP_DELAY) {
                    e.stopImmediatePropagation();
                    e.preventDefault();

                    // Mostrar selector de variantes
                    show470VariantSelector(coachId, btn);

                    // Resetear
                    coachLastTapTime = 0;
                    coachLastTappedId = null;
                    return false;
                }

                // Registrar tap
                coachLastTapTime = now;
                coachLastTappedId = coachId;

                // Permitir tap normal después de un pequeño delay para detectar doble tap
                setTimeout(() => {
                    // Solo ejecutar si no hubo doble tap
                    if (coachLastTappedId === coachId) {
                        selectCoach(coachId);
                        coachLastTapTime = 0;
                        coachLastTappedId = null;
                    }
                }, COACH_DOUBLE_TAP_DELAY + 10);
            });
        } else {
            // Comportamiento normal para otros trenes
            btn.addEventListener("click", () => selectCoach(coachId));
        }

        // LONG PRESS (estadísticas) - funciona en todos los trenes
        btn.addEventListener("mousedown", startPress);
        btn.addEventListener("touchstart", startPress, { passive: true });
        btn.addEventListener("mouseup", endPress);
        btn.addEventListener("touchend", endPress);
        btn.addEventListener("touchcancel", endPress);

        function startPress(e) {
            coachHoldTriggered = false;
            btn.dataset.longpressLock = "0";

            clearTimeout(coachHoldTimer);
            coachHoldTimer = setTimeout(() => {
                coachHoldTriggered = true;
                btn.dataset.longpressLock = "1";

                // Cerrar selector de variantes si está abierto
                const existingSelector = document.querySelector('.variant-selector-popup');
                if (existingSelector) {
                    existingSelector.remove();
                }

                showCoachStats(coachId);
            }, 600);
        }

        function endPress(e) {
            clearTimeout(coachHoldTimer);
            coachHoldTriggered = false;
        }
    });
}

// Muestra la ventanita con número de asientos ocupados/libres (versión corregida)
function showCoachStats(coachId) {
    // 1) Intentar obtener la definición del coche desde trainModels
    const train = trainModels[state.selectedTrain];
    let coachDef = null;
    if (train && Array.isArray(train.coaches)) {
        coachDef = train.coaches.find(c => String(c.id) === String(coachId));
    }

    // 2) Obtén lista de IDs de asiento del layout
    let seatIds = [];

    if (coachDef) {
        // 🔴 NUEVO: Usar getCurrentCoachLayout para obtener el layout correcto
        const layout = getCurrentCoachLayout(coachDef);

        if (Array.isArray(layout)) {
            layout.forEach(block => {
                if (block.type === 'seats' && Array.isArray(block.positions)) {
                    block.positions.forEach(row => {
                        row.forEach(cell => {
                            if (cell === null) return;
                            // Normalizamos a string
                            const sid = String(cell);
                            // Excluir marcadores no-asiento
                            const nonSeatMarkers = ['WC', 'EQ', 'MESA', 'PMR', 'ESPACIO', 'BANO', 'BAÑO', 'MIN', 'S1', 'S2', 'S3', 'S4'];
                            // Verificar si el asiento contiene algún marcador (case insensitive)
                            const isNonSeat = nonSeatMarkers.some(marker =>
                                sid.toUpperCase().includes(marker)
                            );
                            if (isNonSeat) return;
                            seatIds.push(sid);
                        });
                    });
                }
            });
        }
    }

    // Fallback: si no hemos obtenido asientos desde layout, construir lista desde state.seatData keys
    if (seatIds.length === 0) {
        const keys = Object.keys(state.seatData || {});
        const prefix = `${coachId}-`;
        keys.forEach(k => {
            if (k.startsWith(prefix)) {
                // extraer parte posterior (por ejemplo C1-12 -> 12)
                const idPart = k.slice(prefix.length);
                seatIds.push(String(idPart));
            }
        });
    }

    // Evitar duplicados
    seatIds = Array.from(new Set(seatIds));

    const total = seatIds.length;

    // 3) Contar ocupados: existe state.seatData[getSeatKey(coachId, seatId)] con .stop
    let occupied = 0;
    seatIds.forEach(id => {
        try {
            const key = getSeatKey(coachId, id);
            if (state.seatData && state.seatData[key] && state.seatData[key].stop) {
                occupied += 1;
            }
        } catch (e) {
            console.warn('showCoachStats: error comprobando asiento', e);
        }
    });

    const free = Math.max(0, total - occupied);

    // 4) Mostrar popup
    const popup = document.createElement("div");
    popup.className = "coach-popup";
    popup.innerHTML = `
        <div class="coach-popup-content">
            <strong>${coachId}</strong><br>
            Ocupados: ${occupied}<br>
            Libres: ${free}<br>
            Porcentaje: ${total > 0 ? Math.round((occupied / total) * 100) : 0}%
        </div>
    `;

    document.body.appendChild(popup);

    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.zIndex = "9999";

    setTimeout(() => popup.remove(), 2500);
}

// Mostrar selector de variantes del 470
function show470VariantSelector(coachId, buttonElement) {
    // Eliminar selector previo si existe
    const existingSelector = document.querySelector('.variant-selector-popup');
    if (existingSelector) existingSelector.remove();

    const currentVariant = state.coach470Variants[coachId] || "A";

    // Crear overlay modal obligatorio
    const modal = document.createElement("div");
    modal.className = "modal-overlay variant-modal-overlay";
    modal.innerHTML = `
        <div class="variant-selector-popup modal-required">
            <div class="variant-selector-content">
                <div class="variant-selector-title">
                    ${coachId} - Seleccionar variante
                    <small style="display: block; font-size: 0.75rem; font-weight: normal; margin-top: 0.25rem; color: #6b7280;">
                        Elige una variante para continuar
                    </small>
                </div>
                <button class="variant-option ${currentVariant === 'A' ? 'active' : ''}" 
                        onclick="select470Variant('${coachId}', 'A')">
                    Variante A
                </button>
                <button class="variant-option ${currentVariant === 'B' ? 'active' : ''}" 
                        onclick="select470Variant('${coachId}', 'B')">
                    Variante B
                </button>
                <button class="variant-option ${currentVariant === 'C' ? 'active' : ''}" 
                        onclick="select470Variant('${coachId}', 'C')">
                    Variante C
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    // Prevenir que clicks dentro del popup lo cierren
    const popupElement = modal.querySelector('.variant-selector-popup');
    if (popupElement) {
        popupElement.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    lockBodyScroll();

    // Prevenir cierre al hacer click en el overlay
    modal.addEventListener('click', (e) => {
        // Si el click fue en el overlay (no en el popup), no hacer nada
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            // Opcional: pequeña animación de "sacudida" para indicar que no se puede cerrar
            const popup = modal.querySelector('.variant-selector-popup');
            if (popup) {
                popup.style.animation = 'none';
                setTimeout(() => {
                    popup.style.animation = 'variantShake 0.3s ease';
                }, 10);
            }
        }
    });

    // Esperar a que el DOM se actualice
    requestAnimationFrame(() => {
        const popupElement = modal.querySelector('.variant-selector-popup');
        if (!popupElement) return;

        const rect = buttonElement.getBoundingClientRect();
        const popupHeight = popupElement.offsetHeight || 240;
        const popupWidth = popupElement.offsetWidth || 200;

        // Calcular posición centrada debajo del botón
        let top = rect.bottom + 10;
        let left = rect.left + (rect.width / 2);

        // Ajustar si se sale de la pantalla por abajo
        if (top + popupHeight > window.innerHeight) {
            top = rect.top - popupHeight - 10; // Mostrar arriba del botón
        }

        // Ajustar si se sale por la derecha
        if (left + (popupWidth / 2) > window.innerWidth) {
            left = window.innerWidth - (popupWidth / 2) - 20;
        }

        // Ajustar si se sale por la izquierda
        if (left - (popupWidth / 2) < 0) {
            left = (popupWidth / 2) + 20;
        }

        popupElement.style.position = "fixed";
        popupElement.style.top = `${top}px`;
        popupElement.style.left = `${left}px`;
        popupElement.style.transform = "translateX(-50%)";
        popupElement.style.zIndex = "10002";
    });

}

// Seleccionar variante del 470
function select470Variant(coachId, variant) {
    state.coach470Variants[coachId] = variant;
    localStorage.setItem('coach470Variants', JSON.stringify(state.coach470Variants));

    saveData();

    // Cerrar modal obligatorio
    const overlay = document.querySelector('.variant-modal-overlay');
    if (overlay) overlay.remove();

    unlockBodyScroll();

    // Re-renderizar
    if (state.selectedCoach === coachId) {
        render();
    } else {
        render();
    }

    closeVariantSelector();

    // 🔴 NUEVO: Resetear variables de doble tap
    coachLastTapTime = 0;
    coachLastTappedId = null;

    // Re-renderizar si estamos viendo ese coche
    if (state.selectedCoach === coachId) {
        render();
    } else {
        // Si no estamos en ese coche, solo actualizar el header
        render();
    }
}

// Cerrar selector de variantes
function closeVariantSelector() {
    // NO hacer nada si es modal obligatorio
    const isModalRequired = document.querySelector('.modal-required');
    if (isModalRequired) return;

    const popup = document.querySelector('.variant-selector-popup');
    if (popup) popup.remove();

    // Resetear variables de doble tap al cerrar
    coachLastTapTime = 0;
    coachLastTappedId = null;
}

// Calcular ocupación total del tren
function getTotalTrainOccupancy() {
    const train = trainModels[state.selectedTrain];
    if (!train || !train.coaches) return { occupied: 0, total: 0, percentage: 0 };

    let totalSeats = 0;
    let occupiedSeats = 0;

    train.coaches.forEach(coach => {
        const coachLayout = getCurrentCoachLayout(coach);

        // Contar asientos totales del coche
        const coachSeats = coachLayout
            .flatMap(block => block.type === "seats" ? block.positions : [])
            .flat()
            .filter(n => {
                if (n === null) return false;
                const str = String(n);
                // Excluir asientos especiales
                const nonSeatMarkers = ['WC', 'EQ', 'MESA', 'MIN', 'S1', 'S2', 'S3', 'S4'];
                return !nonSeatMarkers.some(marker => str.toUpperCase().includes(marker));
            }).length;

        totalSeats += coachSeats;

        // Contar ocupados en este coche
        const prefix = `${coach.id}-`;
        Object.keys(state.seatData || {}).forEach(key => {
            if (key.startsWith(prefix) && state.seatData[key]?.stop) {
                occupiedSeats++;
            }
        });
    });

    const percentage = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

    return { occupied: occupiedSeats, total: totalSeats, percentage };
}

// Delegación de eventos para botones de coche (evita problemas con re-renders)
document.addEventListener('click', function(e) {
    const coachBtn = e.target.closest('.coach-btn');
    if (coachBtn && !coachBtn.dataset.longpressLock) {
        const coachId = coachBtn.dataset.coachId || coachBtn.textContent.trim();

        // Para tren 470: gestionar doble tap
        if (state.selectedTrain === "470") {
            const now = Date.now();
            if (coachLastTappedId === coachId && (now - coachLastTapTime) < COACH_DOUBLE_TAP_DELAY) {
                e.stopPropagation();
                e.preventDefault();
                show470VariantSelector(coachId, coachBtn);
                coachLastTapTime = 0;
                coachLastTappedId = null;
                return;
            }
            coachLastTapTime = now;
            coachLastTappedId = coachId;
            setTimeout(() => {
                if (coachLastTappedId === coachId) {
                    selectCoach(coachId);
                    coachLastTapTime = 0;
                    coachLastTappedId = null;
                }
            }, COACH_DOUBLE_TAP_DELAY + 10);
        } else {
            selectCoach(coachId);
        }
    }
});

// Reaplicar después de render (los botones se regeneran)
document.addEventListener("DOMContentLoaded", enableCoachLongPress);
const domObserver = new MutationObserver(() => {
    enableCoachLongPress();
    enableSeatmapSwipe();
});
domObserver.observe(document.body, { childList: true, subtree: true });

function openBackupsPanel() {
    const backupsKey = `autoBackups_${state.selectedTrain}`;
    let backups = [];

    try {
        const saved = localStorage.getItem(backupsKey);
        if (saved) backups = JSON.parse(saved);
    } catch (e) {
        console.error("Error loading backups");
    }

    if (backups.length === 0) {
        alert('No hay backups automáticos disponibles para este tren.');
        return;
    }

    // Ordenar del más reciente al más antiguo
    backups.reverse();

    const backupsHTML = backups.map((backup, index) => {
        const date = new Date(backup.timestamp);
        const dateStr = date.toLocaleDateString('es-ES');
        const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const seatCount = Object.keys(backup.seatData || {}).length;
        const incidentCount = Object.keys(backup.incidents || {}).length;

        return `
            <div class="backup-item">
                <div class="backup-info">
                    <strong>${dateStr} - ${timeStr}</strong>
                    <small>Asientos: ${seatCount} | Incidencias: ${incidentCount}</small>
                    ${backup.trainNumber ? `<small>Tren: ${backup.trainNumber}</small>` : ''}
                </div>
                <button class="backup-restore-btn" onclick="restoreBackup(${backups.length - 1 - index})">
                    Restaurar
                </button>
            </div>
        `;
    }).join('');

    const modal = `
        <div class="modal-overlay" onclick="closeBackupsPanel(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Backups automáticos (${backups.length})</h3>
                        <button class="close-btn" onclick="closeBackupsPanel()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="about-content" style="max-height: 500px; overflow-y: auto;">
                    ${backupsHTML}
                </div>
                <div class="modal-footer">
                    <button class="clear-btn delete-btn" onclick="clearAllBackups()">
                        Borrar todos los backups
                    </button>
                    <button class="clear-btn" onclick="closeBackupsPanel()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    lockBodyScroll();
}

function closeBackupsPanel(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();
    }

    if (!document.querySelector('.modal-overlay')) {
        unlockBodyScroll();
    }
}

function restoreBackup(index) {
    const backupsKey = `autoBackups_${state.selectedTrain}`;
    let backups = [];

    try {
        const saved = localStorage.getItem(backupsKey);
        if (saved) backups = JSON.parse(saved);
    } catch (e) {
        alert('Error al cargar backups');
        return;
    }

    const backup = backups[index];
    if (!backup) {
        alert('Backup no encontrado');
        return;
    }

    const date = new Date(backup.timestamp).toLocaleString('es-ES');

    if (confirm(`¿Restaurar backup del ${date}?\n\nEsto reemplazará los datos actuales.`)) {
        // Restaurar datos
        state.seatData = backup.seatData || {};
        state.trainDirection = backup.trainDirection || {};
        state.serviceNotes = backup.serviceNotes || "";
        state.incidents = backup.incidents || {};

        if (backup.trainNumber) {
            state.trainNumber = backup.trainNumber;
            localStorage.setItem('trainNumber', backup.trainNumber);
        }

        if (backup.currentStop) {
            state.currentStop = backup.currentStop;
            localStorage.setItem('currentStop', backup.currentStop);
        }

        if (state.selectedTrain === "470" && backup.coach470Variants) {
            state.coach470Variants = backup.coach470Variants;
            localStorage.setItem('coach470Variants', JSON.stringify(backup.coach470Variants));
        }

        // Guardar en localStorage
        saveData();

        closeBackupsPanel();
        render();

        alert('✅ Backup restaurado correctamente');
    }
}

function clearAllBackups() {
    if (confirm('¿Seguro que quieres borrar TODOS los backups automáticos?\n\nEsta acción no se puede deshacer.')) {
        const backupsKey = `autoBackups_${state.selectedTrain}`;
        localStorage.removeItem(backupsKey);
        closeBackupsPanel();
        alert('Todos los backups han sido borrados');
    }
}

function toggleMoreOptions() {
    const menu = document.getElementById('more-options-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Cerrar menú al hacer clic fuera
document.addEventListener('click', function(e) {
    const menu = document.getElementById('more-options-menu');
    const btn = e.target.closest('.more-options-btn');

    if (menu && !menu.contains(e.target) && !btn) {
        menu.classList.add('hidden');
    }
});

function toggleShareSubmenu() {
    const submenu = document.getElementById('share-submenu');
    const importSubmenu = document.getElementById('import-submenu');

    if (submenu) {
        submenu.classList.toggle('hidden');
        // Cerrar el otro submenú
        if (importSubmenu) importSubmenu.classList.add('hidden');
    }
}

function toggleImportSubmenu() {
    const submenu = document.getElementById('import-submenu');
    const shareSubmenu = document.getElementById('share-submenu');

    if (submenu) {
        submenu.classList.toggle('hidden');
        // Cerrar el otro submenú
        if (shareSubmenu) shareSubmenu.classList.add('hidden');
    }
}

// ============================================
// SISTEMA DE COMPARTIR POR QR
// ============================================
// Importado desde src/features/qr-sharing.js
// Las funciones se cargan dinámicamente y se exportan a window


// ============================================
// EXPORTACIÓN DE FUNCIONES GLOBALES
// ============================================
// Sistema centralizado de exports para event handlers en HTML
Object.assign(window, {
    // Navegación y selección
    selectCoach, selectSeat, selectTrain, navigateToSeat,

    // Gestión de asientos
    clearSeat, clearAllData, updateSeat, updateSeatFromList,
    toggleFlag, updateComment, deleteComment,
    handleSeatPress, handleSeatRelease, handleSeatCancel, handleSeatMove,

    // Modales principales
    closeModal, updateSearch, openAbout, closeAbout,
    openReadmeModal, closeReadmeModal,
    openManualTecnico, closeManualTecnico,

    // Filtros
    toggleFiltersMenu, openStopFilter, openRouteFilter, openSeatFilter,
    clearFilterHighlight, closeFilterModal,
    updateStopFilterSuggestions, selectStopForFilter,
    updateRouteFromSuggestions, selectRouteFromStop,
    updateRouteToSuggestions, selectRouteToStop,
    searchSeatFilter, closeFilterInputModal,

    // Modales genéricos
    showConfirmModal, closeConfirmModal,

    // Scroll y modal helpers
    saveModalScrollPosition, restoreModalScrollPosition,
    handleModalOverlayInteraction, lockBodyScroll, unlockBodyScroll,
    modalSwipeStart, modalSwipeMove, modalSwipeEnd,

    // Tren y configuración
    toggleDirection, toggleTrainSelector, showTrainNumberPrompt,
    setCurrentStop, updateCurrentStopSearch,
    toggleDarkMode, toggleSeatRotation, toggleHeaderCollapse,

    // Variantes 470
    show470VariantSelector, select470Variant, closeVariantSelector,

    // Notas e incidencias
    openServiceNotes, updateServiceNotes, clearServiceNotes, closeServiceNotes,
    toggleIncident, openIncidentNote, saveIncidentNote, closeIncidentNote,
    openIncidentsPanel, closeIncidentsPanel, removeIncident, clearAllIncidents,
    handleDoorPress, handleDoorRelease, handleDoorCancel, getDoorSideText,

    // Backups
    openBackupsPanel, closeBackupsPanel, restoreBackup, clearAllBackups,

    // Compartir/Importar
    exportTurn, importTurn, toggleMoreOptions,
    toggleShareSubmenu, toggleImportSubmenu,
    // generateQRCode, closeQRModal, scanQRCode, closeScanModal exportadas desde qr-sharing.js
    // uploadTurnToServer, downloadTurnFromServer, removeModalAndUnlock exportadas desde qr-sharing.js

    // Utilidades
    getTotalTrainOccupancy,

    // Funciones auxiliares (necesarias para módulos externos)
    getAllTrains, saveData, render
});

// Exportar variables de estado y datos (necesarias para módulos externos)
// IMPORTANTE: Exportar como getters para asegurar que siempre obtienen el valor actualizado
Object.defineProperty(window, 'state', { get: () => state });
Object.defineProperty(window, 'stops', { get: () => stops });
Object.defineProperty(window, 'stationScreens', { get: () => stationScreens });

// MOVIDO A src/utils/modal-helpers.js
// Ver: setupModalScrollBehavior()

// Inicializar
loadData();

// Mostrar prompt de número de tren si no existe
if (!state.trainNumber) {
    // Esperar un momento para que se cargue el DOM
    setTimeout(() => {
        showTrainNumberPrompt();
    }, 100);
}

// ============================================
// PANTALLAS DE ESTACIÓN
// ============================================
// Importado desde src/features/station-screens.js
// Las funciones se cargan dinámicamente y se exportan a window

// ============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================

// Función de inicialización principal
async function initializeApp() {
    try {
        // 1. Cargar datos desde JSON
        console.log('📦 Cargando datos desde archivos JSON...');
        const jsonLoaded = await loadJSONData();

        if (!jsonLoaded) {
            console.error('⚠️ Error cargando datos JSON, la aplicación podría no funcionar correctamente');
        }

        // 2. Cargar datos guardados en localStorage
        loadData();

        // 3. Iniciar backup automático
        startAutoBackup();

        // 4. Renderizar interfaz
        render();

        // 5. Tras el primer render, engancha swipe
        enableSeatmapSwipe();

        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
    }
}

// Iniciar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}