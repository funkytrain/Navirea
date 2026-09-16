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

    // Sugerencia de material: nunca cambia la plantilla por su cuenta, porque
    // eso podría descartar el trabajo de asientos ya hecho.
    const currentTrain = window.state?.selectedTrain;
    const suggest = rt.seriesId &&
                    rt.seriesId !== String(currentTrain) &&
                    window.trainModels?.[rt.seriesId];

    const suggestionBlock = suggest ? `
        <div class="rt-suggestion">
            <p>Material detectado: <strong>S-${rt.seriesId}</strong>, distinto de la plantilla abierta.</p>
            <button class="rt-suggestion-btn" onclick="applyRealtimeSeries('${rt.seriesId}')">
                Cambiar a S-${rt.seriesId}
            </button>
        </div>
    ` : '';

    const staleWarning = rt.status === 'stale'
        ? '<p class="rt-stale-note">Sin datos frescos: puede estar desactualizado.</p>'
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

                    ${suggestionBlock}
                    ${staleWarning}

                    <p class="rt-age">
                        ${rt.ageSeconds !== null
                            ? `Actualizado hace ${rt.ageSeconds} s`
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
