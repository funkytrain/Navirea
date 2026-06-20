// ============================================================================
// SEAT-QUERY.JS - Consultas puras sobre datos de asientos
// ============================================================================
// Módulo sin dependencias de DOM ni de window.render/AppState.
// Recibe datos como argumentos y devuelve resultados — testeable en aislamiento.
// Usado por filters.js (UI) y shift-summary.js (exportación).
// ============================================================================

const SeatQuery = {
    /**
     * Devuelve las paradas disponibles para filtrar a partir de la parada actual.
     * @param {string[]} route - Array de nombres de parada en orden
     * @param {string|null} currentStop - Parada actual o null
     * @returns {string[]}
     */
    availableStops(route, currentStop) {
        if (!route || route.length === 0) return [];
        if (!currentStop) return route;

        const idx = route.indexOf(currentStop);
        return idx === -1 ? route : route.slice(idx);
    },

    /**
     * Devuelve los asientos cuya parada de bajada coincide con stopName.
     * @param {Object} seatData - window.state.seatData
     * @param {string} stopName
     * @returns {Array<{coach, seat, info}>}
     */
    seatsForStop(seatData, stopName) {
        return Object.entries(seatData)
            .filter(([, info]) => info && info.stop && info.stop.full === stopName)
            .map(([key, info]) => {
                const parts = key.split('-');
                return {
                    coach: parts[0],
                    seat: parts.length === 3 ? parts[2] : parts[1],
                    info
                };
            });
    },

    /**
     * Devuelve los asientos cuya parada cae dentro del tramo fromStop→toStop.
     * @param {Object} seatData
     * @param {string[]} route
     * @param {string} fromStop
     * @param {string} toStop
     * @returns {Array<{coach, seat, info}>}
     */
    seatsInRoute(seatData, route, fromStop, toStop) {
        const fromIndex = route.indexOf(fromStop);
        const toIndex = route.indexOf(toStop);
        if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) return [];

        return Object.entries(seatData)
            .filter(([, info]) => {
                if (!info || !info.stop) return false;
                const idx = route.indexOf(info.stop.full);
                return idx >= fromIndex && idx <= toIndex;
            })
            .map(([key, info]) => {
                const parts = key.split('-');
                return {
                    coach: parts[0],
                    seat: parts.length === 3 ? parts[2] : parts[1],
                    info
                };
            });
    },

    /**
     * Busca un asiento por número en todos los coches.
     * @param {Object} seatData
     * @param {string|number} seatNumber
     * @returns {{coach, seat, data}|null}
     */
    seatByNumber(seatData, seatNumber) {
        const num = String(seatNumber);
        const entry = Object.entries(seatData).find(([key]) => {
            const parts = key.split('-');
            return (parts.length === 3 ? parts[2] : parts[1]) === num;
        });

        if (!entry) return null;
        const [key, data] = entry;
        const parts = key.split('-');
        return { coach: parts[0], seat: parts.length === 3 ? parts[2] : parts[1], data };
    },

    /**
     * Devuelve todos los asientos que tienen flag de enlace activo.
     * @param {Object} seatData
     * @returns {Array<{coach, seat, info}>}
     */
    seatsWithLink(seatData) {
        return Object.entries(seatData)
            .filter(([, info]) => info && info.enlace)
            .map(([key, info]) => {
                const parts = key.split('-');
                return { coach: parts[0], seat: parts.length === 3 ? parts[2] : parts[1], info };
            });
    },

    /**
     * Devuelve todos los asientos que tienen comentario activo.
     * @param {Object} seatData
     * @returns {Array<{coach, seat, info}>}
     */
    seatsWithComment(seatData) {
        return Object.entries(seatData)
            .filter(([, info]) => info && info.comentarioFlag)
            .map(([key, info]) => {
                const parts = key.split('-');
                return { coach: parts[0], seat: parts.length === 3 ? parts[2] : parts[1], info };
            });
    }
};

window.SeatQuery = SeatQuery;
