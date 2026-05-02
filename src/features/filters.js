/**
 * ============================================
 * MÓDULO DE FILTROS
 * ============================================
 *
 * Gestión completa del sistema de filtrado de asientos:
 * - Filtrado por parada de bajada
 * - Filtrado por tramo recorrido
 * - Filtrado por número de asiento
 * - Filtrado por enlaces
 * - Filtrado por comentarios
 * - Navegación visual entre resultados
 */

// ============================================
// FUNCIONES AUXILIARES DE DATOS
// ============================================

/**
 * Obtiene las paradas disponibles para filtrar según la parada actual
 */
function getAvailableStopsForFilter() {
    if (!window.state.trainNumber || !window.trainRoutes[window.state.trainNumber]) return [];

    const route = window.trainRoutes[window.state.trainNumber];

    if (!window.state.currentStop) {
        return route; // Todas disponibles si no hay parada actual
    }

    const currentIndex = route.indexOf(window.state.currentStop);
    if (currentIndex === -1) return route;

    // Solo paradas desde la actual hasta el final
    return route.slice(currentIndex);
}

/**
 * Obtiene los asientos que se bajan en una parada específica
 */
function getSeatsForStop(stopName) {
    const seats = [];
    Object.keys(window.state.seatData).forEach(key => {
        const seatInfo = window.state.seatData[key];
        if (seatInfo && seatInfo.stop && seatInfo.stop.full === stopName) {
            const parts = key.split('-');
            const coachId = parts[0];
            const seatNum = parts.length === 3 ? parts[2] : parts[1];
            seats.push({ coach: coachId, seat: seatNum, info: seatInfo });
        }
    });
    return seats;
}

/**
 * Obtiene los asientos en un tramo específico (desde-hasta)
 */
