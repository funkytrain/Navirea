/**
 * Templates Module - Generadores de templates HTML grandes
 * Extraído de script.js para reducir complejidad y mejorar mantenibilidad
 */

/**
 * Genera el template principal del header
 * @param {Object} config - Configuración del header
 * @returns {string} HTML del header
 */
function generateHeaderTemplate(config) {
    const {
        headerCollapsed,
        trainName,
        occupancyPercentage,
        occupancyClass,
        trainSelectorOptions,
        trainNumber,
        copyMode,
        filterActive,
        serviceNotes,
        incidentsCount,
        darkMode,
        rotateSeats,
        currentStop,
        currentStopSearch,
        currentStopDropdown,
        hasTrainRoute,
        coachButtons,
        collapseTitle,
        collapseIcon
    } = config;

    return `
        <div class="header ${headerCollapsed ? 'collapsed' : ''}">
            <div class="header-main">
                    <div class="header-row-1">
                        <div class="header-left">
    <svg class="train-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="4" y="6" width="16" height="12" rx="2"/>
        <path d="M4 11h16M12 6v5"/>
        <circle cx="9" cy="16" r="1"/>
        <circle cx="15" cy="16" r="1"/>
    </svg>
<div class="header-title-group">
    <button class="title train-selector-btn" onclick="toggleTrainSelector()">
        <span class="train-name">${trainName}</span>
        <span class="train-occupancy-badge ${occupancyClass}">${occupancyPercentage}%</span>
        <span class="train-selector-arrow">▼</span>
    </button>
        <div id="train-selector" class="train-selector-dropdown hidden">
            ${trainSelectorOptions}
        </div>
    </div>

${trainNumber ? `
    <div style="position: relative; display: flex; align-items: center; gap: 0.5rem;">

        <!-- Interruptor Copiado rápido -->
        <button class="copy-toggle-btn" onclick="toggleCopyMode()" title="Copiado rápido">
            <div class="copy-switch ${copyMode ? 'on' : ''}">
                <div class="copy-switch-handle"></div>
            </div>
        </button>

        <!-- Botón Filtros -->
        <button class="filters-btn" onclick="toggleFiltersMenu()" title="Filtros">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
        </button>
<!-- Botón Pantallas -->
<button class="screens-btn" onclick="openScreensModal()" title="Pantallas de estación">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <rect x="7" y="18" width="10" height="2" rx="1" />
    </svg>
</button>

        <div id="filters-menu" class="filters-dropdown hidden">
            <button class="filter-option" onclick="openStopFilter()">
                Por parada de bajada
            </button>
            <button class="filter-option" onclick="openRouteFilter()">
                Por tramo recorrido
            </button>
            <button class="filter-option" onclick="openSeatFilter()">
                Por asiento
            </button>
                <button class="filter-option" onclick="openLinksFilter()">
        Por Enlaces
    </button>
    <button class="filter-option" onclick="openCommentsFilter()">
        Por comentario
    </button>
        </div>
    </div>
` : ''}
</div>

<div class="header-right">
    ${filterActive ? `
        <button class="filter-clear-pill" onclick="clearFilterHighlight()" title="Limpiar filtro">
            ×
        </button>
    ` : ''}
    ${trainNumber ? `
        <button class="train-number-display" onclick="showTrainNumberPrompt()">
            Nº ${trainNumber}
        </button>
    ` : ''}
</div>
                    </div>

                    ${trainNumber && hasTrainRoute ? `
                        <div class="current-stop-row">
                            <div class="current-stop-selector">
                                <label class="current-stop-label">Parada actual:</label>
                                <input
                                    type="text"
                                    class="current-stop-input"
                                    placeholder="${currentStop || 'Seleccionar...'}"
                                    value="${currentStopSearch}"
                                    oninput="updateCurrentStopSearch(this.value)"
                                    onfocus="this.select()"
                                />
                                ${currentStopDropdown}
                            </div>
                        </div>
                    ` : ''}

<div class="header-actions">
    <button class="action-btn" onclick="openServiceNotes(); event.stopPropagation();" title="Notas del servicio">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        ${serviceNotes && serviceNotes.trim() ? '<span class="notes-badge"></span>' : ''}
    </button>

    <button class="action-btn ${incidentsCount > 0 ? 'has-incidents' : ''}"
            onclick="openIncidentsPanel(); event.stopPropagation();"
            title="Incidencias">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        ${incidentsCount > 0 ? `<span class="incident-badge">${incidentsCount}</span>` : ''}
    </button>

    <button class="action-btn" onclick="toggleDarkMode()" title="Modo nocturno">
        ${darkMode ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        ` : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        `}
    </button>

    <button class="action-btn rotation-btn ${rotateSeats ? 'rotated' : ''}"
            onclick="toggleSeatRotation()"
            title="Invertir disposición de asientos">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M19 9l-7 7-7-7" />
        </svg>
    </button>
    <button class="action-btn delete-btn" onclick="clearAllData()" title="Borrar todos los datos">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
</button>
    <button class="action-btn more-options-btn" onclick="toggleMoreOptions()" title="Más opciones">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="1"/>
            <circle cx="12" cy="5" r="1"/>
            <circle cx="12" cy="19" r="1"/>
        </svg>
    </button>

${generateMoreOptionsMenu()}
</div>
            </div>

            <div class="coach-selector-row">
                <button class="header-collapse-btn" onclick="toggleHeaderCollapse()" title="${collapseTitle}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        ${collapseIcon}
                    </svg>
                </button>
                <div class="coach-selector">
                 ${coachButtons}
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera el menú de más opciones
 * @returns {string} HTML del menú
 */
function generateMoreOptionsMenu() {
    return `
<div id="more-options-menu" class="more-options-dropdown hidden">
    <button class="more-option" onclick="toggleShareSubmenu(); event.stopPropagation();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/>
            <circle cx="6" cy="12" r="3"/>
            <circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Compartir turno
        <span class="submenu-arrow">›</span>
    </button>

    <div id="share-submenu" class="submenu hidden">
        <button class="more-option submenu-item" onclick="generateQRCode(); toggleMoreOptions();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Por código QR
        </button>
        <button class="more-option submenu-item" onclick="exportTurn(); toggleMoreOptions();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Por archivo JSON
        </button>
    </div>

    <button class="more-option" onclick="toggleImportSubmenu(); event.stopPropagation();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Importar turno
        <span class="submenu-arrow">›</span>
    </button>

    <div id="import-submenu" class="submenu hidden">
        <button class="more-option submenu-item" onclick="scanQRCode(); toggleMoreOptions();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Escanear QR
        </button>
        <button class="more-option submenu-item" onclick="importTurn(); toggleMoreOptions();">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
            </svg>
            Desde archivo JSON
        </button>
    </div>

    <button class="more-option" onclick="openConfigurationManager(); toggleMoreOptions();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
        Configuraciones Personalizadas
    </button>
    <button class="more-option" onclick="openBackupsPanel(); toggleMoreOptions();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
            <circle cx="7" cy="12" r="2"/>
        </svg>
        Backups automáticos
    </button>
    <button class="more-option" onclick="openManualTecnico(); toggleMoreOptions();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        Manual Técnico de Trenes
    </button>
    <button class="more-option" onclick="openAbout(); toggleMoreOptions();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12" y2="8"/>
        </svg>
        Acerca de
    </button>

    <button class="more-option" onclick="openReadmeModal(); toggleMoreOptions();">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        Guía de uso
    </button>
</div>
`;
}

/**
 * Genera el modal "Acerca de"
 * @returns {string} HTML del modal
 */
function generateAboutModal() {
    return `
        <div class="modal-overlay" onclick="closeAbout(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Acerca de</h3>
                        <button class="close-btn" onclick="closeAbout()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="about-content">
                    <p><strong>Navirea v1.0</strong></p>
                    <p>Creado por Adrián Fernández,</p>
<p>y publicado bajo la licencia MIT.</p>
                    <p>Dudas o sugerencias a:<br><a href="mailto:plantillatren@gmail.com">plantillatren@gmail.com</a></p>
                    <br>
                    <p><b>Proyecto no oficial ni afiliado con ADIF o RENFE, con propósito educacional. Las pantallas de las estaciones muestran contenido servido directamente por ADIF. Marca, logotipos y datos mostrados en el panel son propiedad de ADIF.</b></p>
                    <p><b>El Manual Técnico Ferroviario es un proyecto creado por José Luis Domínguez y Juan Pablo Romero.</b></p>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeAbout()">Cerrar</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera el modal del Manual Técnico
 * @returns {string} HTML del modal
 */
function generateManualTecnicoModal() {
    return `
        <div class="modal-overlay" onclick="closeManualTecnico(event)">
            <div class="modal fullscreen-modal manual-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">📘 Manual Técnico Ferroviario</h3>
                    <button class="close-btn" onclick="closeManualTecnico()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body fullscreen-body">
                    <iframe
                        src="https://docs.google.com/document/d/e/2PACX-1vTy4XRIZl21F-LIZPxPd6eYkDvDzCd8vZI6j2qFn5h2i1G1FJcZMDlX2Hj8aRYAqpOOZH7njaBP_iCW/pub?embedded=true"
                        frameborder="0"
                        style="width: 100%; height: 100%; border: none;">
                    </iframe>
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera el modal de Notas del Servicio
 * @param {string} notes - Contenido de las notas
 * @returns {string} HTML del modal
 */
function generateServiceNotesModal(notes) {
    return `
        <div class="modal-overlay" onclick="closeServiceNotes(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Notas del servicio</h3>
                        <button class="close-btn" onclick="closeServiceNotes()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="about-content">
                    <textarea
                        id="service-notes-textarea"
                        class="service-notes-textarea"
                        placeholder="Escribe aquí tus notas sobre el servicio..."
                        oninput="updateServiceNotes(this.value)"
                    >${notes || ""}</textarea>
                </div>
                <div class="modal-footer">
                    ${notes ? `
                        <button class="clear-btn delete-btn" onclick="clearServiceNotes()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 4px;">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Borrar notas
                        </button>
                    ` : ''}
                    <button class="clear-btn" onclick="closeServiceNotes()">Cerrar</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Genera el modal README/Guía
 * @param {string} markdownContent - Contenido en Markdown
 * @param {Function} parseMarkdown - Función para parsear Markdown
 * @returns {string} HTML del modal
 */
async function generateReadmeModal(parseMarkdown) {
    // Cargar contenido desde archivo
    let readmeContent = '';
    try {
        const response = await fetch('templates/readme-content.html');
        if (response.ok) {
            readmeContent = await response.text();
        }
    } catch (error) {
        console.error('Error cargando README:', error);
        // Fallback al contenido inline si falla la carga
        readmeContent = `# Error\n\nNo se pudo cargar el contenido de la guía.`;
    }

    return `
        <div class="modal-overlay readme-overlay" onclick="closeReadmeModal(event)">
            <div class="modal readme-modal" onclick="event.stopPropagation()">
                <div class="modal-header readme-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">📖 Guía de uso</h3>
                        <button class="close-btn" onclick="closeReadmeModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="readme-content" id="readme-content">
                    ${parseMarkdown(readmeContent)}
                </div>
            </div>
        </div>
    `;
}

// Exportar funciones al scope global
window.Templates = {
    generateHeaderTemplate,
    generateMoreOptionsMenu,
    generateAboutModal,
    generateManualTecnicoModal,
    generateServiceNotesModal,
    generateReadmeModal
};
