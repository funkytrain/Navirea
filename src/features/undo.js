/**
 * Undo System
 * Stack de historial en memoria (máx 20 entradas) para deshacer acciones operativas.
 * Guarda snapshot de las partes mutables del estado antes de cada acción.
 */

const MAX_UNDO_STEPS = 20;

// Stack de snapshots: [{seatData, incidents, trainNumber, currentStop, serviceNotes, importantStop, importantStop2, label}, ...]
let undoStack = [];

/**
 * Captura un snapshot del estado operativo actual y lo apila.
 * Llamar ANTES de modificar el estado.
 * @param {string} label - Descripción de la acción (para mostrar en el botón)
 */
function pushUndo(label) {
    const s = window.state;
    const snapshot = {
        seatData: JSON.parse(JSON.stringify(s.seatData)),
        incidents: JSON.parse(JSON.stringify(s.incidents)),
        trainNumber: s.trainNumber,
        currentStop: s.currentStop,
        serviceNotes: s.serviceNotes,
        importantStop: s.importantStop,
        importantStop2: s.importantStop2,
        label: label || 'Acción'
    };
    undoStack.push(snapshot);
    if (undoStack.length > MAX_UNDO_STEPS) {
        undoStack.shift();
    }
    updateUndoButton();
}

/**
 * Deshace la última acción restaurando el snapshot más reciente.
 */
function undo() {
    if (undoStack.length === 0) return;

    const snapshot = undoStack.pop();
    const s = window.state;

    s.seatData = snapshot.seatData;
    s.incidents = snapshot.incidents;
    s.trainNumber = snapshot.trainNumber;
    s.currentStop = snapshot.currentStop;
    s.serviceNotes = snapshot.serviceNotes;
    s.importantStop = snapshot.importantStop;
    s.importantStop2 = snapshot.importantStop2;

    // Persistir el estado restaurado
    window.saveData();
    if (window.saveTrainNumber) window.saveTrainNumber();
    if (window.saveCurrentStop) window.saveCurrentStop();

    // Re-renderizar
    window.render();

    updateUndoButton();
    showUndoToast(snapshot.label);
}

/**
 * Actualiza el estado visual del botón FAB (habilitado/deshabilitado).
 */
function updateUndoButton() {
    const btn = document.getElementById('undo-fab');
    if (!btn) return;
    if (undoStack.length > 0) {
        btn.classList.remove('undo-fab--empty');
        btn.setAttribute('title', `Deshacer: ${undoStack[undoStack.length - 1].label}`);
    } else {
        btn.classList.add('undo-fab--empty');
        btn.setAttribute('title', 'Sin acciones para deshacer');
    }
}

/**
 * Muestra un toast breve indicando qué se deshizo.
 */
function showUndoToast(label) {
    const existing = document.getElementById('undo-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'undo-toast';
    toast.className = 'undo-toast';
    toast.textContent = `Deshecho: ${label}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('undo-toast--show'));
    setTimeout(() => toast.classList.remove('undo-toast--show'), 2000);
    setTimeout(() => toast.remove(), 2400);
}

/**
 * Vacía el stack (llamar al cambiar de tren o importar turno).
 */
function clearUndoStack() {
    undoStack = [];
    updateUndoButton();
}

// Exportar
window.UndoSystem = { pushUndo, undo, clearUndoStack, updateUndoButton };
window.pushUndo = pushUndo;
window.undo = undo;
window.clearUndoStack = clearUndoStack;
