// ============================================
// CARGA DE DATOS DESDE JSON
// ============================================
let trainModels = {};
let stops = [];
let trainNumbers = {};
let trainRoutes = {};
let stationScreens = {};

// Helper para verificar si los datos están cargados
function isDataLoaded() {
    return Object.keys(trainModels).length > 0 &&
           stops.length > 0 &&
           Object.keys(trainNumbers).length > 0;
}

// Función para cargar datos JSON
async function loadJSONData() {
    try {
        // Usar DataLoader que fusiona configuraciones del sistema + custom
        const data = await window.DataLoader.loadAllData();

        trainModels = data.trainModels;
        stops = data.stops;
        trainNumbers = data.trainNumbers;
        trainRoutes = data.trainRoutes;
        stationScreens = data.stationScreens;

        console.log('✅ Datos cargados correctamente desde JSON');
        console.log('📊 Trenes disponibles:', Object.keys(trainModels));
        console.log('📍 Paradas cargadas:', stops.length);
        return true;
    } catch (error) {
        console.error('❌ Error cargando datos JSON:', error);
        return false;
    }
}

// Función para determinar si un coche es el primero o último visualmente
function getCoachPosition(coachId) {
    // Verificar si ya está en cache
    if (state.coachPositions && state.coachPositions[coachId]) {
        return state.coachPositions[coachId];
    }

    const currentTrain = trainModels[state.selectedTrain];
    if (!currentTrain || !currentTrain.coaches) {
        return { isFirst: false, isLast: false };
    }

    const coaches = currentTrain.coaches;
    const index = coaches.findIndex(c => c.id === coachId);

    const result = {
        isFirst: index === 0,
        isLast: index === coaches.length - 1
    };

    // Guardar en cache
    if (!state.coachPositions) {
        state.coachPositions = {};
    }
    state.coachPositions[coachId] = result;

    return result;
}

// Función para obtener la etiqueta de cabina según dirección
function getCabinaLabel(coachId) {
    const direction = state.trainDirection[coachId] || "up";
    const position = getCoachPosition(coachId);

    // Con flecha hacia arriba: CABEZA al inicio, COLA al final
    // Con flecha hacia abajo: COLA al inicio, CABEZA al final
    if (direction === "up") {
        if (position.isFirst) return "CABEZA";
        if (position.isLast) return "COLA";
    } else {
        if (position.isFirst) return "COLA";
        if (position.isLast) return "CABEZA";
    }

    return "CABINA"; // fallback (no debería usarse)
}

// Función para obtener el símbolo de flecha del pasillo
function getAisleArrow(coachId) {
    const direction = state.trainDirection[coachId] || "up";
    const isRotated = state.rotateSeats;

    // Si está rotado, invertimos la flecha visualmente
    if (isRotated) {
        return direction === "up" ? "↓" : "↑";
    }

    return direction === "up" ? "↑" : "↓";
}

// Obtener paradas disponibles para filtrar
// ============================================
// FUNCIONES DE FILTROS
// ============================================
// (Ahora definidas en src/features/filters.js y exportadas a window)

function toggleCopyMode() {
    state.copyMode = !state.copyMode;

    let bannerText = state.copyMode ? "Copiado activado" : "Copiado desactivado";

    // Si está activando y hay datos copiados, mostrar resumen
    if (state.copyMode && lastCopiedSeatData) {
        const stopName = lastCopiedSeatData.stop ? lastCopiedSeatData.stop.abbr : "?";
        const flags = [];
        if (lastCopiedSeatData.enlace) flags.push("Enlace");
        if (lastCopiedSeatData.seguir) flags.push("Seguir");
        if (lastCopiedSeatData.comentarioFlag) flags.push("Comentario");

        const flagsText = flags.length > 0 ? ` (${flags.join(", ")})` : "";
        bannerText = `Copiado: ${stopName}${flagsText}`;
    }

    showCopyBanner(bannerText);
    render();
}

function showCopyBanner(text) {
    const banner = document.createElement("div");
    banner.className = "copy-banner";
    banner.textContent = text;
    document.body.appendChild(banner);

    setTimeout(() => banner.classList.add("show"), 10);
    setTimeout(() => banner.classList.remove("show"), 900);
    setTimeout(() => banner.remove(), 1200);
}

// Estado de la aplicación
let state = {
    selectedTrain: "463",
    selectedCoach: "C1",
    seatData: {},
    selectedSeat: null,
    searchQuery: "",
    trainDirection: {},
    darkMode: false,
    trainNumber: null,
    rotateSeats: false,
    currentStop: null,
    currentStopSearch: '',
    headerCollapsed: false,
    coachPositions: {},
    copyMode: false,
    serviceNotes: "",
    incidents: {},
    customTrains: {},
    coach470Variants: {
        "C1": "A",
        "C2": "A",
        "C3": "A"
    }
};

let isModalOpen = false;

// Obtener todos los trenes (predeterminados + personalizados)
function getAllTrains() {
    return { ...trainModels, ...state.customTrains };
}

let _currentScreen = "arrivals";
// Variables para doble tap en botones de coche 470
let coachTapTimer = null;
let coachLastTapTime = 0;
let coachLastTappedId = null;
// Última información copiada (para el modo copiar) - ahora copia TODO
let lastCopiedSeatData = null;

// Estado para filtros
let filterState = {
    active: false,
    type: null, // 'stop', 'route', 'seat'
    data: null
};

// Variables para long tap en asientos
let seatHoldTimer = null;
let seatHoldTriggered = false;
// Variables para detectar scroll vs tap
let touchStartX = 0;
let touchStartY = 0;
let isScrolling = false;

// Variables para mantener scroll del modal
// NOTA: También existe en src/utils/modal-helpers.js pero se necesita aquí
let modalScrollPosition = 0;

// Obtener clave del asiento
function getSeatKey(coachId, seatNum) {
    // 🔴 NUEVO: Para el 470, incluir la variante en la key
    if (state.selectedTrain === "470") {
        const variant = state.coach470Variants[coachId] || "A";
        return `${coachId}-${variant}-${String(seatNum)}`;
    }
    return `${coachId}-${String(seatNum)}`;
}

// Obtener layout del coche actual (con soporte para variantes del 470)
function getCurrentCoachLayout(coach) {
    if (state.selectedTrain === "470" && coach.variants) {
        const variant = state.coach470Variants[coach.id] || "A";
        return coach.variants[variant].layout;
    }
    return coach.layout;
}

function updateSeat(coachId, seatNum, stop) {
    const key = getSeatKey(coachId, String(seatNum));

    if (!state.seatData[key]) {
        state.seatData[key] = {};
    }

    // Guardar la parada en el asiento
    state.seatData[key].stop = stop;

    // 🔴 NUEVO: Guardar TODA la información del asiento (no solo la parada)
    lastCopiedSeatData = {
        stop: stop,
        enlace: state.seatData[key].enlace || false,
        seguir: state.seatData[key].seguir || false,
        comentarioFlag: state.seatData[key].comentarioFlag || false,
        comentario: state.seatData[key].comentario || ""
    };
    state.lastCopiedSeatData = { ...lastCopiedSeatData };

    saveData();

    // Cerrar modal
    state.selectedSeat = null;
    state.searchQuery = "";

    // IMPORTANTE: Guardar scroll ANTES de unlock
    const scrollToRestore = savedScrollPosition;

    unlockBodyScroll();
    render();

    // Restaurar el scroll que teníamos guardado del modal
    requestAnimationFrame(() => {
        window.scrollTo(0, scrollToRestore);
    });
}

function updateSeatFromList(abbr) {
    const stop = stops.find((s) => s.abbr === abbr);
    if (stop && state.selectedSeat) {
        updateSeat(state.selectedSeat.coach, state.selectedSeat.num, stop);

        // ❌ NO usar closeModal() (provoca scroll)
        // ✅ Cerrar modal sin mover pantalla
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();

        // Quitar estado del seat seleccionado
        state.selectedSeat = null;
    }
}

// Borrar asiento
function clearSeat(coachId, seatNum) {
    const key = getSeatKey(coachId, String(seatNum));
    const seatInfo = state.seatData[key];

    if (seatInfo) {
        // 🔴 NUEVO: Añadir parada actual al historial antes de borrar
        if (seatInfo.stop && seatInfo.stop.full) {
            if (!seatInfo.historial) {
                seatInfo.historial = [];
            }
            // Evitar duplicados
            if (!seatInfo.historial.includes(seatInfo.stop.full)) {
                seatInfo.historial.push(seatInfo.stop.full);
            }
        }

        // Borrar parada, flags y comentarios
        delete seatInfo.stop;
        delete seatInfo.enlace;
        delete seatInfo.seguir;
        delete seatInfo.comentarioFlag;
        delete seatInfo.comentario;

        // Si no queda historial, eliminar la key completamente
        if (!seatInfo.historial || seatInfo.historial.length === 0) {
            delete state.seatData[key];
        }
    }

// Capturar scroll antes de operaciones
    const scrollBeforeClear = window.scrollY || document.documentElement.scrollTop;

    saveData();
    state.selectedSeat = null;
    unlockBodyScroll();
    render();

// Restaurar scroll después
    requestAnimationFrame(() => {
        window.scrollTo(0, scrollBeforeClear);
    });

// Restaurar scroll DESPUÉS de render
    requestAnimationFrame(() => {
        window.scrollTo(0, currentScroll);
    });
}

function toggleFlag(coachId, seatNum, flagName) {
    const key = getSeatKey(coachId, seatNum);
    if (!state.seatData[key]) {
        state.seatData[key] = {};
    }
    state.seatData[key][flagName] = !state.seatData[key][flagName];

// Si desmarca comentarioFlag, borrar el comentario
    if (flagName === "comentarioFlag" && !state.seatData[key][flagName]) {
        delete state.seatData[key].comentario;
    }

    saveData();

// NO renderizar si estamos en medio de un long press
    if (seatHoldTimer) {
        return;
    }

    // 🔴 NUEVO: Si estamos en modo copia, actualizar la información copiada
    if (state.copyMode && lastCopiedSeatData) {
        lastCopiedSeatData[flagName] = state.seatData[key][flagName];
        state.lastCopiedSeatData = { ...lastCopiedSeatData };
    }

    saveData();
// Si hay modal abierto, guardar su scroll
    if (state.selectedSeat) {
        saveModalScrollPosition();
    } else {
        // Si no hay modal, guardar scroll de página
        const pageScroll = window.scrollY || document.documentElement.scrollTop;
        window._pageScrollBeforeRender = pageScroll;
    }

    render();

// Restaurar scroll apropiado
    if (state.selectedSeat) {
        restoreModalScrollPosition();
    } else if (window._pageScrollBeforeRender !== undefined) {
        requestAnimationFrame(() => {
            window.scrollTo(0, window._pageScrollBeforeRender);
        });
    }
}

function updateComment(coachId, seatNum, comment) {
    const key = getSeatKey(coachId, seatNum);
    if (!state.seatData[key]) {
        state.seatData[key] = {};
    }
    state.seatData[key].comentario = comment;

    // 🔴 NUEVO: Si estamos en modo copia, actualizar la información copiada
    if (state.copyMode && lastCopiedSeatData) {
        lastCopiedSeatData.comentario = comment;
        state.lastCopiedSeatData = { ...lastCopiedSeatData };
    }

    saveData();
}

