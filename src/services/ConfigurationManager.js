// ============================================================================
// CONFIGURATION-MANAGER.JS - Gestión de configuraciones personalizadas
// ============================================================================

/**
 * Gestor centralizado de configuraciones del sistema y personalizadas
 */
const ConfigurationManager = {
    // Claves de localStorage
    STORAGE_KEYS: {
        USER_TRAIN_MODELS: 'userTrainModels',
        USER_ROUTES: 'userRoutes',
        USER_STOPS: 'userStops',
        CONFIG_VERSION: 'configVersion'
    },

    // Versión actual del sistema de configuración
    CURRENT_VERSION: '1.0',

    /**
     * Inicializa el gestor de configuraciones
     */
    init() {
        this.ensureStorageStructure();
        this.migrateIfNeeded();
    },

    /**
     * Asegura que la estructura de localStorage existe
     */
    ensureStorageStructure() {
        if (!localStorage.getItem(this.STORAGE_KEYS.USER_TRAIN_MODELS)) {
            localStorage.setItem(this.STORAGE_KEYS.USER_TRAIN_MODELS, JSON.stringify({}));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.USER_ROUTES)) {
            localStorage.setItem(this.STORAGE_KEYS.USER_ROUTES, JSON.stringify({}));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.USER_STOPS)) {
            localStorage.setItem(this.STORAGE_KEYS.USER_STOPS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.CONFIG_VERSION)) {
            localStorage.setItem(this.STORAGE_KEYS.CONFIG_VERSION, this.CURRENT_VERSION);
        }
    },

    /**
     * Migra configuraciones si la versión cambió
     */
    migrateIfNeeded() {
        const storedVersion = localStorage.getItem(this.STORAGE_KEYS.CONFIG_VERSION);
        if (storedVersion !== this.CURRENT_VERSION) {
            console.log(`Migrando configuraciones de v${storedVersion} a v${this.CURRENT_VERSION}`);
            // Aquí se pueden agregar migraciones futuras
            localStorage.setItem(this.STORAGE_KEYS.CONFIG_VERSION, this.CURRENT_VERSION);
        }
    },

    // ========================================================================
    // MODELOS DE TREN
    // ========================================================================

    /**
     * Obtiene todos los modelos de tren (sistema + personalizados)
     * @param {Object} systemModels - Modelos del sistema
     * @returns {Object} Todos los modelos
     */
    getAllTrainModels(systemModels = {}) {
        const userModels = this.getUserTrainModels();
        return {
            ...systemModels,
            ...userModels
        };
    },

    /**
     * Obtiene solo los modelos personalizados
     * @returns {Object} Modelos personalizados
     */
    getUserTrainModels() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.USER_TRAIN_MODELS);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error cargando modelos personalizados:', e);
            return {};
        }
    },

    /**
     * Obtiene un modelo de tren específico
     * @param {string} modelId - ID del modelo
     * @param {Object} systemModels - Modelos del sistema
     * @returns {Object|null} Modelo encontrado o null
     */
    getTrainModel(modelId, systemModels = {}) {
        const allModels = this.getAllTrainModels(systemModels);
        return allModels[modelId] || null;
    },

    /**
     * Guarda un modelo de tren personalizado
     * @param {Object} trainModel - Modelo a guardar
     * @returns {Object} { success: boolean, error?: string }
     */
    saveCustomTrainModel(trainModel) {
        try {
            // Validar modelo
            const existingModels = this.getUserTrainModels();
            const existingIds = Object.keys(existingModels);

            // Si es edición, remover el ID actual de la validación
            const idsToCheck = trainModel._isEdit
                ? existingIds.filter(id => id !== trainModel.id)
                : existingIds;

            const validation = window.ConfigValidator.validateTrainModel(
                trainModel,
                idsToCheck
            );

            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.errors.join(', ')
                };
            }

            // Agregar metadata
            const modelToSave = {
                ...trainModel,
                custom: true,
                createdAt: trainModel.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Guardar
            existingModels[trainModel.id] = modelToSave;
            localStorage.setItem(
                this.STORAGE_KEYS.USER_TRAIN_MODELS,
                JSON.stringify(existingModels)
            );

            console.log(`✅ Modelo "${trainModel.name}" guardado correctamente`);

            return { success: true };
        } catch (e) {
            console.error('Error guardando modelo:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    /**
     * Elimina un modelo de tren personalizado
     * @param {string} modelId - ID del modelo a eliminar
     * @returns {Object} { success: boolean, error?: string }
     */
    deleteCustomTrainModel(modelId) {
        try {
            if (!window.IdGenerator.isCustomId(modelId)) {
                return {
                    success: false,
                    error: 'Solo se pueden eliminar modelos personalizados'
                };
            }

            const models = this.getUserTrainModels();

            if (!models[modelId]) {
                return {
                    success: false,
                    error: 'Modelo no encontrado'
                };
            }

            delete models[modelId];
            localStorage.setItem(
                this.STORAGE_KEYS.USER_TRAIN_MODELS,
                JSON.stringify(models)
            );

            console.log(`✅ Modelo "${modelId}" eliminado correctamente`);

            return { success: true };
        } catch (e) {
            console.error('Error eliminando modelo:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    /**
     * Duplica un modelo existente
     * @param {string} modelId - ID del modelo a duplicar
     * @param {Object} systemModels - Modelos del sistema
     * @returns {Object} { success: boolean, newModel?: Object, error?: string }
     */
    duplicateTrainModel(modelId, systemModels = {}) {
        try {
            const original = this.getTrainModel(modelId, systemModels);

            if (!original) {
                return {
                    success: false,
                    error: 'Modelo no encontrado'
                };
            }

            // Crear copia con nuevo ID
            const existingIds = Object.keys(this.getUserTrainModels());
            const newId = window.IdGenerator.generateUniqueId('train', existingIds);

            const duplicate = {
                ...JSON.parse(JSON.stringify(original)), // Deep clone
                id: newId,
                name: `${original.name} (Copia)`,
                custom: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Guardar
            const result = this.saveCustomTrainModel(duplicate);

            if (result.success) {
                return {
                    success: true,
                    newModel: duplicate
                };
            } else {
                return result;
            }
        } catch (e) {
            console.error('Error duplicando modelo:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    // ========================================================================
    // RUTAS
    // ========================================================================

    /**
     * Obtiene todas las rutas (sistema + personalizadas)
     * @param {Object} systemRoutes - Rutas del sistema
     * @returns {Object} Todas las rutas
     */
    getAllRoutes(systemRoutes = {}) {
        const userRoutes = this.getUserRoutes();
        return {
            ...systemRoutes,
            ...userRoutes
        };
    },

    /**
     * Obtiene solo las rutas personalizadas
     * @returns {Object} Rutas personalizadas
     */
    getUserRoutes() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.USER_ROUTES);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('Error cargando rutas personalizadas:', e);
            return {};
        }
    },

    /**
     * Obtiene una ruta específica
     * @param {string} trainNumber - Número de tren
     * @param {Object} systemRoutes - Rutas del sistema
     * @returns {Array|null} Paradas de la ruta o null
     */
    getRoute(trainNumber, systemRoutes = {}) {
        const allRoutes = this.getAllRoutes(systemRoutes);
        return allRoutes[trainNumber] || null;
    },

    /**
     * Guarda una ruta personalizada
     * @param {Object} route - Ruta a guardar { trainNumber, stops, destination }
     * @returns {Object} { success: boolean, error?: string }
     */
    saveCustomRoute(route) {
        try {
            // Validar ruta
            const existingRoutes = this.getUserRoutes();
            const existingNumbers = Object.keys(existingRoutes);

            // Si es edición, remover el número actual de la validación
            const numbersToCheck = route._isEdit
                ? existingNumbers.filter(num => num !== route.trainNumber)
                : existingNumbers;

            const validation = window.ConfigValidator.validateRoute(
                route,
                numbersToCheck
            );

            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.errors.join(', ')
                };
            }

            // Agregar metadata
            const routeToSave = {
                trainNumber: route.trainNumber,
                stops: route.stops,
                destination: route.destination,
                custom: true,
                createdAt: route.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Guardar
            existingRoutes[route.trainNumber] = routeToSave;
            localStorage.setItem(
                this.STORAGE_KEYS.USER_ROUTES,
                JSON.stringify(existingRoutes)
            );

            console.log(`✅ Ruta "${route.trainNumber}" guardada correctamente`);

            return { success: true };
        } catch (e) {
            console.error('Error guardando ruta:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    /**
     * Elimina una ruta personalizada
     * @param {string} trainNumber - Número de tren
     * @returns {Object} { success: boolean, error?: string }
     */
    deleteCustomRoute(trainNumber) {
        try {
            if (!window.IdGenerator.isCustomRoute(trainNumber)) {
                return {
                    success: false,
                    error: 'Solo se pueden eliminar rutas personalizadas'
                };
            }

            const routes = this.getUserRoutes();

            if (!routes[trainNumber]) {
                return {
                    success: false,
                    error: 'Ruta no encontrada'
                };
            }

            delete routes[trainNumber];
            localStorage.setItem(
                this.STORAGE_KEYS.USER_ROUTES,
                JSON.stringify(routes)
            );

            console.log(`✅ Ruta "${trainNumber}" eliminada correctamente`);

            return { success: true };
        } catch (e) {
            console.error('Error eliminando ruta:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    // ========================================================================
    // PARADAS
    // ========================================================================

    /**
     * Obtiene todas las paradas (sistema + personalizadas)
     * @param {Array} systemStops - Paradas del sistema
     * @returns {Array} Todas las paradas
     */
    getAllStops(systemStops = []) {
        const userStops = this.getUserStops();
        return [...systemStops, ...userStops];
    },

    /**
     * Obtiene solo las paradas personalizadas
     * @returns {Array} Paradas personalizadas
     */
    getUserStops() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.USER_STOPS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error cargando paradas personalizadas:', e);
            return [];
        }
    },

    /**
     * Guarda una parada personalizada
     * @param {Object} stop - Parada a guardar { full, abbr }
     * @returns {Object} { success: boolean, error?: string }
     */
    saveCustomStop(stop) {
        try {
            // Validar parada
            const existingStops = this.getUserStops();
            const existingAbbrs = existingStops.map(s => s.abbr);

            const validation = window.ConfigValidator.validateStop(stop, existingAbbrs);

            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.errors.join(', ')
                };
            }

            // Agregar parada
            const stopToSave = {
                full: stop.full.trim(),
                abbr: stop.abbr.trim().toUpperCase(),
                custom: true
            };

            existingStops.push(stopToSave);
            localStorage.setItem(
                this.STORAGE_KEYS.USER_STOPS,
                JSON.stringify(existingStops)
            );

            console.log(`✅ Parada "${stop.full}" guardada correctamente`);

            return { success: true };
        } catch (e) {
            console.error('Error guardando parada:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    /**
     * Elimina una parada personalizada
     * @param {string} abbr - Abreviatura de la parada
     * @returns {Object} { success: boolean, error?: string }
     */
    deleteCustomStop(abbr) {
        try {
            const stops = this.getUserStops();
            const index = stops.findIndex(s => s.abbr === abbr && s.custom);

            if (index === -1) {
                return {
                    success: false,
                    error: 'Parada no encontrada o no es personalizada'
                };
            }

            stops.splice(index, 1);
            localStorage.setItem(
                this.STORAGE_KEYS.USER_STOPS,
                JSON.stringify(stops)
            );

            console.log(`✅ Parada "${abbr}" eliminada correctamente`);

            return { success: true };
        } catch (e) {
            console.error('Error eliminando parada:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    // ========================================================================
    // EXPORTACIÓN / IMPORTACIÓN
    // ========================================================================

    /**
     * Exporta todas las configuraciones personalizadas
     * @returns {Object} Configuración completa
     */
    exportConfiguration() {
        return {
            version: this.CURRENT_VERSION,
            type: 'train-config-export',
            timestamp: new Date().toISOString(),
            data: {
                trainModels: Object.values(this.getUserTrainModels()),
                routes: Object.values(this.getUserRoutes()),
                stops: this.getUserStops()
            }
        };
    },

    /**
     * Importa configuraciones desde un archivo
     * @param {Object} config - Configuración a importar
     * @param {boolean} merge - Si true, fusiona con existentes; si false, reemplaza
     * @returns {Object} { success: boolean, imported: Object, error?: string }
     */
    importConfiguration(config, merge = true) {
        try {
            // Validar configuración
            const validation = window.ConfigValidator.validateExportedConfig(config);

            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.errors.join(', ')
                };
            }

            const imported = {
                trainModels: 0,
                routes: 0,
                stops: 0
            };

            // Importar modelos de tren
            if (config.data.trainModels && Array.isArray(config.data.trainModels)) {
                const existingModels = merge ? this.getUserTrainModels() : {};

                config.data.trainModels.forEach(model => {
                    existingModels[model.id] = {
                        ...model,
                        custom: true,
                        importedAt: new Date().toISOString()
                    };
                    imported.trainModels++;
                });

                localStorage.setItem(
                    this.STORAGE_KEYS.USER_TRAIN_MODELS,
                    JSON.stringify(existingModels)
                );
            }

            // Importar rutas
            if (config.data.routes && Array.isArray(config.data.routes)) {
                const existingRoutes = merge ? this.getUserRoutes() : {};

                config.data.routes.forEach(route => {
                    existingRoutes[route.trainNumber] = {
                        ...route,
                        custom: true,
                        importedAt: new Date().toISOString()
                    };
                    imported.routes++;
                });

                localStorage.setItem(
                    this.STORAGE_KEYS.USER_ROUTES,
                    JSON.stringify(existingRoutes)
                );
            }

            // Importar paradas
            if (config.data.stops && Array.isArray(config.data.stops)) {
                const existingStops = merge ? this.getUserStops() : [];

                config.data.stops.forEach(stop => {
                    // Evitar duplicados por abreviatura
                    if (!existingStops.find(s => s.abbr === stop.abbr)) {
                        existingStops.push({
                            ...stop,
                            custom: true
                        });
                        imported.stops++;
                    }
                });

                localStorage.setItem(
                    this.STORAGE_KEYS.USER_STOPS,
                    JSON.stringify(existingStops)
                );
            }

            console.log(`✅ Configuración importada: ${imported.trainModels} modelos, ${imported.routes} rutas, ${imported.stops} paradas`);

            return {
                success: true,
                imported
            };
        } catch (e) {
            console.error('Error importando configuración:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    /**
     * Borra todas las configuraciones personalizadas
     * @returns {Object} { success: boolean, error?: string }
     */
    clearAllCustomConfigurations() {
        try {
            localStorage.setItem(this.STORAGE_KEYS.USER_TRAIN_MODELS, JSON.stringify({}));
            localStorage.setItem(this.STORAGE_KEYS.USER_ROUTES, JSON.stringify({}));
            localStorage.setItem(this.STORAGE_KEYS.USER_STOPS, JSON.stringify([]));

            console.log('✅ Todas las configuraciones personalizadas han sido borradas');

            return { success: true };
        } catch (e) {
            console.error('Error borrando configuraciones:', e);
            return {
                success: false,
                error: e.message
            };
        }
    }
};

// Inicializar al cargar
ConfigurationManager.init();

// Exportar a window
window.ConfigurationManager = ConfigurationManager;
