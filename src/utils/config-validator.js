// ============================================================================
// CONFIG-VALIDATOR.JS - Validación de configuraciones personalizadas
// ============================================================================

/**
 * Errores de validación
 */
class ValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ValidationError';
        this.field = field;
    }
}

/**
 * Valida un modelo de tren personalizado
 * @param {Object} trainModel - Modelo de tren a validar
 * @param {Array<string>} existingIds - IDs de modelos existentes
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
function validateTrainModel(trainModel, existingIds = []) {
    const errors = [];

    // Validar ID
    if (!trainModel.id) {
        errors.push('El modelo debe tener un ID');
    } else if (existingIds.includes(trainModel.id)) {
        errors.push(`Ya existe un modelo con el ID "${trainModel.id}"`);
    }

    // Validar nombre
    if (!trainModel.name || trainModel.name.trim().length === 0) {
        errors.push('El modelo debe tener un nombre');
    } else if (trainModel.name.trim().length < 3) {
        errors.push('El nombre debe tener al menos 3 caracteres');
    } else if (trainModel.name.trim().length > 50) {
        errors.push('El nombre no puede exceder 50 caracteres');
    }

    // Validar coches
    if (!trainModel.coaches || !Array.isArray(trainModel.coaches)) {
        errors.push('El modelo debe tener un array de coches');
    } else if (trainModel.coaches.length === 0) {
        errors.push('El modelo debe tener al menos un coche');
    } else if (trainModel.coaches.length > 10) {
        errors.push('El modelo no puede tener más de 10 coches');
    } else {
        // Validar cada coche
        trainModel.coaches.forEach((coach, index) => {
            const coachErrors = validateCoach(coach, index);
            errors.push(...coachErrors);
        });

        // Validar IDs únicos de coches
        const coachIds = trainModel.coaches.map(c => c.id);
        const duplicateCoachIds = coachIds.filter((id, idx) => coachIds.indexOf(id) !== idx);
        if (duplicateCoachIds.length > 0) {
            errors.push(`IDs de coches duplicados: ${duplicateCoachIds.join(', ')}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Valida un coche
 * @param {Object} coach - Coche a validar
 * @param {number} index - Índice del coche
 * @returns {Array<string>} Errores encontrados
 */
function validateCoach(coach, index) {
    const errors = [];
    const prefix = `Coche ${index + 1}`;

    // Validar ID
    if (!coach.id) {
        errors.push(`${prefix}: Debe tener un ID`);
    }

    // Validar nombre
    if (!coach.name || coach.name.trim().length === 0) {
        errors.push(`${prefix}: Debe tener un nombre`);
    }

    // Validar layout o variants
    if (coach.variants) {
        // Coche con variantes (como el 470)
        if (typeof coach.variants !== 'object' || Array.isArray(coach.variants)) {
            errors.push(`${prefix}: Las variantes deben ser un objeto`);
        } else {
            const variantKeys = Object.keys(coach.variants);
            if (variantKeys.length === 0) {
                errors.push(`${prefix}: Debe tener al menos una variante`);
            }
            // Validar cada variante
            variantKeys.forEach(variantKey => {
                const variant = coach.variants[variantKey];
                if (!variant.layout || !Array.isArray(variant.layout)) {
                    errors.push(`${prefix} Variante ${variantKey}: Debe tener un layout`);
                } else {
                    const layoutErrors = validateLayout(variant.layout, `${prefix} Variante ${variantKey}`);
                    errors.push(...layoutErrors);
                }
            });
        }
    } else if (coach.layout) {
        // Coche simple sin variantes
        if (!Array.isArray(coach.layout)) {
            errors.push(`${prefix}: El layout debe ser un array`);
        } else {
            const layoutErrors = validateLayout(coach.layout, prefix);
            errors.push(...layoutErrors);
        }
    } else {
        errors.push(`${prefix}: Debe tener un layout o variantes`);
    }

    return errors;
}

/**
 * Valida el layout de un coche
 * @param {Array} layout - Layout a validar
 * @param {string} prefix - Prefijo para mensajes de error
 * @returns {Array<string>} Errores encontrados
 */
function validateLayout(layout, prefix) {
    const errors = [];
    const seatNumbers = new Set();

    if (layout.length === 0) {
        errors.push(`${prefix}: El layout no puede estar vacío`);
        return errors;
    }

    layout.forEach((row, rowIndex) => {
        // Validar tipo de fila
        if (!row.type) {
            errors.push(`${prefix} Fila ${rowIndex + 1}: Debe tener un tipo`);
            return;
        }

        if (row.type === 'seats') {
            // Validar fila de asientos
            if (!row.positions || !Array.isArray(row.positions)) {
                errors.push(`${prefix} Fila ${rowIndex + 1}: Debe tener posiciones`);
                return;
            }

            row.positions.forEach((seatRow, seatRowIndex) => {
                if (!Array.isArray(seatRow)) {
                    errors.push(`${prefix} Fila ${rowIndex + 1}: Las posiciones deben ser arrays`);
                    return;
                }

                seatRow.forEach(seat => {
                    if (seat !== null) {
                        // Verificar números duplicados (solo números, no strings especiales)
                        if (typeof seat === 'number') {
                            if (seatNumbers.has(seat)) {
                                errors.push(`${prefix}: Número de asiento duplicado: ${seat}`);
                            }
                            seatNumbers.add(seat);
                        }
                    }
                });
            });
        } else if (row.type === 'space') {
            // Validar espacio
            if (typeof row.height !== 'number' || row.height < 0) {
                errors.push(`${prefix} Fila ${rowIndex + 1}: El espacio debe tener una altura válida`);
            }
        } else if (row.type === 'pmr-bathroom') {
            // Validar baño PMR
            if (typeof row.height !== 'number' || row.height < 0) {
                errors.push(`${prefix} Fila ${rowIndex + 1}: El baño PMR debe tener una altura válida`);
            }
        } else if (row.type === 'door') {
            // Validar puerta
            if (typeof row.height !== 'number' || row.height < 0) {
                errors.push(`${prefix} Fila ${rowIndex + 1}: La puerta debe tener una altura válida`);
            }
        } else {
            errors.push(`${prefix} Fila ${rowIndex + 1}: Tipo "${row.type}" no válido`);
        }
    });

    return errors;
}