function deleteComment(coachId, seatNum) {
    const key = getSeatKey(coachId, seatNum);
    if (state.seatData[key]) {
        delete state.seatData[key].comentario;
        state.seatData[key].comentarioFlag = false;
    }
    saveData();

    // Guardar posición del scroll antes de renderizar
    saveModalScrollPosition();
    render();
    // Restaurar posición del scroll después de renderizar
    restoreModalScrollPosition();
}

function toggleDirection(coachId) {
    // Obtener dirección actual del coche seleccionado
    const current = state.trainDirection[coachId] || "up";
    const newDirection = current === "up" ? "down" : "up";

    // Aplicar la misma dirección a TODOS los coches del tren actual
    const currentTrain = trainModels[state.selectedTrain];
    currentTrain.coaches.forEach(coach => {
        state.trainDirection[coach.id] = newDirection;
    });

    saveTrainDirection();
    render();
}

// Obtener texto del lado de la puerta según rotación
function getDoorSideText(side) {
    // side puede ser "L" (Left) o "R" (Right)
    // Si los asientos están rotados, invertimos los nombres
    if (state.rotateSeats) {
        return side === 'L' ? 'Derecha' : 'Izquierda';
    } else {
        return side === 'L' ? 'Izquierda' : 'Derecha';
    }
}

function selectTrain(trainId) {
    if (trainModels[trainId]) {
        state.selectedTrain = trainId;

        // 🔴 NUEVO: Manejar correctamente el primer coche
        const firstCoach = trainModels[trainId].coaches[0];
        state.selectedCoach = firstCoach.id;

        state.seatData = {};
        state.trainDirection = {};
        state.selectedSeat = null;
        state.searchQuery = "";
        state.coachPositions = {};
        state.incidents = {};

        localStorage.setItem("selectedTrain", trainId);

        // Cargar datos del nuevo tren
        const saved = localStorage.getItem(`train${trainId}Data`);
        if (saved) {
            try {
                state.seatData = JSON.parse(saved);
            } catch (e) {
                console.error("Error loading data");
            }
        }

        const savedDirection = localStorage.getItem(`train${trainId}Direction`);
        if (savedDirection) {
            try {
                state.trainDirection = JSON.parse(savedDirection);
            } catch (e) {
                console.error("Error loading direction");
            }
        }

// 🔴 NUEVO: Cargar variantes del 470 si es ese tren
        if (trainId === "470") {
            const saved470Variants = localStorage.getItem('coach470Variants');
            if (saved470Variants) {
                try {
                    state.coach470Variants = JSON.parse(saved470Variants);
                } catch (e) {
                    console.error("Error loading 470 variants");
                    // Valores por defecto si hay error
                    state.coach470Variants = {
                        "C1": "A",
                        "C2": "A",
                        "C3": "A"
                    };
                }
            } else {
                // Inicializar con valores por defecto
                state.coach470Variants = {
                    "C1": "A",
                    "C2": "A",
                    "C3": "A"
                };
            }

            // 🔴 NUEVO: Migrar datos antiguos sin variante a formato con variante
            const newSeatData = {};
            Object.keys(state.seatData).forEach(key => {
                // Si la key no tiene variante (formato antiguo: C1-12)
                if (key.match(/^C\d+-\d+/) || key.match(/^C\d+-[A-Z0-9]+$/)) {
                    const parts = key.split('-');
                    if (parts.length === 2) {
                        const [coach, seat] = parts;
                        // Migrar a variante A por defecto
                        const newKey = `${coach}-A-${seat}`;
                        newSeatData[newKey] = state.seatData[key];
                    } else {
                        // Ya tiene formato con variante
                        newSeatData[key] = state.seatData[key];
                    }
                } else {
                    // Mantener otras keys sin cambios
                    newSeatData[key] = state.seatData[key];
                }
            });
            state.seatData = newSeatData;
            saveData(); // Guardar la migración
        }

        render();
    }
    // Reiniciar backup automático para el nuevo tren
    startAutoBackup();
    // Cerrar el menú después de cambiar de tren
    setTimeout(() => {
        const selector = document.getElementById('train-selector');
        if (selector && !selector.classList.contains('hidden')) {
            selector.classList.add('hidden');
        }
    }, 50);
}

function toggleTrainSelector() {
    const selector = document.getElementById("train-selector");
    if (selector) {
        selector.classList.toggle("hidden");
    }
}

function openConfigurationManager() {
    // Cerrar el selector de trenes
    const selector = document.getElementById("train-selector");
    if (selector) {
        selector.classList.add("hidden");
    }

    // Abrir el gestor de configuraciones
    if (window.ConfigurationManagerUI) {
        window.ConfigurationManagerUI.open();
    } else {
        alert('El gestor de configuraciones no está disponible');
    }
}

function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    saveDarkMode();
    document.body.classList.toggle("dark-mode", state.darkMode);
    render(); // 🔥 Esto vuelve a pintar el header con el nuevo icono
}

function toggleSeatRotation() {
    // Cambiar el estado
    state.rotateSeats = !state.rotateSeats;
    saveSeatRotation();

    // Aplicar o quitar clase visual
    const container = document.querySelector('.seats-container');
    if (container) {
        container.classList.toggle('rotated', state.rotateSeats);
    }

    // Volver a renderizar (esto actualizará las flechas)
    render();
}

function showTrainNumberPrompt() {
    const currentNumber = state.trainNumber || '';
    const input = prompt('Introduce el número de tren:', currentNumber);

    if (input === null) return; // canceló

    const trimmed = input.trim();
    if (trimmed === '') {
        alert('Por favor, introduce un número de tren válido');
        return;
    }

    // Si el número es distinto del actual, mostrar confirmación
    if (trimmed !== state.trainNumber) {
        // Verificar si está en la lista
        const isKnown = trainNumbers[trimmed];

        let confirmMessage = `¿Cambiar al tren número ${trimmed}?\n\n`;
        confirmMessage += '⚠️ ESTO BORRARÁ:\n';
        confirmMessage += '• Todos los asientos registrados\n';
        confirmMessage += '• Notas del servicio\n';
        confirmMessage += '• Incidencias\n';
        confirmMessage += '• Parada actual\n';
        confirmMessage += '• Direcciones del tren\n';
        confirmMessage += '• Backups automáticos\n\n';

        if (!isKnown) {
            confirmMessage += '⚠️ Este número no está en la lista.\n';
            confirmMessage += '(No se aplicará esquina doblada automáticamente)\n\n';
        }

        confirmMessage += '¿Continuar?';

        if (!confirm(confirmMessage)) return;

        // --- BORRAR TODOS LOS DATOS ---
        state.seatData = {};
        state.trainDirection = {};
        state.serviceNotes = "";
        state.incidents = {};
        state.currentStop = null; // 👈 BORRAR PARADA ACTUAL
        lastCopiedSeatData = null;
        state.lastCopiedSeatData = null;

        // Eliminar de localStorage
        clearCurrentTrainData();

        // Guardar estado limpio
        saveData();
    }

    // Actualizar número de tren
    state.trainNumber = trimmed;
    saveTrainNumber();

    // Re-renderizar
    render();
}

function getTrainFinalStops() {
    if (!state.trainNumber) return [];
    return trainNumbers[state.trainNumber] || [];
}

function applyCurrentStopChange(stopName, route, stopIndex) {
    // Guardar parada actual
    state.currentStop = stopName;
    saveCurrentStop();

    // Obtener todas las paradas hasta la actual (inclusive)
    const stopsToDelete = route.slice(0, stopIndex + 1);

    // Recorrer todos los asientos y borrar los que tengan paradas anteriores
    let deletedCount = 0;
    Object.keys(state.seatData)
        .forEach(key => {
            const seatInfo = state.seatData[key];
            if (seatInfo && seatInfo.stop) {
                if (stopsToDelete.includes(seatInfo.stop.full)) {
                    // Guardar en historial antes de borrar
                    if (!seatInfo.historial) {
                        seatInfo.historial = [];
                    }
                    // 🔴 NUEVO: Evitar duplicados en el historial
                    if (!seatInfo.historial.includes(seatInfo.stop.full)) {
                        seatInfo.historial.push(seatInfo.stop.full);
                    }

                    // Borrar parada y flags (mantener comentarios por ahora)
                    delete seatInfo.stop;
                    delete seatInfo.enlace;
                    delete seatInfo.seguir;
                    // Mantener: comentario, comentarioFlag, historial

                    deletedCount++;
                }
            }
        });

    saveData();
    state.currentStopSearch = '';
    render();

    alert(`Parada actual: ${stopName}\n${deletedCount} asiento(s) liberado(s)`);
}

function setCurrentStop(stopName) {
    if (!state.trainNumber || !trainRoutes[state.trainNumber]) {
        alert('Primero debes seleccionar un número de tren válido');
        return;
    }

    const route = trainRoutes[state.trainNumber];
    const stopIndex = route.indexOf(stopName);

    if (stopIndex === -1) {
        alert('Esta parada no está en la ruta del tren ' + state.trainNumber);
        return;
    }

    // Calcular cuántos asientos se liberarán
    const stopsToDelete = route.slice(0, stopIndex + 1);
    let seatsToDelete = 0;

    Object.keys(state.seatData).forEach(key => {
        const seatInfo = state.seatData[key];
        if (seatInfo && seatInfo.stop && stopsToDelete.includes(seatInfo.stop.full)) {
            seatsToDelete++;
        }
    });

    // Verificar si estamos yendo hacia una parada anterior
    const previousStop = state.currentStop || null;
    const isGoingBackwards = previousStop && route.indexOf(previousStop) > stopIndex;

    // Construir mensaje de confirmación
    let confirmMessage = `¿Cambiar parada actual a "${stopName}"?\n\n`;

    if (isGoingBackwards) {
        confirmMessage += `⚠️ Esta parada es ANTERIOR a la actual ("${previousStop}").\n\n`;
    }

    if (seatsToDelete > 0) {
        confirmMessage += `Se liberarán ${seatsToDelete} asiento(s) de paradas anteriores.\n\n`;
    } else {
        confirmMessage += `No se liberarán asientos.\n\n`;
    }

    confirmMessage += '¿Continuar?';

    // Mostrar confirmación SIEMPRE
    showConfirmModal(
        confirmMessage,
        () => {
            // ACEPTAR → aplicar el cambio
            applyCurrentStopChange(stopName, route, stopIndex);
        },
        () => {
            // CANCELAR → no hacer nada
            state.currentStopSearch = '';
            render();
        }
    );
}

function getCurrentRoute() {
    if (!state.trainNumber) return [];
    return trainRoutes[state.trainNumber] || [];
}

function filterCurrentStops() {
    const query = state.currentStopSearch.toLowerCase();
    const route = getCurrentRoute();
    return route.filter(stop => stop.toLowerCase()
        .includes(query));
}

