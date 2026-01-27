// ============================================================================
// ROUTE-WIZARD.JS - Asistente para crear/editar rutas personalizadas
// ============================================================================

/**
 * RouteWizard - Sistema de wizard para crear y editar rutas de tren
 * Utiliza WizardCore como base
 */
const RouteWizard = {
    /**
     * Abre el wizard de ruta
     * @param {Object} options - Opciones del wizard
     * @param {string} options.mode - 'create' o 'edit'
     * @param {Object} options.route - Ruta existente (solo en modo edición)
     * @param {Array} options.availableStops - Paradas disponibles del sistema
     * @param {Function} options.onComplete - Callback al completar
     * @param {Function} options.onCancel - Callback al cancelar
     */
    open(options = {}) {
        console.log('[RouteWizard] Abriendo wizard con opciones:', options);

        const mode = options.mode || 'create';
        const existingRoute = options.route || null;
        const availableStops = options.availableStops || [];

        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'wizard-overlay';
        overlay.id = 'route-wizard-overlay';

        // Definir pasos del wizard
        const steps = [
            {
                title: 'Número de Tren',
                description: 'Introduce el número identificador del tren',
                render: (data) => this.renderStep1_BasicInfo(data, mode, existingRoute),
                validate: (data) => this.validateStep1(data, mode, existingRoute),
                onNext: (data) => this.onStep1Next(data)
            },
            {
                title: 'Paradas',
                description: 'Configura las paradas del trayecto',
                render: (data) => this.renderStep2_Stops(data, availableStops, mode, existingRoute),
                validate: (data) => this.validateStep2(data),
                onNext: (data) => this.onStep2Next(data)
            },
            {
                title: 'Destino Final',
                description: 'Selecciona el destino final del trayecto',
                render: (data) => this.renderStep3_Destination(data),
                validate: (data) => this.validateStep3(data),
                onNext: (data) => this.onStep3Next(data)
            },
            {
                title: 'Vista Previa',
                description: 'Revisa la configuración antes de guardar',
                render: (data) => this.renderStep4_Preview(data),
                validate: () => true,
                showTitle: false
            }
        ];

        // Configuración del wizard
        const wizardConfig = {
            title: mode === 'edit' ? 'Editar Ruta' : 'Crear Nueva Ruta',
            steps: steps,
            onComplete: (data) => {
                console.log('[RouteWizard] Wizard completado con datos:', data);
                this.saveRoute(data, mode, existingRoute);
                document.body.removeChild(overlay);
                if (options.onComplete) {
                    options.onComplete(data);
                }
            },
            onCancel: () => {
                console.log('[RouteWizard] Wizard cancelado');
                document.body.removeChild(overlay);
                if (options.onCancel) {
                    options.onCancel();
                }
            }
        };

        // Crear wizard usando WizardCore
        const wizardContainer = window.WizardCore.create(wizardConfig);
        overlay.appendChild(wizardContainer);
        document.body.appendChild(overlay);

        console.log('[RouteWizard] Wizard renderizado en el DOM');
    },

    // ========================================================================
    // PASO 1: INFORMACIÓN BÁSICA (NÚMERO DE TREN)
    // ========================================================================

    renderStep1_BasicInfo(data, mode, existingRoute) {
        const container = document.createElement('div');
        container.className = 'wizard-form';

        // Inicializar datos si es edición
        if (mode === 'edit' && existingRoute && !data.trainNumber) {
            data.trainNumber = existingRoute.trainNumber;
        }

        // Campo: Número de Tren
        const trainNumberGroup = document.createElement('div');
        trainNumberGroup.className = 'form-group';

        const trainNumberLabel = document.createElement('label');
        trainNumberLabel.textContent = 'Número de Tren';
        trainNumberLabel.className = 'form-label required';
        trainNumberGroup.appendChild(trainNumberLabel);

        const trainNumberInput = document.createElement('input');
        trainNumberInput.type = 'text';
        trainNumberInput.className = 'form-input';
        trainNumberInput.id = 'route-train-number';
        trainNumberInput.placeholder = 'Ej: 99001, R-123';
        trainNumberInput.value = data.trainNumber || '';
        trainNumberInput.disabled = mode === 'edit'; // No permitir cambiar número en edición

        trainNumberInput.addEventListener('input', (e) => {
            data.trainNumber = e.target.value.trim();
        });

        trainNumberGroup.appendChild(trainNumberInput);

        // Ayuda
        const helpText = document.createElement('div');
        helpText.className = 'form-help';
        helpText.textContent = mode === 'edit'
            ? 'El número de tren no se puede modificar en modo edición'
            : 'Usa números entre 90000-99999 para rutas personalizadas';
        trainNumberGroup.appendChild(helpText);

        container.appendChild(trainNumberGroup);

        return container;
    },

    validateStep1(data, mode, existingRoute) {
        if (!data.trainNumber || data.trainNumber.trim() === '') {
            return 'Por favor, introduce un número de tren';
        }

        // Validar duplicados (solo en modo creación)
        if (mode === 'create') {
            const existingRoutes = window.ConfigurationManager.getUserRoutes();
            if (existingRoutes[data.trainNumber]) {
                return `Ya existe una ruta con el número ${data.trainNumber}`;
            }

            // Validar contra rutas del sistema
            const systemRoutes = window.appData?.trainRoutes || {};
            if (systemRoutes[data.trainNumber]) {
                return `Ya existe una ruta del sistema con el número ${data.trainNumber}`;
            }
        }

        return true;
    },

    onStep1Next(data) {
        console.log('[RouteWizard] Paso 1 completado:', data);
    },

    // ========================================================================
    // PASO 2: CONFIGURACIÓN DE PARADAS
    // ========================================================================

    renderStep2_Stops(data, availableStops, mode, existingRoute) {
        const container = document.createElement('div');
        container.className = 'wizard-form stops-editor';

        // Inicializar paradas si no existen
        if (!data.stops || !Array.isArray(data.stops)) {
            // Si es modo edición y existe la ruta, cargar sus paradas
            if (mode === 'edit' && existingRoute && existingRoute.stops) {
                data.stops = [...existingRoute.stops]; // Clonar el array
            } else {
                data.stops = [];
            }
        }

        // Contenedor de la lista de paradas
        const stopsListContainer = document.createElement('div');
        stopsListContainer.className = 'stops-list-container';

        const stopsListTitle = document.createElement('h3');
        stopsListTitle.textContent = 'Paradas del Trayecto';
        stopsListTitle.className = 'stops-list-title';
        stopsListContainer.appendChild(stopsListTitle);

        const stopsList = document.createElement('div');
        stopsList.className = 'stops-list';
        stopsList.id = 'route-stops-list';
        stopsListContainer.appendChild(stopsList);

        // Contenedor para agregar parada
        const addStopContainer = document.createElement('div');
        addStopContainer.className = 'add-stop-container';

        const addStopInput = document.createElement('input');
        addStopInput.type = 'text';
        addStopInput.className = 'form-input';
        addStopInput.id = 'add-stop-input';
        addStopInput.placeholder = 'Buscar por nombre, código ADIF o escribir nueva...';

        // Contenedor de sugerencias
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'autocomplete-suggestions';
        suggestionsContainer.id = 'stop-suggestions';
        suggestionsContainer.style.display = 'none';

        // Botón para agregar parada personalizada
        const addCustomStopBtn = document.createElement('button');
        addCustomStopBtn.type = 'button';
        addCustomStopBtn.className = 'wizard-btn wizard-btn-secondary';
        addCustomStopBtn.textContent = 'Agregar Parada Nueva';
        addCustomStopBtn.style.marginLeft = '10px';
        addCustomStopBtn.addEventListener('click', () => {
            const stopName = addStopInput.value.trim();
            if (stopName) {
                this.addStopToList(data, stopName, stopsList, true);
                addStopInput.value = '';
                suggestionsContainer.style.display = 'none';
            }
        });

        addStopContainer.appendChild(addStopInput);
        addStopContainer.appendChild(addCustomStopBtn);
        addStopContainer.appendChild(suggestionsContainer);

        // Autocompletado (búsqueda en stops locales + estaciones ADIF)
        addStopInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();

            if (query.length < 1) {
                suggestionsContainer.style.display = 'none';
                return;
            }

            // Buscar en paradas locales (stops.json)
            const allStops = window.ConfigurationManager.getAllStops(availableStops);
            const localMatches = allStops.filter(stop =>
                stop.full.toLowerCase().includes(query) ||
                stop.abbr.toLowerCase().includes(query)
            ).map(stop => ({
                ...stop,
                source: 'local'
            }));

            // Buscar en estaciones ADIF (por código o nombre)
            let adifMatches = [];
            if (window.adifStations) {
                const adifArray = Object.values(window.adifStations);
                adifMatches = adifArray.filter(station => {
                    const nameMatch = station.name.toLowerCase().includes(query);
                    const codeMatch = station.code.includes(query);
                    return nameMatch || codeMatch;
                }).map(station => ({
                    full: station.name,
                    abbr: station.code,
                    adifCode: station.code,
                    screenCode: station.screenCode,
                    source: 'adif'
                }));
            }

            // Combinar resultados (primero locales, luego ADIF)
            const allMatches = [...localMatches, ...adifMatches];

            if (allMatches.length > 0) {
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'block';

                allMatches.slice(0, 8).forEach(stop => {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'autocomplete-suggestion';

                    // Badge para indicar origen
                    const badge = stop.source === 'adif'
                        ? `<span class="source-badge adif-badge">ADIF</span>`
                        : '';

                    // Badge para indicar si tiene pantalla
                    const screenBadge = stop.screenCode
                        ? `<span class="source-badge screen-badge">📺</span>`
                        : '';

                    suggestion.innerHTML = `
                        <span class="stop-full">${stop.full}</span>
                        <span class="stop-abbr">${stop.abbr}</span>
                        ${badge}${screenBadge}
                    `;
                    suggestion.addEventListener('click', () => {
                        // Guardar código ADIF si es una estación ADIF
                        const stopIdentifier = stop.adifCode || stop.full;
                        this.addStopToList(data, stopIdentifier, stopsList, false, stop);
                        addStopInput.value = '';
                        suggestionsContainer.style.display = 'none';
                    });
                    suggestionsContainer.appendChild(suggestion);
                });
            } else {
                suggestionsContainer.style.display = 'none';
            }
        });

        // Cerrar sugerencias al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!addStopContainer.contains(e.target)) {
                suggestionsContainer.style.display = 'none';
            }
        });

        container.appendChild(stopsListContainer);
        container.appendChild(addStopContainer);

        // Renderizar paradas existentes
        this.renderStopsList(data, stopsList);

        // Ayuda
        const helpText = document.createElement('div');
        helpText.className = 'form-help';
        helpText.style.marginTop = '20px';
        helpText.innerHTML = `
            💡 <strong>Consejos:</strong><br>
            • Arrastra las paradas para reordenarlas<br>
            • Necesitas al menos 2 paradas para crear una ruta<br>
            • Puedes agregar paradas existentes o crear nuevas
        `;
        container.appendChild(helpText);

        return container;
    },

    /**
     * Agrega una parada a la lista
     */
    addStopToList(data, stopIdentifier, stopsList, isNew, stopData = null) {
        if (!stopIdentifier) return;

        // Evitar duplicados (comparar por identificador que puede ser nombre o código ADIF)
        if (data.stops.includes(stopIdentifier)) {
            const displayName = stopData?.full || stopIdentifier;
            alert(`La parada "${displayName}" ya está en la lista`);
            return;
        }

        data.stops.push(stopIdentifier);

        // Si es estación ADIF, guardar metadata adicional para display
        if (stopData && stopData.source === 'adif') {
            if (!data.adifStopsMetadata) {
                data.adifStopsMetadata = {};
            }
            data.adifStopsMetadata[stopIdentifier] = {
                name: stopData.full,
                code: stopData.adifCode,
                screenCode: stopData.screenCode
            };
        }

        this.renderStopsList(data, stopsList);

        console.log('[RouteWizard] Parada agregada:', stopIdentifier, 'Nueva:', isNew, 'ADIF:', stopData?.source === 'adif');
    },

    /**
     * Renderiza la lista de paradas con drag & drop
     */
    renderStopsList(data, container) {
        container.innerHTML = '';

        if (data.stops.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'empty-message';
            emptyMsg.textContent = 'No hay paradas. Agrega al menos 2 paradas para continuar.';
            container.appendChild(emptyMsg);
            return;
        }

        data.stops.forEach((stopIdentifier, index) => {
            const stopItem = document.createElement('div');
            stopItem.className = 'stop-item';
            stopItem.draggable = true;
            stopItem.dataset.index = index;

            // Número de orden
            const orderNumber = document.createElement('div');
            orderNumber.className = 'stop-order';
            orderNumber.textContent = index + 1;
            stopItem.appendChild(orderNumber);

            // Icono de drag
            const dragHandle = document.createElement('div');
            dragHandle.className = 'drag-handle';
            dragHandle.innerHTML = '⋮⋮';
            stopItem.appendChild(dragHandle);

            // Nombre de la parada (resolver desde ADIF si es código)
            let displayName = stopIdentifier;
            let isAdifStation = false;
            let hasScreenCode = false;

            // Verificar si es estación ADIF con metadata guardada
            if (data.adifStopsMetadata && data.adifStopsMetadata[stopIdentifier]) {
                displayName = data.adifStopsMetadata[stopIdentifier].name;
                isAdifStation = true;
                hasScreenCode = data.adifStopsMetadata[stopIdentifier].screenCode !== null;
            }
            // Verificar si es código ADIF sin metadata (retrocompatibilidad)
            else if (window.adifStations && window.adifStations[stopIdentifier]) {
                displayName = window.adifStations[stopIdentifier].name;
                isAdifStation = true;
                hasScreenCode = window.adifStations[stopIdentifier].screenCode !== null;
            }

            const stopNameEl = document.createElement('div');
            stopNameEl.className = 'stop-name';
            stopNameEl.textContent = displayName;

            // Añadir badge ADIF si corresponde
            if (isAdifStation) {
                const adifBadge = document.createElement('span');
                adifBadge.className = 'source-badge adif-badge';
                adifBadge.textContent = 'ADIF';
                adifBadge.style.marginLeft = '8px';
                stopNameEl.appendChild(adifBadge);

                // Badge de pantalla si tiene
                if (hasScreenCode) {
                    const screenBadge = document.createElement('span');
                    screenBadge.className = 'source-badge screen-badge';
                    screenBadge.textContent = '📺';
                    screenBadge.style.marginLeft = '4px';
                    stopNameEl.appendChild(screenBadge);
                }
            }

            stopItem.appendChild(stopNameEl);

            // Etiqueta de inicio/fin
            const positionLabel = document.createElement('div');
            positionLabel.className = 'stop-position-label';
            if (index === 0) {
                positionLabel.textContent = 'INICIO';
                positionLabel.classList.add('start');
            } else if (index === data.stops.length - 1) {
                positionLabel.textContent = 'FIN';
                positionLabel.classList.add('end');
            }
            stopItem.appendChild(positionLabel);

            // Botón de eliminar
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'stop-delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.title = 'Eliminar parada';
            deleteBtn.addEventListener('click', () => {
                data.stops.splice(index, 1);
                this.renderStopsList(data, container);
            });
            stopItem.appendChild(deleteBtn);

            // Eventos de drag & drop
            stopItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', index);
                stopItem.classList.add('dragging');
            });

            stopItem.addEventListener('dragend', () => {
                stopItem.classList.remove('dragging');
            });

            stopItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const draggingItem = container.querySelector('.dragging');
                if (draggingItem && draggingItem !== stopItem) {
                    stopItem.classList.add('drag-over');
                }
            });

            stopItem.addEventListener('dragleave', () => {
                stopItem.classList.remove('drag-over');
            });

            stopItem.addEventListener('drop', (e) => {
                e.preventDefault();
                stopItem.classList.remove('drag-over');

                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                const toIndex = parseInt(stopItem.dataset.index);

                if (fromIndex !== toIndex) {
                    // Reordenar array
                    const [movedStop] = data.stops.splice(fromIndex, 1);
                    data.stops.splice(toIndex, 0, movedStop);
                    this.renderStopsList(data, container);
                }
            });

            container.appendChild(stopItem);
        });
    },

    validateStep2(data) {
        if (!data.stops || data.stops.length < 2) {
            return 'Debes agregar al menos 2 paradas para crear una ruta';
        }
        return true;
    },

    onStep2Next(data) {
        console.log('[RouteWizard] Paso 2 completado, paradas:', data.stops);
    },

    // ========================================================================
    // PASO 3: DESTINO FINAL
    // ========================================================================

    renderStep3_Destination(data) {
        const container = document.createElement('div');
        container.className = 'wizard-form';

        // Inicializar destino si no existe
        if (!data.destination && data.stops && data.stops.length > 0) {
            data.destination = data.stops[data.stops.length - 1];
        }

        const destinationGroup = document.createElement('div');
        destinationGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = 'Destino Final';
        label.className = 'form-label required';
        destinationGroup.appendChild(label);

        const select = document.createElement('select');
        select.className = 'form-select';
        select.id = 'route-destination';

        if (data.stops && data.stops.length > 0) {
            data.stops.forEach(stop => {
                const option = document.createElement('option');
                option.value = stop;
                option.textContent = stop;
                option.selected = stop === data.destination;
                select.appendChild(option);
            });
        }

        select.addEventListener('change', (e) => {
            data.destination = e.target.value;
        });

        destinationGroup.appendChild(select);

        const helpText = document.createElement('div');
        helpText.className = 'form-help';
        helpText.textContent = 'Selecciona la última parada del trayecto. Se usará para filtros de destino.';
        destinationGroup.appendChild(helpText);

        container.appendChild(destinationGroup);

        return container;
    },

    validateStep3(data) {
        if (!data.destination) {
            return 'Debes seleccionar un destino final';
        }

        if (!data.stops.includes(data.destination)) {
            return 'El destino debe estar en la lista de paradas';
        }

        return true;
    },

    onStep3Next(data) {
        console.log('[RouteWizard] Paso 3 completado, destino:', data.destination);
    },

    // ========================================================================
    // PASO 4: VISTA PREVIA
    // ========================================================================

    renderStep4_Preview(data) {
        const container = document.createElement('div');
        container.className = 'wizard-preview';

        const title = document.createElement('h2');
        title.textContent = '✓ Ruta Lista para Guardar';
        title.style.color = '#27ae60';
        title.style.marginBottom = '30px';
        container.appendChild(title);

        // Información de la ruta
        const routeInfo = document.createElement('div');
        routeInfo.className = 'preview-section';
        routeInfo.innerHTML = `
            <h3>Información de la Ruta</h3>
            <div class="preview-field">
                <span class="preview-label">Número de Tren:</span>
                <span class="preview-value">${data.trainNumber}</span>
            </div>
            <div class="preview-field">
                <span class="preview-label">Destino Final:</span>
                <span class="preview-value">${data.destination}</span>
            </div>
            <div class="preview-field">
                <span class="preview-label">Total de Paradas:</span>
                <span class="preview-value">${data.stops.length}</span>
            </div>
        `;
        container.appendChild(routeInfo);

        // Lista de paradas
        const stopsPreview = document.createElement('div');
        stopsPreview.className = 'preview-section';

        const stopsTitle = document.createElement('h3');
        stopsTitle.textContent = 'Paradas del Trayecto';
        stopsPreview.appendChild(stopsTitle);

        const stopsList = document.createElement('div');
        stopsList.className = 'preview-stops-list';

        data.stops.forEach((stopIdentifier, index) => {
            const stopItem = document.createElement('div');
            stopItem.className = 'preview-stop-item';

            const stopNumber = document.createElement('span');
            stopNumber.className = 'preview-stop-number';
            stopNumber.textContent = index + 1;
            stopItem.appendChild(stopNumber);

            // Resolver nombre si es código ADIF
            let displayName = stopIdentifier;
            if (data.adifStopsMetadata && data.adifStopsMetadata[stopIdentifier]) {
                displayName = data.adifStopsMetadata[stopIdentifier].name;
            } else if (window.adifStations && window.adifStations[stopIdentifier]) {
                displayName = window.adifStations[stopIdentifier].name;
            }

            const stopName = document.createElement('span');
            stopName.className = 'preview-stop-name';
            stopName.textContent = displayName;
            stopItem.appendChild(stopName);

            // Etiquetas especiales
            if (index === 0) {
                const badge = document.createElement('span');
                badge.className = 'preview-badge start';
                badge.textContent = 'INICIO';
                stopItem.appendChild(badge);
            } else if (index === data.stops.length - 1) {
                const badge = document.createElement('span');
                badge.className = 'preview-badge end';
                badge.textContent = 'FIN';
                stopItem.appendChild(badge);
            }

            if (displayName === data.destination || stopIdentifier === data.destination) {
                const badge = document.createElement('span');
                badge.className = 'preview-badge destination';
                badge.textContent = 'DESTINO';
                stopItem.appendChild(badge);
            }

            stopsList.appendChild(stopItem);

            // Flecha entre paradas
            if (index < data.stops.length - 1) {
                const arrow = document.createElement('div');
                arrow.className = 'preview-stop-arrow';
                arrow.textContent = '↓';
                stopsList.appendChild(arrow);
            }
        });

        stopsPreview.appendChild(stopsList);
        container.appendChild(stopsPreview);

        return container;
    },

    // ========================================================================
    // GUARDADO
    // ========================================================================

    /**
     * Guarda la ruta en ConfigurationManager
     */
    saveRoute(data, mode, existingRoute) {
        const route = {
            trainNumber: data.trainNumber,
            stops: data.stops,
            destination: data.destination,
            _isEdit: mode === 'edit'
        };

        if (mode === 'edit' && existingRoute) {
            route.createdAt = existingRoute.createdAt;
        }

        const result = window.ConfigurationManager.saveCustomRoute(route);

        if (result.success) {
            alert(`Ruta "${data.trainNumber}" guardada correctamente`);
        } else {
            alert(`Error al guardar la ruta: ${result.error}`);
        }
    }
};

// Exportar a window
window.RouteWizard = RouteWizard;
