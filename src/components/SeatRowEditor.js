// ============================================================================
// SEAT-ROW-EDITOR.JS - Editor de fila individual de asientos
// ============================================================================

/**
 * Editor para una fila individual de asientos
 */
const SeatRowEditor = {
    /**
     * Crea un editor de fila
     * @param {Array} positions - Posiciones iniciales [1, 2, null, 3, 4]
     * @param {number} rowIndex - Índice de la fila
     * @param {Object} callbacks - { onUpdate, onDelete, onMoveUp, onMoveDown }
     * @returns {HTMLElement} Elemento de la fila
     */
    createRowEditor(positions = [], rowIndex = 0, callbacks = {}) {
        const container = document.createElement('div');
        container.className = 'seat-row-editor';
        container.dataset.rowIndex = rowIndex;

        // Header con controles
        const header = this.createRowHeader(rowIndex, callbacks);
        container.appendChild(header);

        // Grid de posiciones
        const grid = this.createPositionsGrid(positions, rowIndex, callbacks.onUpdate);
        container.appendChild(grid);

        // Botón para agregar posición
        const addButton = this.createAddPositionButton(positions, rowIndex, callbacks.onUpdate);
        container.appendChild(addButton);

        return container;
    },

    /**
     * Crea el header de la fila con controles
     * @param {number} rowIndex - Índice de la fila
     * @param {Object} callbacks - Callbacks de control
     * @returns {HTMLElement} Header
     */
    createRowHeader(rowIndex, callbacks) {
        const header = document.createElement('div');
        header.className = 'seat-row-header';

        // Título
        const title = document.createElement('span');
        title.className = 'seat-row-title';
        title.textContent = `Fila ${rowIndex + 1}`;
        header.appendChild(title);

        // Controles
        const controls = document.createElement('div');
        controls.className = 'seat-row-controls';

        // Botón subir
        const upBtn = document.createElement('button');
        upBtn.className = 'seat-row-control-btn';
        upBtn.innerHTML = '↑';
        upBtn.title = 'Mover arriba';
        upBtn.addEventListener('click', () => {
            if (callbacks.onMoveUp) callbacks.onMoveUp(rowIndex);
        });
        controls.appendChild(upBtn);

        // Botón bajar
        const downBtn = document.createElement('button');
        downBtn.className = 'seat-row-control-btn';
        downBtn.innerHTML = '↓';
        downBtn.title = 'Mover abajo';
        downBtn.addEventListener('click', () => {
            if (callbacks.onMoveDown) callbacks.onMoveDown(rowIndex);
        });
        controls.appendChild(downBtn);

        // Botón eliminar
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'seat-row-control-btn seat-row-control-delete';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Eliminar fila';
        deleteBtn.addEventListener('click', () => {
            if (callbacks.onDelete) callbacks.onDelete(rowIndex);
        });
        controls.appendChild(deleteBtn);

        header.appendChild(controls);

        return header;
    },

    /**
     * Crea el grid de posiciones
     * @param {Array} positions - Posiciones de la fila
     * @param {number} rowIndex - Índice de la fila
     * @param {Function} onUpdate - Callback de actualización
     * @returns {HTMLElement} Grid
     */
    createPositionsGrid(positions, rowIndex, onUpdate) {
        const grid = document.createElement('div');
        grid.className = 'seat-positions-grid';

        positions.forEach((position, posIndex) => {
            const cell = this.createPositionCell(position, rowIndex, posIndex, onUpdate);
            grid.appendChild(cell);
        });

        return grid;
    },

    /**
     * Crea una celda de posición
     * @param {*} position - Valor de la posición
     * @param {number} rowIndex - Índice de la fila
     * @param {number} posIndex - Índice de la posición
     * @param {Function} onUpdate - Callback de actualización
     * @returns {HTMLElement} Celda
     */
    createPositionCell(position, rowIndex, posIndex, onUpdate) {
        const cell = document.createElement('div');
        cell.className = 'seat-position-cell';
        cell.dataset.rowIndex = rowIndex;
        cell.dataset.posIndex = posIndex;

        // Input editable
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'seat-position-input';
        input.value = this.formatPositionValue(position);
        input.placeholder = 'null';

        // Estilo según tipo
        const posType = this.detectPositionType(position);
        input.dataset.positionType = posType;

        // Eventos
        input.addEventListener('change', (e) => {
            const newValue = this.parsePositionValue(e.target.value);
            if (onUpdate) {
                onUpdate(rowIndex, posIndex, newValue);
            }
        });

        input.addEventListener('focus', () => {
            cell.classList.add('focused');
        });

        input.addEventListener('blur', () => {
            cell.classList.remove('focused');
        });

        cell.appendChild(input);

        // Botón eliminar posición
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'seat-position-delete';
        deleteBtn.innerHTML = '×';
        deleteBtn.title = 'Eliminar posición';
        deleteBtn.addEventListener('click', () => {
            if (onUpdate) {
                onUpdate(rowIndex, posIndex, null, true); // true = eliminar
            }
        });
        cell.appendChild(deleteBtn);

        return cell;
    },

    /**
     * Crea el botón para agregar posición
     * @param {Array} positions - Posiciones actuales
     * @param {number} rowIndex - Índice de la fila
     * @param {Function} onUpdate - Callback de actualización
     * @returns {HTMLElement} Botón
     */
    createAddPositionButton(positions, rowIndex, onUpdate) {
        const button = document.createElement('button');
        button.className = 'seat-row-add-position';
        button.innerHTML = '+ Agregar Posición';
        button.addEventListener('click', () => {
            if (onUpdate) {
                const newPosIndex = positions.length;
                onUpdate(rowIndex, newPosIndex, null, false, true); // true = agregar nueva
            }
        });
        return button;
    },

    /**
     * Formatea un valor de posición para mostrar
     * @param {*} position - Valor de la posición
     * @returns {string} Valor formateado
     */
    formatPositionValue(position) {
        if (position === null || position === undefined) {
            return '';
        }
        if (typeof position === 'number') {
            return position.toString();
        }
        if (typeof position === 'string') {
            return position;
        }
        if (typeof position === 'object' && position.type === 'space') {
            return `space:${position.height}`;
        }
        return JSON.stringify(position);
    },

    /**
     * Parsea un valor de posición desde string
     * @param {string} value - Valor string
     * @returns {*} Valor parseado
     */
    parsePositionValue(value) {
        const trimmed = value.trim();

        // Vacío o null explícito
        if (trimmed === '' || trimmed.toLowerCase() === 'null') {
            return null;
        }

        // Número
        if (/^\d+$/.test(trimmed)) {
            return parseInt(trimmed, 10);
        }

        // Space con altura
        if (trimmed.startsWith('space:')) {
            const height = parseInt(trimmed.split(':')[1], 10);
            return { type: 'space', height: isNaN(height) ? 80 : height };
        }

        // String literal (WC, EQ, MESA, PMR, MIN, etc.)
        return trimmed.toUpperCase();
    },

    /**
     * Detecta el tipo de posición
     * @param {*} position - Valor de la posición
     * @returns {string} Tipo detectado
     */
    detectPositionType(position) {
        if (position === null || position === undefined) {
            return 'empty';
        }
        if (typeof position === 'number') {
            return 'seat';
        }
        if (typeof position === 'object' && position.type === 'space') {
            return 'space';
        }
        if (typeof position === 'string') {
            const upper = position.toUpperCase();
            if (upper === 'WC') return 'wc';
            if (upper === 'EQ') return 'luggage';
            if (upper === 'MESA') return 'table';
            if (upper === 'PMR') return 'pmr';
            if (upper === 'MIN') return 'wheelchair';
            return 'custom';
        }
        return 'unknown';
    },

    /**
     * Actualiza una fila existente
     * @param {HTMLElement} rowElement - Elemento de la fila
     * @param {Array} newPositions - Nuevas posiciones
     */
    updateRow(rowElement, newPositions) {
        const grid = rowElement.querySelector('.seat-positions-grid');
        if (!grid) return;

        // Reconstruir grid
        const rowIndex = parseInt(rowElement.dataset.rowIndex, 10);
        const onUpdate = rowElement._onUpdate; // Guardado previamente

        grid.innerHTML = '';
        newPositions.forEach((position, posIndex) => {
            const cell = this.createPositionCell(position, rowIndex, posIndex, onUpdate);
            grid.appendChild(cell);
        });
    }
};

// Exportar a window
window.SeatRowEditor = SeatRowEditor;
