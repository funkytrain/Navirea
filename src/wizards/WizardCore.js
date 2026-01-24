// ============================================================================
// WIZARD-CORE.JS - Sistema base para wizards paso a paso
// ============================================================================

/**
 * WizardCore - Sistema base para crear wizards multi-paso
 * Proporciona navegación, validación y gestión de estado
 */
const WizardCore = {
    /**
     * Crea un nuevo wizard
     * @param {Object} config - Configuración del wizard
     * @param {Array} config.steps - Array de definiciones de pasos
     * @param {string} config.title - Título del wizard
     * @param {Function} config.onComplete - Callback al completar
     * @param {Function} config.onCancel - Callback al cancelar
     * @returns {HTMLElement} Contenedor del wizard
     */
    create(config) {
        console.log('[WizardCore] create() llamado con config:', config);

        const wizard = {
            config: config,
            currentStepIndex: 0,
            data: {},
            container: null,
            stepContainers: []
        };

        console.log('[WizardCore] Wizard state creado:', wizard);

        // Crear contenedor principal
        const container = document.createElement('div');
        container.className = 'wizard-container';
        wizard.container = container;

        console.log('[WizardCore] Container creado');

        // Header del wizard
        const header = this.createHeader(wizard);
        container.appendChild(header);

        // Indicador de progreso
        const progress = this.createProgressBar(wizard);
        container.appendChild(progress);

        // Contenedor de contenido del paso actual
        const contentArea = document.createElement('div');
        contentArea.className = 'wizard-content';
        contentArea.id = 'wizard-content';
        container.appendChild(contentArea);

        // Footer con botones de navegación
        const footer = this.createFooter(wizard);
        container.appendChild(footer);

        console.log('[WizardCore] Footer agregado, ahora renderizando primer paso...');

        // Renderizar primer paso
        this.renderStep(wizard, 0);

        console.log('[WizardCore] Primer paso renderizado, retornando container');

        return container;
    },

    /**
     * Crea el header del wizard
     * @param {Object} wizard - Estado del wizard
     * @returns {HTMLElement} Header
     */
    createHeader(wizard) {
        const header = document.createElement('div');
        header.className = 'wizard-header';

        const title = document.createElement('h1');
        title.className = 'wizard-title';
        title.textContent = wizard.config.title || 'Wizard';
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'wizard-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.title = 'Cerrar';
        closeBtn.addEventListener('click', () => {
            if (confirm('¿Deseas cancelar? Se perderá el progreso actual.')) {
                if (wizard.config.onCancel) {
                    wizard.config.onCancel();
                }
            }
        });
        header.appendChild(closeBtn);

        return header;
    },

    /**
     * Crea la barra de progreso
     * @param {Object} wizard - Estado del wizard
     * @returns {HTMLElement} Barra de progreso
     */
    createProgressBar(wizard) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'wizard-progress';
        progressContainer.id = 'wizard-progress';

        const steps = wizard.config.steps || [];
        steps.forEach((step, index) => {
            const stepIndicator = document.createElement('div');
            stepIndicator.className = 'wizard-step-indicator';
            stepIndicator.dataset.stepIndex = index;

            if (index === 0) {
                stepIndicator.classList.add('active');
            }

            const stepNumber = document.createElement('div');
            stepNumber.className = 'step-number';
            stepNumber.textContent = index + 1;
            stepIndicator.appendChild(stepNumber);

            const stepLabel = document.createElement('div');
            stepLabel.className = 'step-label';
            stepLabel.textContent = step.title || `Paso ${index + 1}`;
            stepIndicator.appendChild(stepLabel);

            progressContainer.appendChild(stepIndicator);

            // Agregar separador (excepto en el último paso)
            if (index < steps.length - 1) {
                const separator = document.createElement('div');
                separator.className = 'step-separator';
                progressContainer.appendChild(separator);
            }
        });

        return progressContainer;
    },

    /**
     * Crea el footer con botones
     * @param {Object} wizard - Estado del wizard
     * @returns {HTMLElement} Footer
     */
    createFooter(wizard) {
        const footer = document.createElement('div');
        footer.className = 'wizard-footer';
        footer.id = 'wizard-footer';

        // Botón Anterior
        const prevBtn = document.createElement('button');
        prevBtn.className = 'wizard-btn wizard-btn-secondary';
        prevBtn.id = 'wizard-prev-btn';
        prevBtn.textContent = 'Anterior';
        prevBtn.addEventListener('click', () => {
            this.goToPreviousStep(wizard);
        });
        footer.appendChild(prevBtn);

        // Espaciador
        const spacer = document.createElement('div');
        spacer.style.flex = '1';
        footer.appendChild(spacer);

        // Botón Cancelar
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'wizard-btn wizard-btn-secondary';
        cancelBtn.textContent = 'Cancelar';
        cancelBtn.addEventListener('click', () => {
            if (confirm('¿Deseas cancelar? Se perderá el progreso actual.')) {
                if (wizard.config.onCancel) {
                    wizard.config.onCancel();
                }
            }
        });
        footer.appendChild(cancelBtn);

        // Botón Siguiente
        const nextBtn = document.createElement('button');
        nextBtn.className = 'wizard-btn wizard-btn-primary';
        nextBtn.id = 'wizard-next-btn';
        nextBtn.textContent = 'Siguiente';
        nextBtn.addEventListener('click', () => {
            this.goToNextStep(wizard);
        });
        footer.appendChild(nextBtn);

        // Actualizar estado de botones
        this.updateFooterButtons(wizard);

        return footer;
    },

    /**
     * Renderiza un paso específico
     * @param {Object} wizard - Estado del wizard
     * @param {number} stepIndex - Índice del paso
     */
    renderStep(wizard, stepIndex) {
        console.log('[WizardCore] renderStep llamado, stepIndex:', stepIndex);

        // Buscar el contentArea en el wizard o en el DOM
        let contentArea = wizard.container.querySelector('#wizard-content');
        if (!contentArea) {
            contentArea = document.getElementById('wizard-content');
        }

        console.log('[WizardCore] contentArea encontrado:', contentArea);

        if (!contentArea) {
            console.error('[WizardCore] No se encontró wizard-content');
            return;
        }

        const steps = wizard.config.steps || [];
        if (stepIndex < 0 || stepIndex >= steps.length) return;

        // Limpiar contenido anterior
        contentArea.innerHTML = '';

        // Obtener definición del paso
        const stepDef = steps[stepIndex];

        // Crear contenedor del paso
        const stepContainer = document.createElement('div');
        stepContainer.className = 'wizard-step-content';

        // Título del paso (opcional, puede omitirse si ya está en el indicador)
        if (stepDef.showTitle !== false) {
            const stepTitle = document.createElement('h2');
            stepTitle.className = 'wizard-step-title';
            stepTitle.textContent = stepDef.title || `Paso ${stepIndex + 1}`;
            stepContainer.appendChild(stepTitle);
        }

        // Descripción del paso (opcional)
        if (stepDef.description) {
            const stepDescription = document.createElement('p');
            stepDescription.className = 'wizard-step-description';
            stepDescription.textContent = stepDef.description;
            stepContainer.appendChild(stepDescription);
        }

        // Contenido del paso (generado por la función render del paso)
        if (stepDef.render) {
            console.log('[WizardCore] Renderizando paso', stepIndex, stepDef.title);
            const stepContent = stepDef.render(wizard.data, wizard);
            console.log('[WizardCore] Contenido generado:', stepContent);
            if (stepContent) {
                stepContainer.appendChild(stepContent);
                console.log('[WizardCore] Contenido agregado al contenedor');
            } else {
                console.error('[WizardCore] El render() retornó null o undefined');
            }
        } else {
            console.error('[WizardCore] No hay función render para el paso', stepIndex);
        }

        contentArea.appendChild(stepContainer);
        console.log('[WizardCore] Step container agregado a contentArea');

        // Actualizar índice actual
        wizard.currentStepIndex = stepIndex;

        // Actualizar indicadores de progreso
        this.updateProgressIndicators(wizard);

        // Actualizar botones del footer
        this.updateFooterButtons(wizard);
    },

    /**
     * Actualiza los indicadores de progreso
     * @param {Object} wizard - Estado del wizard
     */
    updateProgressIndicators(wizard) {
        let progressContainer = wizard.container.querySelector('#wizard-progress');
        if (!progressContainer) {
            progressContainer = document.getElementById('wizard-progress');
        }
        if (!progressContainer) return;

        const indicators = progressContainer.querySelectorAll('.wizard-step-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.remove('active', 'completed');

            if (index < wizard.currentStepIndex) {
                indicator.classList.add('completed');
            } else if (index === wizard.currentStepIndex) {
                indicator.classList.add('active');
            }
        });
    },

    /**
     * Actualiza los botones del footer
     * @param {Object} wizard - Estado del wizard
     */
    updateFooterButtons(wizard) {
        let prevBtn = wizard.container.querySelector('#wizard-prev-btn');
        let nextBtn = wizard.container.querySelector('#wizard-next-btn');

        if (!prevBtn) prevBtn = document.getElementById('wizard-prev-btn');
        if (!nextBtn) nextBtn = document.getElementById('wizard-next-btn');

        if (!prevBtn || !nextBtn) return;

        const isFirstStep = wizard.currentStepIndex === 0;
        const isLastStep = wizard.currentStepIndex === wizard.config.steps.length - 1;

        // Botón Anterior
        prevBtn.disabled = isFirstStep;
        prevBtn.style.visibility = isFirstStep ? 'hidden' : 'visible';

        // Botón Siguiente/Finalizar
        if (isLastStep) {
            nextBtn.textContent = 'Finalizar';
            nextBtn.classList.add('wizard-btn-success');
        } else {
            nextBtn.textContent = 'Siguiente';
            nextBtn.classList.remove('wizard-btn-success');
        }
    },

    /**
     * Navega al siguiente paso
     * @param {Object} wizard - Estado del wizard
     */
    goToNextStep(wizard) {
        const currentStep = wizard.config.steps[wizard.currentStepIndex];

        // Validar paso actual
        if (currentStep.validate) {
            const validationResult = currentStep.validate(wizard.data, wizard);
            if (validationResult !== true) {
                alert(validationResult || 'Por favor, completa todos los campos requeridos.');
                return;
            }
        }

        // Guardar datos del paso actual
        if (currentStep.onNext) {
            currentStep.onNext(wizard.data, wizard);
        }

        // Si es el último paso, finalizar
        const isLastStep = wizard.currentStepIndex === wizard.config.steps.length - 1;
        if (isLastStep) {
            this.completeWizard(wizard);
            return;
        }

        // Ir al siguiente paso
        this.renderStep(wizard, wizard.currentStepIndex + 1);
    },

    /**
     * Navega al paso anterior
     * @param {Object} wizard - Estado del wizard
     */
    goToPreviousStep(wizard) {
        if (wizard.currentStepIndex > 0) {
            // Guardar datos del paso actual antes de retroceder
            const currentStep = wizard.config.steps[wizard.currentStepIndex];
            if (currentStep.onPrevious) {
                currentStep.onPrevious(wizard.data, wizard);
            }

            this.renderStep(wizard, wizard.currentStepIndex - 1);
        }
    },

    /**
     * Completa el wizard
     * @param {Object} wizard - Estado del wizard
     */
    completeWizard(wizard) {
        if (wizard.config.onComplete) {
            wizard.config.onComplete(wizard.data, wizard);
        }
    }
};

// Exportar a window
window.WizardCore = WizardCore;