/**
 * Valida una ruta personalizada
 * @param {Object} route - Ruta a validar
 * @param {Array<string>} existingRouteNumbers - Números de tren existentes
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
function validateRoute(route, existingRouteNumbers = []) {
    const errors = [];

    // Validar número de tren
    if (!route.trainNumber) {
        errors.push('La ruta debe tener un número de tren');
    } else if (existingRouteNumbers.includes(route.trainNumber)) {
        errors.push(`Ya existe una ruta con el número "${route.trainNumber}"`);
    }

    // Validar paradas
    if (!route.stops || !Array.isArray(route.stops)) {
        errors.push('La ruta debe tener un array de paradas');
    } else if (route.stops.length < 2) {
        errors.push('La ruta debe tener al menos 2 paradas');
    } else if (route.stops.length > 50) {
        errors.push('La ruta no puede tener más de 50 paradas');
    } else {
        // Validar que las paradas no estén vacías
        route.stops.forEach((stop, index) => {
            if (!stop || stop.trim().length === 0) {
                errors.push(`Parada ${index + 1}: No puede estar vacía`);
            }
        });

        // Validar paradas duplicadas
        const duplicates = route.stops.filter((stop, idx) =>
            route.stops.indexOf(stop) !== idx
        );
        if (duplicates.length > 0) {
            errors.push(`Paradas duplicadas: ${[...new Set(duplicates)].join(', ')}`);
        }
    }

    // Validar destino
    if (!route.destination) {
        errors.push('La ruta debe tener un destino');
    } else if (route.stops && !route.stops.includes(route.destination)) {
        errors.push('El destino debe estar en la lista de paradas');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Valida una parada personalizada
 * @param {Object} stop - Parada a validar
 * @param {Array<string>} existingAbbrs - Abreviaturas existentes
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
function validateStop(stop, existingAbbrs = []) {
    const errors = [];

    // Validar nombre completo
    if (!stop.full || stop.full.trim().length === 0) {
        errors.push('La parada debe tener un nombre completo');
    } else if (stop.full.trim().length < 2) {
        errors.push('El nombre de la parada debe tener al menos 2 caracteres');
    } else if (stop.full.trim().length > 50) {
        errors.push('El nombre de la parada no puede exceder 50 caracteres');
    }

    // Validar abreviatura
    if (!stop.abbr || stop.abbr.trim().length === 0) {
        errors.push('La parada debe tener una abreviatura');
    } else if (stop.abbr.trim().length < 2 || stop.abbr.trim().length > 5) {
        errors.push('La abreviatura debe tener entre 2 y 5 caracteres');
    } else if (!/^[A-Z]+$/.test(stop.abbr)) {
        errors.push('La abreviatura debe contener solo letras mayúsculas');
    } else if (existingAbbrs.includes(stop.abbr)) {
        errors.push(`Ya existe una parada con la abreviatura "${stop.abbr}"`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Valida un archivo de configuración exportado
 * @param {Object} config - Configuración a validar
 * @returns {Object} { valid: boolean, errors: Array<string> }
 */
function validateExportedConfig(config) {
    const errors = [];

    // Validar estructura básica
    if (!config || typeof config !== 'object') {
        errors.push('La configuración debe ser un objeto');
        return { valid: false, errors };
    }

    // Validar versión
    if (!config.version) {
        errors.push('La configuración debe tener una versión');
    }

    // Validar tipo
    if (config.type !== 'train-config-export') {
        errors.push('Tipo de configuración no válido');
    }

    // Validar datos
    if (!config.data || typeof config.data !== 'object') {
        errors.push('La configuración debe tener datos');
    } else {
        // Validar estructura de datos
        if (config.data.trainModels && !Array.isArray(config.data.trainModels)) {
            errors.push('trainModels debe ser un array');
        }

        if (config.data.routes && !Array.isArray(config.data.routes)) {
            errors.push('routes debe ser un array');
        }

        if (config.data.stops && !Array.isArray(config.data.stops)) {
            errors.push('stops debe ser un array');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Sanitiza un nombre (elimina caracteres no válidos)
 * @param {string} name - Nombre a sanitizar
 * @returns {string} Nombre sanitizado
 */
function sanitizeName(name) {
    if (!name) return '';
    return name.trim().replace(/[<>]/g, '');
}

/**
 * Sanitiza una abreviatura (convierte a mayúsculas y elimina caracteres no válidos)
 * @param {string} abbr - Abreviatura a sanitizar
 * @returns {string} Abreviatura sanitizada
 */
function sanitizeAbbr(abbr) {
    if (!abbr) return '';
    return abbr.trim().toUpperCase().replace(/[^A-Z]/g, '').substr(0, 5);
}

// Exportar funciones
window.ConfigValidator = {
    ValidationError,
    validateTrainModel,
    validateCoach,
    validateLayout,
    validateRoute,
    validateStop,
    validateExportedConfig,
    sanitizeName,
    sanitizeAbbr
};