function updateCurrentStopSearch(value) {
    state.currentStopSearch = value;

    // Buscar el contenedor del selector
    const container = document.querySelector('.current-stop-selector');
    if (!container) return;

    // Eliminar dropdown anterior si existe
    const oldDropdown = container.querySelector('.current-stop-dropdown');
    if (oldDropdown) {
        oldDropdown.remove();
    }

    // Si hay texto y resultados, crear nuevo dropdown
    const filtered = filterCurrentStops();
    if (value && filtered.length > 0) {
        const dropdownHTML = `
            <div class="current-stop-dropdown">
                ${filtered.slice(0, 5).map(stop => `
                    <button class="stop-option" onclick="setCurrentStop('${stop}')">
                        ${stop}
                    </button>
                `).join('')}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', dropdownHTML);
        const dd = container.querySelector('.current-stop-dropdown');
        if (dd) {
            // Bloquea propagación normal
            dd.addEventListener(
                'wheel',
                (e) => {
                    // Lógica para evitar scroll “de fuga” al llegar al borde
                    const atTop = dd.scrollTop === 0;
                    const atBottom =
                        dd.scrollHeight - dd.clientHeight === Math.ceil(dd.scrollTop);

                    if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
                        e.preventDefault();      // Evitar desplazamiento de fondo
                    }
                    e.stopPropagation();
                },
                { passive: false }
            );

            dd.addEventListener(
                'touchmove',
                (e) => {
                    const atTop = dd.scrollTop === 0;
                    const atBottom =
                        dd.scrollHeight - dd.clientHeight === Math.ceil(dd.scrollTop);

                    const touch = e.touches[0];
                    const deltaY = (dd._lastTouchY || touch.clientY) - touch.clientY;
                    dd._lastTouchY = touch.clientY;

                    if ((atTop && deltaY < 0) || (atBottom && deltaY > 0)) {
                        e.preventDefault();
                    }
                    e.stopPropagation();
                },
                { passive: false }
            );
        }


    }
}

function toggleHeaderCollapse() {
    const header = document.querySelector('.header');
    const headerMain = header?.querySelector('.header-main');

    if (!header || !headerMain) {
        // Fallback: si no encuentra los elementos, hacer render completo
        state.headerCollapsed = !state.headerCollapsed;
        saveHeaderCollapsed();
        render();
        return;
    }

    // Si está expandido, colapsar con animación
    if (!state.headerCollapsed) {
        // Obtener altura actual antes de colapsar
        const currentHeight = headerMain.scrollHeight;
        headerMain.style.height = currentHeight + 'px';

        // Forzar reflow
        headerMain.offsetHeight;

        // Agregar clase de transición
        headerMain.style.transition = 'height 0.4s ease, opacity 0.3s ease, padding 0.3s ease';
        headerMain.style.height = '0px';
        headerMain.style.opacity = '0';
        headerMain.style.paddingTop = '0';
        headerMain.style.paddingBottom = '0';
        headerMain.style.overflow = 'hidden';

        state.headerCollapsed = true;
    } else {
        // Si está colapsado, expandir con animación
        headerMain.style.transition = 'height 0.4s ease, opacity 0.3s ease, padding 0.3s ease';
        headerMain.style.overflow = 'hidden';

        // Remover restricciones temporalmente para medir
        headerMain.style.height = 'auto';
        headerMain.style.opacity = '1';
        headerMain.style.paddingTop = '';
        headerMain.style.paddingBottom = '';

        const targetHeight = headerMain.scrollHeight;

        // Volver a altura 0 para animar
        headerMain.style.height = '0px';
        headerMain.style.opacity = '0';
        headerMain.style.paddingTop = '0';
        headerMain.style.paddingBottom = '0';

        // Forzar reflow
        headerMain.offsetHeight;

        // Animar a altura completa
        headerMain.style.height = targetHeight + 'px';
        headerMain.style.opacity = '1';
        headerMain.style.paddingTop = '0.75rem';
        headerMain.style.paddingBottom = '0.75rem';

        state.headerCollapsed = false;

        // Limpiar estilos inline después de la animación
        setTimeout(() => {
            if (!state.headerCollapsed) {
                headerMain.style.height = '';
                headerMain.style.overflow = '';
            }
        }, 400);
    }

    saveHeaderCollapsed();

    // Actualizar el botón de colapsar
    const collapseBtn = header.querySelector('.header-collapse-btn');
    if (collapseBtn) {
        collapseBtn.title = state.headerCollapsed ? 'Expandir' : 'Colapsar';
        const svg = collapseBtn.querySelector('svg');
        if (svg) {
            svg.innerHTML = state.headerCollapsed ?
                '<polyline points="6 9 12 15 18 9"/>' :
                '<polyline points="18 15 12 9 6 15"/>';
        }
    }
}

function openAbout() {
    document.body.insertAdjacentHTML('beforeend', window.Templates.generateAboutModal());
    lockBodyScroll();
}

// Abrir modal de README / Guía de uso
async function openReadmeModal() {
    const modalHTML = await window.Templates.generateReadmeModal(parseMarkdown);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    lockBodyScroll();
}

// Abrir Manual Técnico embebido
function openManualTecnico() {
    document.body.insertAdjacentHTML('beforeend', window.Templates.generateManualTecnicoModal());
    lockBodyScroll();
}

// Abrir Configuration Manager
function openConfigurationManager() {
    const managerUI = new ConfigurationManagerUI();
    managerUI.onClose = () => {
        // Refrescar la interfaz para mostrar nuevas configuraciones
        render();
    };
    managerUI.render(document.body);
}

// Cerrar Manual Técnico
function closeManualTecnico(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.manual-overlay');
        if (overlay) overlay.remove();
    }

    if (!document.querySelector('.modal-overlay')) {
        unlockBodyScroll();
    }
}

// Cerrar modal de README
function closeReadmeModal(event) {
    closeGenericModal('.readme-overlay', event);
}


function closeAbout(event) {
    closeGenericModal('.about-modal', event);
}

function openServiceNotes() {
    // Resetear estado de doble tap al abrir modal
    resetCoachDoubleTap();

    document.body.insertAdjacentHTML('beforeend', window.Templates.generateServiceNotesModal(state.serviceNotes));
    lockBodyScroll();

    // Enfocar el textarea
    setTimeout(() => {
        const textarea = document.getElementById('service-notes-textarea');
        if (textarea) textarea.focus();
    }, 100);
}

function updateServiceNotes(value) {
    state.serviceNotes = value;
    saveData();

    // Actualizar header para mostrar/ocultar badge
    const headerElement = document.querySelector('.header');
    if (headerElement) {
        const notesBtn = headerElement.querySelector('[onclick="openServiceNotes()"]');
        if (notesBtn) {
            if (value && value.trim()) {
                notesBtn.classList.add('has-notes');
                if (!notesBtn.querySelector('.notes-badge')) {
                    notesBtn.insertAdjacentHTML('beforeend', '<span class="notes-badge"></span>');
                }
            } else {
                notesBtn.classList.remove('has-notes');
                const badge = notesBtn.querySelector('.notes-badge');
                if (badge) badge.remove();
            }
        }
    }
}

function clearServiceNotes() {
    if (confirm('¿Seguro que quieres borrar todas las notas del servicio?')) {
        state.serviceNotes = "";
        saveData();
        closeServiceNotes();
        render(); // Actualizar para quitar el badge
    }
}

function closeServiceNotes(event) {
    if (!event || event.target === event.currentTarget) {
        // Guardar scroll antes de cerrar
        const scrollToRestore = savedScrollPosition || 0;

        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();

        if (!document.querySelector('.modal-overlay')) {
            unlockBodyScroll();
            // Restaurar scroll a la posición guardada
            requestAnimationFrame(() => {
                window.scrollTo(0, scrollToRestore);
            });
        }
    }
}

// Obtener clave de incidencia
// Funciones de incidencias movidas a src/features/incidents.js

function exportTurn() {
    const turnData = {
        trainModel: state.selectedTrain,
        seatData: state.seatData,
        trainDirection: state.trainDirection,
        serviceNotes: state.serviceNotes || "",  // 👈 AÑADIR
        incidents: state.incidents || {},        // 👈 AÑADIR
        trainNumber: state.trainNumber || null,  // 👈 AÑADIR (útil para contexto)
        currentStop: state.currentStop || null,  // 👈 AÑADIR (útil para contexto)
        exportDate: new Date().toISOString(),
        trainName: trainModels[state.selectedTrain].name,
        // 🔴 NUEVO: Si es tren 470, incluir variantes
        ...(state.selectedTrain === "470" && {
            coach470Variants: state.coach470Variants
        })
    };

    const dataStr = JSON.stringify(turnData, null, 2);
    const dataBlob = new Blob([dataStr], {
        type: "application/json"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(dataBlob);

    const date = new Date();
    const dateStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const timeStr = `${String(date.getHours()).padStart(2, "0")}-${String(
        date.getMinutes()
    ).padStart(2, "0")}`;

    // 🔴 MEJORAR: Incluir número de tren en el nombre si existe
    const trainNumPart = state.trainNumber ? `-${state.trainNumber}` : '';
    link.download = `turno-${state.selectedTrain}${trainNumPart}-${dateStr}-${timeStr}.json`;

    link.click();

    URL.revokeObjectURL(link.href);
}

function importTurn() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const turnData = JSON.parse(event.target.result);

                // Verificar que el archivo sea válido
                if (!turnData.trainModel || !trainModels[turnData.trainModel]) {
                    alert(
                        "Archivo de turno no válido o modelo de tren no reconocido"
                    );
                    return;
                }

                // Preparar mensaje de confirmación con detalles
                const trainName = turnData.trainName || turnData.trainModel;
                const exportDate = turnData.exportDate ?
                    new Date(turnData.exportDate).toLocaleString("es-ES") :
                    "desconocida";

                const trainNum = turnData.trainNumber ? `\nNúmero de tren: ${turnData.trainNumber}` : '';
                const currentStop = turnData.currentStop ? `\nParada actual: ${turnData.currentStop}` : '';
                const notesPreview = turnData.serviceNotes ? '\n✓ Incluye notas del servicio' : '';
                const incidentsCount = turnData.incidents ? Object.keys(turnData.incidents).length : 0;
                const incidentsPreview = incidentsCount > 0 ? `\n✓ Incluye ${incidentsCount} incidencia(s)` : '';

                if (
                    confirm(
                        `¿Importar turno del ${trainName}?` +
                        `\nFecha de exportación: ${exportDate}` +
                        trainNum +
                        currentStop +
                        notesPreview +
                        incidentsPreview +
                        `\n\nEsto reemplazará los datos actuales de este tren.`
                    )
                ) {
                    // Cambiar al tren correcto si es necesario
                    if (state.selectedTrain !== turnData.trainModel) {
                        state.selectedTrain = turnData.trainModel;
                        state.selectedCoach =
                            trainModels[turnData.trainModel].coaches[0].id;
                        localStorage.setItem(
                            "selectedTrain",
                            turnData.trainModel
                        );
                    }

                    // Importar datos de asientos
                    state.seatData = turnData.seatData || {};

                    // Importar direcciones del tren
                    state.trainDirection = turnData.trainDirection || {};

                    // 🔴 NUEVO: Importar notas del servicio
                    state.serviceNotes = turnData.serviceNotes || "";

                    // 🔴 NUEVO: Importar incidencias
                    state.incidents = turnData.incidents || {};

                    // 🔴 NUEVO: Importar número de tren si existe
                    if (turnData.trainNumber) {
                        state.trainNumber = turnData.trainNumber;
                    }

                    // 🔴 NUEVO: Importar parada actual si existe
                    if (turnData.currentStop) {
                        state.currentStop = turnData.currentStop;
                    }

                    // 🔴 NUEVO: Si es tren 470, importar variantes
                    if (turnData.trainModel === "470" && turnData.coach470Variants) {
                        state.coach470Variants = turnData.coach470Variants;
                    }

                    // Guardar todo en localStorage usando función centralizada
                    saveImportedData(turnData);

                    // Recargar vista
                    render();

                    alert("Turno importado correctamente");
                }
            } catch (error) {
                alert(
                    "Error al leer el archivo. Asegúrate de que sea un archivo de turno válido."
                );
                console.error("Error importing turn:", error);
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

// Borrar todos los datos
function clearAllData() {
    if (confirm("¿Seguro que quieres borrar todos los datos?")) {
        // limpiar datos en memoria
        state.seatData = {};
        state.coachPositions = {};
        state.currentStop = null;
        state.serviceNotes = "";
        state.incidents = {};

        // guardar en localStorage
        saveData();

        // eliminar entradas específicas
        clearSeatsData();

        // refrescar UI
        render();

        alert('Todos los datos han sido borrados, incluyendo backups automáticos.');
    }
}

// Filtrar paradas
function getFilteredStops() {
    const query = state.searchQuery.toLowerCase();

    // Si hay número de tren, filtrar solo las paradas de esa ruta
    let availableStops = stops;
    if (state.trainNumber && trainRoutes[state.trainNumber]) {
        const routeStops = trainRoutes[state.trainNumber];
        availableStops = stops.filter(stop => routeStops.includes(stop.full));
    }

    const filtered = availableStops.filter(
        (stop) =>
            stop.full.toLowerCase().includes(query) ||
            stop.abbr.toLowerCase().includes(query)
    );

// Ordenar SIEMPRE siguiendo el orden de trainRoutes
    const route = trainRoutes[state.trainNumber] || [];
    filtered.sort((a, b) => {
        return route.indexOf(a.full) - route.indexOf(b.full);
    });

    return filtered;

}

// Renderizar header
function renderHeader() {
    // Verificar si los datos están cargados
    if (!isDataLoaded() || !trainModels[state.selectedTrain]) {
        return `<div class="header"><div class="header-main">Cargando datos...</div></div>`;
    }

    const currentTrain = trainModels[state.selectedTrain];

    // Calcular ocupación del tren
    const { percentage: occupancyPercentage } = getTotalTrainOccupancy();
    let occupancyClass = 'occ-low';
    if (occupancyPercentage > 80) occupancyClass = 'occ-high';
    else if (occupancyPercentage > 50) occupancyClass = 'occ-mid';

    // Generar opciones del selector de trenes (separar sistema y custom)
    const systemTrains = Object.entries(trainModels).filter(([id, train]) => !train.custom);
    const customTrains = Object.entries(trainModels).filter(([id, train]) => train.custom);

    let trainSelectorOptions = '';

    // Primero mostrar trenes del sistema
    if (systemTrains.length > 0) {
        trainSelectorOptions += systemTrains
            .map(([id, train]) => `
                <button
                    class="train-option ${state.selectedTrain === id ? "active" : ""}"
                    onclick="selectTrain('${id}'); toggleTrainSelector();"
                >
                    ${train.name}
                </button>
            `)
            .join("");
    }

    // Luego mostrar trenes personalizados con badge
    if (customTrains.length > 0) {
        trainSelectorOptions += '<div class="selector-divider"></div>';
        trainSelectorOptions += customTrains
            .map(([id, train]) => `
                <button
                    class="train-option custom ${state.selectedTrain === id ? "active" : ""}"
                    onclick="selectTrain('${id}'); toggleTrainSelector();"
                >
                    ${train.name}
                    <span class="custom-badge">PERSONALIZADO</span>
                </button>
            `)
            .join("");
    }

    // Agregar botón de gestión de configuraciones
    trainSelectorOptions += `
        <div class="selector-divider"></div>
        <button class="train-option config-manager-btn" onclick="openConfigurationManager()">
            ⚙️ Gestionar Configuraciones
        </button>
    `;

    // Generar dropdown de parada actual
    const currentStopDropdown = state.currentStopSearch && filterCurrentStops().length > 0 ? `
        <div class="current-stop-dropdown">
            ${filterCurrentStops().slice(0, 5).map(stop => `
                <button class="stop-option" onclick="setCurrentStop('${stop}')">
                    ${stop}
                </button>
            `).join('')}
        </div>
    ` : '';

    // Generar botones de coches con ocupación
    const coachButtons = currentTrain.coaches
        .map((coach) => {
            const coachId = coach.id;
            const seatKeys = Object.keys(state.seatData || {})
                .filter(k => k.startsWith(`${coachId}-`));
            const coachLayout = getCurrentCoachLayout(coach);
            const totalSeats = coachLayout
                .flatMap(block => block.type === "seats" ? block.positions : [])
                .flat()
                .filter(n => typeof n === "number").length;
            const occupiedSeats = seatKeys.filter(k => state.seatData[k]?.stop).length;
            const occPercent = totalSeats > 0
                ? Math.round((occupiedSeats / totalSeats) * 100)
                : 0;

            let occClass = "";
            if (occPercent <= 35) occClass = "occ-low";
            else if (occPercent <= 70) occClass = "occ-mid";
            else occClass = "occ-high";

            return `
    <button
        class="coach-btn ${occClass} ${state.selectedCoach === coach.id ? "active" : ""}"
        data-coach-id="${coach.id}"
    >
        ${coach.id}
    </button>`;
        })
        .join("");

    // Verificar si la ruta actual es personalizada
    const currentRoute = trainRoutes[state.trainNumber];
    const isCustomRoute = currentRoute && currentRoute.custom;

    // Usar el generador de templates
    return window.Templates.generateHeaderTemplate({
        headerCollapsed: state.headerCollapsed,
        trainName: currentTrain.name,
        trainIsCustom: currentTrain.custom,
        occupancyPercentage,
        occupancyClass,
        trainSelectorOptions,
        trainNumber: state.trainNumber,
        copyMode: state.copyMode,
        filterActive: filterState.active,
        serviceNotes: state.serviceNotes,
        incidentsCount: Object.keys(state.incidents).length,
        darkMode: state.darkMode,
        rotateSeats: state.rotateSeats,
        currentStop: state.currentStop,
        currentStopSearch: state.currentStopSearch,
        currentStopDropdown,
        hasTrainRoute: trainRoutes[state.trainNumber],
        isCustomRoute: isCustomRoute,
        coachButtons,
        collapseTitle: state.headerCollapsed ? 'Expandir' : 'Colapsar',
        collapseIcon: state.headerCollapsed ?
            '<polyline points="6 9 12 15 18 9"/>' :
            '<polyline points="18 15 12 9 6 15"/>'
    });
}

// Renderizar asientos
// Ahora usa el módulo src/renderers/seats-renderer.js
function renderSeats() {
    return renderSeatsLayout();
}

function scrollCoachToBottom() {
    const layout = document.querySelector('.seats-layout');
    if (!layout) return;

    // Fondo del bloque de asientos
    const bottom = layout.offsetTop + layout.offsetHeight;
    const target = Math.max(0, bottom - window.innerHeight);

    window.scrollTo({
        top: target,
        behavior: 'smooth'
    });
}

// Renderizar modal
function renderModal() {
    if (!state.selectedSeat) return "";

    const key = getSeatKey(state.selectedSeat.coach, state.selectedSeat.num);
    const currentStop = state.seatData[key]?.stop;
    const filteredStops = getFilteredStops();

    // Ruta completa y parada actual del tren
    const route = trainRoutes[state.trainNumber] || [];
    const currentRouteStop = state.currentStop || null;
    const currentRouteIndex = currentRouteStop ? route.indexOf(currentRouteStop) : -1;

    return `
        <div class="modal-overlay" 
             onclick="closeModal(event)"
             onmousedown="handleModalOverlayInteraction(event)"
             ontouchstart="handleModalOverlayInteraction(event)"
             ontouchend="closeModal(event)">
            <div class="modal"
                 onclick="event.stopPropagation()"
                 onmousedown="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Asiento ${
        state.selectedSeat.num
    } - ${state.selectedSeat.coach}</h3>
                    </div>
                    ${
        state.seatData[key]?.historial && state.seatData[key].historial.length > 0
            ? `
                        <div class="seat-history">
                            Asiento liberado en: ${state.seatData[key].historial.join(' → ')}
                        </div>`
            : ""
    }
                    <button class="close-btn" onclick="closeModal()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                ${
        currentStop
            ? `<div class="current-stop">Se baja en: ${currentStop.full}</div>`
            : ""
    }
                <div class="checkbox-group">
                    <div class="checkbox-item">
                        <input
                            type="checkbox"
                            id="enlace-check"
                            ${state.seatData[key]?.enlace ? "checked" : ""}
                            onchange="toggleFlag('${state.selectedSeat.coach}', '${state.selectedSeat.num}', 'enlace'); render();"
                        />
                        <label for="enlace-check">Enlace</label>
                    </div>
                    <div class="checkbox-item">
                        <input
                            type="checkbox"
                            id="comentario-check"
                            ${state.seatData[key]?.comentarioFlag ? "checked" : ""}
                            onchange="toggleFlag('${state.selectedSeat.coach}', '${state.selectedSeat.num}', 'comentarioFlag'); render();"
                        />
                        <label for="comentario-check">Comentario</label>
                    </div>
                    ${
        state.seatData[key]?.comentarioFlag
            ? `
                        <div class="comment-box">
                            <textarea
                                class="comment-input"
                                rows="3"
                                placeholder="Escribe un comentario."
                                oninput="saveModalScrollPosition(); updateComment('${state.selectedSeat.coach}', '${state.selectedSeat.num}', this.value)"
                                onfocus="saveModalScrollPosition()"
                            >${state.seatData[key]?.comentario || ""}</textarea>
                            <button class="delete-comment-btn" onclick="deleteComment('${state.selectedSeat.coach}', '${state.selectedSeat.num}')">
                                Borrar comentario
                            </button>
                        </div>
                    `
            : ""
    }
                    <div class="checkbox-item">
                        <input
                            type="checkbox"
                            id="seguir-check"
                            ${state.seatData[key]?.seguir ? "checked" : ""}
                            onchange="toggleFlag('${state.selectedSeat.coach}', '${state.selectedSeat.num}', 'seguir'); render();"
                        />
                        <label for="seguir-check">Seguir por aquí</label>
                    </div>
                </div>
                <div class="modal-search">
                    <input
                        type="text"
                        class="search-input"
                        placeholder="Buscar parada."
                        value="${state.searchQuery}"
                        oninput="updateSearch(this.value)"
                        readonly onfocus="this.removeAttribute('readonly')"
                    />
                </div>
