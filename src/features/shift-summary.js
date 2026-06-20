/* ============================================
   SHIFT SUMMARY MODULE - Historial de jornada
   ============================================ */

const SHIFT_HISTORY_KEY = 'navereaShiftHistory';

// ---- Persistencia ----

function loadShiftHistory() {
    try {
        const raw = localStorage.getItem(SHIFT_HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveShiftHistory(history) {
    try {
        localStorage.setItem(SHIFT_HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.warn('Error guardando historial de jornada', e);
    }
}

// ---- Cálculo de snapshot ----

function calcTotalSeats() {
    const currentTrain = window.trainModels[window.state.selectedTrain];
    if (!currentTrain || !currentTrain.coaches) return 0;
    let total = 0;
    currentTrain.coaches.forEach(coach => {
        const layout = window.getCurrentCoachLayout ? window.getCurrentCoachLayout(coach) : coach.layout;
        if (!layout) return;
        layout.forEach(section => {
            if (section.type === 'seats' && Array.isArray(section.positions)) {
                section.positions.forEach(row => {
                    if (Array.isArray(row)) {
                        row.forEach(n => { if (typeof n === 'number') total++; });
                    }
                });
            }
        });
    });
    return total;
}

function calcOccupiedSeats() {
    return Object.values(window.state.seatData || {})
        .filter(s => s && s.stop).length;
}

function calcTopStops() {
    const counts = {};
    Object.values(window.state.seatData || {}).forEach(s => {
        if (s && s.stop && s.stop.full) {
            counts[s.stop.full] = (counts[s.stop.full] || 0) + 1;
        }
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));
}

function calcIncidentStrings() {
    const incidents = window.state.incidents || {};
    return Object.keys(incidents).map(key => {
        const parts = key.split('-');
        if (parts.length === 3) {
            // Formato: coachId-variant-elementId (tren 470)
            return `${parts[2]} · ${parts[0]}`;
        }
        // Formato: coachId-elementId
        return `${parts[1]} · ${parts[0]}`;
    });
}

// ---- Ciclo de vida ----

function initShiftEntry() {
    if (!window.state.trainNumber) return;

    const history = loadShiftHistory();
    const last = history[history.length - 1];

    // Si ya hay una entrada activa para este número de tren, no duplicar (recarga de página)
    if (last && last.trainNumber === window.state.trainNumber && last.endTime === null) return;

    const currentTrain = window.trainModels[window.state.selectedTrain];
    history.push({
        trainModel: window.state.selectedTrain,
        trainName: currentTrain ? currentTrain.name : window.state.selectedTrain,
        trainNumber: window.state.trainNumber,
        startTime: new Date().toISOString(),
        endTime: null,
        passengersChecked: 0,   // total viajeros chequeados (liberados en parada)
        stopBreakdown: {},      // { "Parada X": 5, "Parada Y": 3 }
        incidents: [],
        serviceNotes: '',
        coachNotes: {}
    });
    saveShiftHistory(history);
}

function recordStopReleases(stopName, count) {
    if (!stopName || !count) return;
    const history = loadShiftHistory();
    const last = history[history.length - 1];
    if (!last || last.endTime !== null) return;

    last.passengersChecked = (last.passengersChecked || 0) + count;
    if (!last.stopBreakdown) last.stopBreakdown = {};
    last.stopBreakdown[stopName] = (last.stopBreakdown[stopName] || 0) + count;

    saveShiftHistory(history);
}

function closeCurrentShiftEntry() {
    const history = loadShiftHistory();
    const last = history[history.length - 1];
    if (!last || last.endTime !== null) return;

    last.endTime = new Date().toISOString();
    // passengersChecked y stopBreakdown se acumulan en tiempo real — no sobreescribir
    last.incidents = calcIncidentStrings();
    last.serviceNotes = window.state.serviceNotes || '';
    last.coachNotes = Object.assign({}, window.state.coachNotes || {});

    saveShiftHistory(history);
}

function startNewShift() {
    const history = loadShiftHistory();
    if (!history.length) return;

    if (!confirm('¿Iniciar una nueva jornada?\n\nSe borrará el historial de todos los trenes trabajados hoy.')) return;

    localStorage.removeItem(SHIFT_HISTORY_KEY);
    // Si hay un tren activo, arrancar una nueva entrada inmediatamente
    if (window.state.trainNumber && typeof initShiftEntry === 'function') {
        initShiftEntry();
    }
}

// ---- Formato de tiempo ----

function formatTime(isoStr) {
    if (!isoStr) return '--:--';
    const d = new Date(isoStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDuration(startIso, endIso) {
    if (!startIso || !endIso) return '--';
    const mins = Math.round((new Date(endIso) - new Date(startIso)) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

function totalJornada(history) {
    const closed = history.filter(e => e.startTime && e.endTime);
    if (!closed.length) return '--';
    const totalMins = closed.reduce((acc, e) => {
        return acc + Math.round((new Date(e.endTime) - new Date(e.startTime)) / 60000);
    }, 0);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

// ---- Texto plano para compartir ----

function generateSummaryText(history) {
    let txt = '=== RESUMEN DE JORNADA ===\n\n';
    history.forEach((entry, i) => {
        txt += `── Tren ${i + 1} ──────────────────────\n`;
        txt += `${entry.trainName} · Nº ${entry.trainNumber}\n`;
        txt += `Inicio: ${formatTime(entry.startTime)}`;
        if (entry.endTime) txt += `   Fin: ${formatTime(entry.endTime)}   (${formatDuration(entry.startTime, entry.endTime)})`;
        txt += '\n';
        if (entry.passengersChecked > 0) {
            txt += `Viajeros chequeados: ${entry.passengersChecked}\n`;
        }
        if (entry.stopBreakdown && Object.keys(entry.stopBreakdown).length) {
            const breakdown = Object.entries(entry.stopBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([stop, count]) => `${stop} (${count})`)
                .join(' · ');
            txt += `Bajadas por parada: ${breakdown}\n`;
        }
        if (entry.incidents && entry.incidents.length) {
            txt += `Incidencias: ${entry.incidents.join(' · ')}\n`;
        }
        if (entry.serviceNotes && entry.serviceNotes.trim()) {
            txt += `Notas: ${entry.serviceNotes.trim()}\n`;
        }
        if (entry.coachNotes) {
            Object.entries(entry.coachNotes).forEach(([coachId, note]) => {
                if (note && note.trim()) txt += `${coachId}: ${note.trim()}\n`;
            });
        }
        txt += '\n';
    });
    const totalPassengers = history.reduce((s, e) => s + (e.passengersChecked || 0), 0);
    txt += `─────────────────────────────\n`;
    txt += `TOTAL JORNADA\n`;
    txt += `Duración total: ${totalJornada(history)} · Trenes trabajados: ${history.length}`;
    if (totalPassengers > 0) txt += ` · Total viajeros: ${totalPassengers}`;
    txt += '\n';
    return txt;
}

// ---- Modal HTML ----

function generateShiftSummaryModal(history) {
    const sections = history.map((entry, i) => {
        const passengersChecked = entry.passengersChecked || 0;

        const stopBreakdownHtml = entry.stopBreakdown && Object.keys(entry.stopBreakdown).length
            ? Object.entries(entry.stopBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([stop, count]) => `${stop} (${count})`)
                .join(' · ')
            : null;

        const incidentsHtml = entry.incidents && entry.incidents.length
            ? entry.incidents.join(' · ')
            : null;

        const coachNotesHtml = entry.coachNotes
            ? Object.entries(entry.coachNotes)
                .filter(([, v]) => v && v.trim())
                .map(([k, v]) => `<div class="shift-summary-row"><span class="shift-summary-label">${k}:</span><span>${v.trim()}</span></div>`)
                .join('')
            : '';

        return `
            <div class="shift-summary-section">
                <h4>Tren ${i + 1} — ${entry.trainName} · Nº ${entry.trainNumber}</h4>
                <div class="shift-summary-row">
                    <span class="shift-summary-label">Inicio:</span>
                    <span>${formatTime(entry.startTime)}</span>
                    ${entry.endTime ? `
                        <span class="shift-summary-label" style="margin-left:1rem;">Fin:</span>
                        <span>${formatTime(entry.endTime)}</span>
                        <span style="color:var(--color-gray-500,#6b7280);margin-left:0.5rem;">(${formatDuration(entry.startTime, entry.endTime)})</span>
                    ` : '<span style="color:var(--color-gray-500,#6b7280);margin-left:0.5rem;">(en curso)</span>'}
                </div>
                ${passengersChecked > 0 ? `
                    <div class="shift-summary-row">
                        <span class="shift-summary-label">Viajeros:</span>
                        <span>${passengersChecked} chequeados</span>
                    </div>
                ` : ''}
                ${stopBreakdownHtml ? `
                    <div class="shift-summary-row">
                        <span class="shift-summary-label">Bajadas:</span>
                        <span>${stopBreakdownHtml}</span>
                    </div>
                ` : ''}
                ${incidentsHtml ? `
                    <div class="shift-summary-row">
                        <span class="shift-summary-label">Incidencias:</span>
                        <span>${incidentsHtml}</span>
                    </div>
                ` : ''}
                ${entry.serviceNotes && entry.serviceNotes.trim() ? `
                    <div class="shift-summary-row">
                        <span class="shift-summary-label">Notas:</span>
                        <span>${entry.serviceNotes.trim()}</span>
                    </div>
                ` : ''}
                ${coachNotesHtml}
            </div>
        `;
    }).join('');

    const totalPassengers = history.reduce((s, e) => s + (e.passengersChecked || 0), 0);

    const totalesHtml = `
        <div class="shift-summary-totals">
            Duración total: ${totalJornada(history)} &nbsp;·&nbsp; Trenes trabajados: ${history.length}${totalPassengers > 0 ? ` &nbsp;·&nbsp; Total viajeros: ${totalPassengers}` : ''}
        </div>
    `;

    return `
        <div class="modal-overlay shift-summary-overlay" onclick="closeShiftSummary(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Resumen de jornada</h3>
                        <button class="close-btn" onclick="closeShiftSummary()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="shift-summary-content">
                    ${sections || '<p style="color:var(--color-gray-500,#6b7280);text-align:center;padding:2rem 0;">Sin trenes registrados en esta jornada.</p>'}
                    ${history.length > 0 ? totalesHtml : ''}
                </div>
                <div class="modal-footer">
                    ${history.length > 0 ? `
                        <button class="clear-btn" onclick="shareShiftSummary()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:4px;vertical-align:middle;">
                                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                            </svg>
                            Compartir como texto
                        </button>
                        <button class="clear-btn" onclick="printShiftSummary()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;margin-right:4px;vertical-align:middle;">
                                <polyline points="6 9 6 2 18 2 18 9"/>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                            Exportar PDF
                        </button>
                    ` : ''}
                    <button class="clear-btn" onclick="closeShiftSummary()">Cerrar</button>
                </div>
            </div>
        </div>
    `;
}

// ---- Abrir / cerrar modal ----

function openShiftSummary() {
    // Registrar snapshot del tren activo sin cerrarlo (para mostrarlo en el resumen)
    const history = loadShiftHistory();
    const last = history[history.length - 1];
    if (last && last.endTime === null) {
        // Snapshot temporal para el modal — no se persiste endTime
        const snapshot = Object.assign({}, last, {
            endTime: new Date().toISOString(),
            incidents: calcIncidentStrings(),
            serviceNotes: window.state.serviceNotes || '',
            coachNotes: Object.assign({}, window.state.coachNotes || {})
        });
        const displayHistory = history.slice(0, -1).concat(snapshot);
        document.body.insertAdjacentHTML('beforeend', generateShiftSummaryModal(displayHistory));
    } else {
        document.body.insertAdjacentHTML('beforeend', generateShiftSummaryModal(history));
    }
    if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
}

function closeShiftSummary(event) {
    if (event && event.target && !event.target.classList.contains('shift-summary-overlay')) return;
    const overlay = document.querySelector('.shift-summary-overlay');
    if (overlay) overlay.remove();
    if (typeof window.unlockBodyScroll === 'function') window.unlockBodyScroll();
}

async function shareShiftSummary() {
    const history = loadShiftHistory();
    const text = generateSummaryText(history);
    if (navigator.share) {
        try {
            await navigator.share({ title: 'Resumen de jornada', text });
            return;
        } catch (e) { /* fallback */ }
    }
    try {
        await navigator.clipboard.writeText(text);
        alert('Resumen copiado al portapapeles');
    } catch (e) {
        alert('No se pudo copiar el resumen');
    }
}

// ---- Exportar como PDF (ventana de impresión) ----

function printShiftSummary() {
    const raw = loadShiftHistory();
    // Construir snapshot temporal del tren activo (igual que openShiftSummary)
    const last = raw[raw.length - 1];
    const history = (last && last.endTime === null)
        ? raw.slice(0, -1).concat(Object.assign({}, last, {
            endTime: new Date().toISOString(),
            incidents: calcIncidentStrings(),
            serviceNotes: window.state.serviceNotes || '',
            coachNotes: Object.assign({}, window.state.coachNotes || {})
          }))
        : raw;

    const sectionsHtml = history.map((entry, i) => {
        const passengersChecked = entry.passengersChecked || 0;
        const stopBreakdown = entry.stopBreakdown && Object.keys(entry.stopBreakdown).length
            ? Object.entries(entry.stopBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([stop, count]) => `${stop} (${count})`)
                .join(' · ')
            : null;
        const incidents = entry.incidents && entry.incidents.length
            ? entry.incidents.join(' · ')
            : null;
        const coachNotes = entry.coachNotes
            ? Object.entries(entry.coachNotes)
                .filter(([, v]) => v && v.trim())
                .map(([k, v]) => `<tr><td class="label">${k}</td><td>${v.trim()}</td></tr>`)
                .join('')
            : '';

        return `
            <div class="section">
                <div class="section-title">Tren ${i + 1} — ${entry.trainName} · Nº ${entry.trainNumber}</div>
                <table>
                    <tr><td class="label">Inicio</td><td>${formatTime(entry.startTime)}${entry.endTime ? ` &nbsp;·&nbsp; Fin: ${formatTime(entry.endTime)} &nbsp;·&nbsp; ${formatDuration(entry.startTime, entry.endTime)}` : ' <em>(en curso)</em>'}</td></tr>
                    ${passengersChecked > 0 ? `<tr><td class="label">Viajeros</td><td>${passengersChecked} chequeados</td></tr>` : ''}
                    ${stopBreakdown ? `<tr><td class="label">Bajadas</td><td>${stopBreakdown}</td></tr>` : ''}
                    ${incidents ? `<tr><td class="label">Incidencias</td><td>${incidents}</td></tr>` : ''}
                    ${entry.serviceNotes && entry.serviceNotes.trim() ? `<tr><td class="label">Notas servicio</td><td>${entry.serviceNotes.trim()}</td></tr>` : ''}
                    ${coachNotes}
                </table>
            </div>`;
    }).join('');

    const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Resumen de jornada — ${date}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 2cm; }
  h1 { font-size: 16px; margin-bottom: 0.2em; }
  .meta { color: #555; margin-bottom: 1.5em; font-size: 11px; }
  .section { margin-bottom: 1.2em; page-break-inside: avoid; }
  .section-title { font-weight: bold; font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 6px; vertical-align: top; }
  td.label { color: #555; width: 7em; white-space: nowrap; }
  .totals { border-top: 2px solid #111; padding-top: 0.6em; font-weight: bold; margin-top: 1em; }
</style>
</head>
<body>
  <h1>Resumen de jornada</h1>
  <div class="meta">${date}</div>
  ${sectionsHtml}
  <div class="totals">Duración total: ${totalJornada(history)} &nbsp;·&nbsp; Trenes trabajados: ${history.length}${history.reduce((s, e) => s + (e.passengersChecked || 0), 0) > 0 ? ` &nbsp;·&nbsp; Total viajeros: ${history.reduce((s, e) => s + (e.passengersChecked || 0), 0)}` : ''}</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para esta página.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
}

// ---- Exportar al scope global ----

Object.assign(window, {
    loadShiftHistory,
    saveShiftHistory,
    initShiftEntry,
    closeCurrentShiftEntry,
    recordStopReleases,
    openShiftSummary,
    closeShiftSummary,
    shareShiftSummary,
    printShiftSummary,
    startNewShift
});
