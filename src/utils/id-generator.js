// ============================================================================
// ID-GENERATOR.JS - Generador de IDs únicos para configuraciones personalizadas
// ============================================================================

/**
 * Genera un ID único para configuraciones personalizadas
 * Formato: {prefix}_{timestamp}_{random}
 * Ejemplo: custom_1737543000_a3f9
 *
 * @param {string} prefix - Prefijo del ID (por defecto 'custom')
 * @returns {string} ID único generado
 */
function generateCustomId(prefix = 'custom') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${prefix}_${timestamp}_${random}`;
}

/**
 * Genera un ID único para un modelo de tren personalizado
 * @returns {string} ID del modelo
 */
function generateTrainModelId() {
    return generateCustomId('train');
}

/**
 * Genera un ID único para una ruta personalizada
 * @returns {string} Número de tren
 */
function generateRouteId() {
    // Para rutas, usamos números de 5 dígitos empezando en 90000
    const timestamp = Date.now();
    const base = 90000 + (timestamp % 9999);
    return base.toString();
}

/**
 * Verifica si un ID es de una configuración personalizada
 * @param {string} id - ID a verificar
 * @returns {boolean} true si es personalizado
 */
function isCustomId(id) {
    return id && (id.toString().startsWith('custom_') || id.toString().startsWith('train_'));
}

/**
 * Verifica si un número de tren es personalizado
 * @param {string} trainNumber - Número de tren
 * @returns {boolean} true si es personalizado (90000-99999)
 */
function isCustomRoute(trainNumber) {
    const num = parseInt(trainNumber);
    return num >= 90000 && num <= 99999;
}

/**
 * Genera un ID único verificando que no exista en una lista
 * @param {string} prefix - Prefijo del ID
 * @param {Array<string>} existingIds - Lista de IDs existentes
 * @param {number} maxAttempts - Número máximo de intentos
 * @returns {string} ID único garantizado
 */
function generateUniqueId(prefix, existingIds = [], maxAttempts = 100) {
    let attempts = 0;
    let id;

    do {
        id = generateCustomId(prefix);
        attempts++;

        if (attempts >= maxAttempts) {
            throw new Error(`No se pudo generar un ID único después de ${maxAttempts} intentos`);
        }
    } while (existingIds.includes(id));

    return id;
}

/**
 * Genera un número de tren único verificando que no exista
 * @param {Array<string>} existingRoutes - Lista de números de tren existentes
 * @returns {string} Número de tren único
 */
function generateUniqueRouteId(existingRoutes = []) {
    let attempts = 0;
    let routeId;
    const maxAttempts = 1000;

    do {
        routeId = generateRouteId();
        attempts++;

        if (attempts >= maxAttempts) {
            throw new Error('No se pudo generar un número de tren único');
        }
    } while (existingRoutes.includes(routeId));

    return routeId;
}

// Exportar funciones
window.IdGenerator = {
    generateCustomId,
    generateTrainModelId,
    generateRouteId,
    isCustomId,
    isCustomRoute,
    generateUniqueId,
    generateUniqueRouteId
};