<div class="modal-list">
    ${filteredStops
        .map((stop) => {
            const stopIndex = route.indexOf(stop.full);
            const isPassed =
                currentRouteIndex !== -1 &&
                stopIndex !== -1 &&
                stopIndex < currentRouteIndex;
            const isCurrent =
                currentRouteIndex !== -1 &&
                stopIndex === currentRouteIndex;

            return `
                <button
                    class="stop-item ${isPassed ? 'passed' : ''} ${isCurrent ? 'current' : ''}"
                    ${isCurrent ? 'id="current-stop-item"' : ''}
                    onclick="updateSeatFromList('${stop.abbr}')"
                >
                    <span class="stop-name">${stop.full}</span>
                    <span class="stop-abbr">${stop.abbr}</span>
                </button>
            `;
        })
        .join("")}
</div>

                ${
        currentStop
            ? `
                <div class="modal-footer">
                    <button class="clear-btn" onclick="clearSeat('${state.selectedSeat.coach}', '${state.selectedSeat.num}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Liberar asiento
                    </button>
                </div>
                `
            : ""
    }
            </div>
        </div>
    `;
}

// Renderizar todo
function render() {
    // --- evitar flash en modo oscuro durante el render inicial ---
    const body = document.body;
    body.style.transition = "none";

    // reactivar transición tras el primer frame (una vez pintado)
    requestAnimationFrame(() => {
        body.style.transition = "";
    });
    // Aplicar modo oscuro al body
    document.body.classList.toggle("dark-mode", state.darkMode);
    const app = document.getElementById("app");
    app.innerHTML = `
    ${renderHeader()}
    <div class="seats-container ${state.rotateSeats ? 'rotated' : ''}">
            ${renderSeats()}
            <div class="legend">
    <div class="legend-content">
        <div class="legend-item">
            <div class="legend-box free"></div>
            <span>Libre</span>
        </div>
        <div class="legend-item">
            <div class="legend-box checked"></div>
            <span>Revisado</span>
        </div>
        <div class="legend-item">
            <div class="legend-box blue"></div>
            <span>Enlace</span>
        </div>
        <div class="legend-item">
            <div class="legend-box orange"></div>
            <span>Comentario</span>
        </div>
        <div class="legend-item">
            <div class="legend-box yellow"></div>
            <span>Continuar</span>
        </div>
