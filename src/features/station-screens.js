// ============================================
// SISTEMA DE PANTALLAS DE ESTACIÓN
// ============================================
// Módulo para gestionar la visualización de pantallas de llegadas/salidas

// Importar dependencias necesarias
// Nota: lockBodyScroll/unlockBodyScroll están en dom.js pero no son módulos ES6
// Las usamos directamente desde window ya que dom.js las exporta globalmente

// Estado interno del módulo
let _currentScreen = "arrivals";

/**
 * Elimina todos los modales de pantallas activos
 */
export function removeAllScreenModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
}

/**
 * Abre el modal de selección de pantallas de estación
 */
export function openScreensModal() {
    removeAllScreenModals();
    const modal = `
        <div class="modal-overlay" onclick="closeScreensModal(event)">
            <div class="modal" onclick="event.stopPropagation()">

                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Pantallas de estación</h3>
                        <button class="close-btn" onclick="closeScreensModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="modal-search">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Buscar por nombre o código ADIF..."
                        oninput="updateScreenSearch(this.value)"
                        autocomplete="off"
                        id="screen-search-input"
                    />

                    <button class="cancel-screens-btn" onclick="closeScreensModal()">
                        Cancelar
                    </button>
                </div>

                <div class="modal-list" id="screen-list"></div>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modal);
    setTimeout(() => {
        const inp = document.getElementById("screen-search-input");
        if (inp) inp.focus();
    }, 50);

    window.lockBodyScroll();
}

/**
 * Cierra el modal de pantallas
 * @param {Event} event - Evento de click
 */
export function closeScreensModal(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.remove();
        window.unlockBodyScroll();
    }
}

/**
 * Actualiza la lista de estaciones filtradas según búsqueda
 * @param {string} query - Texto de búsqueda (nombre o código ADIF)
 */
export function updateScreenSearch(query) {
    const list = document.getElementById("screen-list");
    query = query.toLowerCase().trim();

    // Si está vacío, no mostrar nada
    if (query === "") {
        list.innerHTML = "";
        return;
    }

    // Obtener datos de paradas locales y ADIF
    const stops = window.stops || [];
    const stationScreens = window.stationScreens || {};
    const adifStations = window.adifStations || {};
    const trainRoutes = window.trainRoutes || {};
    const state = window.state || {};

    // Determinar si hay una ruta activa
    const currentTrainNumber = state.trainNumber;
    const currentRoute = currentTrainNumber && trainRoutes[currentTrainNumber];

    // La ruta puede ser un array directo o un objeto con .stops
    let routeStops = [];
    if (currentRoute) {
        if (Array.isArray(currentRoute)) {
            routeStops = currentRoute;
        } else if (currentRoute.stops) {
            routeStops = currentRoute.stops;
        }
    }

    const hasActiveRoute = routeStops.length > 0;

    let availableStations = [];

    if (hasActiveRoute) {
        // Solo mostrar estaciones de la ruta actual
        const adifMetadata = (currentRoute && currentRoute.adifStopsMetadata) || {};

        routeStops.forEach(stopIdentifier => {
            // Verificar si es estación ADIF
            if (adifMetadata[stopIdentifier]) {
                availableStations.push({
                    name: adifMetadata[stopIdentifier].name,
                    identifier: stopIdentifier,
                    source: 'adif',
                    hasScreen: adifMetadata[stopIdentifier].screenCode !== null
                });
            } else if (adifStations[stopIdentifier]) {
                availableStations.push({
                    name: adifStations[stopIdentifier].name,
                    identifier: stopIdentifier,
                    source: 'adif',
                    hasScreen: adifStations[stopIdentifier].screenCode !== null
                });
            } else {
                // Es parada local
                availableStations.push({
                    name: stopIdentifier,
                    identifier: stopIdentifier,
                    source: 'local',
                    hasScreen: stationScreens[stopIdentifier] !== undefined
                });
            }
        });
    } else {
        // No hay ruta activa: mostrar todas las estaciones
        const localStations = stops.map(s => ({
            name: s.full,
            identifier: s.full,
            source: 'local',
            hasScreen: stationScreens[s.full] !== undefined
        }));

        const adifStationsList = Object.entries(adifStations).map(([code, data]) => ({
            name: data.name,
            identifier: code,
            source: 'adif',
            hasScreen: data.screenCode !== null
        }));

        availableStations = [...localStations, ...adifStationsList];
    }

    // Filtrar por nombre o código
    const filtered = availableStations.filter(station => {
        const nameMatch = station.name.toLowerCase().includes(query);
        const codeMatch = station.identifier.toLowerCase().includes(query);
        return nameMatch || codeMatch;
    });

    list.innerHTML = filtered.slice(0, 20).map(station => {
        const badge = station.source === 'adif' ? '<span style="font-size:10px; background:#3b82f6; color:white; padding:2px 6px; border-radius:4px; margin-left:8px;">ADIF</span>' : '';

        return `
            <button class="stop-item" onclick="openStationScreen('${station.identifier.replace(/'/g, "\\'")}')">
                <span class="stop-name">
                    ${station.name} ${badge}
                </span>
            </button>
        `;
    }).join("");
}

/**
 * Abre la pantalla específica de una estación
 * @param {string} name - Nombre de la estación o código ADIF
 */
export function openStationScreen(name) {
    removeAllScreenModals();
    const stationScreens = window.stationScreens || {};
    const adifStations = window.adifStations || {};

    // Intentar obtener código de pantalla desde station-screens.json
    let code = stationScreens[name];

    // Si no existe, verificar si es código ADIF y obtener screenCode
    if (!code && adifStations[name]) {
        code = adifStations[name].screenCode;
    }

    // Si aún no existe código, buscar por nombre en ADIF
    if (!code) {
        const adifStation = Object.values(adifStations).find(
            station => station.name === name
        );
        if (adifStation) {
            code = adifStation.screenCode;
        }
    }

    if (!code) {
        alert("No existe pantalla disponible para esta estación.");
        return;
    }

    const arrivals = `https://pantallas-estaciones.vercel.app/~/?station=${code}&interfaz=arrivals&showHeader=true&showAccess=false&showPlatform=true&showProduct=true&showNumber=true&countdown=true&maxShowStops=-1&showAllTrains=false&subtitle=station-name&fontSize=0`;
    const departures = `https://pantallas-estaciones.vercel.app/~/?station=${code}&interfaz=departures&showHeader=true&showAccess=false&showPlatform=true&showProduct=true&showNumber=true&countdown=true&maxShowStops=-1&showAllTrains=false&subtitle=station-name&fontSize=0`;

    const modal = `
        <div class="modal-overlay" onclick="closeStationScreen(event)">
            <div class="modal" style="height: 100%; border-radius:0;" onclick="event.stopPropagation()">

                <iframe id="screen-iframe" src="${arrivals}" style="width:100%; height:100%; border:none;"></iframe>

                <button class="swipe-btn-left" onclick="toggleScreen()">←</button>
                <button class="swipe-btn-right" onclick="toggleScreen()">→</button>

            </div>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modal);
    window.lockBodyScroll();

    _currentScreen = "arrivals";

    // Guardar URLs en el objeto window para que toggleScreen pueda acceder
    window._arrivalsURL = arrivals;
    window._departuresURL = departures;
}

/**
 * Cierra la pantalla de estación activa
 * @param {Event} event - Evento de click
 */
export function closeStationScreen(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) overlay.remove();
        window.unlockBodyScroll();
    }
}

/**
 * Alterna entre vista de llegadas y salidas
 */
export function toggleScreen() {
    const iframe = document.getElementById("screen-iframe");

    if (_currentScreen === "arrivals") {
        iframe.src = window._departuresURL;
        _currentScreen = "departures";
    } else {
        iframe.src = window._arrivalsURL;
        _currentScreen = "arrivals";
    }
}

// Exportar al objeto window para compatibilidad con HTML inline handlers
if (typeof window !== 'undefined') {
    window.openScreensModal = openScreensModal;
    window.closeScreensModal = closeScreensModal;
    window.updateScreenSearch = updateScreenSearch;
    window.openStationScreen = openStationScreen;
    window.closeStationScreen = closeStationScreen;
    window.toggleScreen = toggleScreen;
}
