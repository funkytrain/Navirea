// ============================================================================
// NETWORK-ALERTS.JS - Avisos de "Estado de la red" de Adif
// ============================================================================
// Mientras la app está abierta con un tren seleccionado, consulta cada pocos
// minutos las incidencias publicadas por Adif y avisa de las que afectan a
// las comunidades por las que pasa ese tren.
//
// PRINCIPIOS DE DISEÑO (los mismos que RealtimeService)
//
//   1. Degrada en silencio. Si el Worker no responde, Adif bloquea la
//      petición o la página cambia de formato, no pasa nada: no hay aviso y
//      la app funciona igual. Ningún error sale de aquí.
//
//   2. No toca window.state ni re-renderiza: el aviso es un nodo propio, así
//      que no entra en los snapshots de undo ni roba el foco de los inputs.
//
//   3. Poco tráfico. Adif protege su web contra el tráfico automático, así
//      que se consulta como mucho cada 5 min y solo con la app visible.
//
//   4. El aviso es persistente: no caduca solo, porque su razón de ser es que
//      el interventor esté ocupado. Se descarta pulsando "Entendido".
// ============================================================================

const NetworkAlerts = {

    // --- Configuración ---------------------------------------------------

    // Cada cuánto se pide la lista al Worker.
    FETCH_INTERVAL: 5 * 60 * 1000,

    // Cada cuánto se reevalúa lo ya descargado (cambio de tren, de ruta...).
    // No hace red: solo recalcula y repinta el aviso.
    EVAL_INTERVAL: 30 * 1000,

    STORAGE_KEY: 'navirea_net_alerts_seen',

    // Comunidad de cada estación. Solo se usa para saber qué comunidades
    // recorre el tren, así que basta con cubrir las estaciones de las rutas;
    // una estación desconocida simplemente no aporta comunidad.
    // Claves normalizadas (ver _norm). Se compara por nombre completo o por
    // prefijo de palabra, de modo que "zaragoza" cubre "Zaragoza Delicias".
    STATION_REGIONS: {
        // Aragón
        'zaragoza': 'Aragón', 'utebo': 'Aragón', 'casetas': 'Aragón',
        'alagon': 'Aragón', 'cabanas': 'Aragón', 'pedrola': 'Aragón',
        'luceni': 'Aragón', 'gallur': 'Aragón',
        // Navarra
        'cortes': 'Navarra', 'ribaforada': 'Navarra', 'tudela': 'Navarra',
        'castejon': 'Navarra', 'marcilla': 'Navarra', 'villafranca': 'Navarra',
        'olite': 'Navarra', 'tafalla': 'Navarra', 'pamplona': 'Navarra',
        'uharte arakil': 'Navarra', 'etxarri aranatz': 'Navarra',
        'altsasu': 'Navarra',
        // La Rioja
        'alfaro': 'La Rioja', 'rincon de soto': 'La Rioja',
        'calahorra': 'La Rioja', 'alcanadre': 'La Rioja', 'logrono': 'La Rioja',
        // País Vasco
        'agurain salvatierra': 'País Vasco', 'alegria dulantzi': 'País Vasco',
        'araia': 'País Vasco', 'manzanos': 'País Vasco',
        'nanclares langraiz': 'País Vasco', 'vitoria gasteiz': 'País Vasco',
        // Castilla y León (Burgos)
        'miranda': 'Castilla y León', 'la puebla arganzon': 'Castilla y León'
    },

    // --- Estado interno ---------------------------------------------------

    _fetchTimer: null,
    _evalTimer: null,
    _started: false,
    _incidents: [],        // última lista válida recibida del Worker
    _lastFetchOk: null,
    _lastFetchTry: 0,
    _fetching: false,
    _shownKey: null,       // incidencias pendientes ya pintadas en el aviso

    get proxyUrl() {
        return window.RENFE_PROXY_URL || null;
    },

    // --- Ciclo de vida ----------------------------------------------------

    start() {
        if (this._started || !this.proxyUrl) return;
        this._started = true;

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._stopTimers();
            } else {
                this._tick();
                this._startTimers();
            }
        });

        this._tick();
        this._startTimers();
    },

    _startTimers() {
        this._stopTimers();
        this._evalTimer = setInterval(() => this._tick(), this.EVAL_INTERVAL);
    },

    _stopTimers() {
        clearInterval(this._evalTimer);
        this._evalTimer = null;
    },

    /**
     * Una ronda: descarga si toca y repinta. Nunca lanza.
     */
    async _tick() {
        try {
            const regions = this.getTrainRegions();

            // Sin comunidades conocidas (sin tren, ruta personalizada con
            // estaciones desconocidas) no hay nada que vigilar ni que pedir.
            if (!regions.length) {
                this._render([]);
                return;
            }

            const due = Date.now() - this._lastFetchTry >= this.FETCH_INTERVAL;
            if (due) await this._fetchIncidents();

            this._render(this._pendingFor(regions));
        } catch (err) {
            console.info('[NetworkAlerts] Error ignorado:', err.message);
        }
    },

    async _fetchIncidents() {
        if (this._fetching) return;
        this._fetching = true;
        // Se anota el intento, no el éxito: si Adif bloquea, no hay que
        // reintentar cada 30 s y empeorar el bloqueo.
        this._lastFetchTry = Date.now();

        try {
            const res = await fetch(`${this.proxyUrl}/?feed=incidencias`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (!data || !Array.isArray(data.incidencias)) {
                throw new Error('Formato inesperado');
            }

            this._incidents = data.incidencias;
            this._lastFetchOk = Date.now();
            this._pruneSeen();
        } catch (err) {
            // Se conserva la última lista buena: un fallo puntual no debe
            // hacer desaparecer un aviso que sigue vigente.
            console.info('[NetworkAlerts] Sin datos de Adif:', err.message);
        } finally {
            this._fetching = false;
        }
    },

    // --- Comunidades del tren ---------------------------------------------

    /**
     * Comunidades que recorre el tren abierto, deducidas de las paradas de
     * su ruta. Se usa la ruta entera y no solo lo que queda por delante: una
     * incidencia en un tramo ya recorrido aún puede causar retrasos.
     *
     * @returns {string[]} Nombres tal y como los escribe Adif ("Aragón")
     */
    getTrainRegions() {
        const route = typeof window.getCurrentRoute === 'function'
            ? window.getCurrentRoute()
            : null;
        if (!Array.isArray(route) || !route.length) return [];

        const found = new Set();
        for (const stop of route) {
            const region = this._regionOfStation(stop);
            if (region) found.add(region);
        }
        return [...found];
    },

    /**
     * Comunidad en la que está el tren ahora mismo: la parada actual que
     * apunta el interventor y, si no hay, la estación que da el tiempo real.
     * Con ninguna de las dos (o una estación desconocida) devuelve null.
     *
     * @param {Object} [realtime] Resultado de RealtimeService.getForTrain
     */
    getCurrentRegion(realtime) {
        const candidates = [
            window.state?.currentStop,
            realtime?.currentStation,
            realtime?.nextStation
        ];
        for (const stop of candidates) {
            const region = this._regionOfStation(stop);
            if (region) return region;
        }
        return null;
    },

    ADIF_URL: 'https://www.adif.es/viajeros/estado-de-la-red',

    // Id de categoría de cada comunidad en la web de Adif (el que lleva la URL
    // de su pestaña). Solo están las que recorren las rutas actuales; para el
    // resto se abre la página general. Para añadir una: pulsar su pestaña en
    // Adif y copiar el número de la URL.
    ADIF_CATEGORY_IDS: {
        'Aragón': '53897329',
        'La Rioja': '53897353',
        'Navarra': '53897362',
        'País Vasco': '53897365'
    },

    /** URL de la pestaña de la comunidad, o la página general si no se conoce. */
    adifUrlFor(region) {
        const id = this.ADIF_CATEGORY_IDS[region];
        return id
            ? `${this.ADIF_URL}/-/categories/${id}?p_r_p_categoryId=${id}&resetCur=true`
            : this.ADIF_URL;
    },

    /** Abre el Estado de la red de Adif en la comunidad donde está el tren. */
    openAdifStatus() {
        const realtime = window.RealtimeService?.getForTrain(window.state?.trainNumber);
        const region = this.getCurrentRegion(realtime);

        window.open(this.adifUrlFor(region), '_blank', 'noopener');

        // Sin enlace directo, la página abre en "General": se dice qué
        // pestaña pulsar para no dejar al interventor buscándola.
        if (region && !this.ADIF_CATEGORY_IDS[region] && typeof window.showToast === 'function') {
            window.showToast(`Estado de la red · pulsa «${region}»`);
        }
    },

    _regionOfStation(stop) {
        const name = this._norm(typeof stop === 'string' ? stop : (stop?.name || ''));
        if (!name) return null;

        const map = this.STATION_REGIONS;
        if (map[name]) return map[name];

        for (const key of Object.keys(map)) {
            if (name.startsWith(key + ' ')) return map[key];
        }
        return null;
    },

    /** Minúsculas, sin acentos y con los guiones como espacios. */
    _norm(s) {
        return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
    },

    // --- Incidencias vistas -----------------------------------------------

    _loadSeen() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    },

    _saveSeen(seen) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(seen));
        } catch {
            // Sin almacenamiento el aviso reaparece en cada visita: molesto
            // pero inofensivo.
        }
    },

    /** Olvida las incidencias que Adif ya ha retirado de la página. */
    _pruneSeen() {
        const seen = this._loadSeen();
        const vigentes = new Set(this._incidents.map(i => i.id));
        let changed = false;
        for (const id of Object.keys(seen)) {
            if (!vigentes.has(id)) { delete seen[id]; changed = true; }
        }
        if (changed) this._saveSeen(seen);
    },

    _markSeen(incidents) {
        const seen = this._loadSeen();
        incidents.forEach(i => { seen[i.id] = i.rev; });
        this._saveSeen(seen);
    },

    /**
     * Incidencias que afectan al tren y que el usuario aún no ha visto
     * (nuevas, o con el texto modificado desde la última vez).
     */
    _pendingFor(regions) {
        const seen = this._loadSeen();
        return this._incidents.filter(i =>
            Array.isArray(i.regiones) &&
            i.regiones.some(r => regions.includes(r)) &&
            seen[i.id] !== i.rev
        );
    },

    // --- Aviso en pantalla -------------------------------------------------

    _render(pending) {
        const banner = document.getElementById('na-banner');

        if (!pending.length) {
            if (banner) banner.remove();
            this._shownKey = null;
            return;
        }

        // Ya se está mostrando exactamente este conjunto: no repintar.
        const key = pending.map(i => `${i.id}:${i.rev}`).join(',');
        if (banner && this._shownKey === key) return;
        if (banner) banner.remove();

        // Vibración breve solo cuando aparece algo que antes no se mostraba:
        // es lo más parecido a una notificación con la app en la mano.
        const prev = new Set((this._shownKey || '').split(','));
        if (pending.some(i => !prev.has(`${i.id}:${i.rev}`))) {
            try { navigator.vibrate?.(200); } catch { /* no soportado */ }
        }
        this._shownKey = key;

        const first = pending[0];
        const extra = pending.length > 1
            ? ` · y ${pending.length - 1} más`
            : '';
        const where = [...new Set(pending.flatMap(i => i.regiones))].join(' / ');

        const el = document.createElement('div');
        el.id = 'na-banner';
        el.className = 'na-banner';
        el.setAttribute('role', 'alert');
        el.innerHTML = `
            <div class="na-banner-text">
                <strong>⚠ ${window.escapeHtml(first.titulo)}</strong>
                <span>${window.escapeHtml(where)}${window.escapeHtml(extra)}</span>
            </div>
            <div class="na-banner-actions">
                <button class="na-dismiss">Entendido</button>
                <button class="na-view">Ver</button>
            </div>
        `;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('na-banner-visible'));

        el.querySelector('.na-dismiss').addEventListener('click', () => {
            this._markSeen(pending);
            this._render([]);
        });
        el.querySelector('.na-view').addEventListener('click', () => {
            this._openDetail(pending);
        });
    },

    _openDetail(incidents) {
        const esc = window.escapeHtml;
        const items = incidents.map(i => `
            <section class="na-item">
                <p class="na-item-where">${esc(i.regiones.join(' / '))}</p>
                <h4 class="na-item-title">${esc(i.titulo)}</h4>
                ${String(i.texto || '').split('\n').filter(Boolean)
                    .map(p => `<p class="na-item-text">${esc(p)}</p>`).join('')}
            </section>
        `).join('');

        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal-overlay" onclick="closeNetworkAlerts(event)">
                <div class="modal rt-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <div class="modal-header-top">
                            <h3 class="modal-title">Estado de la red</h3>
                            <button class="close-btn" onclick="closeNetworkAlerts()">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="rt-body">
                        ${items}
                        <a class="na-source" href="https://www.adif.es/viajeros/estado-de-la-red"
                           target="_blank" rel="noopener">Ver en la web de Adif</a>
                    </div>
                </div>
            </div>
        `);
        window.lockBodyScroll?.();

        // Abrir el detalle cuenta como visto: el aviso se retira al cerrar.
        this._detailSeen = incidents;
    },

    _closeDetail(event) {
        if (event && event.target !== event.currentTarget) return;
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        window.unlockBodyScroll?.();

        if (this._detailSeen) {
            this._markSeen(this._detailSeen);
            this._detailSeen = null;
            this._render([]);
        }
    }
};

window.NetworkAlerts = NetworkAlerts;
window.openAdifStatus = () => NetworkAlerts.openAdifStatus();
window.closeNetworkAlerts = event => NetworkAlerts._closeDetail(event);