<div class="legend-item">
            <div class="legend-box checked final-stop-legend"></div>
            <span>Fin trayecto</span>
        </div>
<div class="direction-control">
    <button class="direction-btn-bottom" onclick="toggleDirection('${state.selectedCoach}')" title="Cambiar dirección del tren">
        <div class="direction-icon">${state.trainDirection[state.selectedCoach] === 'down' ? '↓' : '↑'}</div>
        <div class="direction-label">Dirección del tren</div>
    </button>
</div>
    </div>
</div>
        </div>
        ${renderModal()}
    `;
    // Restaurar scroll del modal si existe
    if (state.selectedSeat) {
        restoreModalScrollPosition();
    } else {
        // Si cerramos el modal, resetear la posición guardada
        modalScrollPosition = 0;
    }
}

function scrollToCurrentStop() {
    // Esperar a que el DOM esté listo
    requestAnimationFrame(() => {
        const currentStopElement = document.getElementById('current-stop-item');
        const modalList = document.querySelector('.modal-list');

        if (currentStopElement && modalList) {
            // Calcular posición para centrar el elemento
            const elementTop = currentStopElement.offsetTop;
            const elementHeight = currentStopElement.offsetHeight;
            const listHeight = modalList.clientHeight;

            // Ajuste: restar altura de ~2 elementos para subir el centrado
            const offsetAdjustment = elementHeight * 2; // Altura aproximada de 2 paradas

            // Centrar el elemento en la lista con ajuste
            const scrollPosition = elementTop - (listHeight / 2) + (elementHeight / 2) - offsetAdjustment;

            // Hacer scroll suave
            modalList.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior: 'smooth'
            });
        }
    });
}

// NOTA: También existe en src/utils/modal-helpers.js pero se necesita aquí
function saveModalScrollPosition() {
    const modalList = document.querySelector('.modal-list');
    if (modalList) {
        modalScrollPosition = modalList.scrollTop;
    }
}

function restoreModalScrollPosition() {
    // Usar requestAnimationFrame para asegurar que el DOM está actualizado
    requestAnimationFrame(() => {
        const modalList = document.querySelector('.modal-list');
        if (modalList && modalScrollPosition > 0) {
            modalList.scrollTop = modalScrollPosition;
        }
    });
}

// ========== SCROLL HELPERS MOVIDOS A src/utils/modal-helpers.js ==========
// Las funciones de scroll guards ahora se cargan desde el módulo externo

// Función helper para prevenir interacciones en overlay
function handleModalOverlayInteraction(e) {
    // Solo actuar si el click/touch es directamente en el overlay
    if (e.target.classList.contains('modal-overlay')) {
        e.preventDefault();
    }
}

// Funciones globales para eventos
function selectCoach(coachId) {
    const previousCoach = state.selectedCoach;
    state.selectedCoach = coachId;

    render();

    // Solo hacer scroll al fondo SI hemos cambiado realmente de coche
    if (previousCoach !== coachId) {
        requestAnimationFrame(() => {
            scrollCoachToBottom();
        });
    }
    // Si es el mismo coche → no tocamos el scroll (conserva la posición actual)
}

function selectSeat(coach, num) {
    // Guardar scroll actual antes de abrir modal
    savedScrollPosition = window.scrollY || document.documentElement.scrollTop;

    // 🔴 NUEVO: Copiar TODA la información del asiento
    if (state.copyMode && lastCopiedSeatData) {
        const key = getSeatKey(coach, num);
        const seatInfo = state.seatData[key];

        // Solo aplicar si el asiento está vacío (sin parada activa)
        if (!seatInfo || !seatInfo.stop) {
            // Crear o actualizar con toda la información copiada
            if (!state.seatData[key]) {
                state.seatData[key] = {};
            }

            // Copiar toda la información
            state.seatData[key].stop = lastCopiedSeatData.stop;
            state.seatData[key].enlace = lastCopiedSeatData.enlace;
            state.seatData[key].seguir = lastCopiedSeatData.seguir;
            state.seatData[key].comentarioFlag = lastCopiedSeatData.comentarioFlag;
            state.seatData[key].comentario = lastCopiedSeatData.comentario;

            saveData();
            render();
            return;
        }
    }

    state.selectedSeat = { coach, num };
    state.searchQuery = "";
    isModalOpen = true;
    lockBodyScroll();
    render();

    // Hacer scroll a la parada actual
    scrollToCurrentStop();
}

// MOVIDO A src/utils/modal-helpers.js
// Ver: setupModalListScrollGuards(), removeModalScrollGuards()
// Ver: setupModalOverlayScrollBlock(), removeModalOverlayScrollBlock()

function handleSeatPress(coach, num, event) {
    const key = getSeatKey(coach, num);
    if (filterState.active && filterState.data && !filterState.data.includes(key)) {
        return;
    }

    const seatInfo = state.seatData[key];

    // Guardar posición inicial del toque
    if (event.type === 'touchstart') {
        const touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isScrolling = false;
    } else if (event.type === 'mousedown') {
        touchStartX = event.clientX;
        touchStartY = event.clientY;
        isScrolling = false;
    }

    seatHoldTriggered = false;
    clearTimeout(seatHoldTimer);

    // Iniciar timer para long press
    seatHoldTimer = setTimeout(() => {
        if (!isScrolling) {
            const scrollBeforeLongPress = window.scrollY || document.documentElement.scrollTop;
            seatHoldTriggered = true;
            if (navigator.vibrate) navigator.vibrate(40);

            const key = getSeatKey(coach, num);
            const seatInfo = state.seatData[key];

            // 🔴 NUEVO: Verificar si tiene PARADA ACTIVA (no solo datos en general)
            const hasActiveStop = seatInfo && seatInfo.stop;

            // 🔴 Long press: solo borrar si tiene parada ACTIVA
            if (hasActiveStop) {
                // Guardar TODO lo que tenía el asiento antes de borrarlo
                const previousData = {
                    stop: seatInfo.stop ? seatInfo.stop.full : null,
                    enlace: seatInfo.enlace || false,
                    seguir: seatInfo.seguir || false,
                    comentarioFlag: seatInfo.comentarioFlag || false,
                    comentario: seatInfo.comentario || "",
                    historial: seatInfo.historial ? [...seatInfo.historial] : []
                };

                // 🔴 NUEVO: Añadir parada actual al historial antes de borrar
                if (seatInfo.stop && seatInfo.stop.full) {
                    if (!seatInfo.historial) {
                        seatInfo.historial = [];
                    }
                    // Evitar duplicados en el historial
                    if (!seatInfo.historial.includes(seatInfo.stop.full)) {
                        seatInfo.historial.push(seatInfo.stop.full);
                    }
                }

                // 🔴 NUEVO: Borrar parada, flags Y comentarios (mantener solo historial)
                delete seatInfo.stop;
                delete seatInfo.enlace;
                delete seatInfo.seguir;
                delete seatInfo.comentarioFlag;
                delete seatInfo.comentario;
                // Mantener SOLO: historial

                // 🔴 NUEVO: Si después de borrar no queda nada útil, eliminar la key
                if (!seatInfo.historial || seatInfo.historial.length === 0) {
                    delete state.seatData[key];
                }

                saveData();

// Capturar scroll antes de render
                const scrollPosition = window.scrollY || document.documentElement.scrollTop;

                render();

// Restaurar scroll después de render
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollPosition);
                });

// Guardar datos completos para deshacer
                state.undoData = {
                    coach,
                    num,
                    data: previousData
                };

                showUndoBanner(
                    `Parada eliminada: ${previousData.stop}`,
                    () => {
                        const undo = state.undoData;
                        if (!undo) return;

                        const key = getSeatKey(undo.coach, undo.num);

                        // Restaurar COMPLETO
                        state.seatData[key] = {
                            stop: undo.data.stop
                                ? stops.find(s => s.full === undo.data.stop)
                                : null,
                            enlace: undo.data.enlace,
                            seguir: undo.data.seguir,
                            comentarioFlag: undo.data.comentarioFlag,
                            comentario: undo.data.comentario,
                            historial: [...undo.data.historial]
                        };

                        saveData();
                        render();

                        state.undoData = null;
                    }
                );
            }
            else {
                // 🔴 NO tiene parada activa

                // Primero verificar si tiene SOLO checkboxes/comentario (sin parada)
                const hasOnlyMetadata = seatInfo && (
                    seatInfo.enlace ||
                    seatInfo.seguir ||
                    seatInfo.comentarioFlag ||
                    seatInfo.comentario
                );

                if (hasOnlyMetadata) {
                    // BORRAR checkboxes y comentarios
                    const previousData = {
                        enlace: seatInfo.enlace || false,
                        seguir: seatInfo.seguir || false,
                        comentarioFlag: seatInfo.comentarioFlag || false,
                        comentario: seatInfo.comentario || "",
                        historial: seatInfo.historial ? [...seatInfo.historial] : []
                    };

                    delete seatInfo.enlace;
                    delete seatInfo.seguir;
                    delete seatInfo.comentarioFlag;
                    delete seatInfo.comentario;

                    // Si no queda historial, eliminar key completa
                    if (!seatInfo.historial || seatInfo.historial.length === 0) {
                        delete state.seatData[key];
                    }

                    saveData();

                    // Capturar scroll antes de render
                    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
                    isLongPressActive = false;
                    render();
                    requestAnimationFrame(() => {
                        window.scrollTo(0, scrollPosition);
                    });

                    showUndoBanner(
                        `Información borrada del asiento ${num}`,
                        () => {
                            const key = getSeatKey(coach, num);
                            if (!state.seatData[key]) {
                                state.seatData[key] = {};
                            }
                            state.seatData[key].enlace = previousData.enlace;
                            state.seatData[key].seguir = previousData.seguir;
                            state.seatData[key].comentarioFlag = previousData.comentarioFlag;
                            state.seatData[key].comentario = previousData.comentario;
                            if (previousData.historial && previousData.historial.length > 0) {
                                state.seatData[key].historial = previousData.historial;
                            }
                            saveData();

                            const scrollPos = window.scrollY || document.documentElement.scrollTop;
                            render();
                            requestAnimationFrame(() => {
                                window.scrollTo(0, scrollPos);
                            });
                        }
                    );

                    // IMPORTANTE: Salir aquí para no continuar con asignar parada
                    return;
                }

                // Si llegamos aquí: NO tiene parada NI metadata → Asignar parada final del tren

                // 🚫 Si el modo copiado rápido está activo → copiar toda la información
                if (state.copyMode && lastCopiedSeatData) {
                    const key = getSeatKey(coach, num);

                    if (!state.seatData[key]) {
                        state.seatData[key] = {};
                    }

                    // Copiar toda la información
                    state.seatData[key].stop = lastCopiedSeatData.stop;
                    state.seatData[key].enlace = lastCopiedSeatData.enlace;
                    state.seatData[key].seguir = lastCopiedSeatData.seguir;
                    state.seatData[key].comentarioFlag = lastCopiedSeatData.comentarioFlag;
                    state.seatData[key].comentario = lastCopiedSeatData.comentario;

                    saveData();
                    render();
                    return;
                }

                // Obtener parada final del tren
                const route = state.trainNumber && trainRoutes[state.trainNumber];

                if (route && route.length > 0) {
                    let finalStopName = route[route.length - 1];

                    // Ajustes de parada efectiva
                    if (finalStopName === 'Miranda') {
                        finalStopName = 'Vitoria Gasteiz';
                    } else if (finalStopName === 'Logroño') {
                        finalStopName = 'Castejón';
                    }

                    const stopObj = stops.find(s => s.full === finalStopName);

                    if (stopObj) {
                        // Capturar scroll ANTES de cualquier operación
                        const scrollPosition = window.scrollY || document.documentElement.scrollTop;

                        // Asignar parada sin abrir modal
                        const key = getSeatKey(coach, num);

                        if (!state.seatData[key]) {
                            state.seatData[key] = {};
                        }

                        state.seatData[key].stop = stopObj;

                        // Guardar datos copiados
                        lastCopiedSeatData = {
                            stop: stopObj,
                            enlace: state.seatData[key].enlace || false,
                            seguir: state.seatData[key].seguir || false,
                            comentarioFlag: state.seatData[key].comentarioFlag || false,
                            comentario: state.seatData[key].comentario || ""
                        };
                        state.lastCopiedSeatData = { ...lastCopiedSeatData };

                        saveData();

                        if (navigator.vibrate) {
                            navigator.vibrate(30);
                        }

                        // Renderizar y restaurar scroll
                        render();
                        requestAnimationFrame(() => {
                            window.scrollTo(0, scrollPosition);
                        });
                    }
                }
            }
        }
    }, SEAT_LONG_PRESS_DURATION);
}

function handleSeatMove(coach, num, event) {
    // Calcular distancia del movimiento
    let currentX, currentY;

    if (event.type === 'touchmove') {
        const touch = event.touches[0];
        currentX = touch.clientX;
        currentY = touch.clientY;
    } else if (event.type === 'mousemove') {
        currentX = event.clientX;
        currentY = event.clientY;
    } else {
        return;
    }

    const deltaX = Math.abs(currentX - touchStartX);
    const deltaY = Math.abs(currentY - touchStartY);

    // Si el movimiento supera el umbral, es scroll
    if (deltaX > 18 || deltaY > 18) {
        isScrolling = true;
        clearTimeout(seatHoldTimer);
        seatHoldTriggered = false;
        // NO prevenir aquí - dejar que el scroll funcione naturalmente
    }
}

function handleSeatRelease(coach, num, event) {
    clearTimeout(seatHoldTimer);

    // Si NO fue long press Y NO estamos haciendo scroll, abrir modal
    if (!seatHoldTriggered && !isScrolling) {
        // Solo prevenir si vamos a abrir el modal
        event.preventDefault();
        selectSeat(coach, num);
    }

    // Resetear estados
    seatHoldTriggered = false;
    isScrolling = false;
}

function handleSeatCancel() {
    clearTimeout(seatHoldTimer);
    seatHoldTriggered = false;
    isScrolling = false;
}

function closeModal(event) {
    if (!event || event.target === event.currentTarget) {
        unlockBodyScroll();

        state.selectedSeat = null;
        state.searchQuery = "";
        modalScrollPosition = 0;
        isModalOpen = false;

        render();

        // ←←← RESTAURAR SCROLL DESPUÉS DE CERRAR
        requestAnimationFrame(() => {
            window.scrollTo(0, savedScrollPosition);
        });
    }
}

function showUndoBanner(message, onUndo) {
    const banner = document.createElement('div');
    banner.className = 'undo-banner';
    banner.innerHTML = `
        <span>${message}</span>
        <button class="undo-btn">Deshacer</button>
    `;

    document.body.appendChild(banner);

    const timeout = setTimeout(() => {
        banner.style.animation = 'undoBannerFadeOut 0.35s ease forwards';
        setTimeout(() => banner.remove(), 350);
    }, 5000);

    banner.querySelector('.undo-btn').addEventListener('click', () => {
        clearTimeout(timeout);
        banner.style.animation = 'undoBannerFadeOut 0.35s ease forwards';
        setTimeout(() => banner.remove(), 350);
        onUndo();
    });
}

// --- Swipe down para cerrar modal con rebote ---

// NOTA: También existe en src/utils/modal-helpers.js pero se necesita aquí
let modalSwipeStartY = 0;
let modalSwipeDeltaY = 0;
let modalSwipeActive = false;

function modalSwipeStart(event) {
    if (!event.touches || event.touches.length === 0) return;

    // Solo activamos el swipe si el gesto empieza en el header del modal
    const header = event.target.closest('.modal-header');
    if (!header) {
        modalSwipeActive = false;
        return;
    }

    modalSwipeActive = true;
    const touch = event.touches[0];
    modalSwipeStartY = touch.clientY;
    modalSwipeDeltaY = 0;

    const modal = document.querySelector('.modal');
    if (modal) {
        modal.style.transition = 'none';
        modal.style.animation = '';
    }
}

function modalSwipeMove(event) {
    if (!modalSwipeActive || !event.touches || event.touches.length === 0) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - modalSwipeStartY;

    // Solo nos interesa si se mueve hacia abajo
    if (deltaY <= 0) {
        modalSwipeDeltaY = 0;
        return;
    }

    modalSwipeDeltaY = deltaY;

    const modal = document.querySelector('.modal');
    if (modal) {
        const limited = Math.min(deltaY, 200); // límite para que no se vaya a Cuenca
        modal.style.transform = `translateY(${limited}px)`;
    }
}

function modalSwipeEnd(event) {
    if (!modalSwipeActive) return;
    modalSwipeActive = false;

    const modal = document.querySelector('.modal');
    if (!modal) {
        modalSwipeDeltaY = 0;
        return;
    }

    // Si hemos arrastrado suficiente, cerramos el modal deslizando hacia abajo
    if (modalSwipeDeltaY > MODAL_SWIPE_CLOSE_THRESHOLD) {
        // Guardar posición de scroll ANTES de la animación
        const scrollToRestore = savedScrollPosition;

        modal.style.transition = 'transform 0.2s ease-out';
        modal.style.transform = 'translateY(100%)';

        // Una vez termina la animación, cerramos de verdad
        setTimeout(() => {
            modal.style.transition = '';
            modal.style.transform = '';
            // Cerrar el overlay padre
            const overlay = modal.closest('.modal-overlay');
            if (overlay) overlay.remove();

            // Desbloquear scroll si era necesario
            if (!document.querySelector('.modal-overlay')) {
                unlockBodyScroll();
                // Restaurar scroll a la posición guardada
                requestAnimationFrame(() => {
                    window.scrollTo(0, scrollToRestore);
                });
            }
        }, 200);
    } else {
        // No llega al umbral → animación de rebote
        modal.style.transition = '';
        modal.style.setProperty('--modal-swipe-distance', `${modalSwipeDeltaY}px`);
        modal.style.animation = 'modalReturnBounce 0.25s ease-out';

        modal.addEventListener(
            'animationend',
            () => {
                modal.style.animation = '';
                modal.style.transform = '';
                modal.style.removeProperty('--modal-swipe-distance');
            },
            { once: true }
        );
    }

    modalSwipeDeltaY = 0;
}

// ===== DELEGACIÓN GLOBAL PARA MODAL SWIPE =====
// Detectar si el touch empieza en un modal
document.addEventListener('touchstart', function(e) {
    const modal = e.target.closest('.modal');
    if (modal) {
        modalSwipeStart(e);
        e.stopPropagation();
    }
}, { passive: true });

document.addEventListener('touchmove', function(e) {
    if (modalSwipeActive) {
        modalSwipeMove(e);
    }
}, { passive: true });

document.addEventListener('touchend', function(e) {
    if (modalSwipeActive) {
        modalSwipeEnd(e);
    }
}, { passive: true });

document.addEventListener('touchcancel', function(e) {
    if (modalSwipeActive) {
        modalSwipeEnd(e);
    }
}, { passive: true });

function updateSearch(value) {
    state.searchQuery = value;
    // Solo actualizar la lista de paradas, no todo
    const modalList = document.querySelector(".modal-list");
    if (modalList) {
        const filteredStops = getFilteredStops();
        modalList.innerHTML = filteredStops
            .map(
                (stop) => `
            <button
                class="stop-item"
                onclick="updateSeatFromList('${stop.abbr}')"
            >
                <span class="stop-name">${stop.full}</span>
                <span class="stop-abbr">${stop.abbr}</span>
            </button>
        `
            )
            .join("");
    }
}

// --- Swipe lateral en la plantilla + cambio de coche con fade --- //
let __touchStartX = 0, __touchStartY = 0, __touchStartTime = 0;

function __getAdjacentCoachId(direction) {
    // Nos basamos en el orden visual de los botones .coach-btn
    const btns = Array.from(document.querySelectorAll('.coach-btn'));
    const i = btns.findIndex(b => b.classList.contains('active'));
    if (i === -1) return null;
    const nextIndex = direction === 'next' ? i + 1 : i - 1;
    const targetBtn = btns[nextIndex];
    return targetBtn ? targetBtn.textContent.trim() : null;
}

function __changeCoachWithFade(direction) {
    const targetId = __getAdjacentCoachId(direction);
    if (!targetId) return;

    const seatMap = document.querySelector('.seats-layout');
    if (seatMap) {
        // Fade out actual
        seatMap.classList.add('fade-out');

        setTimeout(() => {
            // Cambiar de coche (tu función pública ya expuesta)
            selectCoach(targetId);

            // Tras render, quitar fade en el nuevo contenedor
            requestAnimationFrame(() => {
                const newSeatMap = document.querySelector('.seats-layout');
                if (newSeatMap) {
                    // forzamos reflow para asegurar transición
                    void newSeatMap.offsetWidth;
                    newSeatMap.classList.remove('fade-out');
                }
            });
        }, 150); // Igual a .15s del CSS
    } else {
        // Fallback si no se encontró el contenedor
        selectCoach(targetId);
    }
}

function enableSeatmapSwipe() {
    const seatMap = document.querySelector('.seats-layout');
    if (!seatMap || seatMap.dataset.swipeBound === '1') return; // evitas duplicados
    seatMap.dataset.swipeBound = '1';

    seatMap.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0];
        __touchStartX = t.clientX;
        __touchStartY = t.clientY;
        __touchStartTime = Date.now();
    }, { passive: true });

    seatMap.addEventListener('touchend', (e) => {
        const t = e.changedTouches[0];
        const dx = t.clientX - __touchStartX;
        const dy = t.clientY - __touchStartY;
        const dt = Date.now() - __touchStartTime;

        const isHorizontal = Math.abs(dx) >= __SWIPE_X_THRESHOLD && Math.abs(dy) <= __SWIPE_Y_MAX;
        const isFastEnough = dt <= __SWIPE_TIME_MAX;

        if (isHorizontal && isFastEnough) {
            if (dx < 0) __changeCoachWithFade('next'); // swipe izquierda -> siguiente coche
            else __changeCoachWithFade('prev');        // swipe derecha -> coche anterior
        }
    });
}
// --- fin swipe + fade --- //

// --- PRESIONADO LARGO EN BOTONES DE COCHE (versión corregida) ---
let coachHoldTimer = null;
let coachHoldTriggered = false;

function enableCoachLongPress() {
    const buttons = document.querySelectorAll(".coach-btn");

    buttons.forEach(btn => {
        const coachId = btn.dataset.coachId || btn.textContent.trim().replace(/[ABC]$/, ''); // Extraer ID sin variante

        // 🔴 DOBLE TAP para 470
        if (state.selectedTrain === "470") {
            btn.addEventListener("click", (e) => {
                const now = Date.now();

                // Cerrar selector existente antes de procesar
                const existingSelector = document.querySelector('.variant-selector-popup');
                if (existingSelector) {
                    existingSelector.remove();
                }

                // Si es doble tap (mismo botón, menos de 300ms)
                if (coachLastTappedId === coachId && (now - coachLastTapTime) < COACH_DOUBLE_TAP_DELAY) {
                    e.stopImmediatePropagation();
                    e.preventDefault();

                    // Mostrar selector de variantes
                    show470VariantSelector(coachId, btn);

                    // Resetear
                    coachLastTapTime = 0;
                    coachLastTappedId = null;
                    return false;
                }

                // Registrar tap
                coachLastTapTime = now;
                coachLastTappedId = coachId;

                // Permitir tap normal después de un pequeño delay para detectar doble tap
                setTimeout(() => {
                    // Solo ejecutar si no hubo doble tap
                    if (coachLastTappedId === coachId) {
                        selectCoach(coachId);
                        coachLastTapTime = 0;
                        coachLastTappedId = null;
                    }
                }, COACH_DOUBLE_TAP_DELAY + 10);
            });
        } else {
            // Comportamiento normal para otros trenes
            btn.addEventListener("click", () => selectCoach(coachId));
        }

        // LONG PRESS (estadísticas) - funciona en todos los trenes
        btn.addEventListener("mousedown", startPress);
        btn.addEventListener("touchstart", startPress, { passive: true });
        btn.addEventListener("mouseup", endPress);
        btn.addEventListener("touchend", endPress);
        btn.addEventListener("touchcancel", endPress);

        function startPress(e) {
            coachHoldTriggered = false;
            btn.dataset.longpressLock = "0";

            clearTimeout(coachHoldTimer);
            coachHoldTimer = setTimeout(() => {
                coachHoldTriggered = true;
                btn.dataset.longpressLock = "1";

                // Cerrar selector de variantes si está abierto
                const existingSelector = document.querySelector('.variant-selector-popup');
                if (existingSelector) {
                    existingSelector.remove();
                }

                showCoachStats(coachId);
            }, 600);
        }

        function endPress(e) {
            clearTimeout(coachHoldTimer);
            coachHoldTriggered = false;
        }
    });
}

// Muestra la ventanita con número de asientos ocupados/libres (versión corregida)
function showCoachStats(coachId) {
    // 1) Intentar obtener la definición del coche desde trainModels
    const train = trainModels[state.selectedTrain];
    let coachDef = null;
    if (train && Array.isArray(train.coaches)) {
        coachDef = train.coaches.find(c => String(c.id) === String(coachId));
    }

    // 2) Obtén lista de IDs de asiento del layout
    let seatIds = [];

    if (coachDef) {
        // 🔴 NUEVO: Usar getCurrentCoachLayout para obtener el layout correcto
        const layout = getCurrentCoachLayout(coachDef);

        if (Array.isArray(layout)) {
            layout.forEach(block => {
                if (block.type === 'seats' && Array.isArray(block.positions)) {
                    block.positions.forEach(row => {
                        row.forEach(cell => {
                            if (cell === null) return;
                            // Normalizamos a string
                            const sid = String(cell);
                            // Excluir marcadores no-asiento
                            const nonSeatMarkers = ['WC', 'EQ', 'MESA', 'PMR', 'ESPACIO', 'BANO', 'BAÑO', 'MIN', 'S1', 'S2', 'S3', 'S4'];
                            // Verificar si el asiento contiene algún marcador (case insensitive)
                            const isNonSeat = nonSeatMarkers.some(marker =>
                                sid.toUpperCase().includes(marker)
                            );
                            if (isNonSeat) return;
                            seatIds.push(sid);
                        });
                    });
                }
            });
        }
    }

    // Fallback: si no hemos obtenido asientos desde layout, construir lista desde state.seatData keys
    if (seatIds.length === 0) {
        const keys = Object.keys(state.seatData || {});
        const prefix = `${coachId}-`;
        keys.forEach(k => {
            if (k.startsWith(prefix)) {
                // extraer parte posterior (por ejemplo C1-12 -> 12)
                const idPart = k.slice(prefix.length);
                seatIds.push(String(idPart));
            }
        });
    }

    // Evitar duplicados
    seatIds = Array.from(new Set(seatIds));

    const total = seatIds.length;

    // 3) Contar ocupados: existe state.seatData[getSeatKey(coachId, seatId)] con .stop
    let occupied = 0;
    seatIds.forEach(id => {
        try {
            const key = getSeatKey(coachId, id);
            if (state.seatData && state.seatData[key] && state.seatData[key].stop) {
                occupied += 1;
            }
        } catch (e) {
            console.warn('showCoachStats: error comprobando asiento', e);
        }
    });

    const free = Math.max(0, total - occupied);

    // 4) Mostrar popup
    const popup = document.createElement("div");
    popup.className = "coach-popup";
    popup.innerHTML = `
        <div class="coach-popup-content">
            <strong>${coachId}</strong><br>
            Ocupados: ${occupied}<br>
            Libres: ${free}<br>
            Porcentaje: ${total > 0 ? Math.round((occupied / total) * 100) : 0}%
        </div>
    `;

    document.body.appendChild(popup);

    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.zIndex = "9999";

    setTimeout(() => popup.remove(), 2500);
}

// Mostrar selector de variantes del 470
function show470VariantSelector(coachId, buttonElement) {
    // Eliminar selector previo si existe
    const existingSelector = document.querySelector('.variant-selector-popup');
    if (existingSelector) existingSelector.remove();

    const currentVariant = state.coach470Variants[coachId] || "A";

    // Crear overlay modal obligatorio
    const modal = document.createElement("div");
    modal.className = "modal-overlay variant-modal-overlay";
    modal.innerHTML = `
        <div class="variant-selector-popup modal-required">
            <div class="variant-selector-content">
                <div class="variant-selector-title">
                    ${coachId} - Seleccionar variante
                    <small style="display: block; font-size: 0.75rem; font-weight: normal; margin-top: 0.25rem; color: #6b7280;">
                        Elige una variante para continuar
                    </small>
                </div>
                <button class="variant-option ${currentVariant === 'A' ? 'active' : ''}" 
                        onclick="select470Variant('${coachId}', 'A')">
                    Variante A
                </button>
                <button class="variant-option ${currentVariant === 'B' ? 'active' : ''}" 
                        onclick="select470Variant('${coachId}', 'B')">
                    Variante B
                </button>
                <button class="variant-option ${currentVariant === 'C' ? 'active' : ''}" 
                        onclick="select470Variant('${coachId}', 'C')">
                    Variante C
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    // Prevenir que clicks dentro del popup lo cierren
    const popupElement = modal.querySelector('.variant-selector-popup');
    if (popupElement) {
        popupElement.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
    lockBodyScroll();

    // Prevenir cierre al hacer click en el overlay
    modal.addEventListener('click', (e) => {
        // Si el click fue en el overlay (no en el popup), no hacer nada
        if (e.target === modal) {
            e.preventDefault();
            e.stopPropagation();
            // Opcional: pequeña animación de "sacudida" para indicar que no se puede cerrar
            const popup = modal.querySelector('.variant-selector-popup');
            if (popup) {
                popup.style.animation = 'none';
                setTimeout(() => {
                    popup.style.animation = 'variantShake 0.3s ease';
                }, 10);
            }
        }
    });

    // Esperar a que el DOM se actualice
    requestAnimationFrame(() => {
        const popupElement = modal.querySelector('.variant-selector-popup');
        if (!popupElement) return;

        const rect = buttonElement.getBoundingClientRect();
        const popupHeight = popupElement.offsetHeight || 240;
        const popupWidth = popupElement.offsetWidth || 200;

        // Calcular posición centrada debajo del botón
        let top = rect.bottom + 10;
        let left = rect.left + (rect.width / 2);

        // Ajustar si se sale de la pantalla por abajo
        if (top + popupHeight > window.innerHeight) {
            top = rect.top - popupHeight - 10; // Mostrar arriba del botón
        }

        // Ajustar si se sale por la derecha
        if (left + (popupWidth / 2) > window.innerWidth) {
            left = window.innerWidth - (popupWidth / 2) - 20;
        }

        // Ajustar si se sale por la izquierda
        if (left - (popupWidth / 2) < 0) {
            left = (popupWidth / 2) + 20;
        }

        popupElement.style.position = "fixed";
        popupElement.style.top = `${top}px`;
        popupElement.style.left = `${left}px`;
        popupElement.style.transform = "translateX(-50%)";
        popupElement.style.zIndex = "10002";
    });

}

