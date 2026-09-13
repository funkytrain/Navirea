// ============================================================================
// PMR-TYPES.JS - Catálogo de tipos de viajero PMR
// ============================================================================
// Códigos oficiales de Personas con Movilidad Reducida asignables a un asiento.
// El tipo 1 (silla de ruedas propia en plaza H) no aparece: esa plaza no es
// seleccionable en la plantilla, se gestiona como espacio reservado del coche.
// ============================================================================

const PMR_TYPES = [
    { code: "2",   label: "Persona en silla de ruedas propia plegable ocupando plaza regular" },
    { code: "3.1", label: "Discapacidad visual" },
    { code: "3.2", label: "Discapacidad auditiva" },
    { code: "3.3", label: "Discapacidad cognitiva" },
    { code: "3.4", label: "Discapacidad sordoceguera" },
    { code: "4.1", label: "Persona con dificultades en miembros sup. / inf." },
    { code: "4.2", label: "Persona mayor" },
    { code: "4.3", label: "Persona con carrito de niño" },
    { code: "4.4", label: "Persona embarazada" },
    { code: "4.6", label: "Otra persona con movilidad reducida" },
    { code: "5",   label: "Persona con dificultades de desplazamiento" }
];

/**
 * Devuelve la etiqueta descriptiva de un código PMR.
 * @param {string} code - Código del tipo (ej. "3.1")
 * @returns {string} Etiqueta, o cadena vacía si el código no existe
 */
function getPMRTypeLabel(code) {
    const type = PMR_TYPES.find((t) => t.code === code);
    return type ? type.label : "";
}

// Exportar al scope global para acceso desde módulos
Object.assign(window, { PMR_TYPES, getPMRTypeLabel });
