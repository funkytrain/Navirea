/**
 * Template Loader - Sistema de carga de templates HTML externos
 * Extrae templates HTML del script.js a archivos separados
 */

// Cache de templates cargados
const templateCache = {};

/**
 * Carga un template HTML desde un archivo externo
 * @param {string} templateId - ID del template a cargar
 * @returns {string} Contenido del template
 */
async function loadTemplate(templateId) {
    if (templateCache[templateId]) {
        return templateCache[templateId];
    }

    // Mapeo de IDs a rutas de archivos
    const templatePaths = {
        'header': 'templates/header.html',
        'seats': 'templates/seats.html',
        'modal': 'templates/modal.html',
        'filter-modals': 'templates/filter-modals.html',
        'readme-content': 'templates/readme-content.html'
    };

    const path = templatePaths[templateId];
    if (!path) {
        console.error(`Template no encontrado: ${templateId}`);
        return '';
    }

    try {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Error cargando template: ${response.status}`);
        }
        const html = await response.text();
        templateCache[templateId] = html;
        return html;
    } catch (error) {
        console.error(`Error cargando template ${templateId}:`, error);
        return '';
    }
}

/**
 * Obtiene el contenido de un template cargado en el DOM
 * @param {string} templateId - ID del template en el DOM
 * @returns {string} Contenido del template
 */
function getTemplateContent(templateId) {
    const template = document.getElementById(templateId);
    if (!template) {
        console.error(`Template no encontrado en DOM: ${templateId}`);
        return '';
    }
    return template.innerHTML.trim();
}

/**
 * Procesa un template reemplazando variables
 * @param {string} template - String del template con variables ${variable}
 * @param {Object} data - Objeto con los datos a interpolar
 * @returns {string} Template procesado
 */
function processTemplate(template, data) {
    return template.replace(/\$\{(\w+)\}/g, (match, key) => {
        return data.hasOwnProperty(key) ? data[key] : match;
    });
}

/**
 * Renderiza el header usando el template externo
 */
function renderHeaderTemplate(data) {
    const template = getTemplateContent('header-template');

    // Preparar datos para el template
    const templateData = {
        headerCollapsed: data.headerCollapsed ? 'collapsed' : '',
        trainName: data.trainName || '',
        occupancyClass: data.occupancyClass || 'occ-low',
        occupancyPercentage: data.occupancyPercentage || 0,
        trainSelectorOptions: data.trainSelectorOptions || '',
        trainNumberSection: data.trainNumberSection || '',
        filterClearButton: data.filterClearButton || '',
        trainNumberDisplay: data.trainNumberDisplay || '',
        currentStopSection: data.currentStopSection || '',
        notesBadge: data.notesBadge || '',
        incidentsClass: data.incidentsClass || '',
        incidentBadge: data.incidentBadge || '',
        darkModeIcon: data.darkModeIcon || '',
        rotationClass: data.rotationClass || '',
        moreOptionsMenu: data.moreOptionsMenu || '',
        collapseTitle: data.collapseTitle || 'Colapsar',
        collapseIcon: data.collapseIcon || '',
        coachButtons: data.coachButtons || ''
    };

    return processTemplate(template, templateData);
}

/**
 * Genera el HTML para la sección de número de tren
 */
function getTrainNumberSection(copyMode) {
    const template = getTemplateContent('train-number-section-template');
    return processTemplate(template, {
        copyModeClass: copyMode ? 'on' : ''
    });
}

/**
 * Genera el HTML para la sección de parada actual
 */
function getCurrentStopSection(data) {
    const template = getTemplateContent('current-stop-section-template');
    return processTemplate(template, {
        currentStopPlaceholder: data.currentStopPlaceholder || 'Seleccionar...',
        currentStopSearch: data.currentStopSearch || '',
        currentStopDropdown: data.currentStopDropdown || ''
    });
}

/**
 * Genera el HTML para el menú de más opciones
 */
function getMoreOptionsMenu() {
    return getTemplateContent('more-options-menu-template');
}

// Exportar funciones al scope global
window.templateLoader = {
    loadTemplate,
    getTemplateContent,
    processTemplate,
    renderHeaderTemplate,
    getTrainNumberSection,
    getCurrentStopSection,
    getMoreOptionsMenu
};