// Seleccionar variante del 470
function select470Variant(coachId, variant) {
    state.coach470Variants[coachId] = variant;
    save470Variants();

    saveData();

    // Cerrar modal obligatorio
    const overlay = document.querySelector('.variant-modal-overlay');
    if (overlay) overlay.remove();

    unlockBodyScroll();

    // Re-renderizar
    if (state.selectedCoach === coachId) {
        render();
    } else {
        render();
    }

    closeVariantSelector();

    // 🔴 NUEVO: Resetear variables de doble tap
    resetCoachDoubleTap();

    // Re-renderizar si estamos viendo ese coche
    if (state.selectedCoach === coachId) {
        render();
    } else {
        // Si no estamos en ese coche, solo actualizar el header
        render();
    }
}

// Resetear estado de doble tap
function resetCoachDoubleTap() {
    coachLastTapTime = 0;
    coachLastTappedId = null;
}

// Cerrar selector de variantes
function closeVariantSelector() {
    // NO hacer nada si es modal obligatorio
    const isModalRequired = document.querySelector('.modal-required');
    if (isModalRequired) return;

    const popup = document.querySelector('.variant-selector-popup');
    if (popup) popup.remove();

    // Resetear variables de doble tap al cerrar
    resetCoachDoubleTap();
}

// Calcular ocupación total del tren
function getTotalTrainOccupancy() {
    const train = trainModels[state.selectedTrain];
    if (!train || !train.coaches) return { occupied: 0, total: 0, percentage: 0 };

    let totalSeats = 0;
    let occupiedSeats = 0;

    train.coaches.forEach(coach => {
        const coachLayout = getCurrentCoachLayout(coach);

        // Contar asientos totales del coche
        const coachSeats = coachLayout
            .flatMap(block => block.type === "seats" ? block.positions : [])
            .flat()
            .filter(n => {
                if (n === null) return false;
                const str = String(n);
                // Excluir asientos especiales
                const nonSeatMarkers = ['WC', 'EQ', 'MESA', 'MIN', 'S1', 'S2', 'S3', 'S4'];
                return !nonSeatMarkers.some(marker => str.toUpperCase().includes(marker));
            }).length;

        totalSeats += coachSeats;

        // Contar ocupados en este coche
        const prefix = `${coach.id}-`;
        Object.keys(state.seatData || {}).forEach(key => {
            if (key.startsWith(prefix) && state.seatData[key]?.stop) {
                occupiedSeats++;
            }
        });
    });

    const percentage = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

    return { occupied: occupiedSeats, total: totalSeats, percentage };
}

