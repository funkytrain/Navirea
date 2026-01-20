/* ========================================
   MODAL HELPERS - Utilidades para modales
   ======================================== */

// NOTA: Estas utilidades están disponibles aquí para uso futuro,
// pero actualmente script.js tiene sus propias versiones activas
// para mantener la funcionalidad existente.

/*
// Variables de estado para scroll y swipe
let modalScrollPosition = 0;
let modalSwipeStartY = 0;
let modalSwipeDeltaY = 0;
let modalSwipeActive = false;
const MODAL_SWIPE_CLOSE_THRESHOLD = 80; // px necesarios para cerrar

// ===== GESTIÓN DE SCROLL EN MODALES =====

function saveModalScrollPosition() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modalScrollPosition = modal.scrollTop || 0;
    }
}

function restoreModalScrollPosition() {
    requestAnimationFrame(() => {
        const modal = document.querySelector('.modal');
        if (modal && modalScrollPosition > 0) {
            modal.scrollTop = modalScrollPosition;
        }
    });
}

// Evitar propagación de scroll del modal al body
function handleModalOverlayInteraction(e) {
    const modal = e.target.closest('.modal');
    if (modal) {
        e.stopPropagation();
    }
}

function setupModalListScrollGuards() {
    const modal = document.querySelector('.modal');
    if (!modal) return;

    const scrollableContent = modal.querySelector('.modal-list, .modal-content');
    if (!scrollableContent) return;

    scrollableContent.addEventListener('touchstart', function (e) {
        const scrollTop = this.scrollTop;
        const scrollHeight = this.scrollHeight;
        const clientHeight = this.clientHeight;
        const delta = e.touches[0].clientY - (this._lastY || 0);
        this._lastY = e.touches[0].clientY;

        // Bloquear overscroll arriba
        if (scrollTop === 0 && delta > 0) {
            e.preventDefault();
        }

        // Bloquear overscroll abajo
        if (scrollTop + clientHeight >= scrollHeight && delta < 0) {
            e.preventDefault();
        }
    }, { passive: false });

    scrollableContent.addEventListener('touchmove', function (e) {
        const scrollTop = this.scrollTop;
        const scrollHeight = this.scrollHeight;
        const clientHeight = this.clientHeight;
        const delta = e.touches[0].clientY - this._lastY;
        this._lastY = e.touches[0].clientY;

        // Bloquear overscroll arriba
        if (scrollTop === 0 && delta > 0) {
            e.preventDefault();
        }

        // Bloquear overscroll abajo
        if (scrollTop + clientHeight >= scrollHeight && delta < 0) {
            e.preventDefault();
        }
    }, { passive: false });
}

function removeModalScrollGuards() {
    const modal = document.querySelector('.modal');
    if (!modal) return;

    const scrollableContent = modal.querySelector('.modal-list, .modal-content');
    if (!scrollableContent) {
        scrollableContent.removeEventListener('touchstart', () => { });
        scrollableContent.removeEventListener('touchmove', () => { });
    }
}

function setupModalOverlayScrollBlock() {
    const overlay = document.querySelector('.modal-overlay');
    if (!overlay) return;

    overlay.addEventListener('touchstart', function (e) {
        const modal = e.target.closest('.modal');
        if (!modal) {
            e.preventDefault();
        }
    }, { passive: false });

    overlay.addEventListener('touchmove', function (e) {
        const modal = e.target.closest('.modal');
        if (!modal) {
            e.preventDefault();
        }
    }, { passive: false });
}

function removeModalOverlayScrollBlock() {
    const overlay = document.querySelector('.modal-overlay');
    if (!overlay) return;

    overlay.removeEventListener('touchstart', () => { });
    overlay.removeEventListener('touchmove', () => { });
}

function setupModalScrollBehavior() {
    requestAnimationFrame(() => {
        setupModalListScrollGuards();
        setupModalOverlayScrollBlock();
        restoreModalScrollPosition();
    });
}

// ===== SWIPE PARA CERRAR MODAL =====

function modalSwipeStart(event) {
    if (!event.touches || event.touches.length === 0) return;

    // Solo activamos el swipe si el gesto empieza en el header del modal
    const header = event.target.closest('.modal-header');
    if (!header) {
        modalSwipeActive = false;
        return;
    }

    modalSwipeActive = true;
    const touch = event.touches[0];
    modalSwipeStartY = touch.clientY;
    modalSwipeDeltaY = 0;

    const modal = document.querySelector('.modal');
    if (modal) {
        modal.style.transition = 'none';
    }
}

function modalSwipeMove(event) {
    if (!modalSwipeActive || !event.touches || event.touches.length === 0) return;

    const touch = event.touches[0];
    modalSwipeDeltaY = touch.clientY - modalSwipeStartY;

    // Solo permitir swipe hacia abajo (valores positivos)
    if (modalSwipeDeltaY < 0) {
        modalSwipeDeltaY = 0;
    }

    const modal = document.querySelector('.modal');
    if (modal) {
        modal.style.transform = `translateY(${modalSwipeDeltaY}px)`;
    }
}

function modalSwipeEnd(event) {
    if (!modalSwipeActive) return;

    modalSwipeActive = false;

    const modal = document.querySelector('.modal');
    if (!modal) return;

    // Restaurar transición
    modal.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

    // Si superamos el threshold, cerrar modal
    if (modalSwipeDeltaY > MODAL_SWIPE_CLOSE_THRESHOLD) {
        modal.style.transform = 'translateY(100%)';
        modal.style.opacity = '0';
        setTimeout(() => {
            // Llamar a la función global closeModal
            if (typeof closeModal === 'function') {
                closeModal();
            }
        }, 300);
    } else {
        // Si no, volver a la posición original con rebote
        modal.style.transform = 'translateY(0)';
    }

    modalSwipeDeltaY = 0;
}

// ===== UTILIDAD PARA ELIMINAR MODALES =====

function removeModalAndUnlock() {
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
        modal.remove();
    }
    unlockBodyScroll();
}

function removeAllScreenModals() {
    const screenModals = document.querySelectorAll('.screen-modal-overlay, .station-screen-overlay');
    screenModals.forEach(modal => modal.remove());
    unlockBodyScroll();
}
*/
