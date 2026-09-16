// ============================================================================
// REALTIME-PANEL.JS - Panel de detalle de circulación en tiempo real
// ============================================================================
// Se abre al tocar el indicador de retraso de la cabecera. Muestra el detalle
// del tren en curso y, si detecta el material rodante, ofrece cambiar a la
// plantilla correspondiente.
// ============================================================================

/**
 * Abre el panel de tiempo real del tren actual.
 */
function openRealtimePanel() {
    const rt = window.RealtimeService?.getForTrain(window.state?.trainNumber);
    if (!rt) return;

    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

    const row = (label, value) => `
        <div class="rt-row">
            <span class="rt-row-label">${label}</span>
            <span class="rt-row-value">${value}</span>
        </div>
    `;

    // La velocidad es derivada de dos posiciones GPS, no la da el feed:
    // el "~" marca que es una estimación y no un dato medido.
    const speed = rt.speedKmh !== null ? `~${rt.speedKmh} km/h` : '—';

    const nextArrival = rt.nextArrival
        ? `${rt.nextArrival}${rt.delay > 0 ? ` <span class="rt-delta">+${rt.delay}</span>` : ''}`
        : '—';

    const suggestionBlock = buildMaterialBlock(rt);

    // Cuando el tren lleva rato sin reportar posición hay que decirlo con
    // los minutos reales: si no, el panel muestra una parada de hace veinte
    // minutos con el mismo aplomo que un dato recién llegado.
    const staleWarning = rt.status === 'stale'
        ? `<p class="rt-stale-note">El tren no reporta posición desde hace
           ${_formatAge(rt.ageSeconds)}. Los datos pueden no reflejar
           dónde está ahora.</p>`
        : '';

    const modal = `
        <div class="modal-overlay" onclick="closeRealtimePanel(event)">
            <div class="modal rt-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Tren ${window.escapeHtml(String(window.state.trainNumber))}</h3>
                        <button class="close-btn" onclick="closeRealtimePanel()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="rt-body">
                    ${row('Retraso', `<span class="rt-pill ${rt.delayClass}">${rt.delayLabel}</span>`)}
                    ${row('Velocidad', speed)}
                    ${row('Próxima', rt.nextStation || '—')}
                    ${row('Llegada est.', nextArrival)}
                    ${row('Material', rt.material || '—')}
                    ${rt.accessible ? row('Accesible', 'Sí') : ''}

                    <button class="rt-route-btn" onclick="closeRealtimePanel(); openRouteView();">
                        Ver recorrido completo
                    </button>

                    ${suggestionBlock}
                    ${staleWarning}

                    <p class="rt-age">
                        ${rt.ageSeconds !== null
                            ? `Posición recibida hace ${_formatAge(rt.ageSeconds)}`
                            : 'Sin actualizar'}
                    </p>
                    <p class="rt-source">Datos públicos de Renfe · orientativos</p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    window.lockBodyScroll?.();
}

/**
 * Bloque de material del panel. Muestra SIEMPRE el estado, porque el
 * silencio es ambiguo: no saber si el sistema calla porque todo cuadra o
 * porque está roto obliga a desconfiar de él.
 *
 * Cuatro casos:
 *   1. Serie distinta de la plantilla abierta  → ofrecer cambiar de serie
 *   2. Serie correcta y unidad guardada        → ofrecer cargar la unidad
 *   3. Serie correcta y unidad desconocida     → avisar para guardarla
 *   4. Todo coincide                           → confirmar en una línea
 *
 * Nunca aplica nada por su cuenta: cambiar de serie o de unidad borra
 * asientos ya registrados.
 */
function buildMaterialBlock(rt) {
    if (!rt || !rt.seriesId) return '';

    const currentTrain = String(window.state?.selectedTrain || '');
    const knownSeries = !!window.trainModels?.[rt.seriesId];

    // CASO 1: la plantilla abierta no es de esta serie
    if (rt.seriesId !== currentTrain) {
        if (!knownSeries) {
            return `
                <div class="rt-suggestion rt-suggestion-info">
                    <p>Material detectado: <strong>S-${rt.seriesId}</strong>.
                    No hay plantilla para esta serie.</p>
                </div>
            `;
        }
        return `
            <div class="rt-suggestion">
                <p>Material detectado: <strong>S-${rt.seriesId}</strong>, distinto de la plantilla abierta.</p>
                <button class="rt-suggestion-btn" onclick="applyRealtimeSeries('${rt.seriesId}')">
                    Cambiar a S-${rt.seriesId}
                </button>
            </div>
        `;
    }

    // A partir de aquí la serie ya coincide. Si esa serie maneja unidades
    // concretas (hoy solo el 470), comprobamos también la unidad.
    const unit = _firstUnit(rt.material);
    if (rt.seriesId === '470' && unit) {
        const units = typeof window.load470Units === 'function'
            ? window.load470Units()
            : {};
        const variants = units[unit];

        if (!variants) {
            // CASO 3: unidad que el interventor aún no tiene guardada
            return `
                <div class="rt-suggestion rt-suggestion-info">
                    <p>Unidad <strong>${window.escapeHtml(unit)}</strong> no guardada.
                    Puedes añadirla manteniendo pulsado "Tren 470" en la cabecera.</p>
                </div>
            `;
        }

        const actual = window.state?.coach470Variants || {};
        const yaCargada = Object.keys(variants)
            .every(c => actual[c] === variants[c]);

        if (!yaCargada) {
            // CASO 2: unidad guardada pero no cargada
            const detalle = Object.keys(variants)
                .map(c => `${c}:${variants[c]}`)
                .join(' · ');
            return `
                <div class="rt-suggestion">
                    <p>Unidad detectada: <strong>${window.escapeHtml(unit)}</strong>
                    <span class="rt-unit-detail">${window.escapeHtml(detalle)}</span></p>
                    <button class="rt-suggestion-btn" onclick="applyRealtimeUnit('${window.escapeHtml(unit)}')">
                        Cargar unidad ${window.escapeHtml(unit)}
                    </button>
                </div>
            `;
        }

        // CASO 4 (con unidad): todo correcto
        return `
            <p class="rt-match">Unidad ${window.escapeHtml(unit)} · coincide</p>
        `;
    }

    // CASO 4 (sin unidades): la serie coincide
    return `<p class="rt-match">S-${rt.seriesId} · coincide</p>`;
}

/** Antigüedad legible: "12 s", "4 min", "1 h 20 min". */
function _formatAge(seconds) {
    if (seconds === null || seconds === undefined) return '—';
    if (seconds < 60) return `${seconds} s`;
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
}

/** Primer número de unidad de "mat" ("470094,470103" → "470094"). */
function _firstUnit(mat) {
    if (!mat) return null;
    const first = String(mat).split(',')[0].trim();
    return /^\d{6}$/.test(first) ? first : null;
}

/**
 * Carga la unidad detectada. Pasa por apply470Unit(), que confirma y avisa
 * de los asientos que se borrarán.
 */
function applyRealtimeUnit(unitName) {
    closeRealtimePanel();
    if (typeof window.apply470Unit === 'function') {
        window.apply470Unit(unitName);
    }
}

function closeRealtimePanel(event) {
    if (event && event.target !== event.currentTarget) return;
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    window.unlockBodyScroll?.();
}

/**
 * Aplica la plantilla de la serie detectada. Pasa por selectTrain() para
 * reutilizar el guardado y las confirmaciones que ya existen.
 */
function applyRealtimeSeries(seriesId) {
    closeRealtimePanel();
    if (typeof window.selectTrain === 'function') {
        window.selectTrain(seriesId);
    }
}

// ============================================================================
// VISTA DE RECORRIDO
// ============================================================================
// Todas las paradas del trayecto con la hora estimada de llegada y los
// minutos de desviación. Su valor está en ver la TENDENCIA: si el retraso
// baja hacia el final, el enlace del viajero probablemente se salva.
// ============================================================================

/**
 * Abre la vista de recorrido del tren actual.
 */
function openRouteView() {
    const trainNumber = window.state?.trainNumber;
    if (!trainNumber) return;

    const route = typeof window.getCurrentRoute === 'function'
        ? window.getCurrentRoute()
        : [];
    if (!route.length) return;

    const times = window.RealtimeService?.getRouteTimes(trainNumber, route) || null;
    const currentStop = window.state?.currentStop || null;
    const currentIndex = currentStop ? route.indexOf(currentStop) : -1;

    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

    const filas = route.map((name, i) => {
        const t = times ? times[i] : null;
        const pasada = currentIndex !== -1 && i < currentIndex;
        const actual = i === currentIndex;

        // Solo se marca la desviación a partir de 3 min: por debajo es ruido
        // y llenaría la columna de números sin significado.
        const dev = t && t.deviation !== null && Math.abs(t.deviation) >= 3
            ? t.deviation
            : null;

        let devClass = '';
        if (dev !== null) devClass = dev > 0 ? 'rv-late' : 'rv-early';

        const marca = pasada ? '✓' : (actual ? '▶' : '○');

        return `
            <div class="rv-row ${pasada ? 'rv-passed' : ''} ${actual ? 'rv-current' : ''}">
                <span class="rv-mark">${marca}</span>
                <span class="rv-name">${window.escapeHtml(name)}</span>
                <span class="rv-time">${t && t.estimated ? t.estimated : '—'}</span>
                <span class="rv-dev ${devClass}">${
                    dev !== null ? (dev > 0 ? `+${dev}` : `−${Math.abs(dev)}`) : ''
                }</span>
            </div>
        `;
    }).join('');

    const sinDatos = !times
        ? '<p class="rt-stale-note">Sin horarios en tiempo real para este tren.</p>'
        : '';

    const modal = `
        <div class="modal-overlay" onclick="closeRouteView(event)">
            <div class="modal rv-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Recorrido · ${window.escapeHtml(String(trainNumber))}</h3>
                        <button class="close-btn" onclick="closeRouteView()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="rv-body">
                    ${sinDatos}
                    <div class="rv-head">
                        <span class="rv-mark"></span>
                        <span class="rv-name">Parada</span>
                        <span class="rv-time">Est.</span>
                        <span class="rv-dev">Desv.</span>
                    </div>
                    ${filas}
                    <p class="rt-source">Horarios estimados de Renfe · orientativos</p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    window.lockBodyScroll?.();

    // Dejar a la vista la parada actual, no el principio del trayecto
    const actual = document.querySelector('.rv-current');
    if (actual) actual.scrollIntoView({ block: 'center' });
}

