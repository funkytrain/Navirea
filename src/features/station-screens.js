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
                        placeholder="Introduce estación..."
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
 * @param {string} query - Texto de búsqueda
 */
export function updateScreenSearch(query) {
    const list = document.getElementById("screen-list");
    query = query.toLowerCase().trim();

    // Si está vacío, no mostrar nada
    if (query === "") {
        list.innerHTML = "";
        return;
    }

    // Obtener datos de paradas desde el estado global
    const stops = window.stops || [];
    const stationScreens = window.stationScreens || {};
    const stations = stops.map(s => s.full);

    const filtered = stations.filter(s => s.toLowerCase().includes(query));

    list.innerHTML = filtered.map(name => {
        const hasScreen = stationScreens[name];
        return `
            <button class="stop-item" onclick="openStationScreen('${name}')">
                <span class="stop-name" style="${hasScreen ? 'font-weight:700' : 'text-decoration:line-through; opacity:0.6;'}">
                    ${name}
                </span>
            </button>
        `;
    }).join("");
}

/**
 * Abre la pantalla específica de una estación
 * @param {string} name - Nombre de la estación
 */
export function openStationScreen(name) {
    removeAllScreenModals();
    const stationScreens = window.stationScreens || {};
    const code = stationScreens[name];

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
