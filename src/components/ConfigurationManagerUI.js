/**
 * ConfigurationManagerUI.js
 * UI principal para gestionar configuraciones personalizadas de trenes y rutas
 * Permite ver, crear, editar, eliminar, importar y exportar configuraciones
 */

class ConfigurationManagerUI {
    constructor() {
        this.container = null;
        this.currentView = 'models'; // 'models' o 'routes'

        // Referencias a wizards
        this.trainWizard = null;
        this.routeWizard = null;

        // Callbacks
        this.onClose = null;
    }

    /**
     * Renderiza la UI completa
     */
    render(parentElement) {
        this.container = document.createElement('div');
        this.container.className = 'config-manager-overlay';

        const modal = document.createElement('div');
        modal.className = 'config-manager-modal';

        modal.innerHTML = `
            <div class="config-manager-header">
                <h2>🔧 Gestionar Configuraciones</h2>
                <button class="config-close-btn" aria-label="Cerrar">✕</button>
            </div>

            <div class="config-manager-tabs">
                <button class="config-tab active" data-view="models">
                    📋 Modelos de Tren
                </button>
                <button class="config-tab" data-view="routes">
                    🚂 Trayectos
                </button>
                <button class="config-tab" data-view="restore">
                    ♻️ Restauración
                </button>
            </div>

            <div class="config-manager-content">
                <div class="config-view" id="models-view"></div>
                <div class="config-view hidden" id="routes-view"></div>
                <div class="config-view hidden" id="restore-view"></div>
            </div>

            <div class="config-manager-footer">
                <button class="config-btn config-btn-secondary" id="export-all-btn">
                    📤 Exportar Todo
                </button>
                <button class="config-btn config-btn-secondary" id="import-btn">
                    📥 Importar
                </button>
                <button class="config-btn config-btn-secondary" id="share-qr-btn">
                    📱 Compartir QR
                </button>
                <button class="config-btn config-btn-secondary" id="scan-qr-btn">
                    📷 Escanear QR
                </button>
            </div>
        `;

        this.container.appendChild(modal);
        parentElement.appendChild(this.container);

        // Bloquear scroll del body
        window.lockBodyScroll();

        // Guardar referencia global para actualización desde import QR
        window.currentConfigManagerUI = this;

        this.attachEventListeners();
        this.renderModelsView();
        this.renderRoutesView();
        this.renderRestoreView();
    }

