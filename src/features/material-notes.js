// ============================================================================
// MATERIAL-NOTES.JS - Notas por unidad de material
// ============================================================================
// Cada unidad física tiene sus particularidades (enchufes, máquina de
// billetes, tipo de cerradura de cabina...) que no se deducen de la serie.
// Este módulo las guarda por número de unidad y las muestra cuando el tiempo
// real detecta ese material o cuando se carga desde el selector de unidades.
//
// Va aparte del sistema de unidades del 470 a propósito: aquello guarda la
// configuración de coches y solo existe para esa serie, mientras que estas
// notas valen para cualquier material (449017, 599012...).
// ============================================================================

const MATERIAL_NOTES_KEY = 'materialNotes';

/**
 * Carga todas las notas guardadas.
 * @returns {Object} { "470094": "texto", ... }
 */
function loadMaterialNotes() {
    try {
        const raw = localStorage.getItem(MATERIAL_NOTES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        console.warn('Error al leer notas de material', e);
        return {};
    }
}

function saveMaterialNotes(notes) {
    try {
        localStorage.setItem(MATERIAL_NOTES_KEY, JSON.stringify(notes));
    } catch (e) {
        console.warn('Error al guardar notas de material', e);
    }
}

/**
 * Nota de una unidad concreta, o null si no tiene.
 * @param {string} unit Número de unidad ("470094")
 */
function getMaterialNote(unit) {
    if (!unit) return null;
    const note = loadMaterialNotes()[String(unit).trim()];
    return note && note.trim() ? note : null;
}

/**
 * Guarda (o borra, si el texto queda vacío) la nota de una unidad.
 */
function setMaterialNote(unit, text) {
    if (!unit) return;
    const key = String(unit).trim();
    const notes = loadMaterialNotes();

    if (text && text.trim()) {
        notes[key] = text.trim();
    } else {
        delete notes[key];
    }
    saveMaterialNotes(notes);
}

/**
 * "470094,470103" → ["470094", "470103"]
 * Un servicio puede llevar dos unidades acopladas y cada una tiene sus notas.
 */
function splitUnits(mat) {
    if (!mat) return [];
    return String(mat)
        .split(',')
        .map(u => u.trim())
        .filter(u => /^\d{6}$/.test(u));
}

/**
 * Notas de todas las unidades de un material acoplado.
 * @returns {Array<{unit, note}>} solo las que tienen nota
 */
function getNotesForMaterial(mat) {
    return splitUnits(mat)
        .map(unit => ({ unit, note: getMaterialNote(unit) }))
        .filter(x => x.note);
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

/**
 * Abre el editor de la nota de una unidad.
 * @param {string} unit
 * @param {Function} [onSaved] Se llama tras guardar (para refrescar la vista)
 */
function openMaterialNoteEditor(unit, onSaved) {
    if (!unit) return;

    const existing = document.getElementById('material-note-modal');
    if (existing) existing.remove();

    const current = getMaterialNote(unit) || '';

    const modal = document.createElement('div');
    modal.id = 'material-note-modal';
    // Clase propia, no .modal-overlay: varias funciones de la app borran de
    // golpe todos los .modal-overlay, y este editor se abre por encima de
    // otros modales (el selector de unidades del 470) que deben sobrevivirle.
    modal.className = 'mn-overlay';
    modal.innerHTML = `
        <div class="modal mn-modal">
            <div class="modal-header">
                <div class="modal-header-top">
                    <h3 class="modal-title">Notas · ${window.escapeHtml(unit)}</h3>
                    <button class="close-btn" onclick="closeMaterialNoteEditor()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="mn-body">
                <p class="mn-hint">
                    Particularidades de esta unidad: enchufes, máquina de
                    billetes, cerradura de cabina, averías recurrentes…
                </p>
                <textarea
                    id="mn-text"
                    class="mn-textarea"
                    rows="7"
                    placeholder="Ej: Pocos enchufes en C2. Cabina con llavín, no con llave."
                >${window.escapeHtml(current)}</textarea>
                <div class="mn-actions">
                    <button class="mn-cancel" onclick="closeMaterialNoteEditor()">Cancelar</button>
                    <button class="mn-save" id="mn-save">Guardar</button>
                </div>
            </div>
        </div>
    `;

    modal.addEventListener('click', e => {
        if (e.target === modal) closeMaterialNoteEditor();
    });
    document.body.appendChild(modal);
    window.lockBodyScroll?.();

    modal.querySelector('#mn-save').addEventListener('click', () => {
        setMaterialNote(unit, document.getElementById('mn-text').value);
        closeMaterialNoteEditor();
        if (typeof onSaved === 'function') onSaved();
        window.showToast?.(`Notas de ${unit} guardadas`);
    });

    setTimeout(() => document.getElementById('mn-text')?.focus(), 100);
}

function closeMaterialNoteEditor() {
    document.getElementById('material-note-modal')?.remove();

    // Solo se desbloquea el scroll si no queda otro modal abierto detrás:
    // este editor puede abrirse sobre el selector de unidades del 470, que
    // sigue necesitando el bloqueo cuando el editor se cierra.
    const quedanModales = document.querySelector(
        '.modal-overlay, .units470-overlay, .crew-modal-overlay'
    );
    if (!quedanModales) window.unlockBodyScroll?.();
}

/**
 * Bloque HTML con las notas de un material, para incrustar en otros paneles.
 * Devuelve '' si no hay ninguna: quien lo llama no necesita comprobarlo.
 */
function renderMaterialNotes(mat) {
    const notas = getNotesForMaterial(mat);
    if (!notas.length) return '';

    return `
        <div class="mn-block">
            ${notas.map(({ unit, note }) => `
                <div class="mn-entry">
                    <span class="mn-entry-unit">${window.escapeHtml(unit)}</span>
                    <p class="mn-entry-text">${window.escapeHtml(note)}</p>
                </div>
            `).join('')}
        </div>
    `;
}

window.loadMaterialNotes = loadMaterialNotes;
window.getMaterialNote = getMaterialNote;
window.setMaterialNote = setMaterialNote;
window.getNotesForMaterial = getNotesForMaterial;
window.openMaterialNoteEditor = openMaterialNoteEditor;
window.closeMaterialNoteEditor = closeMaterialNoteEditor;
window.renderMaterialNotes = renderMaterialNotes;
