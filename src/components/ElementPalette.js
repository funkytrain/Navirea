// ============================================================================
// ELEMENT-PALETTE.JS - Paleta de elementos para el editor de asientos
// ============================================================================

/**
 * Paleta de elementos disponibles para crear layouts de asientos
 */
const ElementPalette = {
    /**
     * Tipos de elementos disponibles
     */
    ELEMENT_TYPES: {
        SEAT: {
            type: 'seat',
            label: 'Asiento',
            icon: '💺',
            description: 'Asiento numerado estándar',
            defaultValue: null // Se asigna automáticamente
        },
        SPACE: {
            type: 'space',
            label: 'Espacio',
            icon: '⬜',
            description: 'Espacio vertical entre filas',
            defaultValue: { height: 80 }
        },
        WC: {
            type: 'wc',
            label: 'WC',
            icon: '🚽',
            description: 'Baño',
            defaultValue: 'WC'
        },
        LUGGAGE: {
            type: 'luggage',
            label: 'Equipaje',
            icon: '🧳',
            description: 'Zona de equipaje',
            defaultValue: 'EQ'
        },
        TABLE: {
            type: 'table',
            label: 'Mesa',
            icon: '🪑',
            description: 'Mesa entre asientos',
            defaultValue: 'MESA'
        },
        PMR: {
            type: 'pmr',
            label: 'PMR',
            icon: '♿',
            description: 'Asiento PMR',
            defaultValue: 'PMR'
        },
        WHEELCHAIR: {
            type: 'wheelchair',
            label: 'Minusválidos',
            icon: '♿',
            description: 'Espacio para silla de ruedas',
            defaultValue: 'MIN'
        },
        EMPTY: {
            type: 'empty',
            label: 'Vacío',
            icon: '⚪',
            description: 'Celda vacía (null)',
            defaultValue: null
        }
    },

    /**
     * Crea el elemento DOM de la paleta
     * @param {Function} onElementSelect - Callback al seleccionar elemento
     * @returns {HTMLElement} Contenedor de la paleta
     */
    createPalette(onElementSelect) {
        const container = document.createElement('div');
        container.className = 'element-palette';

        // Título
        const title = document.createElement('h3');
        title.className = 'element-palette-title';
        title.textContent = 'Elementos Disponibles';
        container.appendChild(title);

        // Grid de elementos
        const grid = document.createElement('div');
        grid.className = 'element-palette-grid';

        Object.values(this.ELEMENT_TYPES).forEach(elementType => {
            const button = this.createElementButton(elementType, onElementSelect);
            grid.appendChild(button);
        });

        container.appendChild(grid);

        return container;
    },

    /**
     * Crea un botón de elemento
     * @param {Object} elementType - Tipo de elemento
     * @param {Function} onSelect - Callback al seleccionar
     * @returns {HTMLElement} Botón del elemento
     */
    createElementButton(elementType, onSelect) {
        const button = document.createElement('button');
        button.className = 'element-palette-button';
        button.dataset.elementType = elementType.type;
        button.title = elementType.description;

        // Icono
        const icon = document.createElement('span');
        icon.className = 'element-palette-icon';
        icon.textContent = elementType.icon;
        button.appendChild(icon);

        // Label
        const label = document.createElement('span');
        label.className = 'element-palette-label';
        label.textContent = elementType.label;
        button.appendChild(label);

        // Click handler
        button.addEventListener('click', () => {
            if (onSelect) {
                onSelect(elementType);
            }
        });

        return button;
    },

    /**
     * Obtiene el tipo de elemento por su tipo
     * @param {string} type - Tipo de elemento
     * @returns {Object|null} Definición del elemento
     */
    getElementType(type) {
        return Object.values(this.ELEMENT_TYPES).find(el => el.type === type) || null;
    },

    /**
     * Crea un elemento de layout a partir de un tipo
     * @param {string} type - Tipo de elemento
     * @param {*} value - Valor opcional (ej: número de asiento, altura)
     * @returns {Object} Elemento de layout
     */
    createLayoutElement(type, value = null) {
        const elementType = this.getElementType(type);
        if (!elementType) {
            console.error(`Tipo de elemento desconocido: ${type}`);
            return null;
        }

        switch (type) {
            case 'seat':
                return value !== null ? value : elementType.defaultValue;

            case 'space':
                return {
                    type: 'space',
                    height: value !== null ? value : elementType.defaultValue.height
                };

            case 'empty':
                return null;

            default:
                // WC, EQ, MESA, PMR, MIN
                return value !== null ? value : elementType.defaultValue;
        }
    },

    /**
     * Valida si un valor es válido para un tipo de elemento
     * @param {string} type - Tipo de elemento
     * @param {*} value - Valor a validar
     * @returns {boolean} Es válido
     */
    isValidValue(type, value) {
        const elementType = this.getElementType(type);
        if (!elementType) return false;

        switch (type) {
            case 'seat':
                return typeof value === 'number' && value > 0;

            case 'space':
                return typeof value === 'object' &&
                       value !== null &&
                       typeof value.height === 'number' &&
                       value.height > 0;

            case 'empty':
                return value === null;

            default:
                return typeof value === 'string' && value.length > 0;
        }
    }
};

// Exportar a window
window.ElementPalette = ElementPalette;
