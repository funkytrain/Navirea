// ============================================================================
// DATA-LOADER.JS - Utilidad para cargar datos JSON
// ============================================================================

/**
 * Carga un archivo JSON
 * @param {string} path - Ruta al archivo JSON
 * @returns {Promise<any>} - Datos del JSON
 */
async function loadJSON(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Error loading ${path}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to load JSON from ${path}:`, error);
        throw error;
    }
}

/**
 * Carga todos los datos necesarios para la aplicación
 * @returns {Promise<Object>} Objeto con todos los datos cargados
 */
async function loadAllData() {
    try {
        const [stops, trainNumbers, trainRoutes, stationScreens, trains] = await Promise.all([
            loadJSON('data/stops.json'),
            loadJSON('data/train-numbers.json'),
            loadJSON('data/train-routes.json'),
            loadJSON('data/station-screens.json'),
            loadAllTrains()
        ]);

        // Fusionar datos del sistema con configuraciones personalizadas
        const allStops = window.ConfigurationManager
            ? window.ConfigurationManager.getAllStops(stops)
            : stops;

        let allTrainRoutes = window.ConfigurationManager
            ? window.ConfigurationManager.getAllRoutes(trainRoutes)
            : trainRoutes;

        // Normalizar rutas: convertir objetos { stops: [...] } a arrays directos
        const normalizedRoutes = {};
        for (const [trainNumber, route] of Object.entries(allTrainRoutes)) {
            if (Array.isArray(route)) {
                // Ya es un array (ruta del sistema)
                normalizedRoutes[trainNumber] = route;
            } else if (route && route.stops && Array.isArray(route.stops)) {
                // Es un objeto de ruta personalizada con propiedad stops
                normalizedRoutes[trainNumber] = route.stops;
                // Guardar metadata en un objeto separado si es necesario
                normalizedRoutes[trainNumber].custom = route.custom;
                normalizedRoutes[trainNumber].destination = route.destination;
            } else {
                // Formato desconocido, mantener como está
                normalizedRoutes[trainNumber] = route;
            }
        }

        const allTrainModels = window.ConfigurationManager
            ? window.ConfigurationManager.getAllTrainModels(trains)
            : trains;

        return {
            stops: allStops,
            trainNumbers,
            trainRoutes: normalizedRoutes,
            stationScreens,
            trainModels: allTrainModels
        };
    } catch (error) {
        console.error('Error loading application data:', error);
        throw error;
    }
}

/**
 * Carga todos los modelos de trenes disponibles
 * @returns {Promise<Object>} Objeto con todos los modelos de trenes
 */
async function loadAllTrains() {
    const trainIds = ['463', '464', '465', '449', '470'];
    const trainPromises = trainIds.map(id => loadTrain(id));
    const trainData = await Promise.all(trainPromises);

    // Convertir array a objeto con IDs como claves
    const trains = {};
    trainData.forEach((train, index) => {
        trains[trainIds[index]] = train;
    });

    return trains;
}

/**
 * Carga un modelo de tren específico
 * @param {string} trainId - ID del tren (463, 464, etc.)
 * @returns {Promise<Object>} Datos del tren
 */
async function loadTrain(trainId) {
    return loadJSON(`data/trains/train-${trainId}.json`);
}

/**
 * Carga datos de rutas de trenes
 * @returns {Promise<Object>} Rutas de trenes
 */
async function loadTrainRoutes() {
    return loadJSON('data/train-routes.json');
}

// Exportar funciones
window.DataLoader = {
    loadJSON,
    loadAllData,
    loadAllTrains,
    loadTrain,
    loadTrainRoutes
};
