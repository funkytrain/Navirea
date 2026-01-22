/**
 * Sistema genérico de modales
 * Consolida la lógica duplicada de creación, gestión y cierre de modales
 */

// ===== UTILIDADES =====

/**
 * Escapa caracteres HTML para prevenir XSS
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
}

/**
 * Genera el SVG de botón de cierre estándar
 */
function getCloseButtonSVG() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
}

// ===== FUNCIONES DE CIERRE GENÉRICAS =====

/**
 * Cierra un modal genérico por selector
 */
function closeGenericModal(modalSelector, event) {
    if (!event || event.target === event.currentTarget) {
        // Guardar scroll antes de cerrar
        const scrollToRestore = window.savedScrollPosition || 0;

        const modal = document.querySelector(modalSelector)?.closest('.modal-overlay');
        if (!modal) {
            // Si no encuentra con closest, buscar directamente
            const directModal = document.querySelector(modalSelector);
            if (directModal) directModal.remove();
        } else {
            modal.remove();
        }

        // Si ya no queda ningún overlay, devolvemos el scroll del body
        if (!document.querySelector('.modal-overlay')) {
            window.unlockBodyScroll();
            // Restaurar scroll a la posición guardada
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollToRestore);
            });
        }
    }
}

/**
 * Cierra modal de entrada de filtros
 */
function closeFilterInputModal(event) {
    closeGenericModal('.about-modal', event);
}

/**
 * Cierra modal de resultados de filtros
 */
function closeFilterModal(event) {
    closeGenericModal('.filter-modal', event);
}

/**
 * Cierra modal de confirmación
 */
function closeConfirmModal(accepted, event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.querySelector('.confirm-modal')?.closest('.modal-overlay');
        if (modal) {
            modal.remove();
        }

        if (!document.querySelector('.modal-overlay')) {
            window.unlockBodyScroll();
        }
    }

    // Ejecutar callback si existe
    if (window._confirmModalCallback) {
        if (accepted) {
            window._confirmModalCallback.onConfirm?.();
        } else {
            window._confirmModalCallback.onCancel?.();
        }
        delete window._confirmModalCallback;
    }
}

// ===== GENERADORES DE MODALES =====

/**
 * Crea un modal de entrada con autocompletado
 * @param {Object} config - Configuración del modal
 * @param {string} config.title - Título del modal
 * @param {string} config.label - Etiqueta del input
 * @param {string} config.placeholder - Placeholder del input
 * @param {string} config.inputId - ID del input
 * @param {string} config.suggestionsId - ID del contenedor de sugerencias
 * @param {string} config.oninput - Función a llamar en oninput (nombre como string)
 * @param {string} config.oninputArgs - Argumentos adicionales para oninput (opcional)
 * @param {string} config.extraContent - Contenido HTML adicional antes del label (opcional)
 * @returns {string} HTML del modal
 */
