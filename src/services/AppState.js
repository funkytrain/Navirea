// ============================================================================
// APPSTATE.JS - Propietario del estado de aplicación
// ============================================================================
// Posee window.state y expone un seam explícito para snapshot/restore y
// notificación al renderer. Los módulos llaman AppState.notify() en lugar de
// window.render() directamente — eso hace que el renderer sea sustituible
// (en tests: AppState.setRenderer(() => {}) para silenciarlo).
// ============================================================================

const AppState = {
    // Campos que se incluyen en los snapshots de undo
    SNAPSHOT_FIELDS: [
        'seatData', 'incidents', 'trainNumber', 'currentStop',
        'serviceNotes', 'importantStop', 'importantStop2'
    ],

    _renderer: null,

    /**
     * Registra la función de renderizado. Llamado una vez desde script.js
     * tras definir render().
     * @param {Function} fn
     */
    setRenderer(fn) {
        this._renderer = fn;
    },

    /**
     * Dispara el renderer registrado. Los feature modules llaman esto
     * en lugar de window.render() directamente.
     */
    notify() {
        if (this._renderer) this._renderer();
    },

    /**
     * Devuelve una copia profunda de los campos mutables del estado.
     * Usada por el sistema de undo para capturar puntos de restauración.
     * @returns {Object}
     */
    snapshot() {
        const s = window.state;
        const snap = {};
        for (const field of this.SNAPSHOT_FIELDS) {
            const val = s[field];
            snap[field] = (val !== null && typeof val === 'object')
                ? JSON.parse(JSON.stringify(val))
                : val;
        }
        return snap;
    },

    /**
     * Restaura el estado a partir de un snapshot previamente capturado.
     * NO llama a notify() — el llamador decide si re-renderizar.
     * @param {Object} snap
     */
    restore(snap) {
        const s = window.state;
        for (const field of this.SNAPSHOT_FIELDS) {
            if (field in snap) s[field] = snap[field];
        }
    },

    /**
     * Lee un subconjunto de campos del estado para el renderer u otros
     * módulos que solo necesitan leer, no escribir.
     * @param {...string} fields
     * @returns {Object}
     */
    getViewState(...fields) {
        const s = window.state;
        if (fields.length === 0) return s;
        const view = {};
        for (const f of fields) view[f] = s[f];
        return view;
    }
};

window.AppState = AppState;