// Delegación de eventos para botones de coche (evita problemas con re-renders)
document.addEventListener('click', function(e) {
    const coachBtn = e.target.closest('.coach-btn');
    if (coachBtn && !coachBtn.dataset.longpressLock) {
        const coachId = coachBtn.dataset.coachId || coachBtn.textContent.trim();

        // Para tren 470: gestionar doble tap
        if (state.selectedTrain === "470") {
            const now = Date.now();
            if (coachLastTappedId === coachId && (now - coachLastTapTime) < COACH_DOUBLE_TAP_DELAY) {
                e.stopPropagation();
                e.preventDefault();
                show470VariantSelector(coachId, coachBtn);
                coachLastTapTime = 0;
                coachLastTappedId = null;
                return;
            }
            coachLastTapTime = now;
            coachLastTappedId = coachId;
            setTimeout(() => {
                if (coachLastTappedId === coachId) {
                    selectCoach(coachId);
                    coachLastTapTime = 0;
                    coachLastTappedId = null;
                }
            }, COACH_DOUBLE_TAP_DELAY + 10);
        } else {
            selectCoach(coachId);
        }
    }
});

// Reaplicar después de render (los botones se regeneran)
document.addEventListener("DOMContentLoaded", enableCoachLongPress);
const domObserver = new MutationObserver(() => {
    enableCoachLongPress();
    enableSeatmapSwipe();
});
domObserver.observe(document.body, { childList: true, subtree: true });

