/* ========================================
   DOM UTILITIES - Helpers para manipulación DOM
   ======================================== */

// Variable global para guardar la posición del scroll
let savedScrollPosition = 0;

/**
 * Bloquea el scroll del body (usado cuando se abre un modal)
 */
function lockBodyScroll() {
    // Guardar posición actual
    savedScrollPosition = window.scrollY || document.documentElement.scrollTop;

    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollPosition}px`;
    document.body.style.width = '100%';
}

/**
 * Desbloquea el scroll del body (usado cuando se cierra un modal)
 */
function unlockBodyScroll() {
    document.body.classList.remove('modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';

    // NO restaurar scroll aquí - lo hace quien llama a esta función
}

/**
 * Restaura la posición del scroll guardada
 */
function restoreScrollPosition() {
    window.scrollTo(0, savedScrollPosition);
}

/**
 * Obtiene la posición del scroll guardada
 */
function getSavedScrollPosition() {
    return savedScrollPosition;
}

/**
 * Capitaliza la primera letra de un string
 */
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Formatea un timestamp a fecha legible
 */
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Genera un ID único simple
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Normaliza texto eliminando acentos y diacríticos
 * Útil para búsquedas insensibles a acentos
 * @param {string} text - Texto a normalizar
 * @returns {string} Texto sin acentos en minúsculas
 */
function normalizeText(text) {
    if (!text) return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

/* ========================================
   EXPORTS
   ======================================== */

// Exportar funciones a window para uso global
window.lockBodyScroll = lockBodyScroll;
window.unlockBodyScroll = unlockBodyScroll;
window.restoreScrollPosition = restoreScrollPosition;
window.getSavedScrollPosition = getSavedScrollPosition;
window.capitalize = capitalize;
window.formatTimestamp = formatTimestamp;
window.generateId = generateId;
window.normalizeText = normalizeText;
