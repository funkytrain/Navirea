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
        CONFIG_VERSION: 'configVersion',
        HIDDEN_SYSTEM_MODELS: 'hiddenSystemModels',
        HIDDEN_SYSTEM_ROUTES: 'hiddenSystemRoutes'
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
        if (!localStorage.getItem(this.STORAGE_KEYS.HIDDEN_SYSTEM_MODELS)) {
            localStorage.setItem(this.STORAGE_KEYS.HIDDEN_SYSTEM_MODELS, JSON.stringify([]));
        }
        if (!localStorage.getItem(this.STORAGE_KEYS.HIDDEN_SYSTEM_ROUTES)) {
            localStorage.setItem(this.STORAGE_KEYS.HIDDEN_SYSTEM_ROUTES, JSON.stringify([]));
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
     * Obtiene todos los modelos de tren (sistema + personalizados, excluyendo ocultos)
     * @param {Object} systemModels - Modelos del sistema
     * @returns {Object} Todos los modelos visibles
     */
    getAllTrainModels(systemModels = {}) {
        const userModels = this.getUserTrainModels();
        const hiddenModels = this.getHiddenSystemModels();

        // Filtrar modelos del sistema que están ocultos
        const visibleSystemModels = {};
        for (const [id, model] of Object.entries(systemModels)) {
            if (!hiddenModels.includes(id)) {
                visibleSystemModels[id] = model;
            }
        }

        return {
            ...visibleSystemModels,
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
     * Obtiene modelos del sistema (excluye personalizados y ocultos)
     * @param {Object} allModels - Todos los modelos disponibles
     * @returns {Array} Array de modelos del sistema
     */
    getSystemTrainModels(allModels = {}) {
        const userModels = this.getUserTrainModels();
        const userModelIds = Object.keys(userModels);
        const hiddenModels = this.getHiddenSystemModels();

        return Object.entries(allModels)
            .filter(([id]) => !userModelIds.includes(id) && !hiddenModels.includes(id))
            .map(([id, model]) => ({ id, ...model }));
    },

    /**
     * Obtiene modelos personalizados como array
     * @returns {Array} Array de modelos personalizados
     */
    getCustomTrainModels() {
        const userModels = this.getUserTrainModels();
        return Object.entries(userModels)
            .map(([id, model]) => ({ id, ...model }));
    },

    /**
     * Obtiene un modelo personalizado por ID
     * @param {string} modelId - ID del modelo
     * @returns {Object|null} Modelo o null
     */
    getCustomTrainModelById(modelId) {
        const userModels = this.getUserTrainModels();
        return userModels[modelId] ? { id: modelId, ...userModels[modelId] } : null;
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

            // Agregar metadata (excluir flag interno _isEdit)
            const { _isEdit, ...modelData } = trainModel;
            const modelToSave = {
                ...modelData,
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
     * Obtiene todas las rutas (sistema + personalizadas, excluyendo ocultas)
     * @param {Object} systemRoutes - Rutas del sistema
     * @returns {Object} Todas las rutas visibles
     */
    getAllRoutes(systemRoutes = {}) {
        const userRoutes = this.getUserRoutes();
        const hiddenRoutes = this.getHiddenSystemRoutes();

        // Filtrar rutas del sistema que están ocultas
        const visibleSystemRoutes = {};
        for (const [trainNumber, route] of Object.entries(systemRoutes)) {
            if (!hiddenRoutes.includes(trainNumber)) {
                visibleSystemRoutes[trainNumber] = route;
            }
        }

        return {
            ...visibleSystemRoutes,
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
     * Obtiene rutas del sistema (excluye personalizadas y ocultas)
     * @param {Object} allRoutes - Todas las rutas disponibles
     * @returns {Array} Array de rutas del sistema
     */
    getSystemRoutes(allRoutes = {}) {
        const userRoutes = this.getUserRoutes();
        const userRouteNumbers = Object.keys(userRoutes);
        const hiddenRoutes = this.getHiddenSystemRoutes();

        return Object.entries(allRoutes)
            .filter(([trainNumber]) => !userRouteNumbers.includes(trainNumber) && !hiddenRoutes.includes(trainNumber))
            .map(([trainNumber, data]) => {
                // Si data es un array (formato antiguo), convertir a objeto
                if (Array.isArray(data)) {
                    return {
                        trainNumber,
                        stops: data,
                        destination: data[data.length - 1]
                    };
                }
                // Si es un objeto, retornar tal cual
                return { trainNumber, ...data };
            });
    },

    /**
     * Obtiene rutas personalizadas como array
     * @returns {Array} Array de rutas personalizadas
     */
    getCustomRoutes() {
        const userRoutes = this.getUserRoutes();
        return Object.entries(userRoutes)
            .map(([trainNumber, route]) => ({ trainNumber, ...route }));
    },

    /**
     * Obtiene una ruta personalizada por número
     * @param {string} trainNumber - Número de tren
     * @returns {Object|null} Ruta o null
     */
    getCustomRouteByNumber(trainNumber) {
        const userRoutes = this.getUserRoutes();
        return userRoutes[trainNumber] ? { trainNumber, ...userRoutes[trainNumber] } : null;
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

            // Si tiene metadata de estaciones ADIF, guardarla también
            if (route.adifStopsMetadata) {
                routeToSave.adifStopsMetadata = route.adifStopsMetadata;
            }

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
    // GESTIÓN DE ELEMENTOS OCULTOS DEL SISTEMA
    // ========================================================================

    /**
     * Obtiene la lista de modelos del sistema ocultos
     * @returns {Array} Array de IDs de modelos ocultos
     */
    getHiddenSystemModels() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.HIDDEN_SYSTEM_MODELS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error cargando modelos ocultos:', e);
            return [];
        }
    },

    /**
     * Obtiene la lista de rutas del sistema ocultas
     * @returns {Array} Array de números de tren ocultos
     */
    getHiddenSystemRoutes() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.HIDDEN_SYSTEM_ROUTES);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error cargando rutas ocultas:', e);
            return [];
        }
    },

    /**
     * Obtiene todos los modelos sin filtrar (incluyendo ocultos)
     * SOLO para uso en la UI de restauración
     * @param {Object} systemModels - Modelos del sistema
     * @returns {Object} Todos los modelos sin filtrar
     */
    getAllTrainModelsUnfiltered(systemModels = {}) {
        const userModels = this.getUserTrainModels();
        return {
            ...systemModels,
            ...userModels
        };
    },

    /**
     * Obtiene todas las rutas sin filtrar (incluyendo ocultas)
     * SOLO para uso en la UI de restauración
     * @param {Object} systemRoutes - Rutas del sistema
     * @returns {Object} Todas las rutas sin filtrar
     */
    getAllRoutesUnfiltered(systemRoutes = {}) {
        const userRoutes = this.getUserRoutes();
        return {
            ...systemRoutes,
            ...userRoutes
        };
    },

    /**
     * Oculta un modelo del sistema
     * @param {string} modelId - ID del modelo a ocultar
     * @returns {Object} { success: boolean, error?: string }
     */
    hideSystemTrainModel(modelId) {
        try {
            if (window.IdGenerator.isCustomId(modelId)) {
                return {
                    success: false,
                    error: 'Solo se pueden ocultar modelos del sistema'
                };
            }

            const hiddenModels = this.getHiddenSystemModels();

            if (hiddenModels.includes(modelId)) {
                return {
                    success: false,
                    error: 'El modelo ya está oculto'
                };
            }

            hiddenModels.push(modelId);
            localStorage.setItem(
                this.STORAGE_KEYS.HIDDEN_SYSTEM_MODELS,
                JSON.stringify(hiddenModels)
            );

            console.log(`✅ Modelo "${modelId}" ocultado correctamente`);

            return { success: true };
        } catch (e) {
            console.error('Error ocultando modelo:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    /**
     * Oculta una ruta del sistema
     * @param {string} trainNumber - Número de tren a ocultar
     * @returns {Object} { success: boolean, error?: string }
     */
    hideSystemRoute(trainNumber) {
        try {
            if (window.IdGenerator.isCustomRoute(trainNumber)) {
                return {
                    success: false,
                    error: 'Solo se pueden ocultar rutas del sistema'
                };
            }

            const hiddenRoutes = this.getHiddenSystemRoutes();

            if (hiddenRoutes.includes(trainNumber)) {
                return {
                    success: false,
                    error: 'La ruta ya está oculta'
                };
            }

            hiddenRoutes.push(trainNumber);
            localStorage.setItem(
                this.STORAGE_KEYS.HIDDEN_SYSTEM_ROUTES,
                JSON.stringify(hiddenRoutes)
            );

            console.log(`✅ Ruta "${trainNumber}" ocultada correctamente`);

            return { success: true };
        } catch (e) {
            console.error('Error ocultando ruta:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    /**
     * Muestra un modelo del sistema previamente oculto
     * @param {string} modelId - ID del modelo a mostrar
     * @returns {Object} { success: boolean, error?: string }
     */
    showSystemTrainModel(modelId) {
        try {
            const hiddenModels = this.getHiddenSystemModels();
            const index = hiddenModels.indexOf(modelId);

            if (index === -1) {
                return {
                    success: false,
                    error: 'El modelo no está oculto'
                };
            }

            hiddenModels.splice(index, 1);
            localStorage.setItem(
                this.STORAGE_KEYS.HIDDEN_SYSTEM_MODELS,
                JSON.stringify(hiddenModels)
            );

            console.log(`✅ Modelo "${modelId}" visible nuevamente`);

            return { success: true };
        } catch (e) {
            console.error('Error mostrando modelo:', e);
            return {
                success: false,
                error: e.message
            };
        }
    },

    /**
     * Muestra una ruta del sistema previamente oculta
     * @param {string} trainNumber - Número de tren a mostrar
     * @returns {Object} { success: boolean, error?: string }
     */
    showSystemRoute(trainNumber) {
        try {
            const hiddenRoutes = this.getHiddenSystemRoutes();
            const index = hiddenRoutes.indexOf(trainNumber);

            if (index === -1) {
                return {
                    success: false,
                    error: 'La ruta no está oculta'
                };
            }

            hiddenRoutes.splice(index, 1);
            localStorage.setItem(
                this.STORAGE_KEYS.HIDDEN_SYSTEM_ROUTES,
                JSON.stringify(hiddenRoutes)
            );

            console.log(`✅ Ruta "${trainNumber}" visible nuevamente`);

            return { success: true };
        } catch (e) {
            console.error('Error mostrando ruta:', e);
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
    },

    // ========================================================================
    // PERSISTENCIA DE ESTADO DE SESIÓN (absorbido de StorageService)
    // ========================================================================

    _backupTimer: null,
    _MAX_BACKUPS: 20,
    _BACKUP_INTERVAL: 5 * 60 * 1000,

    /**
     * Carga el estado de sesión guardado en localStorage y lo aplica sobre window.state
     */
    loadData() {
        const savedTrain = localStorage.getItem('selectedTrain');
        if (savedTrain && window.trainModels && window.trainModels[savedTrain]) {
            window.state.selectedTrain = savedTrain;
        }

        const saved = localStorage.getItem(`train${window.state.selectedTrain}Data`);
        if (saved) {
            try { window.state.seatData = JSON.parse(saved); } catch (e) { console.error('Error loading data'); }
        }

        const savedDirection = localStorage.getItem(`train${window.state.selectedTrain}Direction`);
        if (savedDirection) {
            try { window.state.trainDirection = JSON.parse(savedDirection); } catch (e) { console.error('Error loading direction'); }
        }

        const currentTrain = window.trainModels && window.trainModels[window.state.selectedTrain];
        if (currentTrain && currentTrain.coaches) {
            currentTrain.coaches.forEach(coach => {
                if (!window.state.trainDirection[coach.id]) {
                    window.state.trainDirection[coach.id] = 'up';
                }
            });
        }

        const savedDarkMode = localStorage.getItem('darkMode');
        if (savedDarkMode) window.state.darkMode = savedDarkMode === 'true';

        const savedTrainNumber = localStorage.getItem(`train${window.state.selectedTrain}Number`);
        if (savedTrainNumber) window.state.trainNumber = savedTrainNumber;

        const savedCurrentStop = localStorage.getItem(`train${window.state.selectedTrain}CurrentStop`);
        if (savedCurrentStop) window.state.currentStop = savedCurrentStop;

        const savedImportantStop = localStorage.getItem(`train${window.state.selectedTrain}ImportantStop`);
        if (savedImportantStop) window.state.importantStop = savedImportantStop;

        const savedImportantStop2 = localStorage.getItem(`train${window.state.selectedTrain}ImportantStop2`);
        if (savedImportantStop2) window.state.importantStop2 = savedImportantStop2;

        const savedServiceNotes = localStorage.getItem(`train${window.state.selectedTrain}ServiceNotes`);
        if (savedServiceNotes) window.state.serviceNotes = savedServiceNotes;

        const savedIncidents = localStorage.getItem(`train${window.state.selectedTrain}Incidents`);
        if (savedIncidents) {
            try { window.state.incidents = JSON.parse(savedIncidents); } catch (e) { console.error('Error loading incidents'); }
        }

        if (window.state.selectedTrain === '470') {
            const savedVariants = localStorage.getItem('train470Variants');
            if (savedVariants) {
                try { window.state.coach470Variants = JSON.parse(savedVariants); } catch (e) { console.error('Error loading 470 variants'); }
            }
        }

        const savedCoachNotes = localStorage.getItem(`train${window.state.selectedTrain}CoachNotes`);
        if (savedCoachNotes) {
            try { window.state.coachNotes = JSON.parse(savedCoachNotes); } catch (e) { console.error('Error loading coach notes'); }
        }
    },

    /**
     * Persiste el estado de sesión actual en localStorage
     */
    saveData() {
        const t = window.state.selectedTrain;
        localStorage.setItem('selectedTrain', t);
        localStorage.setItem(`train${t}Data`, JSON.stringify(window.state.seatData));
        localStorage.setItem(`train${t}Direction`, JSON.stringify(window.state.trainDirection));
        localStorage.setItem('darkMode', window.state.darkMode);

        if (window.state.trainNumber) {
            localStorage.setItem(`train${t}Number`, window.state.trainNumber);
        }
        if (window.state.currentStop) {
            localStorage.setItem(`train${t}CurrentStop`, window.state.currentStop);
        }

        if (window.state.importantStop) {
            localStorage.setItem(`train${t}ImportantStop`, window.state.importantStop);
        } else {
            localStorage.removeItem(`train${t}ImportantStop`);
        }

        if (window.state.importantStop2) {
            localStorage.setItem(`train${t}ImportantStop2`, window.state.importantStop2);
        } else {
            localStorage.removeItem(`train${t}ImportantStop2`);
        }

        if (window.state.serviceNotes !== undefined) {
            localStorage.setItem(`train${t}ServiceNotes`, window.state.serviceNotes);
        }

        if (window.state.incidents) {
            localStorage.setItem(`train${t}Incidents`, JSON.stringify(window.state.incidents));
        }

        if (t === '470') {
            localStorage.setItem('train470Variants', JSON.stringify(window.state.coach470Variants));
        }

        localStorage.setItem(`train${t}CoachNotes`, JSON.stringify(window.state.coachNotes || {}));
    },

    saveAutoBackup() {
        const t = window.state.selectedTrain;
        const backupData = {
            trainModel: t,
            seatData: window.state.seatData,
            trainDirection: window.state.trainDirection,
            serviceNotes: window.state.serviceNotes || '',
            incidents: window.state.incidents || {},
            trainNumber: window.state.trainNumber || null,
            currentStop: window.state.currentStop || null,
            timestamp: new Date().toISOString(),
            ...(t === '470' && { coach470Variants: window.state.coach470Variants })
        };

        const key = `autoBackups_${t}`;
        let backups = [];
        try {
            const saved = localStorage.getItem(key);
            if (saved) backups = JSON.parse(saved);
        } catch (e) { console.error('Error loading backups'); }

        backups.push(backupData);
        if (backups.length > this._MAX_BACKUPS) backups = backups.slice(-this._MAX_BACKUPS);

        try {
            localStorage.setItem(key, JSON.stringify(backups));
        } catch (e) { console.error('Error saving backup:', e); }
    },

    startAutoBackup() {
        if (this._backupTimer) clearInterval(this._backupTimer);
        this.saveAutoBackup();
        this._backupTimer = setInterval(() => this.saveAutoBackup(), this._BACKUP_INTERVAL);
    },

    getAutoBackups() {
        const key = `autoBackups_${window.state.selectedTrain}`;
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error al cargar backups', e);
            return [];
        }
    },

    restoreFromBackup(backup) {
        window.state.seatData = backup.seatData || {};
        window.state.trainDirection = backup.trainDirection || {};
        window.state.serviceNotes = backup.serviceNotes || '';
        window.state.incidents = backup.incidents || {};

        if (backup.trainNumber) {
            window.state.trainNumber = backup.trainNumber;
            localStorage.setItem('trainNumber', backup.trainNumber);
        }
        if (backup.currentStop) {
            window.state.currentStop = backup.currentStop;
            localStorage.setItem('currentStop', backup.currentStop);
        }
        if (window.state.selectedTrain === '470' && backup.coach470Variants) {
            window.state.coach470Variants = backup.coach470Variants;
            localStorage.setItem('coach470Variants', JSON.stringify(backup.coach470Variants));
        }

        this.saveData();
    },

    clearAllAutoBackups() {
        try {
            localStorage.removeItem(`autoBackups_${window.state.selectedTrain}`);
        } catch (e) { console.warn('Error al borrar backups', e); }
    },

    saveTrainDirection() {
        try {
            localStorage.setItem(`train${window.state.selectedTrain}Direction`, JSON.stringify(window.state.trainDirection));
        } catch (e) { console.warn('Error al guardar dirección', e); }
    },

    saveDarkMode() {
        try { localStorage.setItem('darkMode', window.state.darkMode); } catch (e) { console.warn('Error al guardar darkMode', e); }
    },

    saveSeatRotation() {
        try { localStorage.setItem('rotateSeats', window.state.rotateSeats); } catch (e) { console.warn('Error al guardar rotación', e); }
    },

    saveTrainNumber() {
        try {
            if (window.state.trainNumber) localStorage.setItem('trainNumber', window.state.trainNumber);
        } catch (e) { console.warn('Error al guardar número de tren', e); }
    },

    saveCurrentStop() {
        try {
            if (window.state.currentStop) localStorage.setItem('currentStop', window.state.currentStop);
        } catch (e) { console.warn('Error al guardar parada actual', e); }
    },

    save470Variants() {
        try {
            localStorage.setItem('coach470Variants', JSON.stringify(window.state.coach470Variants));
        } catch (e) { console.warn('Error al guardar variantes 470', e); }
    },

    saveHeaderCollapsed() {
        try { localStorage.setItem('headerCollapsed', window.state.headerCollapsed); } catch (e) { console.warn('Error al guardar header', e); }
    },

    clearCurrentTrainData() {
        const t = window.state.selectedTrain;
        try {
            localStorage.removeItem(`train${t}Data`);
            localStorage.removeItem(`train${t}Direction`);
            localStorage.removeItem(`train${t}Notes`);
            localStorage.removeItem(`train${t}Incidents`);
            localStorage.removeItem(`train${t}CopiedData`);
            localStorage.removeItem(`train${t}CoachNotes`);
            localStorage.removeItem('currentStop');
            localStorage.removeItem(`autoBackups_${t}`);
        } catch (e) { console.warn('Error al eliminar datos', e); }
    },

    clearSeatsData() {
        const t = window.state.selectedTrain;
        try {
            localStorage.removeItem('currentStop');
            localStorage.removeItem(`train${t}Notes`);
            localStorage.removeItem(`train${t}Incidents`);
            localStorage.removeItem(`train${t}CopiedData`);
            localStorage.removeItem(`autoBackups_${t}`);
        } catch (e) { console.warn('Error al limpiar datos de asientos', e); }
    },

    saveImportedData(turnData) {
        try {
            if (turnData.trainModel) localStorage.setItem('selectedTrain', turnData.trainModel);
            if (turnData.trainNumber) localStorage.setItem('trainNumber', turnData.trainNumber);
            if (turnData.currentStop) localStorage.setItem('currentStop', turnData.currentStop);
            if (turnData.trainModel === '470' && turnData.coach470Variants) {
                localStorage.setItem('coach470Variants', JSON.stringify(turnData.coach470Variants));
            }
            if (turnData.seatData) {
                localStorage.setItem(`train${turnData.trainModel}Data`, JSON.stringify(turnData.seatData));
            }
            if (turnData.trainDirection) {
                localStorage.setItem(`train${turnData.trainModel}Direction`, JSON.stringify(turnData.trainDirection));
            }
            if (turnData.serviceNotes !== undefined) {
                localStorage.setItem(`train${turnData.trainModel}Notes`, turnData.serviceNotes);
            }
            if (turnData.incidents) {
                localStorage.setItem(`train${turnData.trainModel}Incidents`, JSON.stringify(turnData.incidents));
            }
        } catch (e) { console.warn('Error al guardar datos importados', e); }
    }
};

// Inicializar al cargar
ConfigurationManager.init();

// Exportar a window
window.ConfigurationManager = ConfigurationManager;

// Aliases globales para compatibilidad con script.js, undo.js, incidents.js, etc.
// Se eliminan cuando AppState absorba la gestión de estado (Candidato 1).
window.saveData         = () => ConfigurationManager.saveData();
window.loadData         = () => ConfigurationManager.loadData();
window.startAutoBackup  = () => ConfigurationManager.startAutoBackup();
window.saveAutoBackup   = () => ConfigurationManager.saveAutoBackup();
window.saveTrainDirection  = () => ConfigurationManager.saveTrainDirection();
window.saveDarkMode        = () => ConfigurationManager.saveDarkMode();
window.saveSeatRotation    = () => ConfigurationManager.saveSeatRotation();
window.saveTrainNumber     = () => ConfigurationManager.saveTrainNumber();
window.saveCurrentStop     = () => ConfigurationManager.saveCurrentStop();
window.save470Variants     = () => ConfigurationManager.save470Variants();
window.saveHeaderCollapsed = () => ConfigurationManager.saveHeaderCollapsed();
window.clearCurrentTrainData = () => ConfigurationManager.clearCurrentTrainData();
window.clearSeatsData        = () => ConfigurationManager.clearSeatsData();
window.saveImportedData      = (d) => ConfigurationManager.saveImportedData(d);
window.getAutoBackups        = () => ConfigurationManager.getAutoBackups();
window.restoreFromBackup     = (b) => ConfigurationManager.restoreFromBackup(b);
window.clearAllAutoBackups   = () => ConfigurationManager.clearAllAutoBackups();
window.saveCustomTrainModel  = (m) => ConfigurationManager.saveCustomTrainModel(m);
window.deleteCustomTrainModel = (id) => ConfigurationManager.deleteCustomTrainModel(id);
window.saveCustomRoute       = (r) => ConfigurationManager.saveCustomRoute(r);
window.deleteCustomRoute     = (n) => ConfigurationManager.deleteCustomRoute(n);
window.saveCustomStop        = (s) => ConfigurationManager.saveCustomStop(s);
window.deleteCustomStop      = (a) => ConfigurationManager.deleteCustomStop(a);
window.exportCustomConfigurations = () => ConfigurationManager.exportConfiguration();
window.importCustomConfigurations = (c, merge) => ConfigurationManager.importConfiguration(c, merge);
