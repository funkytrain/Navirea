// ============================================================================
// LAYOUT-PREVIEW.JS - Vista previa del layout de asientos
// ============================================================================

/**
 * Vista previa en tiempo real del layout de asientos
 */
const LayoutPreview = {
    /**
     * Crea un componente de vista previa
     * @param {Array} layout - Layout a previsualizar
     * @param {string} coachName - Nombre del coche
     * @returns {HTMLElement} Contenedor de vista previa
     */
    createPreview(layout = [], coachName = 'Coche 1') {
        const container = document.createElement('div');
        container.className = 'layout-preview';

        // Título
        const title = document.createElement('h3');
        title.className = 'layout-preview-title';
        title.textContent = 'Vista Previa';
        container.appendChild(title);

        // Contenedor del coche
        const coachContainer = document.createElement('div');
        coachContainer.className = 'layout-preview-coach';

        // Renderizar layout
        const renderedContent = this.renderLayout(layout, coachName);
        coachContainer.innerHTML = renderedContent;

        container.appendChild(coachContainer);

        return container;
    },

    /**
     * Renderiza el layout completo
     * @param {Array} layout - Array de secciones
     * @param {string} coachName - Nombre del coche
     * @returns {string} HTML renderizado
     */
    renderLayout(layout, coachName) {
        if (!layout || layout.length === 0) {
            return '<div class="layout-preview-empty">Sin contenido</div>';
        }

        let html = '';
        let doorCounter = 0;
        let wcCounter = 0;

        layout.forEach((section, index) => {
            if (section.type === 'seats') {
                html += this.renderSeatsSection(section);
            } else if (section.type === 'space') {
                html += this.renderSpace(section);
            } else if (section.type === 'door') {
                doorCounter++;
                html += this.renderDoor(section, doorCounter);
            } else if (section.type === 'pmr-bathroom') {
                html += this.renderPMRBathroom(section);
            }
        });

        return html;
    },

    /**
     * Renderiza una sección de asientos
     * @param {Object} section - Sección con positions
     * @returns {string} HTML
     */
    renderSeatsSection(section) {
        if (!section.positions || section.positions.length === 0) {
            return '';
        }

        let html = '<div class="seats-section">';

        section.positions.forEach(row => {
            if (!row || row.length === 0) return;

            html += '<div class="seat-row">';

            row.forEach((position, idx) => {
                html += this.renderPosition(position, idx);
            });

            html += '</div>';
        });

        html += '</div>';

        return html;
    },

    /**
     * Renderiza una posición individual
     * @param {*} position - Valor de la posición
     * @param {number} index - Índice en la fila
     * @returns {string} HTML
     */
    renderPosition(position, index) {
        // null = vacío
        if (position === null || position === undefined) {
            return '<div class="seat-empty"></div>';
        }

        // Número = asiento
        if (typeof position === 'number') {
            return `<button class="seat" disabled>${position}</button>`;
        }

        // String = elemento especial
        if (typeof position === 'string') {
            const upper = position.toUpperCase();

            if (upper === 'WC') {
                return '<button class="seat wc" disabled>WC</button>';
            }

            if (upper === 'EQ') {
                return '<button class="seat luggage" disabled>EQ</button>';
            }

            if (upper === 'MESA') {
                return '<button class="seat table" disabled>MESA</button>';
            }

            if (upper === 'PMR') {
                return '<button class="seat pmr" disabled>PMR</button>';
            }

            if (upper === 'MIN') {
                return '<button class="seat wheelchair" disabled>MIN</button>';
            }

            // Otro string genérico
            return `<button class="seat custom" disabled>${position}</button>`;
        }

        // Objeto desconocido
        return '<div class="seat-unknown">?</div>';
    },

    /**
     * Renderiza un espacio
     * @param {Object} section - Sección space
     * @returns {string} HTML
     */
    renderSpace(section) {
        const height = section.height || 80;
        return `<div class="space" style="height: ${height}px"></div>`;
    },

    /**
     * Renderiza una puerta
     * @param {Object} section - Sección door
     * @param {number} doorNumber - Número de puerta
     * @returns {string} HTML
     */
    renderDoor(section, doorNumber) {
        const height = section.height || 120;
        return `
            <div class="door-space" style="height: ${height}px">
                <button class="door-side door-left" disabled>
                    <span class="door-label">P${doorNumber}</span>
                </button>
                <div class="door-center"></div>
                <button class="door-side door-right" disabled>
                    <span class="door-label">P${doorNumber}</span>
                </button>
            </div>
        `;
    },

    /**
     * Renderiza un baño PMR
     * @param {Object} section - Sección pmr-bathroom
     * @returns {string} HTML
     */
    renderPMRBathroom(section) {
        const height = section.height || 100;
        const label = section.label || 'BAÑO PMR';
        return `
            <button class="pmr-bathroom" style="height: ${height}px" disabled>
                ${label}
            </button>
        `;
    },

    /**
     * Actualiza una vista previa existente
     * @param {HTMLElement} previewElement - Elemento de vista previa
     * @param {Array} layout - Nuevo layout
     * @param {string} coachName - Nombre del coche
     */
    updatePreview(previewElement, layout, coachName) {
        const coachContainer = previewElement.querySelector('.layout-preview-coach');
        if (!coachContainer) return;

        const renderedContent = this.renderLayout(layout, coachName);
        coachContainer.innerHTML = renderedContent;
    },

    /**
     * Valida un layout y retorna información
     * @param {Array} layout - Layout a validar
     * @returns {Object} { valid, errors, stats }
     */
    validateLayout(layout) {
        const errors = [];
        const stats = {
            totalSeats: 0,
            specialElements: 0,
            emptyPositions: 0,
            rows: 0,
            spaces: 0,
            doors: 0
        };

        if (!layout || !Array.isArray(layout)) {
            errors.push('Layout debe ser un array');
            return { valid: false, errors, stats };
        }

        layout.forEach((section, index) => {
            if (!section || typeof section !== 'object') {
                errors.push(`Sección ${index} es inválida`);
                return;
            }

            if (section.type === 'seats') {
                if (!section.positions || !Array.isArray(section.positions)) {
                    errors.push(`Sección ${index} de asientos sin positions válido`);
                    return;
                }

                section.positions.forEach((row, rowIndex) => {
                    if (!Array.isArray(row)) {
                        errors.push(`Fila ${rowIndex} en sección ${index} no es un array`);
                        return;
                    }

                    stats.rows++;

                    row.forEach((position, posIndex) => {
                        if (position === null || position === undefined) {
                            stats.emptyPositions++;
                        } else if (typeof position === 'number') {
                            stats.totalSeats++;
                        } else {
                            stats.specialElements++;
                        }
                    });
                });
            } else if (section.type === 'space') {
                stats.spaces++;
                if (typeof section.height !== 'number' || section.height <= 0) {
                    errors.push(`Espacio en sección ${index} tiene altura inválida`);
                }
            } else if (section.type === 'door') {
                stats.doors++;
                if (section.height && (typeof section.height !== 'number' || section.height <= 0)) {
                    errors.push(`Puerta en sección ${index} tiene altura inválida`);
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors,
            stats
        };
    }
};

// Exportar a window
window.LayoutPreview = LayoutPreview;