    /**
     * Adjunta event listeners
     */
    attachEventListeners() {
        // Cerrar modal
        const closeBtn = this.container.querySelector('.config-close-btn');
        closeBtn.addEventListener('click', () => this.close());

        // Cerrar al hacer click fuera
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) {
                this.close();
            }
        });

        // Tabs
        const tabs = this.container.querySelectorAll('.config-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                this.switchView(view);
            });
        });

        // Botones de footer
        const exportBtn = this.container.querySelector('#export-all-btn');
        exportBtn.addEventListener('click', () => this.exportAll());

        const importBtn = this.container.querySelector('#import-btn');
        importBtn.addEventListener('click', () => this.importConfiguration());

        // Botones de QR
        const shareQRBtn = this.container.querySelector('#share-qr-btn');
        shareQRBtn.addEventListener('click', () => window.generateConfigQR());

        const scanQRBtn = this.container.querySelector('#scan-qr-btn');
        scanQRBtn.addEventListener('click', () => window.scanConfigQR());
    }

    /**
     * Cambia entre vistas de modelos y rutas
     */
    switchView(view) {
        this.currentView = view;

        // Actualizar tabs
        const tabs = this.container.querySelectorAll('.config-tab');
        tabs.forEach(tab => {
            if (tab.dataset.view === view) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Mostrar vista correspondiente
        const views = this.container.querySelectorAll('.config-view');
        views.forEach(v => {
            if (v.id === `${view}-view`) {
                v.classList.remove('hidden');
            } else {
                v.classList.add('hidden');
            }
        });
    }

    /**
     * Renderiza la vista de modelos de tren
     */
    renderModelsView() {
        const view = this.container.querySelector('#models-view');

        // Obtener modelos del sistema (desde trainModels global si existe)
        const allModels = window.trainModels || {};
        const systemModels = window.ConfigurationManager.getSystemTrainModels(allModels);
        const customModels = window.ConfigurationManager.getCustomTrainModels();

        view.innerHTML = `
            <div class="config-section">
                <h3 class="config-section-title">Sistema (${systemModels.length})</h3>
                <div class="config-list">
                    ${this.renderSystemModelsList(systemModels)}
                </div>
            </div>

            <div class="config-section">
                <div class="config-section-header">
                    <h3 class="config-section-title">Personalizados (${customModels.length})</h3>
                    <button class="config-btn config-btn-primary" id="new-model-btn">
                        ➕ Nuevo Modelo
                    </button>
                </div>
                <div class="config-list">
                    ${this.renderCustomModelsList(customModels)}
                </div>
            </div>
        `;

        // Event listener para nuevo modelo
        const newModelBtn = view.querySelector('#new-model-btn');
        newModelBtn.addEventListener('click', () => this.openTrainWizard());

        // Event listeners para editar/eliminar
        this.attachModelActions(view);
    }

    /**
     * Renderiza lista de modelos del sistema
     */
    renderSystemModelsList(models) {
        if (models.length === 0) {
            return '<p class="config-empty">No hay modelos del sistema</p>';
        }

        return models.map(model => `
            <div class="config-item config-item-system">
                <div class="config-item-icon">🚄</div>
                <div class="config-item-info">
                    <div class="config-item-name">${model.name}</div>
                    <div class="config-item-meta">${model.coaches.length} coches</div>
                </div>
                <div class="config-item-actions">
                    <button class="config-action-btn config-action-delete" data-action="delete-system" data-type="model" data-id="${model.id}" title="Eliminar">
                        ✕
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderiza lista de modelos personalizados
     */
    renderCustomModelsList(models) {
        if (models.length === 0) {
            return '<p class="config-empty">No tienes modelos personalizados. Crea uno nuevo para empezar.</p>';
        }

        return models.map(model => `
            <div class="config-item config-item-custom" data-model-id="${model.id}">
                <div class="config-item-icon">🚆</div>
                <div class="config-item-info">
                    <div class="config-item-name">${model.name}</div>
                    <div class="config-item-meta">
                        ${model.coaches.length} coches •
                        Creado ${this.formatDate(model.createdAt)}
                    </div>
                </div>
                <div class="config-item-actions">
                    <button class="config-action-btn" data-action="edit" data-id="${model.id}" title="Editar">
                        ⚙️
                    </button>
                    <button class="config-action-btn" data-action="duplicate" data-id="${model.id}" title="Duplicar">
                        📋
                    </button>
                    <button class="config-action-btn config-action-delete" data-action="delete" data-id="${model.id}" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderiza la vista de trayectos
     */
    renderRoutesView() {
        const view = this.container.querySelector('#routes-view');

        // Obtener rutas del sistema (desde trainRoutes global si existe)
        const allRoutes = window.trainRoutes || {};
        const systemRoutes = window.ConfigurationManager.getSystemRoutes(allRoutes);
        const customRoutes = window.ConfigurationManager.getCustomRoutes();

        view.innerHTML = `
            <div class="config-section">
                <h3 class="config-section-title">Sistema (${systemRoutes.length})</h3>
                <div class="config-list">
                    ${this.renderSystemRoutesList(systemRoutes)}
                </div>
            </div>

            <div class="config-section">
                <div class="config-section-header">
                    <h3 class="config-section-title">Personalizados (${customRoutes.length})</h3>
                    <button class="config-btn config-btn-primary" id="new-route-btn">
                        ➕ Nuevo Trayecto
                    </button>
                </div>
                <div class="config-list">
                    ${this.renderCustomRoutesList(customRoutes)}
                </div>
            </div>
        `;

        // Event listener para nuevo trayecto
        const newRouteBtn = view.querySelector('#new-route-btn');
        newRouteBtn.addEventListener('click', () => this.openRouteWizard());

        // Event listeners para editar/eliminar
        this.attachRouteActions(view);
    }

    /**
     * Renderiza lista de rutas del sistema
     */
    renderSystemRoutesList(routes) {
        if (routes.length === 0) {
            return '<p class="config-empty">No hay rutas del sistema</p>';
        }

        return routes.map(route => `
            <div class="config-item config-item-system">
                <div class="config-item-icon">🛤️</div>
                <div class="config-item-info">
                    <div class="config-item-name">Tren ${route.trainNumber}</div>
                    <div class="config-item-meta">
                        ${route.stops[0]} → ${route.destination} (${route.stops.length} paradas)
                    </div>
                </div>
                <div class="config-item-actions">
                    <button class="config-action-btn config-action-delete" data-action="delete-system" data-type="route" data-id="${route.trainNumber}" title="Eliminar">
                        ✕
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderiza lista de rutas personalizadas
     */
    renderCustomRoutesList(routes) {
        if (routes.length === 0) {
            return '<p class="config-empty">No tienes trayectos personalizados. Crea uno nuevo para empezar.</p>';
        }

        return routes.map(route => `
            <div class="config-item config-item-custom" data-route-id="${route.trainNumber}">
                <div class="config-item-icon">🚉</div>
                <div class="config-item-info">
                    <div class="config-item-name">Tren ${route.trainNumber}</div>
                    <div class="config-item-meta">
                        ${route.stops[0]} → ${route.destination} (${route.stops.length} paradas) •
                        Creado ${this.formatDate(route.createdAt)}
                    </div>
                </div>
                <div class="config-item-actions">
                    <button class="config-action-btn" data-action="edit" data-id="${route.trainNumber}" title="Editar">
                        ⚙️
                    </button>
                    <button class="config-action-btn" data-action="duplicate" data-id="${route.trainNumber}" title="Duplicar">
                        📋
                    </button>
                    <button class="config-action-btn config-action-delete" data-action="delete" data-id="${route.trainNumber}" title="Eliminar">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderiza la vista de restauración de elementos ocultos
     */
    renderRestoreView() {
        const view = this.container.querySelector('#restore-view');

        // Obtener elementos ocultos
        const hiddenModels = this.getHiddenSystemModelsWithDetails();
        const hiddenRoutes = this.getHiddenSystemRoutesWithDetails();

        const totalHidden = hiddenModels.length + hiddenRoutes.length;

        view.innerHTML = `
            ${totalHidden > 0 ? `
                <div class="config-section">
                    <div class="config-section-header">
                        <h3 class="config-section-title">Restauración Rápida</h3>
                        <button class="config-btn config-btn-primary" id="restore-all-btn">
                            ♻️ Restaurar Todo
                        </button>
                    </div>
                    <p style="color: #6b7280; margin-bottom: 1.5rem;">
                        Restaura todos los modelos y trayectos ocultos de una sola vez.
                    </p>
                </div>
            ` : ''}

            <div class="config-section">
                <h3 class="config-section-title">Modelos Ocultos (${hiddenModels.length})</h3>
                <div class="config-list">
                    ${this.renderHiddenModelsList(hiddenModels)}
                </div>
            </div>

            <div class="config-section">
                <h3 class="config-section-title">Trayectos Ocultos (${hiddenRoutes.length})</h3>
                <div class="config-list">
                    ${this.renderHiddenRoutesList(hiddenRoutes)}
                </div>
            </div>
        `;

        // Event listeners para restaurar
        this.attachRestoreActions(view);

        // Event listener para restaurar todo
        const restoreAllBtn = view.querySelector('#restore-all-btn');
        if (restoreAllBtn) {
            restoreAllBtn.addEventListener('click', () => this.restoreAll());
        }
    }

    /**
     * Obtiene modelos ocultos con sus detalles
     */
    getHiddenSystemModelsWithDetails() {
        const hiddenIds = window.ConfigurationManager.getHiddenSystemModels();
        // Usar datos originales sin filtrar
        const allModels = window._originalTrainModels || {};

        return hiddenIds.map(id => ({
            id,
            ...allModels[id]
        })).filter(model => model && model.name); // Filtrar los que existen
    }

    /**
     * Obtiene rutas ocultas con sus detalles
     */
    getHiddenSystemRoutesWithDetails() {
        const hiddenNumbers = window.ConfigurationManager.getHiddenSystemRoutes();
        // Usar datos originales sin filtrar
        const allRoutes = window._originalTrainRoutes || {};

        return hiddenNumbers.map(trainNumber => {
            const routeData = allRoutes[trainNumber];
            if (!routeData) return null;

            // Manejar formato array o objeto
            if (Array.isArray(routeData)) {
                return {
                    trainNumber,
                    stops: routeData,
                    destination: routeData[routeData.length - 1]
                };
            } else {
                return {
                    trainNumber,
                    stops: routeData.stops || routeData,
                    destination: routeData.destination || (Array.isArray(routeData.stops) ? routeData.stops[routeData.stops.length - 1] : routeData[routeData.length - 1])
                };
            }
        }).filter(route => route !== null); // Filtrar los que existen
    }

    /**
     * Renderiza lista de modelos ocultos
     */
    renderHiddenModelsList(models) {
        if (models.length === 0) {
            return '<p class="config-empty">No hay modelos ocultos</p>';
        }

        return models.map(model => `
            <div class="config-item config-item-hidden">
                <div class="config-item-icon">🚄</div>
                <div class="config-item-info">
                    <div class="config-item-name">${model.name}</div>
                    <div class="config-item-meta">${model.coaches.length} coches</div>
                </div>
                <div class="config-item-actions">
                    <button class="config-action-btn config-action-restore" data-action="restore-model" data-id="${model.id}" title="Restaurar">
                        ♻️
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderiza lista de rutas ocultas
     */
    renderHiddenRoutesList(routes) {
        if (routes.length === 0) {
            return '<p class="config-empty">No hay trayectos ocultos</p>';
        }

        return routes.map(route => `
            <div class="config-item config-item-hidden">
                <div class="config-item-icon">🛤️</div>
                <div class="config-item-info">
                    <div class="config-item-name">Tren ${route.trainNumber}</div>
                    <div class="config-item-meta">
                        ${route.stops[0]} → ${route.destination} (${route.stops.length} paradas)
                    </div>
                </div>
                <div class="config-item-actions">
                    <button class="config-action-btn config-action-restore" data-action="restore-route" data-id="${route.trainNumber}" title="Restaurar">
                        ♻️
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Adjunta event listeners para acciones de restauración
     */
    attachRestoreActions(view) {
        const actionButtons = view.querySelectorAll('.config-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;

                switch (action) {
                    case 'restore-model':
                        this.restoreModel(id);
                        break;
                    case 'restore-route':
                        this.restoreRoute(id);
                        break;
                }
            });
        });
    }

    /**
     * Adjunta event listeners para acciones de modelos
     */
    attachModelActions(view) {
        const actionButtons = view.querySelectorAll('.config-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                const type = btn.dataset.type;

                switch (action) {
                    case 'edit':
                        this.editModel(id);
                        break;
                    case 'duplicate':
                        this.duplicateModel(id);
                        break;
                    case 'delete':
                        this.deleteModel(id);
                        break;
                    case 'delete-system':
                        this.deleteSystemItem(type, id);
                        break;
                }
            });
        });
    }

    /**
     * Adjunta event listeners para acciones de rutas
     */
    attachRouteActions(view) {
        const actionButtons = view.querySelectorAll('.config-action-btn');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const id = btn.dataset.id;
                const type = btn.dataset.type;

                switch (action) {
                    case 'edit':
                        this.editRoute(id);
                        break;
                    case 'duplicate':
                        this.duplicateRoute(id);
                        break;
                    case 'delete':
                        this.deleteRoute(id);
                        break;
                    case 'delete-system':
                        this.deleteSystemItem(type, id);
                        break;
                }
            });
        });
    }

    /**
     * Abre el wizard de creación de modelo de tren
     */
    openTrainWizard(modelData = null) {
        // Ocultar temporalmente el manager
        this.container.style.display = 'none';

        // Abrir wizard usando la API correcta
        TrainModelWizard.open({
            editModel: modelData,
            onComplete: async (savedModel) => {
                // Recargar datos globales para que trainModels se actualice
                if (window.loadJSONData) {
                    await window.loadJSONData();
                }

                // Mostrar manager de nuevo
                this.container.style.display = 'flex';

                // Refrescar vista
                this.renderModelsView();

                // Mostrar mensaje de éxito
                this.showSuccessMessage(modelData ? 'Modelo actualizado correctamente' : 'Modelo creado correctamente');
            },
            onCancel: () => {
                // Mostrar manager de nuevo
                this.container.style.display = 'flex';
            }
        });
    }

    /**
     * Abre el wizard de creación de trayecto
     */
    openRouteWizard(routeData = null) {
        // Ocultar temporalmente el manager
        this.container.style.display = 'none';

        // Obtener paradas disponibles
        const availableStops = window.stops || [];

        // Abrir wizard usando la API correcta
        RouteWizard.open({
            mode: routeData ? 'edit' : 'create',
            route: routeData,
            availableStops: availableStops,
            onComplete: async (savedRoute) => {
                // Recargar datos globales para que trainRoutes se actualice
                if (window.loadJSONData) {
                    await window.loadJSONData();
                }

                // Mostrar manager de nuevo
                this.container.style.display = 'flex';

                // Refrescar vista
                this.renderRoutesView();

                // Mostrar mensaje de éxito
                this.showSuccessMessage(routeData ? 'Trayecto actualizado correctamente' : 'Trayecto creado correctamente');
            },
            onCancel: () => {
                // Mostrar manager de nuevo
                this.container.style.display = 'flex';
            }
        });
    }

    /**
     * Edita un modelo existente
     */
    editModel(modelId) {
        const model = window.ConfigurationManager.getCustomTrainModelById(modelId);
        if (model) {
            this.openTrainWizard(model);
        }
    }

    /**
     * Duplica un modelo
     */
    duplicateModel(modelId) {
        const model = window.ConfigurationManager.getCustomTrainModelById(modelId);
        if (model) {
            // Crear copia con nuevo ID y nombre
            const duplicate = {
                ...model,
                id: undefined, // Se generará uno nuevo
                name: `${model.name} (Copia)`,
                createdAt: undefined // Se generará nueva fecha
            };

            this.openTrainWizard(duplicate);
        }
    }

    /**
     * Elimina un modelo
     */
    deleteModel(modelId) {
        const model = window.ConfigurationManager.getCustomTrainModelById(modelId);
        if (!model) return;

        if (confirm(`¿Estás seguro de que quieres eliminar el modelo "${model.name}"?\n\nEsta acción no se puede deshacer.`)) {
            const result = window.ConfigurationManager.deleteCustomTrainModel(modelId);
            if (result.success) {
                this.renderModelsView();
                this.showSuccessMessage('Modelo eliminado correctamente');
            } else {
                alert('Error al eliminar el modelo: ' + result.error);
            }
        }
    }

    /**
     * Edita una ruta existente
     */
    editRoute(trainNumber) {
        const route = window.ConfigurationManager.getCustomRouteByNumber(trainNumber);
        if (route) {
            this.openRouteWizard(route);
        }
    }

    /**
     * Duplica una ruta
     */
    duplicateRoute(trainNumber) {
        const route = window.ConfigurationManager.getCustomRouteByNumber(trainNumber);
        if (route) {
            // Crear copia con nuevo número de tren
            const duplicate = {
                ...route,
                trainNumber: '', // El usuario deberá ingresar uno nuevo
                createdAt: undefined
            };

            this.openRouteWizard(duplicate);
        }
    }

    /**
     * Elimina una ruta
     */
    deleteRoute(trainNumber) {
        const route = window.ConfigurationManager.getCustomRouteByNumber(trainNumber);
        if (!route) return;

        if (confirm(`¿Estás seguro de que quieres eliminar el trayecto del tren ${trainNumber}?\n\nEsta acción no se puede deshacer.`)) {
            const result = window.ConfigurationManager.deleteCustomRoute(trainNumber);
            if (result.success) {
                this.renderRoutesView();
                this.showSuccessMessage('Trayecto eliminado correctamente');
            } else {
                alert('Error al eliminar el trayecto: ' + result.error);
            }
        }
    }

    /**
     * Elimina un elemento del sistema (modelo o ruta)
     */
    deleteSystemItem(type, id) {
        if (type === 'model') {
            const result = window.ConfigurationManager.hideSystemTrainModel(id);
            if (result.success) {
                // Recargar datos globales para que el modelo desaparezca del selector
                if (window.loadJSONData) {
                    window.loadJSONData().then(() => {
                        // Verificar cuántos modelos quedan disponibles
                        const availableModels = Object.keys(window.trainModels || {});

                        if (availableModels.length === 0) {
                            // No hay modelos disponibles
                            console.warn('⚠️ No hay modelos disponibles');
                            this.renderModelsView();
                            this.renderRestoreView();
                            alert('⚠️ Has ocultado todos los modelos de tren.\n\nNo podrás usar la aplicación hasta que restaures al menos un modelo desde la pestaña de Restauración.');
                            return;
                        }

                        // Verificar si el modelo oculto era el que estaba en uso
                        if (window.state && window.state.selectedTrain === id) {
                            // Cambiar al primer modelo disponible
                            window.state.selectedTrain = availableModels[0];
                            console.log(`⚠️ Modelo en uso ocultado, cambiando a: ${availableModels[0]}`);
                            // Re-renderizar la interfaz
                            if (window.render) {
                                window.render();
                            }
                        }

                        this.renderModelsView();
                        this.renderRestoreView();
                        this.showSuccessMessage('Modelo ocultado correctamente');
                    });
                } else {
                    this.renderModelsView();
                    this.renderRestoreView();
                    this.showSuccessMessage('Modelo ocultado correctamente');
                }
            } else {
                alert('Error al ocultar el modelo: ' + result.error);
            }
        } else if (type === 'route') {
            const result = window.ConfigurationManager.hideSystemRoute(id);
            if (result.success) {
                // Recargar datos globales para que la ruta desaparezca del selector
                if (window.loadJSONData) {
                    window.loadJSONData().then(() => {
                        // Verificar si la ruta oculta era la que estaba en uso
                        if (window.state && window.state.trainNumber === id) {
                            // Buscar otra ruta disponible
                            const availableRoutes = Object.keys(window.trainRoutes || {});
                            if (availableRoutes.length > 0) {
                                window.state.trainNumber = availableRoutes[0];
                                console.log(`⚠️ Ruta en uso ocultada, cambiando a: ${availableRoutes[0]}`);
                                // Re-renderizar la interfaz
                                if (window.render) {
                                    window.render();
                                }
                            } else {
                                // Si no hay rutas, poner valor por defecto
                                window.state.trainNumber = '0000';
                                console.warn('⚠️ No hay rutas disponibles, usando valor por defecto');
                            }
                        }
                        this.renderRoutesView();
                        this.renderRestoreView();
                        this.showSuccessMessage('Trayecto ocultado correctamente');
                    });
                } else {
                    this.renderRoutesView();
                    this.renderRestoreView();
                    this.showSuccessMessage('Trayecto ocultado correctamente');
                }
            } else {
                alert('Error al ocultar el trayecto: ' + result.error);
            }
        }
    }

    /**
     * Restaura un modelo del sistema previamente oculto
     */
    restoreModel(modelId) {
        const result = window.ConfigurationManager.showSystemTrainModel(modelId);
        if (result.success) {
            // Recargar datos globales
            if (window.loadJSONData) {
                window.loadJSONData().then(() => {
                    this.renderModelsView();
                    this.renderRestoreView();
                    this.showSuccessMessage('Modelo restaurado correctamente');
                });
            } else {
                this.renderModelsView();
                this.renderRestoreView();
                this.showSuccessMessage('Modelo restaurado correctamente');
            }
        } else {
            alert('Error al restaurar el modelo: ' + result.error);
        }
    }

    /**
     * Restaura una ruta del sistema previamente oculta
     */
    restoreRoute(trainNumber) {
        const result = window.ConfigurationManager.showSystemRoute(trainNumber);
        if (result.success) {
            // Recargar datos globales
            if (window.loadJSONData) {
                window.loadJSONData().then(() => {
                    this.renderRoutesView();
                    this.renderRestoreView();
                    this.showSuccessMessage('Trayecto restaurado correctamente');
                });
            } else {
                this.renderRoutesView();
                this.renderRestoreView();
                this.showSuccessMessage('Trayecto restaurado correctamente');
            }
        } else {
            alert('Error al restaurar el trayecto: ' + result.error);
        }
    }

    /**
     * Restaura todos los elementos ocultos del sistema
     */
    restoreAll() {
        if (!confirm('¿Deseas restaurar todos los modelos y trayectos ocultos?\n\nEsto hará visibles nuevamente todos los elementos del sistema que has ocultado.')) {
            return;
        }

        // Limpiar listas de elementos ocultos
        localStorage.removeItem('hiddenSystemModels');
        localStorage.removeItem('hiddenSystemRoutes');

        console.log('✅ Todos los elementos del sistema restaurados');

        // Recargar datos globales
        if (window.loadJSONData) {
            window.loadJSONData().then(() => {
                this.renderModelsView();
                this.renderRoutesView();
                this.renderRestoreView();

                // Si hay un render global, ejecutarlo para actualizar la UI principal
                if (window.render) {
                    window.render();
                }

                this.showSuccessMessage('Todos los elementos restaurados correctamente');
            });
        } else {
            this.renderModelsView();
            this.renderRoutesView();
            this.renderRestoreView();
            this.showSuccessMessage('Todos los elementos restaurados correctamente');
        }
    }

    /**
     * Exporta todas las configuraciones
     */
    exportAll() {
        const data = window.ConfigurationManager.exportConfiguration();

        // Crear archivo JSON
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Descargar
        const a = document.createElement('a');
        a.href = url;
        a.download = `navirea-config-${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);

        this.showSuccessMessage('Configuraciones exportadas correctamente');
    }

    /**
     * Importa configuraciones desde archivo
     */
    importConfiguration() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    const result = window.ConfigurationManager.importConfiguration(data);

                    if (result.success) {
                        this.renderModelsView();
                        this.renderRoutesView();

                        const summary = result.imported;
                        const message = `Importación completada:\n\n` +
                            `✓ ${summary.trainModels} modelos de tren\n` +
                            `✓ ${summary.routes} trayectos\n` +
                            `✓ ${summary.stops} paradas`;

                        alert(message);
                    } else {
                        alert('Error al importar configuraciones: ' + result.error);
                    }
                } catch (error) {
                    alert('Error al leer el archivo: ' + error.message);
                }
            };

            reader.readAsText(file);
        });

        input.click();
    }

    /**
     * Muestra mensaje de éxito temporal
     */
    showSuccessMessage(message) {
        const toast = document.createElement('div');
        toast.className = 'config-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    /**
     * Formatea una fecha para mostrar
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `hace ${minutes} min`;
        if (hours < 24) return `hace ${hours}h`;
        if (days < 7) return `hace ${days}d`;

        return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    /**
     * Cierra el UI
     */
    close() {
        if (this.container && this.container.parentElement) {
            this.container.parentElement.removeChild(this.container);
        }

        // Desbloquear scroll del body
        window.unlockBodyScroll();

        // Limpiar referencia global
        window.currentConfigManagerUI = null;

        if (this.onClose) {
            this.onClose();
        }
    }

    /**
     * Método estático para abrir el gestor de configuraciones
     */
    static open() {
        // Si ya hay uno abierto, no abrir otro
        if (window.currentConfigManagerUI) {
            return;
        }

        const managerUI = new ConfigurationManagerUI();
        managerUI.render(document.body);
        window.currentConfigManagerUI = managerUI;
    }
}

// Hacer disponible globalmente
window.ConfigurationManagerUI = ConfigurationManagerUI;