function getSeatsInRoute(fromStop, toStop) {
    if (!window.state.trainNumber || !window.trainRoutes[window.state.trainNumber]) return [];

    const route = window.trainRoutes[window.state.trainNumber];
    const fromIndex = route.indexOf(fromStop);
    const toIndex = route.indexOf(toStop);

    // validación: ambos en ruta y from antes que to
    if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) return [];

    const seats = [];

    Object.keys(window.state.seatData).forEach(key => {
        const seatInfo = window.state.seatData[key];
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

/**
 * Obtiene información de un asiento por su número
 */
function getSeatInfo(seatNumber) {
    // Buscar en todos los coches
    const keys = Object.keys(window.state.seatData);
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
        data: window.state.seatData[foundKey]
    };
}

// ============================================
// GESTIÓN DE ESTADO DE FILTROS
// ============================================

/**
 * Aplica el resaltado visual de filtro
 */
function applyFilterHighlight(seatKeys) {
    window.filterState.active = true;
    window.filterState.data = seatKeys;
    window.render();
}

/**
 * Limpia el filtro visual activo
 */
function clearFilterHighlight() {
    window.filterState.active = false;
    window.filterState.type = null;
    window.filterState.data = null;
    window.render();
}

// ============================================
// FILTRO POR PARADA
// ============================================

function openStopFilter() {
    window.toggleFiltersMenu();

    const availableStops = getAvailableStopsForFilter();
    if (availableStops.length === 0) {
        alert('No hay paradas disponibles para filtrar');
        return;
    }

    const modal = window.createInputModalWithSuggestions({
        title: 'Filtrar por parada de bajada',
        label: 'Introduce el nombre de la parada:',
        placeholder: 'Escribe para buscar...',
        inputId: 'stop-filter-input',
        suggestionsId: 'stop-suggestions',
        oninput: 'updateStopFilterSuggestions'
    });

    window.showModal(modal, () => {
        const inp = document.getElementById('stop-filter-input');
        if (inp) inp.focus();
    });
}

function updateStopFilterSuggestions(query) {
    const availableStops = getAvailableStopsForFilter();
    const normalizedQuery = window.normalizeText(query);
    const suggestions = availableStops.filter(stop =>
        window.normalizeText(stop).includes(normalizedQuery)
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
    window.closeFilterInputModal();

    const seats = getSeatsForStop(stopName);

    if (seats.length === 0) {
        alert(`No hay asientos con destino a ${stopName}`);
        return;
    }

    // Preguntar si quiere resaltar con modal personalizado
    window.showConfirmModal(
        `Se encontraron ${seats.length} asiento(s) con destino a ${stopName}\n\n` +
        `¿Deseas resaltarlos visualmente en la plantilla?`,
        () => {
            // Si acepta
            const seatKeys = seats.map(s => window.getSeatKey(s.coach, s.seat));
            window.filterState.type = 'stop';
            applyFilterHighlight(seatKeys);
            showStopFilterResults(stopName, seats);
        },
        () => {
            // Si cancela, solo mostrar resultados sin resaltar
            showStopFilterResults(stopName, seats);
        }
    );
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

    const modal = window.createFilterResultsModal({
        title: `Asientos con destino a ${stopName}`,
        total: seats.length,
        details: details
    });

    window.showModal(modal);
}

// ============================================
// FILTRO POR TRAMO
// ============================================

function openRouteFilter() {
    window.toggleFiltersMenu();

    const availableStops = getAvailableStopsForFilter();
    if (availableStops.length < 2) {
        alert('No hay suficientes paradas disponibles');
        return;
    }

    const modal = window.createInputModalWithSuggestions({
        title: 'Filtrar por tramo recorrido',
        label: 'Introduce la parada inicial:',
        placeholder: 'Escribe para buscar...',
        inputId: 'route-from-input',
        suggestionsId: 'route-from-suggestions',
        oninput: 'updateRouteFromSuggestions'
    });

    window.showModal(modal, () => {
        const inp = document.getElementById('route-from-input');
        if (inp) inp.focus();
    });
}

function updateRouteFromSuggestions(query) {
    const availableStops = getAvailableStopsForFilter();
    const normalizedQuery = window.normalizeText(query);
    const suggestions = availableStops.filter(stop =>
        window.normalizeText(stop).includes(normalizedQuery)
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
    window.closeFilterInputModal();

    const modal = window.createInputModalWithSuggestions({
        title: 'Filtrar por tramo recorrido',
        extraContent: `<p style="margin-bottom: 1rem; color: #4f46e5; font-weight: 500;">Desde: ${fromStop}</p>`,
        label: 'Introduce la parada final:',
        placeholder: 'Escribe para buscar...',
        inputId: 'route-to-input',
        suggestionsId: 'route-to-suggestions',
        oninput: 'updateRouteToSuggestions',
        oninputArgs: `'${fromStop}'`
    });

    window.showModal(modal, () => {
        const inp = document.getElementById('route-to-input');
        if (inp) inp.focus();
    });
}

function updateRouteToSuggestions(query, fromStop) {
    const availableStops = getAvailableStopsForFilter();
    const normalizedQuery = window.normalizeText(query);
    const suggestions = availableStops.filter(stop =>
        window.normalizeText(stop).includes(normalizedQuery)
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
    window.closeFilterInputModal();

    const seats = getSeatsInRoute(fromStop, toStop);

    if (seats.length === 0) {
        alert(`No hay viajeros en el tramo ${fromStop} - ${toStop}`);
        return;
    }

    window.showConfirmModal(
        `Se encontraron ${seats.length} viajero(s) en el tramo\n` +
        `${fromStop} → ${toStop}\n\n` +
        `¿Deseas resaltarlos visualmente en la plantilla?`,
        () => {
            // Si acepta
            const seatKeys = seats.map(s => window.getSeatKey(s.coach, s.seat));
            window.filterState.type = 'route';
            applyFilterHighlight(seatKeys);
            showRouteFilterResults(fromStop, toStop, seats);
        },
        () => {
            // Si cancela, solo mostrar resultados
            showRouteFilterResults(fromStop, toStop, seats);
        }
    );
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

    const modal = window.createFilterResultsModal({
        title: 'Viajeros en tramo',
        subtitle: `${fromStop} → ${toStop}`,
        total: seats.length,
        totalLabel: 'viajero(s)',
        details: details
    });

    window.showModal(modal);
}

// ============================================
// FILTRO POR ASIENTO
// ============================================

function openSeatFilter() {
    window.toggleFiltersMenu();

    const modal = window.createSimpleInputModal({
        title: 'Filtrar por asiento',
        label: 'Introduce el número de asiento:',
        placeholder: 'Ej: 42',
        inputId: 'seat-filter-input',
        onEnter: 'searchSeatFilter',
        onSearch: 'searchSeatFilter'
    });

    window.showModal(modal, () => {
        const inp = document.getElementById('seat-filter-input');
        if (inp) inp.focus();
    });
}

function searchSeatFilter() {
    const input = document.getElementById('seat-filter-input');
    const seatNum = input.value.trim();

    if (!seatNum) return;

    window.closeFilterInputModal();

    const seatInfo = getSeatInfo(seatNum);

    if (!seatInfo) {
        alert(`No se encontró información para el asiento ${seatNum}`);
        return;
    }

    showSeatFilterResults(seatInfo);
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

    const modal = window.createFilterResultsModal({
        title: `Información del asiento ${seat}`,
        total: 1,
        totalLabel: '',
        details: info,
        actions: [
            {
                label: 'Mostrar',
                onclick: `navigateToSeat('${coach}', '${seat}')`,
                style: 'background-color: #4f46e5;'
            }
        ]
    });

    window.showModal(modal);
}

// ============================================
// FILTROS DE LISTA (ENLACES Y COMENTARIOS)
// ============================================

// Estado temporal para la lista actualmente mostrada en el overlay
let _currentFilterList = [];      // array de seatKeys: ['C1-12', 'C2-3', ...]
let _currentFilterIndex = -1;     // índice del asiento actualmente enfocado en la lista

/**
 * Helper para convertir seatKey a partes (coach, seat)
 */
function seatKeyToParts(key) {
    const [coach, seat] = key.split('-');
    return { coach, seat };
}

/**
 * Centra y marca visualmente un asiento (no cierra overlays)
 */
function scrollSeatIntoViewAndFlash(seatKey) {
    const { coach, seat } = seatKeyToParts(seatKey);

    // Cambiar al coche (si procede) y renderizar
    window.state.selectedCoach = coach;
    window.render();

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
        if (window.filterState) {
            window.filterState.active = true;
            window.filterState.data = _currentFilterList.slice();
            window.filterState.type = window.filterState.type || 'custom';
        }
    }, 120);
}

/**
 * Navega a un índice concreto de la lista mostrada en el overlay
 */
function navigateToFilterIndex(index) {
    if (!Array.isArray(_currentFilterList) || _currentFilterList.length === 0) return;

    // Normalizar índice en rango circular
    if (index < 0) index = _currentFilterList.length - 1;
    if (index >= _currentFilterList.length) index = 0;

    _currentFilterIndex = index;
    const key = _currentFilterList[_currentFilterIndex];

    // Mantener overlay abierto: NO llamamos a closeFilterModal()
    // Solo centramos y pintamos el asiento y actualizamos estado de filtro
    window.filterState.active = true;
    window.filterState.data = _currentFilterList.slice();
    window.filterState.type = window.filterState.type || 'custom';
    window.filterState.highlightIndex = _currentFilterIndex; // opcional para uso visual
    window.render(); // para que aplique clases 'filtered-seat'
    scrollSeatIntoViewAndFlash(key);

    // Actualizar contador dentro del modal (si existe)
    const counter = document.getElementById('filter-list-counter');
    if (counter) counter.textContent = `${_currentFilterIndex + 1} / ${_currentFilterList.length}`;
}

/**
 * Función llamada por los botones "Ir" del modal (no cierra modal)
 */
function onFilterListGo(index) {
    navigateToFilterIndex(index);
}

/**
 * Función para abrir un modal tipo lista (genérico)
 * type: 'links' | 'comments' u otro identificador
 * items: array de objetos { key: 'C1-12', coach: 'C1', seat: '12', extra: 'texto comentario' }
 */
function showFilterListModal(type, items) {
    // Normalizar lista de keys
    _currentFilterList = items.map(i => i.key);
    _currentFilterIndex = (_currentFilterList.length > 0) ? 0 : -1;
    window.filterState.type = type;
    window.filterState.active = true;
    window.filterState.data = _currentFilterList.slice();

    const title = type === 'links' ? 'Enlaces' : 'Con comentario';
    const modal = window.createListModal({
        title: title,
        items: items,
        onItemClick: 'onFilterListGo'
    });

    window.showModal(modal, () => {
        // Inicial: si hay elementos, centrar el primero
        if (_currentFilterList.length > 0) {
            navigateToFilterIndex(0);
        }
    });
}

/**
 * Abrir filtro "Enlaces" (asientos con flag .enlace)
 */
function openLinksFilter() {
    window.toggleFiltersMenu();
    const items = [];

    Object.keys(window.state.seatData).forEach(key => {
        const info = window.state.seatData[key];
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

/**
 * Abrir filtro "Por comentario" (asientos con comentarioFlag o comentario)
 */
function openCommentsFilter() {
    window.toggleFiltersMenu();
    const items = [];

    Object.keys(window.state.seatData).forEach(key => {
        const info = window.state.seatData[key];
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

// ============================================
// NAVEGACIÓN Y UTILIDADES
// ============================================

/**
 * Navega a un asiento específico cerrando filtros
 */
function navigateToSeat(coachId, seatNum) {
    // Cerrar modal de filtro
    window.closeFilterModal();

    // Cambiar al coche correcto
    window.state.selectedCoach = coachId;

    // Re-renderizar para mostrar el coche
    window.render();

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

/**
 * Cierra el modal de filtro
 */
function closeFilterModal(event) {
    window.closeGenericModal('.filter-modal', event);
}

/**
 * Toggle del menú de filtros
 */
function toggleFiltersMenu() {
    const menu = document.getElementById('filters-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// ============================================
// EXPORTS
// ============================================

// Exportar todas las funciones a window para acceso global
Object.assign(window, {
    // Funciones auxiliares de datos
    getAvailableStopsForFilter,
    getSeatsForStop,
    getSeatsInRoute,
    getSeatInfo,

    // Gestión de estado
    applyFilterHighlight,
    clearFilterHighlight,

    // Filtro por parada
    openStopFilter,
    updateStopFilterSuggestions,
    selectStopForFilter,
    showStopFilterResults,

    // Filtro por tramo
    openRouteFilter,
    updateRouteFromSuggestions,
    selectRouteFromStop,
    updateRouteToSuggestions,
    selectRouteToStop,
    showRouteFilterResults,

    // Filtro por asiento
    openSeatFilter,
    searchSeatFilter,
    showSeatFilterResults,

    // Filtros de lista
    scrollSeatIntoViewAndFlash,
    navigateToFilterIndex,
    onFilterListGo,
    showFilterListModal,
    openLinksFilter,
    openCommentsFilter,

    // Navegación y utilidades
    navigateToSeat,
    closeFilterModal,
    toggleFiltersMenu
});

console.log('✅ Módulo de filtros cargado');
