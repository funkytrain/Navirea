// ============================================================================
// TRAIN-MODEL-WIZARD.JS - Wizard para crear modelos de tren personalizados
// ============================================================================

/**
 * TrainModelWizard - Asistente paso a paso para crear modelos de tren
 */
const TrainModelWizard = {
    /**
     * Abre el wizard para crear un nuevo modelo de tren
     * @param {Object} options - { onComplete, onCancel, editModel }
     */
    open(options = {}) {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'wizard-overlay';
        overlay.id = 'train-wizard-overlay';

        // Configurar wizard
        const wizardConfig = {
            title: options.editModel ? 'Editar Modelo de Tren' : 'Crear Nuevo Modelo de Tren',
            steps: this.createSteps(options.editModel),
            onComplete: (data) => {
                this.handleComplete(data, options);
                overlay.remove();
            },
            onCancel: () => {
                if (options.onCancel) options.onCancel();
                overlay.remove();
            }
        };

        // Crear wizard
        const wizard = window.WizardCore.create(wizardConfig);
        overlay.appendChild(wizard);

        // Agregar al body
        document.body.appendChild(overlay);

        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';

        // Restaurar scroll al cerrar
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.removedNodes.forEach((node) => {
                    if (node === overlay) {
                        document.body.style.overflow = '';
                        observer.disconnect();
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true });
    },

    /**
     * Define los pasos del wizard
     * @param {Object} editModel - Modelo a editar (null para crear nuevo)
     * @returns {Array} Definiciones de pasos
     */
    createSteps(editModel = null) {
        return [
            {
                title: 'Información Básica',
                description: 'Información general del modelo de tren',
                showTitle: true,
                render: (data) => this.renderStep1_BasicInfo(data, editModel),
                validate: (data) => this.validateStep1(data),
                onNext: (data) => this.saveStep1(data)
            },
            {
                title: 'Configuración de Coches',
                description: 'Define cuántos coches tiene el tren y sus nombres',
                showTitle: true,
                render: (data) => this.renderStep2_Coaches(data),
                validate: (data) => this.validateStep2(data),
                onNext: (data) => this.saveStep2(data)
            },
            {
                title: 'Editor de Layouts',
                description: 'Diseña la disposición de asientos de cada coche',
                showTitle: true,
                render: (data) => this.renderStep3_Layouts(data),
                validate: (data) => this.validateStep3(data),
                onNext: (data) => this.saveStep3(data)
            },
            {
                title: 'Vista Previa',
                description: 'Revisa tu modelo antes de guardarlo',
                showTitle: true,
                render: (data) => this.renderStep4_Preview(data),
                validate: (data) => true
            }
        ];
    },

    // ========================================================================
    // PASO 1: INFORMACIÓN BÁSICA
    // ========================================================================

    /**
     * Renderiza el paso 1
     */
    renderStep1_BasicInfo(data, editModel) {
        console.log('[TrainModelWizard] Renderizando paso 1 - Información Básica');
        console.log('[TrainModelWizard] Data recibida:', data);
        console.log('[TrainModelWizard] EditModel:', editModel);

        const container = document.createElement('div');
        container.className = 'wizard-form';
        console.log('[TrainModelWizard] Container creado:', container);

        // Prellenar datos si estamos editando
        if (editModel && !data.modelName) {
            data.modelId = editModel.id;
            data.modelName = editModel.name;
            data.modelDescription = editModel.description || '';
            console.log('[TrainModelWizard] Datos prellenados desde editModel');
        }

        // Campo: Nombre del Modelo
        const nameGroup = document.createElement('div');
        nameGroup.className = 'form-group';
        nameGroup.innerHTML = `
            <label for="model-name" class="form-label">
                Nombre del Modelo <span class="required">*</span>
            </label>
            <input
                type="text"
                id="model-name"
                class="form-input"
                placeholder="Ej: Tren Regional 3 Coches"
                value="${data.modelName || ''}"
            />
            <small class="form-help">Nombre descriptivo para identificar este modelo</small>
        `;
        container.appendChild(nameGroup);

        // Campo: Descripción (opcional)
        const descGroup = document.createElement('div');
        descGroup.className = 'form-group';
        descGroup.innerHTML = `
            <label for="model-description" class="form-label">
                Descripción (opcional)
            </label>
            <textarea
                id="model-description"
                class="form-input"
                rows="3"
                placeholder="Ej: Modelo para trayectos cortos con 3 coches"
            >${data.modelDescription || ''}</textarea>
            <small class="form-help">Información adicional sobre este modelo</small>
        `;
        container.appendChild(descGroup);

        // Escuchar cambios
        const nameInput = nameGroup.querySelector('#model-name');
        const descInput = descGroup.querySelector('#model-description');

        nameInput.addEventListener('input', (e) => {
            data.modelName = e.target.value.trim();
        });

        descInput.addEventListener('input', (e) => {
            data.modelDescription = e.target.value.trim();
        });

        console.log('[TrainModelWizard] Container HTML:', container.innerHTML.substring(0, 200));
        console.log('[TrainModelWizard] Retornando container con', container.children.length, 'hijos');
        return container;
    },

    /**
     * Valida el paso 1
     */
    validateStep1(data) {
        if (!data.modelName || data.modelName.trim() === '') {
            return 'Por favor, ingresa un nombre para el modelo.';
        }
        return true;
    },

    /**
     * Guarda datos del paso 1
     */
    saveStep1(data) {
        // Generar ID si no existe (nuevo modelo)
        if (!data.modelId) {
            data.modelId = window.IdGenerator.generateCustomId('custom');
        }
        data.custom = true;
        data.createdAt = data.createdAt || new Date().toISOString();
    },

    // ========================================================================
    // PASO 2: CONFIGURACIÓN DE COCHES
    // ========================================================================

    /**
     * Renderiza el paso 2
     */
    renderStep2_Coaches(data) {
        const container = document.createElement('div');
        container.className = 'wizard-form';

        // Inicializar coches si no existen
        if (!data.coaches || data.coaches.length === 0) {
            data.coaches = [
                { id: 'C1', name: 'Coche 1', layout: [] }
            ];
        }

        // Campo: Número de coches
        const countGroup = document.createElement('div');
        countGroup.className = 'form-group';
        countGroup.innerHTML = `
            <label for="coach-count" class="form-label">
                Número de Coches <span class="required">*</span>
            </label>
            <input
                type="number"
                id="coach-count"
                class="form-input"
                min="1"
                max="20"
                value="${data.coaches.length}"
            />
            <small class="form-help">Cantidad de coches que tendrá el tren</small>
        `;
        container.appendChild(countGroup);

        // Lista de coches
        const coachesListContainer = document.createElement('div');
        coachesListContainer.className = 'form-group';
        coachesListContainer.innerHTML = `
            <label class="form-label">Nombres de los Coches</label>
        `;

        const coachesList = document.createElement('div');
        coachesList.id = 'coaches-list';
        coachesList.className = 'coaches-list';
        coachesListContainer.appendChild(coachesList);

        container.appendChild(coachesListContainer);

        // Renderizar lista de coches
        const renderCoachesList = () => {
            coachesList.innerHTML = '';
            data.coaches.forEach((coach, index) => {
                const coachItem = document.createElement('div');
                coachItem.className = 'coach-item';
                coachItem.innerHTML = `
                    <div class="coach-number">${index + 1}</div>
                    <input
                        type="text"
                        class="form-input coach-name-input"
                        data-index="${index}"
                        placeholder="Nombre del coche"
                        value="${coach.name || `Coche ${index + 1}`}"
                    />
                `;

                const input = coachItem.querySelector('.coach-name-input');
                input.addEventListener('input', (e) => {
                    data.coaches[index].name = e.target.value.trim() || `Coche ${index + 1}`;
                });

                coachesList.appendChild(coachItem);
            });
        };

        renderCoachesList();

        // Escuchar cambios en número de coches
        const countInput = countGroup.querySelector('#coach-count');
        countInput.addEventListener('change', (e) => {
            const newCount = parseInt(e.target.value, 10);
            if (isNaN(newCount) || newCount < 1) {
                e.target.value = data.coaches.length;
                return;
            }

            const currentCount = data.coaches.length;

            if (newCount > currentCount) {
                // Agregar coches
                for (let i = currentCount; i < newCount; i++) {
                    data.coaches.push({
                        id: `C${i + 1}`,
                        name: `Coche ${i + 1}`,
                        layout: []
                    });
                }
            } else if (newCount < currentCount) {
                // Eliminar coches
                if (confirm(`¿Estás seguro de eliminar ${currentCount - newCount} coche(s)? Se perderán sus layouts.`)) {
                    data.coaches = data.coaches.slice(0, newCount);
                } else {
                    e.target.value = currentCount;
                    return;
                }
            }

            renderCoachesList();
        });

        return container;
    },

    /**
     * Valida el paso 2
     */
    validateStep2(data) {
        if (!data.coaches || data.coaches.length === 0) {
            return 'Debe haber al menos 1 coche.';
        }

        for (let i = 0; i < data.coaches.length; i++) {
            if (!data.coaches[i].name || data.coaches[i].name.trim() === '') {
                return `Por favor, ingresa un nombre para el Coche ${i + 1}.`;
            }
        }

        return true;
    },

    /**
     * Guarda datos del paso 2
     */
    saveStep2(data) {
        // Asegurar que cada coche tenga un ID único
        data.coaches.forEach((coach, index) => {
            if (!coach.id) {
                coach.id = `C${index + 1}`;
            }
            if (!coach.layout) {
                coach.layout = [];
            }
        });
    },

    // ========================================================================
    // PASO 3: EDITOR DE LAYOUTS
    // ========================================================================

    /**
     * Renderiza el paso 3
     */
    renderStep3_Layouts(data) {
        const container = document.createElement('div');
        container.className = 'wizard-layouts-editor';

        // Selector de coche
        const coachSelector = document.createElement('div');
        coachSelector.className = 'coach-selector';
        coachSelector.innerHTML = `
            <label class="form-label">Editando:</label>
            <select id="coach-selector" class="form-input">
                ${data.coaches.map((coach, index) => `
                    <option value="${index}">${coach.name}</option>
                `).join('')}
            </select>
        `;
        container.appendChild(coachSelector);

        // Contenedor del editor
        const editorContainer = document.createElement('div');
        editorContainer.id = 'layout-editor-container';
        container.appendChild(editorContainer);

        // Variable para mantener el índice actual
        let currentCoachIndex = 0;

        // Función para renderizar el editor del coche actual
        const renderEditor = (coachIndex) => {
            editorContainer.innerHTML = '';
            const coach = data.coaches[coachIndex];

            // Crear editor de layout
            const editor = window.SeatLayoutEditor.init({
                layout: coach.layout.length > 0 ? coach.layout : undefined,
                coachName: coach.name,
                onChange: (newLayout) => {
                    // Guardar layout en el coche
                    coach.layout = newLayout;
                }
            });

            editorContainer.appendChild(editor);
        };

        // Renderizar editor inicial
        renderEditor(currentCoachIndex);

        // Escuchar cambios en el selector
        const selector = coachSelector.querySelector('#coach-selector');
        selector.addEventListener('change', (e) => {
            // Guardar el layout del coche actual antes de cambiar
            const editor = window.SeatLayoutEditor;
            if (editor && editor.state) {
                data.coaches[currentCoachIndex].layout = editor.getLayout();
            }

            currentCoachIndex = parseInt(e.target.value, 10);
            renderEditor(currentCoachIndex);
        });

        return container;
    },

    /**
     * Valida el paso 3
     */
    validateStep3(data) {
        // Guardar el layout actual antes de validar
        const editor = window.SeatLayoutEditor;
        if (editor && editor.state) {
            const currentCoachIndex = parseInt(
                document.getElementById('coach-selector')?.value || '0',
                10
            );
            data.coaches[currentCoachIndex].layout = editor.getLayout();
        }

        // Validar que cada coche tenga al menos un layout
        for (let i = 0; i < data.coaches.length; i++) {
            const coach = data.coaches[i];
            if (!coach.layout || coach.layout.length === 0) {
                return `El ${coach.name} no tiene ningún layout definido. Por favor, agrega al menos una sección.`;
            }

            // Validar que haya al menos una sección de asientos
            const hasSeats = coach.layout.some(section => section.type === 'seats');
            if (!hasSeats) {
                return `El ${coach.name} debe tener al menos una sección de asientos.`;
            }
        }

        return true;
    },

    /**
     * Guarda datos del paso 3
     */
    saveStep3(data) {
        // Guardar el layout del coche actual
        const editor = window.SeatLayoutEditor;
        if (editor && editor.state) {
            const currentCoachIndex = parseInt(
                document.getElementById('coach-selector')?.value || '0',
                10
            );
            data.coaches[currentCoachIndex].layout = editor.getLayout();
        }

        // Validar layouts con el validador
        data.coaches.forEach(coach => {
            const validation = window.ConfigValidator.validateTrainModel({
                id: data.modelId,
                name: data.modelName,
                custom: true,
                coaches: [coach]
            });

            if (!validation.valid && validation.errors.length > 0) {
                console.warn(`Advertencia en ${coach.name}:`, validation.errors);
            }
        });
    },

    // ========================================================================
    // PASO 4: VISTA PREVIA
    // ========================================================================

    /**
     * Renderiza el paso 4
     */
    renderStep4_Preview(data) {
        const container = document.createElement('div');
        container.className = 'wizard-preview';

        // Información del modelo
        const infoSection = document.createElement('div');
        infoSection.className = 'preview-section';
        infoSection.innerHTML = `
            <h3 class="preview-section-title">Información del Modelo</h3>
            <div class="preview-info">
                <div class="preview-info-item">
                    <strong>Nombre:</strong> ${data.modelName}
                </div>
                ${data.modelDescription ? `
                    <div class="preview-info-item">
                        <strong>Descripción:</strong> ${data.modelDescription}
                    </div>
                ` : ''}
                <div class="preview-info-item">
                    <strong>Número de Coches:</strong> ${data.coaches.length}
                </div>
                <div class="preview-info-item">
                    <strong>ID:</strong> <code>${data.modelId}</code>
                </div>
            </div>
        `;
        container.appendChild(infoSection);

        // Vista previa de coches
        const coachesSection = document.createElement('div');
        coachesSection.className = 'preview-section';
        coachesSection.innerHTML = `
            <h3 class="preview-section-title">Vista Previa de Coches</h3>
        `;

        data.coaches.forEach((coach, index) => {
            const coachPreview = document.createElement('div');
            coachPreview.className = 'preview-coach';

            const coachTitle = document.createElement('h4');
            coachTitle.className = 'preview-coach-title';
            coachTitle.textContent = coach.name;
            coachPreview.appendChild(coachTitle);

            const preview = window.LayoutPreview.createPreview(coach.layout, coach.name);
            coachPreview.appendChild(preview);

            coachesSection.appendChild(coachPreview);
        });

        container.appendChild(coachesSection);

        // Mensaje de confirmación
        const confirmSection = document.createElement('div');
        confirmSection.className = 'preview-section preview-confirm';
        confirmSection.innerHTML = `
            <p class="preview-confirm-text">
                ¿Todo se ve correcto? Haz clic en <strong>Finalizar</strong> para guardar este modelo.
            </p>
        `;
        container.appendChild(confirmSection);

        return container;
    },

    // ========================================================================
    // COMPLETAR WIZARD
    // ========================================================================

    /**
     * Maneja la finalización del wizard
     */
    handleComplete(data, options) {
        try {
            // Crear objeto del modelo
            const trainModel = {
                id: data.modelId,
                name: data.modelName,
                description: data.modelDescription,
                custom: true,
                createdAt: data.createdAt,
                coaches: data.coaches
            };

            // Guardar en ConfigurationManager
            const result = window.ConfigurationManager.saveCustomTrainModel(trainModel);

            if (result.success) {
                alert(`✅ Modelo "${data.modelName}" guardado exitosamente.`);

                if (options.onComplete) {
                    options.onComplete(trainModel);
                }
            } else {
                alert(`❌ Error al guardar: ${result.message}`);
            }
        } catch (error) {
            console.error('Error al completar wizard:', error);
            alert(`❌ Error: ${error.message}`);
        }
    }
};

// Exportar a window
window.TrainModelWizard = TrainModelWizard;
