// ============================================================================
// SEAT-LAYOUT-EDITOR.JS - Editor principal de layouts de asientos
// ============================================================================

/**
 * Editor completo de layouts de asientos con vista previa en tiempo real
 */
const SeatLayoutEditor = {
    // Estado interno del editor
    state: {
        layout: [],
        coachName: 'Coche 1',
        autoNumber: true,
        nextSeatNumber: 1,
        onChange: null
    },

    /**
     * Inicializa el editor
     * @param {Object} options - { layout, coachName, onChange, startNumber }
     * @returns {HTMLElement} Contenedor del editor
     */
    init(options = {}) {
        // Establecer número inicial ANTES de crear el layout
        const startNumber = options.startNumber !== undefined ? options.startNumber : 1;

        // Inicializar estado
        this.state.layout = options.layout || this.createDefaultLayout(startNumber);
        this.state.coachName = options.coachName || 'Coche 1';
        this.state.onChange = options.onChange || null;
        this.state.autoNumber = options.autoNumber !== false;

        // Establecer número inicial
        if (options.startNumber !== undefined) {
            this.state.nextSeatNumber = options.startNumber;
            // Recalcular basándose en el layout que acabamos de crear
            this.recalculateNextSeatNumber();
        } else {
            // Calcular próximo número de asiento basándose en el layout existente
            this.recalculateNextSeatNumber();
        }

        // Crear contenedor principal
        const container = document.createElement('div');
        container.className = 'seat-layout-editor';

        // Panel izquierdo: Controles y editor
        const leftPanel = this.createLeftPanel();
        container.appendChild(leftPanel);

        // Panel derecho: Vista previa
        const rightPanel = this.createRightPanel();
        container.appendChild(rightPanel);

        return container;
    },

    /**
     * Crea el panel izquierdo con controles
     * @returns {HTMLElement} Panel izquierdo
     */
    createLeftPanel() {
        const panel = document.createElement('div');
        panel.className = 'editor-panel editor-left-panel';

        // Título
        const title = document.createElement('h2');
        title.className = 'editor-title';
        title.textContent = 'Editor de Layout';
        panel.appendChild(title);

        // Controles generales
        const controls = this.createGeneralControls();
        panel.appendChild(controls);

        // Lista de secciones
        const sectionsList = this.createSectionsList();
        panel.appendChild(sectionsList);

        // Botones de acción
        const actions = this.createActionButtons();
        panel.appendChild(actions);

        return panel;
    },

    /**
     * Crea el panel derecho con vista previa
     * @returns {HTMLElement} Panel derecho
     */
    createRightPanel() {
        const panel = document.createElement('div');
        panel.className = 'editor-panel editor-right-panel';

        const preview = window.LayoutPreview.createPreview(
            this.state.layout,
            this.state.coachName
        );
        preview.id = 'layout-preview-container';
        panel.appendChild(preview);

        return panel;
    },

    /**
     * Crea controles generales
     * @returns {HTMLElement} Controles
     */
    createGeneralControls() {
        const container = document.createElement('div');
        container.className = 'editor-controls';

        // Auto-numeración
        const autoNumberLabel = document.createElement('label');
        autoNumberLabel.className = 'editor-control-label';

        const autoNumberCheckbox = document.createElement('input');
        autoNumberCheckbox.type = 'checkbox';
        autoNumberCheckbox.checked = this.state.autoNumber;
        autoNumberCheckbox.addEventListener('change', (e) => {
            this.state.autoNumber = e.target.checked;
            if (this.state.autoNumber) {
                this.renumberSeats();
            }
        });

        autoNumberLabel.appendChild(autoNumberCheckbox);
        autoNumberLabel.appendChild(document.createTextNode(' Numeración automática'));
        container.appendChild(autoNumberLabel);

        return container;
    },

    /**
     * Crea la lista de secciones
     * @returns {HTMLElement} Lista de secciones
     */
    createSectionsList() {
        const container = document.createElement('div');
        container.className = 'sections-list';
        container.id = 'sections-list';

        this.renderSections(container);

        return container;
    },

    /**
     * Renderiza todas las secciones
     * @param {HTMLElement} container - Contenedor
     */
    renderSections(container) {
        container.innerHTML = '';

        this.state.layout.forEach((section, index) => {
            const sectionElement = this.createSectionElement(section, index);
            container.appendChild(sectionElement);
        });
    },

    /**
     * Crea un elemento de sección
     * @param {Object} section - Datos de la sección
     * @param {number} index - Índice de la sección
     * @returns {HTMLElement} Elemento de sección
     */
    createSectionElement(section, index) {
        const container = document.createElement('div');
        container.className = 'section-item';
        container.dataset.sectionIndex = index;

        if (section.type === 'seats') {
            // Sección de asientos
            container.appendChild(this.createSeatsSection(section, index));
        } else if (section.type === 'space') {
            // Espacio
            container.appendChild(this.createSpaceSection(section, index));
        } else if (section.type === 'door') {
            // Puerta
            container.appendChild(this.createDoorSection(section, index));
        } else if (section.type === 'pmr-bathroom') {
            // Baño PMR
            container.appendChild(this.createPMRBathroomSection(section, index));
        }

        return container;
    },

    /**
     * Crea una sección de asientos
     * @param {Object} section - Sección
     * @param {number} sectionIndex - Índice
     * @returns {HTMLElement} Elemento
     */
    createSeatsSection(section, sectionIndex) {
        const container = document.createElement('div');
        container.className = 'seats-section-editor';

        // Header
        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            <span class="section-title">Asientos</span>
            <button class="section-delete-btn" data-section="${sectionIndex}">🗑️</button>
        `;
        header.querySelector('.section-delete-btn').addEventListener('click', () => {
            this.deleteSection(sectionIndex);
        });
        container.appendChild(header);

        // Filas
        section.positions.forEach((row, rowIndex) => {
            const rowEditor = window.SeatRowEditor.createRowEditor(
                row,
                rowIndex,
                {
                    onUpdate: (rIdx, posIdx, value, isDelete, isAdd) => {
                        this.updatePosition(sectionIndex, rIdx, posIdx, value, isDelete, isAdd);
                    },
                    onDelete: (rIdx) => {
                        this.deleteRow(sectionIndex, rIdx);
                    },
                    onMoveUp: (rIdx) => {
                        this.moveRow(sectionIndex, rIdx, -1);
                    },
                    onMoveDown: (rIdx) => {
                        this.moveRow(sectionIndex, rIdx, 1);
                    }
                }
            );
            container.appendChild(rowEditor);
        });

        // Botón agregar fila
        const addRowBtn = document.createElement('button');
        addRowBtn.className = 'add-row-btn';
        addRowBtn.textContent = '+ Agregar Fila de Asientos';
        addRowBtn.addEventListener('click', () => {
            this.addRow(sectionIndex);
        });
        container.appendChild(addRowBtn);

        return container;
    },

    /**
     * Crea una sección de espacio
     * @param {Object} section - Sección
     * @param {number} sectionIndex - Índice
     * @returns {HTMLElement} Elemento
     */
    createSpaceSection(section, sectionIndex) {
        const container = document.createElement('div');
        container.className = 'space-section-editor';
        container.innerHTML = `
            <div class="section-header">
                <span class="section-title">Espacio</span>
                <button class="section-delete-btn" data-section="${sectionIndex}">🗑️</button>
            </div>
            <div class="section-content">
                <label>
                    Altura (px):
                    <input type="number" class="space-height-input" value="${section.height}" min="20" max="500" />
                </label>
            </div>
        `;

        container.querySelector('.section-delete-btn').addEventListener('click', () => {
            this.deleteSection(sectionIndex);
        });

        container.querySelector('.space-height-input').addEventListener('change', (e) => {
            this.updateSpaceHeight(sectionIndex, parseInt(e.target.value, 10));
        });

        return container;
    },

    /**
     * Crea una sección de puerta
     * @param {Object} section - Sección
     * @param {number} sectionIndex - Índice
     * @returns {HTMLElement} Elemento
     */
    createDoorSection(section, sectionIndex) {
        const container = document.createElement('div');
        container.className = 'door-section-editor';
        container.innerHTML = `
            <div class="section-header">
                <span class="section-title">Puerta</span>
                <button class="section-delete-btn" data-section="${sectionIndex}">🗑️</button>
            </div>
            <div class="section-content">
                <label>
                    Altura (px):
                    <input type="number" class="door-height-input" value="${section.height || 120}" min="80" max="300" />
                </label>
            </div>
        `;

        container.querySelector('.section-delete-btn').addEventListener('click', () => {
            this.deleteSection(sectionIndex);
        });

        container.querySelector('.door-height-input').addEventListener('change', (e) => {
            this.updateDoorHeight(sectionIndex, parseInt(e.target.value, 10));
        });

        return container;
    },

    /**
     * Crea una sección de baño PMR
     * @param {Object} section - Sección
     * @param {number} sectionIndex - Índice
     * @returns {HTMLElement} Elemento
     */
    createPMRBathroomSection(section, sectionIndex) {
        const container = document.createElement('div');
        container.className = 'pmr-bathroom-section-editor';
        container.innerHTML = `
            <div class="section-header">
                <span class="section-title">Baño PMR</span>
                <button class="section-delete-btn" data-section="${sectionIndex}">🗑️</button>
            </div>
            <div class="section-content">
                <label>
                    Altura (px):
                    <input type="number" class="pmr-height-input" value="${section.height || 100}" min="80" max="300" />
                </label>
                <label>
                    Etiqueta:
                    <input type="text" class="pmr-label-input" value="${section.label || 'BAÑO PMR'}" />
                </label>
            </div>
        `;

        container.querySelector('.section-delete-btn').addEventListener('click', () => {
            this.deleteSection(sectionIndex);
        });

        container.querySelector('.pmr-height-input').addEventListener('change', (e) => {
            this.updatePMRHeight(sectionIndex, parseInt(e.target.value, 10));
        });

        container.querySelector('.pmr-label-input').addEventListener('change', (e) => {
            this.updatePMRLabel(sectionIndex, e.target.value);
        });

        return container;
    },

    /**
     * Crea botones de acción
     * @returns {HTMLElement} Botones
     */
    createActionButtons() {
        const container = document.createElement('div');
        container.className = 'editor-actions';

        // Botón para agregar fila de asientos con numeración continua
        const addSeatRowBtn = document.createElement('button');
        addSeatRowBtn.className = 'editor-action-btn editor-action-btn-primary';
        addSeatRowBtn.textContent = '+ Agregar Fila de Asientos';
        addSeatRowBtn.addEventListener('click', () => {
            this.addSeatRowToLastSection();
        });
        container.appendChild(addSeatRowBtn);

        const addSeatSectionBtn = document.createElement('button');
        addSeatSectionBtn.className = 'editor-action-btn';
        addSeatSectionBtn.textContent = '+ Agregar Sección de Asientos';
        addSeatSectionBtn.addEventListener('click', () => {
            this.addSeatsSection();
        });
        container.appendChild(addSeatSectionBtn);

        const addSpaceBtn = document.createElement('button');
        addSpaceBtn.className = 'editor-action-btn';
        addSpaceBtn.textContent = '+ Agregar Espacio';
        addSpaceBtn.addEventListener('click', () => {
            this.addSpaceSection();
        });
        container.appendChild(addSpaceBtn);

        const addDoorBtn = document.createElement('button');
        addDoorBtn.className = 'editor-action-btn';
        addDoorBtn.textContent = '+ Agregar Puerta';
        addDoorBtn.addEventListener('click', () => {
            this.addDoorSection();
        });
        container.appendChild(addDoorBtn);

        return container;
    },

    /**
     * Crea un layout por defecto
     * @returns {Array} Layout vacío
     */
    createDefaultLayout(startNumber = 1) {
        return [
            {
                type: 'seats',
                positions: [
                    [startNumber, startNumber + 1, null, startNumber + 2, startNumber + 3]
                ]
            }
        ];
    },

    /**
     * Recalcula el próximo número de asiento
     */
    recalculateNextSeatNumber() {
        let maxSeat = 0;

        this.state.layout.forEach(section => {
            if (section.type === 'seats' && section.positions) {
                section.positions.forEach(row => {
                    row.forEach(pos => {
                        if (typeof pos === 'number' && pos > maxSeat) {
                            maxSeat = pos;
                        }
                    });
                });
            }
        });

        this.state.nextSeatNumber = maxSeat + 1;
    },

    /**
     * Renumera todos los asientos
     */
    renumberSeats() {
        let currentNumber = 1;

        this.state.layout.forEach(section => {
            if (section.type === 'seats' && section.positions) {
                section.positions.forEach(row => {
                    for (let i = 0; i < row.length; i++) {
                        if (typeof row[i] === 'number') {
                            row[i] = currentNumber++;
                        }
                    }
                });
            }
        });

        this.state.nextSeatNumber = currentNumber;
        this.refresh();
    },

    /**
     * Actualiza una posición
     */
    updatePosition(sectionIndex, rowIndex, posIndex, value, isDelete = false, isAdd = false) {
        const section = this.state.layout[sectionIndex];
        if (!section || section.type !== 'seats') return;

        const row = section.positions[rowIndex];
        if (!row) return;

        if (isDelete) {
            // Eliminar posición
            row.splice(posIndex, 1);
        } else if (isAdd) {
            // Agregar nueva posición
            row.push(null);
        } else {
            // Actualizar valor
            row[posIndex] = value;
        }

        this.refresh();
    },

    /**
     * Agrega una fila de asientos
     */
    addRow(sectionIndex) {
        const section = this.state.layout[sectionIndex];
        if (!section || section.type !== 'seats') return;

        // Si la autonumeración está activa, recalcular el siguiente número basándose en los asientos existentes
        if (this.state.autoNumber) {
            this.recalculateNextSeatNumber();
        }

        // Crear fila con 4 asientos por defecto
        const newRow = this.state.autoNumber
            ? [
                this.state.nextSeatNumber++,
                this.state.nextSeatNumber++,
                null,
                this.state.nextSeatNumber++,
                this.state.nextSeatNumber++
            ]
            : [null, null, null, null, null];

        section.positions.push(newRow);
        this.refresh();
    },

    /**
     * Elimina una fila
     */
    deleteRow(sectionIndex, rowIndex) {
        const section = this.state.layout[sectionIndex];
        if (!section || section.type !== 'seats') return;

        section.positions.splice(rowIndex, 1);

        // Renumerar todos los asientos para que sean consecutivos
        if (this.state.autoNumber) {
            this.renumberSeats();
        } else {
            this.refresh();
        }
    },

    /**
     * Mueve una fila
     */
    moveRow(sectionIndex, rowIndex, direction) {
        const section = this.state.layout[sectionIndex];
        if (!section || section.type !== 'seats') return;

        const newIndex = rowIndex + direction;
        if (newIndex < 0 || newIndex >= section.positions.length) return;

        const temp = section.positions[rowIndex];
        section.positions[rowIndex] = section.positions[newIndex];
        section.positions[newIndex] = temp;

        this.refresh();
    },

    /**
     * Agrega una sección de asientos
     */
    addSeatsSection() {
        this.state.layout.push({
            type: 'seats',
            positions: [
                [null, null, null, null]
            ]
        });
        this.refresh();
    },

    /**
     * Agrega una fila de asientos al final del layout
     * Si el último elemento es una sección de asientos, agrega la fila ahí
     * Si no, crea una nueva sección de asientos al final
     */
    addSeatRowToLastSection() {
        const lastIndex = this.state.layout.length - 1;

        // Si el último elemento es una sección de asientos, agregar fila ahí
        if (lastIndex >= 0 && this.state.layout[lastIndex].type === 'seats') {
            this.addRow(lastIndex);
            return;
        }

        // Si no hay secciones o el último elemento no es de asientos,
        // crear nueva sección de asientos al final
        this.state.layout.push({
            type: 'seats',
            positions: []
        });

        // Agregar fila a la nueva sección
        const newSectionIndex = this.state.layout.length - 1;
        this.addRow(newSectionIndex);
    },

    /**
     * Agrega una sección de espacio
     */
    addSpaceSection() {
        this.state.layout.push({
            type: 'space',
            height: 80
        });
        this.refresh();
    },

    /**
     * Agrega una sección de puerta
     */
    addDoorSection() {
        this.state.layout.push({
            type: 'door',
            height: 120
        });
        this.refresh();
    },

    /**
     * Elimina una sección
     */
    deleteSection(sectionIndex) {
        this.state.layout.splice(sectionIndex, 1);
        this.refresh();
    },

    /**
     * Actualiza altura de espacio
     */
    updateSpaceHeight(sectionIndex, height) {
        const section = this.state.layout[sectionIndex];
        if (!section || section.type !== 'space') return;

        section.height = height;
        this.refreshPreview();
    },

    /**
     * Actualiza altura de puerta
     */
    updateDoorHeight(sectionIndex, height) {
        const section = this.state.layout[sectionIndex];
        if (!section || section.type !== 'door') return;

        section.height = height;
        this.refreshPreview();
    },

    /**
     * Actualiza altura de baño PMR
     */
    updatePMRHeight(sectionIndex, height) {
        const section = this.state.layout[sectionIndex];
        if (!section || section.type !== 'pmr-bathroom') return;

        section.height = height;
        this.refreshPreview();
    },

    /**
     * Actualiza label de baño PMR
     */
    updatePMRLabel(sectionIndex, label) {
        const section = this.state.layout[sectionIndex];
        if (!section || section.type !== 'pmr-bathroom') return;

        section.label = label;
        this.refreshPreview();
    },

    /**
     * Refresca el editor completo
     */
    refresh() {
        // Refrescar lista de secciones
        const sectionsList = document.getElementById('sections-list');
        if (sectionsList) {
            this.renderSections(sectionsList);
        }

        // Refrescar vista previa
        this.refreshPreview();

        // Llamar callback
        if (this.state.onChange) {
            this.state.onChange(this.state.layout);
        }
    },

    /**
     * Refresca solo la vista previa
     */
    refreshPreview() {
        const preview = document.getElementById('layout-preview-container');
        if (preview) {
            window.LayoutPreview.updatePreview(
                preview,
                this.state.layout,
                this.state.coachName
            );
        }

        // Llamar callback
        if (this.state.onChange) {
            this.state.onChange(this.state.layout);
        }
    },

    /**
     * Obtiene el layout actual
     * @returns {Array} Layout
     */
    getLayout() {
        return JSON.parse(JSON.stringify(this.state.layout)); // Deep clone
    },

    /**
     * Establece un nuevo layout
     * @param {Array} layout - Nuevo layout
     */
    setLayout(layout) {
        this.state.layout = JSON.parse(JSON.stringify(layout)); // Deep clone
        this.recalculateNextSeatNumber();
        this.refresh();
    }
};

// Exportar a window
window.SeatLayoutEditor = SeatLayoutEditor;