function closeRouteView(event) {
    if (event && event.target !== event.currentTarget) return;
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    window.unlockBodyScroll?.();
}

window.openRouteView = openRouteView;
window.closeRouteView = closeRouteView;

// ============================================================================
// AVISO DE PARADA DESFASADA
// ============================================================================
// Si el tren ya ha dejado atrás la parada apuntada en la app, se muestra un
// aviso persistente para poder actualizarla de un toque.
//
// El aviso NO caduca solo: su razón de ser es que el interventor esté
// ocupado, así que desaparecer a los pocos segundos lo haría inútil.
// Tampoco cambia la parada por su cuenta: aplicar el cambio libera los
// asientos de las paradas anteriores y un falso positivo destruiría trabajo.
// ============================================================================

// Parada ya rechazada por el interventor: no se vuelve a ofrecer
let _stopSuggestionDismissed = null;

/**
 * Comprueba si la parada actual se ha quedado atrás y muestra el aviso.
 * Llamado por RealtimeService tras cada actualización.
 */
function checkStopSuggestion() {
    const banner = document.getElementById('rt-stop-banner');

    const route = typeof window.getCurrentRoute === 'function'
        ? window.getCurrentRoute()
        : null;

    const s = window.RealtimeService?.getStopSuggestion(
        window.state?.trainNumber,
        window.state?.currentStop,
        route
    );

    // Sin sugerencia, o ya rechazada para esa misma parada
    if (!s || _stopSuggestionDismissed === s.suggested) {
        if (banner) banner.remove();
        return;
    }

    // Ya se está mostrando esta misma sugerencia
    if (banner && banner.dataset.stop === s.suggested) return;
    if (banner) banner.remove();

    const saltadas = s.skipped > 1
        ? ` (${s.skipped} paradas por delante)`
        : '';

    const el = document.createElement('div');
    el.id = 'rt-stop-banner';
    el.className = 'rt-stop-banner';
    el.dataset.stop = s.suggested;
    el.innerHTML = `
        <div class="rt-stop-banner-text">
            <strong>El tren ya está en ${window.escapeHtml(s.suggested)}</strong>
            <span>Tu parada actual sigue en ${window.escapeHtml(window.state.currentStop)}${saltadas}</span>
        </div>
        <div class="rt-stop-banner-actions">
            <button class="rt-stop-dismiss">Ahora no</button>
            <button class="rt-stop-apply">Actualizar</button>
        </div>
    `;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('rt-stop-banner-visible'));

    el.querySelector('.rt-stop-apply').addEventListener('click', () => {
        el.remove();
        _stopSuggestionDismissed = null;
        // Pasa por el flujo normal: registra undo y libera asientos anteriores
        if (typeof window.setCurrentStop === 'function') {
            window.setCurrentStop(s.suggested);
        }
    });

    el.querySelector('.rt-stop-dismiss').addEventListener('click', () => {
        _stopSuggestionDismissed = s.suggested;
        el.remove();
    });
}

/** Reinicia el rechazo al cambiar de tren. */
function resetStopSuggestion() {
    _stopSuggestionDismissed = null;
    document.getElementById('rt-stop-banner')?.remove();
}

window.checkStopSuggestion = checkStopSuggestion;
window.resetStopSuggestion = resetStopSuggestion;
window.openRealtimePanel = openRealtimePanel;
window.closeRealtimePanel = closeRealtimePanel;
window.applyRealtimeSeries = applyRealtimeSeries;
window.applyRealtimeUnit = applyRealtimeUnit;
