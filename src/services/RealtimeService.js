// ============================================================================
// REALTIMESERVICE.JS - Datos de circulación en tiempo real
// ============================================================================
// Consume el feed público del visor de Renfe (a través del Worker proxy) y
// expone la información del tren que el interventor tiene abierto: retraso,
// próxima estación, velocidad estimada y material rodante.
//
// PRINCIPIOS DE DISEÑO
//
//   1. Degrada en silencio. El feed es una API no documentada de Renfe: si
//      falla, cambia de formato o no está configurado el proxy, este módulo
//      deja los datos en null y Navirea funciona exactamente igual que sin él.
//      Ningún error sale de aquí.
//
//   2. No toca el estado del usuario. Los datos viven en este módulo, NO en
//      window.state, y por tanto NO entran en los snapshots de undo. Si
//      entraran, cada refresco de 30s llenaría el historial y el interventor
//      no podría deshacer sus propias acciones.
//
//   3. No re-renderiza la app. render() reescribe todo el innerHTML, lo que
//      haría perder el foco del input de "Parada actual" mientras se escribe.
//      En su lugar actualizamos solo el nodo del indicador.
//
//   4. Ahorra batería. Sin polling cuando la app está en segundo plano.
// ============================================================================

const RealtimeService = {

    // --- Configuración ---------------------------------------------------

    // El origen cachea 30s: pedir más a menudo gasta batería sin datos nuevos.
    POLL_INTERVAL: 30000,

    // Pasado este tiempo sin datos frescos, el dato se marca como "stale".
    STALE_AFTER: 90000,

    // Umbrales de retraso en minutos (alineados con la escala de ocupación).
    ON_TIME_MAX: 3,
    LATE_MAX: 10,

    // Guardas para la velocidad derivada.
    MIN_DELTA_MS: 20000,   // menos tiempo que esto = ruido de GPS
    MAX_PLAUSIBLE_KMH: 220, // por encima = salto de posición, no velocidad real

    // --- Estado interno ---------------------------------------------------

    _timer: null,
    _trenes: [],            // último feed recibido
    _lastFetchOk: null,     // timestamp del último fetch correcto
    _status: 'idle',        // idle | ok | stale | offline | disabled
    _prevPositions: {},     // {numTren: {lat, lon, t}} para derivar velocidad
    _started: false,

    /**
     * URL base del proxy, definida en config.local.js.
     * Sin ella el servicio queda deshabilitado.
     */
    get proxyUrl() {
        return window.RENFE_PROXY_URL || null;
    },

    get isEnabled() {
        return Boolean(this.proxyUrl);
    },

    // --- Ciclo de vida ----------------------------------------------------

    /**
     * Arranca el polling. Seguro de llamar varias veces.
     */
    start() {
        if (this._started) return;
        if (!this.isEnabled) {
            this._status = 'disabled';
            console.info('[Realtime] Sin RENFE_PROXY_URL — tiempo real desactivado');
            return;
        }

        this._started = true;

        // Pausar en segundo plano: una jornada son 8h de batería.
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._stopTimer();
            } else {
                this._tick();
                this._startTimer();
            }
        });

        this._tick();
        this._startTimer();
    },

    _startTimer() {
        this._stopTimer();
        this._timer = setInterval(() => this._tick(), this.POLL_INTERVAL);
    },

    _stopTimer() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    },

    /**
     * Una ronda de actualización. Nunca lanza.
     */
    async _tick() {
        try {
            const url = `${this.proxyUrl}/?feed=flota&v=${Date.now()}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            if (!data || !Array.isArray(data.trenes)) {
                throw new Error('Formato inesperado');
            }

            this._trenes = data.trenes;
            this._lastFetchOk = Date.now();
            this._status = 'ok';
        } catch (err) {
            // El feed puede caer o cambiar sin aviso: no es excepcional.
            this._status = this._lastFetchOk ? 'stale' : 'offline';
            console.info('[Realtime] Sin datos:', err.message);
        }

        this._refreshIndicator();
    },

    // --- Consulta ---------------------------------------------------------

    /**
     * Devuelve la información en vivo del tren indicado, o null si no hay.
     *
     * @param {string} trainNumber Número comercial (ej. "18077")
     * @returns {Object|null} {delay, delayClass, delayLabel, speedKmh,
     *                         nextStation, nextArrival, material, seriesId,
     *                         accessible, ageSeconds, status}
     */
    getForTrain(trainNumber) {
        if (!trainNumber || !this.isEnabled) return null;
        if (this._status === 'offline') return null;

        const t = this._trenes.find(x => x.codComercial === String(trainNumber));
        if (!t) return null;

        const age = this._lastFetchOk
            ? Math.round((Date.now() - this._lastFetchOk) / 1000)
            : null;

        const stale = this._lastFetchOk
            ? (Date.now() - this._lastFetchOk) > this.STALE_AFTER
            : true;

        const delay = this._parseDelay(t.ultRetraso);

        return {
            delay,
            delayClass: this._delayClass(delay),
            delayLabel: this._delayLabel(delay),
            speedKmh: this._deriveSpeed(t),
            nextStation: this._stationName(t.codEstSig),
            nextArrival: this._formatTime(t.horaLlegadaSigEst),
            material: t.mat || null,
            seriesId: this._seriesFromMaterial(t.mat),
            accessible: t.accesible === true,
            ageSeconds: age,
            status: stale ? 'stale' : 'ok'
        };
    },

    // --- Cálculos ---------------------------------------------------------

    _parseDelay(raw) {
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? n : null;
    },

    /**
     * Clase CSS según retraso. Reutiliza la escala visual de ocupación para
     * que la app hable un solo lenguaje de color.
     */
    _delayClass(delay) {
        if (delay === null) return '';
        if (delay < 0) return 'rt-early';
        if (delay <= this.ON_TIME_MAX) return 'occ-low';
        if (delay <= this.LATE_MAX) return 'occ-mid';
        return 'occ-high';
    },

    /**
     * Texto del indicador. Nunca depende solo del color: el signo y la
     * palabra distinguen los estados por sí solos.
     */
    _delayLabel(delay) {
        if (delay === null) return '—';
        if (delay < 0) return `−${Math.abs(delay)} min`;
        if (delay <= this.ON_TIME_MAX) return 'En hora';
        return `+${delay} min`;
    },

    /**
     * Velocidad derivada de dos posiciones GPS consecutivas.
     * El feed NO da velocidad: esto es una estimación y la UI debe
     * presentarla como tal (con "~").
     *
     * @returns {number|null} km/h, o null si no es fiable
     */
    _deriveSpeed(t) {
        const num = t.codComercial;
        const now = { lat: t.latitud, lon: t.longitud, t: (t.time || 0) * 1000 };
        const prev = this._prevPositions[num];

        // Guardar siempre la posición para la siguiente ronda.
        if (!prev || prev.t !== now.t) {
            this._prevPositions[num] = now;
        }

        if (!prev || !now.t || !prev.t) return null;

        const deltaMs = now.t - prev.t;
        if (deltaMs < this.MIN_DELTA_MS) return null;

        const km = this._haversineKm(prev.lat, prev.lon, now.lat, now.lon);
        const kmh = km / (deltaMs / 3600000);

        if (!Number.isFinite(kmh) || kmh > this.MAX_PLAUSIBLE_KMH) return null;
        return Math.round(kmh);
    },

    _haversineKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const rad = d => d * Math.PI / 180;
        const dLat = rad(lat2 - lat1);
        const dLon = rad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(a));
    },

    /**
     * Traduce código ADIF a nombre legible usando data/adif-stations.json,
     * que ya comparte codificación con el feed (99% de cobertura medida).
     */
    _stationName(code) {
        if (!code) return null;
        const stations = window.adifStations || {};
        const entry = stations[String(code)];
        if (!entry || !entry.name) return null;
        return this._toTitleCase(entry.name);
    },

    /**
     * "TUDELA DE NAVARRA" → "Tudela de Navarra"
     * Capitaliza también tras guion y barra, habituales en los nombres
     * bilingües de ADIF ("PAMPLONA/IRUÑA" → "Pamplona/Iruña",
     * "MADRID-PRÍNCIPE PÍO" → "Madrid-Príncipe Pío").
     */
    _toTitleCase(name) {
        const minor = ['de', 'del', 'la', 'las', 'los', 'el', 'y', 'a', 'en'];
        return name.toLowerCase().split(/\s+/).map((word, i) => {
            // Cada segmento separado por guion o barra se capitaliza aparte:
            // tras un guion empieza otro topónimo ("GALAPAGAR-LA NAVATA" →
            // "Galapagar-La Navata"), así que ahí la partícula SÍ se capitaliza.
            return word.split(/([-/])/).map((part, j) => {
                if (!part || part === '-' || part === '/') return part;
                // Partícula en minúscula solo si sigue a un espacio, es decir
                // si no es la primera palabra ni va tras guion/barra (j > 0)
                if (i > 0 && j === 0 && minor.includes(part)) return part;
                return part.charAt(0).toUpperCase() + part.slice(1);
            }).join('');
        }).join(' ');
    },

    _formatTime(iso) {
        if (!iso) return null;
        const m = String(iso).match(/T(\d{2}:\d{2})/);
        return m ? m[1] : null;
    },

    /**
     * Deduce la serie a partir del número de material ("470163" → "470").
     * Puede venir con varias unidades separadas por coma.
     */
    _seriesFromMaterial(mat) {
        if (!mat) return null;
        const first = String(mat).split(',')[0].trim();
        const serie = first.slice(0, 3);
        return /^\d{3}$/.test(serie) ? serie : null;
    },

    // --- Actualización de la UI -------------------------------------------

    /**
     * Repinta solo el indicador, sin re-renderizar la app: un render()
     * completo cada 30s haría perder el foco del input de parada actual.
     */
    _refreshIndicator() {
        const el = document.getElementById('rt-pill');
        if (!el) return;

        const rt = this.getForTrain(window.state?.trainNumber);
        if (!rt) {
            el.hidden = true;
            return;
        }

        el.hidden = false;
        el.className = `rt-pill ${rt.delayClass} ${rt.status === 'stale' ? 'rt-stale' : ''}`;
        el.textContent = rt.delayLabel;
        el.title = rt.nextStation
            ? `Próxima: ${rt.nextStation}${rt.nextArrival ? ' · ' + rt.nextArrival : ''}`
            : 'Información en tiempo real';
    }
};

window.RealtimeService = RealtimeService;
