/* ========================================
   MODAL HELPERS - Sistema de Scroll Guards
   ======================================== */

// Referencias globales para poder remover los listeners
let modalWheelHandler = null;
let modalTouchMoveHandler = null;
let modalTouchEndHandler = null;
let overlayWheelHandler = null;
let overlayTouchMoveHandler = null;

/* ========================================
   FUNCIONES DE SCROLL GUARDS PARA LISTAS
   ======================================== */

/**
 * Configura listeners de scroll para evitar overscroll en modal-list
 * Previene que el scroll de la lista propague al body
 */
function setupModalListScrollGuards() {
    // Remover listeners previos si existen
    removeModalScrollGuards();

    // wheel (ratón / trackpad)
    modalWheelHandler = (e) => {
        const list = e.target.closest('.modal-list');
        if (!list) return;

        const atTop = list.scrollTop === 0;
        const atBottom = Math.ceil(list.scrollTop) === list.scrollHeight - list.clientHeight;

        if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
            e.preventDefault();
        }

        e.stopPropagation();
    };

    // touchmove (móvil)
    modalTouchMoveHandler = (e) => {
        const list = e.target.closest('.modal-list');
        if (!list) return;

        const touch = e.touches[0];
        const lastY = list._lastTouchY ?? touch.clientY;
        const deltaY = lastY - touch.clientY;
        list._lastTouchY = touch.clientY;

        const atTop = list.scrollTop === 0;
        const atBottom = Math.ceil(list.scrollTop) === list.scrollHeight - list.clientHeight;

        if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
            e.preventDefault();
        }

        e.stopPropagation();
    };

    // touchend/cancel
    modalTouchEndHandler = (e) => {
        const list = e.target.closest('.modal-list');
        if (list) list._lastTouchY = null;
    };

    // Añadir listeners
    document.addEventListener('wheel', modalWheelHandler, { passive: false, capture: true });
    document.addEventListener('touchmove', modalTouchMoveHandler, { passive: false, capture: true });
    document.addEventListener('touchend', modalTouchEndHandler, { capture: true });
    document.addEventListener('touchcancel', modalTouchEndHandler, { capture: true });
}

/**
 * Remover listeners de scroll guards cuando se cierra el modal
 */
function removeModalScrollGuards() {
    if (modalWheelHandler) {
        document.removeEventListener('wheel', modalWheelHandler, { capture: true });
        modalWheelHandler = null;
    }
    if (modalTouchMoveHandler) {
        document.removeEventListener('touchmove', modalTouchMoveHandler, { capture: true });
        modalTouchMoveHandler = null;
    }
    if (modalTouchEndHandler) {
        document.removeEventListener('touchend', modalTouchEndHandler, { capture: true });
        document.removeEventListener('touchcancel', modalTouchEndHandler, { capture: true });
        modalTouchEndHandler = null;
    }
}

/* ========================================
   FUNCIONES DE BLOQUEO DE SCROLL EN OVERLAY
   ======================================== */

/**
 * Prevenir scroll en el overlay del modal excepto en áreas específicas
 * Permite scroll en: .modal-list, .comment-input, .current-stop-dropdown
 */
function setupModalOverlayScrollBlock() {
    // Remover listeners previos
    removeModalOverlayScrollBlock();

    const scrollableSelectors = ['.modal-list', '.comment-input', '.current-stop-dropdown'];

    // Prevenir scroll en el modal excepto en áreas específicas
    overlayTouchMoveHandler = (e) => {
        const overlay = e.target.closest('.modal-overlay');
        if (!overlay) return;

        const isInScrollable = scrollableSelectors.some(selector =>
            e.target.closest(selector)
        );

        if (!isInScrollable) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    overlayWheelHandler = (e) => {
        const overlay = e.target.closest('.modal-overlay');
        if (!overlay) return;

        const isInScrollable = scrollableSelectors.some(selector =>
            e.target.closest(selector)
        );

        if (!isInScrollable) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    document.addEventListener('touchmove', overlayTouchMoveHandler, { passive: false, capture: true });
    document.addEventListener('wheel', overlayWheelHandler, { passive: false, capture: true });
}

/**
 * Remover listeners de overlay cuando se cierra el modal
 */
function removeModalOverlayScrollBlock() {
    if (overlayTouchMoveHandler) {
        document.removeEventListener('touchmove', overlayTouchMoveHandler, { capture: true });
        overlayTouchMoveHandler = null;
    }
    if (overlayWheelHandler) {
        document.removeEventListener('wheel', overlayWheelHandler, { capture: true });
        overlayWheelHandler = null;
    }
}

/* ========================================
   FUNCIÓN PRINCIPAL DE CONFIGURACIÓN
   ======================================== */

/**
 * Configura todo el comportamiento de scroll para modales
 * Combina guards de lista y bloqueo de overlay con gestión de eventos unificada
 */
function setupModalScrollBehavior() {
    // Prevenir scroll en overlay excepto en áreas scrolleables
    ['wheel', 'touchmove'].forEach(eventType => {
        document.addEventListener(eventType, (e) => {
            const overlay = e.target.closest('.modal-overlay');
            if (!overlay) return;

            const scrollableSelectors = ['.modal-list', '.comment-input', '.current-stop-dropdown'];
            const isInScrollable = scrollableSelectors.some(sel => e.target.closest(sel));

            if (!isInScrollable) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // Lógica específica para modal-list
            const list = e.target.closest('.modal-list');
            if (list) {
                const atTop = list.scrollTop === 0;
                const atBottom = Math.ceil(list.scrollTop) === list.scrollHeight - list.clientHeight;

                if (eventType === 'wheel') {
                    if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
                        e.preventDefault();
                    }
                } else { // touchmove
                    const touch = e.touches[0];
                    const lastY = list._lastTouchY ?? touch.clientY;
                    const deltaY = lastY - touch.clientY;
                    list._lastTouchY = touch.clientY;

                    if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
                        e.preventDefault();
                    }
                }
                e.stopPropagation();
            }
        }, { passive: false, capture: true });
    });

    // Limpiar memoria del último toque
    ['touchend', 'touchcancel'].forEach(type => {
        document.addEventListener(type, (e) => {
            const list = e.target.closest('.modal-list');
            if (list) list._lastTouchY = null;
        }, { capture: true });
    });
}

/* ========================================
   EXPORTS
   ======================================== */

// Exportar funciones a window para uso global
window.setupModalListScrollGuards = setupModalListScrollGuards;
window.removeModalScrollGuards = removeModalScrollGuards;
window.setupModalOverlayScrollBlock = setupModalOverlayScrollBlock;
window.removeModalOverlayScrollBlock = removeModalOverlayScrollBlock;
window.setupModalScrollBehavior = setupModalScrollBehavior;