function createInputModalWithSuggestions(config) {
    const oninputCall = config.oninputArgs
        ? `${config.oninput}(this.value, ${config.oninputArgs})`
        : `${config.oninput}(this.value)`;

    return `
        <div class="modal-overlay" onclick="closeFilterInputModal(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">${config.title}</h3>
                        <button class="close-btn" onclick="closeFilterInputModal()">
                            ${getCloseButtonSVG()}
                        </button>
                    </div>
                </div>
                <div class="filter-input-content">
                    ${config.extraContent || ''}
                    <label class="filter-input-label">${config.label}</label>
                    <div style="position: relative;">
                        <input
                            type="text"
                            id="${config.inputId}"
                            class="filter-text-input"
                            placeholder="${config.placeholder}"
                            oninput="${oninputCall}"
                            autocomplete="off"
                        />
                        <div id="${config.suggestionsId}" class="filter-suggestions hidden"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeFilterInputModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crea un modal de entrada simple (sin autocompletado)
 * @param {Object} config - Configuración del modal
 * @param {string} config.title - Título del modal
 * @param {string} config.label - Etiqueta del input
 * @param {string} config.placeholder - Placeholder del input
 * @param {string} config.inputId - ID del input
 * @param {string} config.onEnter - Función a llamar al presionar Enter
 * @param {string} config.onSearch - Función a llamar al hacer clic en Buscar
 * @returns {string} HTML del modal
 */
function createSimpleInputModal(config) {
    return `
        <div class="modal-overlay" onclick="closeFilterInputModal(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">${config.title}</h3>
                        <button class="close-btn" onclick="closeFilterInputModal()">
                            ${getCloseButtonSVG()}
                        </button>
                    </div>
                </div>
                <div class="filter-input-content">
                    <label class="filter-input-label">${config.label}</label>
                    <input
                        type="text"
                        id="${config.inputId}"
                        class="filter-text-input"
                        placeholder="${config.placeholder}"
                        onkeypress="if(event.key==='Enter') ${config.onEnter}()"
                    />
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" style="background-color: #4f46e5;" onclick="${config.onSearch}()">Buscar</button>
                    <button class="clear-btn" onclick="closeFilterInputModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crea un modal de resultados de filtro
 * @param {Object} config - Configuración del modal
 * @param {string} config.title - Título del modal
 * @param {string} config.subtitle - Subtítulo opcional
 * @param {number} config.total - Total de asientos/resultados
 * @param {string} config.details - Detalles formateados
 * @param {Array} config.actions - Botones adicionales [{label, onclick, style}]
 * @returns {string} HTML del modal
 */
function createFilterResultsModal(config) {
    const actions = config.actions || [];
    const actionButtons = actions.map(action =>
        `<button class="clear-btn" ${action.style ? `style="${action.style}"` : ''} onclick="${action.onclick}">${action.label}</button>`
    ).join('');

    // Mostrar total solo si se especifica y es > 0
    const showTotal = config.total !== undefined && config.total > 0 && config.totalLabel !== '';
    const totalLine = showTotal
        ? `<p><strong>Total: ${config.total} ${config.totalLabel || 'asiento(s)'}</strong></p>`
        : '';

    return `
        <div class="modal-overlay" onclick="closeFilterModal(event)">
            <div class="modal filter-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">${config.title}</h3>
                    ${config.subtitle ? `<p style="font-size: 0.9rem; margin-top: 0.5rem;">${config.subtitle}</p>` : ''}
                    <button class="close-btn" onclick="closeFilterModal()">
                        ${getCloseButtonSVG()}
                    </button>
                </div>
                <div class="filter-results">
                    ${totalLine}
                    <pre>${config.details}</pre>
                </div>
                <div class="modal-footer">
                    ${actionButtons}
                    <button class="clear-btn" onclick="closeFilterModal()">Cerrar</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crea un modal de confirmación
 * @param {string} message - Mensaje a mostrar (soporta \n para saltos de línea)
 * @param {Function} onConfirm - Callback al confirmar
 * @param {Function} onCancel - Callback al cancelar
 * @returns {string} HTML del modal
 */
function createConfirmModal(message, onConfirm, onCancel) {
    // Guardar callbacks en variable global temporal
    window._confirmModalCallback = { onConfirm, onCancel };

    return `
        <div class="modal-overlay" onclick="closeConfirmModal(false, event)">
            <div class="modal confirm-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">Confirmar</h3>
                </div>
                <div class="confirm-content">
                    <p>${message.replace(/\n/g, '<br>')}</p>
                </div>
                <div class="modal-footer" style="display: flex; flex-direction: column; gap: 0.5rem;">
                    <button class="clear-btn" style="width: 100%; background-color: #4f46e5;" onclick="closeConfirmModal(true)">Aceptar</button>
                    <button class="clear-btn" style="width: 100%;" onclick="closeConfirmModal(false)">Cancelar</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Crea un modal de lista con elementos navegables
 * @param {Object} config - Configuración del modal
 * @param {string} config.title - Título del modal
 * @param {Array} config.items - Items a mostrar [{key, coach, seat, extra}]
 * @param {string} config.onItemClick - Función a llamar al hacer clic en "Ir" (recibe índice)
 * @returns {string} HTML del modal
 */
function createListModal(config) {
    const items = config.items || [];

    if (items.length === 0) {
        return `
        <div class="modal-overlay filter-input-modal" onclick="closeFilterInputModal(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">${config.title}</h3>
                        <button class="close-btn" onclick="closeFilterInputModal()">
                            ${getCloseButtonSVG()}
                        </button>
                    </div>
                </div>
                <div class="filter-input-content">
                    <div style="color:#777; padding:1rem; text-align:center;">No hay asientos que mostrar.</div>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeFilterInputModal()">Cerrar</button>
                </div>
            </div>
        </div>
        `;
    }

    return `
    <div class="modal-overlay filter-input-modal" onclick="closeFilterInputModal(event)">
        <div class="modal about-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
                <div class="modal-header-top">
                    <h3 class="modal-title">${config.title}</h3>
                    <button class="close-btn" onclick="closeFilterInputModal()">
                        ${getCloseButtonSVG()}
                    </button>
                </div>
            </div>
            <div class="filter-input-content">
                <div class="filter-list-container">
                    ${items.map((it, i) => `
                        <div class="filter-list-row">
                            <div class="filter-list-seat">
                                <strong>${it.coach}</strong> – ${it.seat}
                                ${it.extra ? `<div class="filter-extra">${escapeHtml(it.extra)}</div>` : ''}
                            </div>
                            <div class="filter-list-actions">
                                <button class="icon-btn small red" onclick="${config.onItemClick}(${i})" title="Ir">
                                    <svg viewBox="0 0 24 24" width="16" height="16"
                                         stroke="currentColor" fill="none" stroke-width="2">
                                        <polyline points="9 6 15 12 9 18"></polyline>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="modal-footer">
                <button class="clear-btn" onclick="closeFilterInputModal()">Cerrar</button>
            </div>
        </div>
    </div>
    `;
}

// ===== FUNCIONES DE ALTO NIVEL =====

/**
 * Muestra un modal y bloquea el scroll del body
 * @param {string} modalHTML - HTML del modal a mostrar
 * @param {Function} onOpen - Callback opcional después de abrir
 */
function showModal(modalHTML, onOpen) {
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    window.lockBodyScroll();

    if (onOpen) {
        setTimeout(onOpen, 50);
    }
}

/**
 * Muestra un modal de confirmación
 */
function showConfirmModal(message, onConfirm, onCancel) {
    const modal = createConfirmModal(message, onConfirm, onCancel);
    showModal(modal);
}

// ===== EXPORTS =====

// Exportar funciones al objeto window para uso global
Object.assign(window, {
    // Utilidades
    escapeHtml,

    // Funciones de cierre
    closeGenericModal,
    closeFilterInputModal,
    closeFilterModal,
    closeConfirmModal,

    // Generadores de modales
    createInputModalWithSuggestions,
    createSimpleInputModal,
    createFilterResultsModal,
    createConfirmModal,
    createListModal,

    // Funciones de alto nivel
    showModal,
    showConfirmModal
});