function openBackupsPanel() {
    let backups = getAutoBackups();

    if (backups.length === 0) {
        alert('No hay backups automáticos disponibles para este tren.');
        return;
    }

    // Ordenar del más reciente al más antiguo
    backups.reverse();

    const backupsHTML = backups.map((backup, index) => {
        const date = new Date(backup.timestamp);
        const dateStr = date.toLocaleDateString('es-ES');
        const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        const seatCount = Object.keys(backup.seatData || {}).length;
        const incidentCount = Object.keys(backup.incidents || {}).length;

        return `
            <div class="backup-item">
                <div class="backup-info">
                    <strong>${dateStr} - ${timeStr}</strong>
                    <small>Asientos: ${seatCount} | Incidencias: ${incidentCount}</small>
                    ${backup.trainNumber ? `<small>Tren: ${backup.trainNumber}</small>` : ''}
                </div>
                <button class="backup-restore-btn" onclick="restoreBackup(${backups.length - 1 - index})">
                    Restaurar
                </button>
            </div>
        `;
    }).join('');

    const modal = `
        <div class="modal-overlay" onclick="closeBackupsPanel(event)">
            <div class="modal about-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Backups automáticos (${backups.length})</h3>
                        <button class="close-btn" onclick="closeBackupsPanel()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="about-content" style="max-height: 500px; overflow-y: auto;">
                    ${backupsHTML}
                </div>
                <div class="modal-footer">
                    <button class="clear-btn delete-btn" onclick="clearAllBackups()">
                        Borrar todos los backups
                    </button>
                    <button class="clear-btn" onclick="closeBackupsPanel()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    lockBodyScroll();
}

function closeBackupsPanel(event) {
    if (!event || event.target === event.currentTarget) {
        const overlay = document.querySelector('.about-modal')?.closest('.modal-overlay');
        if (overlay) overlay.remove();
    }

    if (!document.querySelector('.modal-overlay')) {
        unlockBodyScroll();
    }
}

function restoreBackup(index) {
    let backups = getAutoBackups();

    const backup = backups[index];
    if (!backup) {
        alert('Backup no encontrado');
        return;
    }

    const date = new Date(backup.timestamp).toLocaleString('es-ES');

    if (confirm(`¿Restaurar backup del ${date}?\n\nEsto reemplazará los datos actuales.`)) {
        try {
            restoreFromBackup(backup);
            closeBackupsPanel();
            render();
            alert('✅ Backup restaurado correctamente');
        } catch (e) {
            alert('Error al restaurar backup');
        }
    }
}

function clearAllBackups() {
    if (confirm('¿Seguro que quieres borrar TODOS los backups automáticos?\n\nEsta acción no se puede deshacer.')) {
        clearAllAutoBackups();
        closeBackupsPanel();
        alert('Todos los backups han sido borrados');
    }
}

function toggleMoreOptions() {
    const menu = document.getElementById('more-options-menu');
    if (menu) {
        menu.classList.toggle('hidden');
    }
}

// Cerrar menú al hacer clic fuera
document.addEventListener('click', function(e) {
    const menu = document.getElementById('more-options-menu');
    const btn = e.target.closest('.more-options-btn');

    if (menu && !menu.contains(e.target) && !btn) {
        menu.classList.add('hidden');
    }
});

function toggleShareSubmenu() {
    const submenu = document.getElementById('share-submenu');
    const importSubmenu = document.getElementById('import-submenu');

    if (submenu) {
        submenu.classList.toggle('hidden');
        // Cerrar el otro submenú
        if (importSubmenu) importSubmenu.classList.add('hidden');
    }
}

function toggleImportSubmenu() {
    const submenu = document.getElementById('import-submenu');
    const shareSubmenu = document.getElementById('share-submenu');

    if (submenu) {
        submenu.classList.toggle('hidden');
        // Cerrar el otro submenú
        if (shareSubmenu) shareSubmenu.classList.add('hidden');
    }
}

// ============================================
// SISTEMA DE COMPARTIR POR QR
// ============================================
// Importado desde src/features/qr-sharing.js
// Las funciones se cargan dinámicamente y se exportan a window


// ============================================
// EXPORTACIÓN DE FUNCIONES GLOBALES
// ============================================
// Sistema centralizado de exports para event handlers en HTML
Object.assign(window, {
    // Navegación y selección
    selectCoach, selectSeat, selectTrain,

    // Gestión de asientos
    clearSeat, clearAllData, updateSeat, updateSeatFromList,
    toggleFlag, updateComment, deleteComment,
    handleSeatPress, handleSeatRelease, handleSeatCancel, handleSeatMove,

    // Modales principales
    closeModal, updateSearch, openAbout, closeAbout,
    openReadmeModal, closeReadmeModal,
    openManualTecnico, closeManualTecnico,

    // Filtros (definidos en src/features/filters.js)
    // toggleFiltersMenu, openStopFilter, openRouteFilter, openSeatFilter, etc.

    // Modales genéricos
    showConfirmModal, closeConfirmModal,

    // Scroll y modal helpers
    saveModalScrollPosition, restoreModalScrollPosition,
    handleModalOverlayInteraction, lockBodyScroll, unlockBodyScroll,
    modalSwipeStart, modalSwipeMove, modalSwipeEnd,

    // Tren y configuración
    toggleDirection, toggleTrainSelector, showTrainNumberPrompt,
    setCurrentStop, updateCurrentStopSearch,
    toggleDarkMode, toggleSeatRotation, toggleHeaderCollapse,

    // Variantes 470
    show470VariantSelector, select470Variant, closeVariantSelector, resetCoachDoubleTap,

    // Notas e incidencias
    openServiceNotes, updateServiceNotes, clearServiceNotes, closeServiceNotes,
    // Las funciones de incidencias están en src/features/incidents.js
    getDoorSideText,

    // Backups
    openBackupsPanel, closeBackupsPanel, restoreBackup, clearAllBackups,

    // Compartir/Importar
    exportTurn, importTurn, toggleMoreOptions,
    toggleShareSubmenu, toggleImportSubmenu,
    // generateQRCode, closeQRModal, scanQRCode, closeScanModal exportadas desde qr-sharing.js
    // uploadTurnToServer, downloadTurnFromServer, removeModalAndUnlock exportadas desde qr-sharing.js

    // Utilidades
    getTotalTrainOccupancy,

    // Funciones auxiliares (necesarias para módulos externos)
    getAllTrains, saveData, render
});

// Exportar variables de estado y datos (necesarias para módulos externos)
// IMPORTANTE: Exportar como getters para asegurar que siempre obtienen el valor actualizado
Object.defineProperty(window, 'state', { get: () => state });
Object.defineProperty(window, 'stops', { get: () => stops });
Object.defineProperty(window, 'stationScreens', { get: () => stationScreens });
Object.defineProperty(window, 'filterState', { get: () => filterState });
Object.defineProperty(window, 'trainRoutes', { get: () => trainRoutes });
Object.defineProperty(window, 'trainModels', { get: () => trainModels });

// Exportar funciones auxiliares necesarias para módulos externos
window.getSeatKey = getSeatKey;
window.getCabinaLabel = getCabinaLabel;
window.getAisleArrow = getAisleArrow;
window.getCurrentCoachLayout = getCurrentCoachLayout;
window.getTrainFinalStops = getTrainFinalStops;
window.isDataLoaded = isDataLoaded;

// MOVIDO A src/utils/modal-helpers.js
// Ver: setupModalScrollBehavior()

// Inicializar
loadData();

// Asignar número de tren por defecto si no existe
if (!state.trainNumber) {
    state.trainNumber = '0000';
    localStorage.setItem('trainNumber', state.trainNumber);
}

// ============================================
// PANTALLAS DE ESTACIÓN
// ============================================
// Importado desde src/features/station-screens.js
// Las funciones se cargan dinámicamente y se exportan a window

// ============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ============================================

// Función de inicialización principal
async function initializeApp() {
    try {
        // 1. Cargar datos desde JSON
        console.log('📦 Cargando datos desde archivos JSON...');
        const jsonLoaded = await loadJSONData();

        if (!jsonLoaded) {
            console.error('⚠️ Error cargando datos JSON, la aplicación podría no funcionar correctamente');
        }

        // 2. Cargar datos guardados en localStorage
        loadData();

        // 3. Iniciar backup automático
        startAutoBackup();

        // 4. Renderizar interfaz
        render();

        // 5. Tras el primer render, engancha swipe
        enableSeatmapSwipe();

        console.log('✅ Aplicación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error durante la inicialización:', error);
    }
}

// Iniciar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}