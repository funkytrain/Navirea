/**
 * Módulo de renderizado de asientos
 * Contiene funciones para generar HTML de asientos, puertas, WC y elementos especiales
 */

/**
 * Renderiza el label de cabeza/cola del tren
 */
function renderCabinaLabel(coachId, isFirst) {
    const label = window.getCabinaLabel(coachId);
    return `<div class="cabina-label">${label}</div>`;
}

/**
 * Renderiza un baño PMR
 */
function renderPMRBathroom(section, coachId) {
    const label = section.label || "BAÑO PMR";
    const pmrId = "PMR-WC";
    const pmrKey = window.getIncidentKey(coachId, pmrId);
    const pmrActive = window.state.incidents[pmrKey] ? 'incident-active' : '';

    return `
        <button class="pmr-bathroom ${pmrActive}"
                style="height: ${section.height}px"
                data-wc-id="${pmrId}"
                onmousedown="handleDoorPress('${coachId}', '${pmrId}', 'wc', 'Baño PMR', event)"
                onmousemove="handleDoorMove(event)"
                onmouseup="handleDoorRelease(event)"
                onmouseleave="handleDoorCancel(event)"
                ontouchstart="handleDoorPress('${coachId}', '${pmrId}', 'wc', 'Baño PMR', event)"
                ontouchmove="handleDoorMove(event)"
                ontouchend="handleDoorRelease(event)"
                ontouchcancel="handleDoorCancel(event)">
            ${label}
        </button>
    `;
}

/**
 * Renderiza una puerta con lados clickables
 */
function renderDoor(section, coachId, doorNumber) {
    const leftId = `D${doorNumber}-L`;
    const rightId = `D${doorNumber}-R`;
    const leftKey = window.getIncidentKey(coachId, leftId);
    const rightKey = window.getIncidentKey(coachId, rightId);
    const leftActive = window.state.incidents[leftKey] ? 'incident-active' : '';
    const rightActive = window.state.incidents[rightKey] ? 'incident-active' : '';

    // Calcular labels según rotación
    const leftLabel = `Puerta ${doorNumber} - ${window.getDoorSideText('L')}`;
    const rightLabel = `Puerta ${doorNumber} - ${window.getDoorSideText('R')}`;

    return `
        <div class="door-space" style="height: ${section.height}px">
            <button class="door-side door-left ${leftActive}"
                    data-door-id="${leftId}"
                    onmousedown="handleDoorPress('${coachId}', '${leftId}', 'door', '${leftLabel}', event)"
                    onmousemove="handleDoorMove(event)"
                    onmouseup="handleDoorRelease(event)"
                    onmouseleave="handleDoorCancel(event)"
                    ontouchstart="handleDoorPress('${coachId}', '${leftId}', 'door', '${leftLabel}', event)"
                    ontouchmove="handleDoorMove(event)"
                    ontouchend="handleDoorRelease(event)"
                    ontouchcancel="handleDoorCancel(event)">
                <span class="door-label">P${doorNumber}</span>
            </button>
            <div class="door-center"></div>
            <button class="door-side door-right ${rightActive}"
                    data-door-id="${rightId}"
                    onmousedown="handleDoorPress('${coachId}', '${rightId}', 'door', '${rightLabel}', event)"
                    onmousemove="handleDoorMove(event)"
                    onmouseup="handleDoorRelease(event)"
                    onmouseleave="handleDoorCancel(event)"
                    ontouchstart="handleDoorPress('${coachId}', '${rightId}', 'door', '${rightLabel}', event)"
                    ontouchmove="handleDoorMove(event)"
                    ontouchend="handleDoorRelease(event)"
                    ontouchcancel="handleDoorCancel(event)">
                <span class="door-label">P${doorNumber}</span>
            </button>
        </div>
    `;
}

/**
 * Renderiza un espacio vacío (no puerta)
 */
function renderSpace(section) {
    return `<div class="space" style="height: ${section.height}px"></div>`;
}

/**
 * Renderiza un WC (baño estándar)
 */
function renderWC(seatNum, coachId, wcCounter) {
    // WC ahora soporta IDs personalizados (ej: "WC-A", "WC-B") para agrupar
    // Si es solo "WC" sin ID, se trata individualmente con contador global
    const wcId = String(seatNum).includes("-") ? String(seatNum) : `WC${wcCounter.value}`;

    // Verificar si este WC pertenece a alguna incidencia de grupo
    let wcActive = '';

    // Primero verificar si tiene incidencia individual
    const wcKey = window.getIncidentKey(coachId, wcId);
    if (window.state.incidents[wcKey]) {
        wcActive = 'incident-active';
    } else {
        // Verificar si pertenece a algún bloque de WC con incidencia
        Object.keys(window.state.incidents).forEach(key => {
            const incident = window.state.incidents[key];
            if (incident.type === 'wc' && incident.wcIds && incident.wcIds.includes(wcId)) {
                wcActive = 'incident-active';
            }
        });
    }

    // Label para mostrar
    const wcLabel = String(seatNum).includes("-") ? "WC" : String(seatNum);

    return `
        <button class="seat special-wc ${wcActive}"
                data-wc-id="${wcId}"
                onmousedown="handleDoorPress('${coachId}', '${wcId}', 'wc', 'WC', event)"
                onmousemove="handleDoorMove(event)"
                onmouseup="handleDoorRelease(event)"
                onmouseleave="handleDoorCancel(event)"
                ontouchstart="handleDoorPress('${coachId}', '${wcId}', 'wc', 'WC', event)"
                ontouchmove="handleDoorMove(event)"
                ontouchend="handleDoorRelease(event)"
                ontouchcancel="handleDoorCancel(event)">
            ${wcLabel}
        </button>
    `;
}

/**
 * Renderiza elementos especiales no clickeables (EQ, MIN, MESA)
 */
function renderSpecialElement(seatNum) {
    return `<div class="seat special-non-clickable">${seatNum}</div>`;
}

/**
 * Calcula estilos y clases para un asiento
 */
function calculateSeatStyles(key, seatInfo) {
    let seatClass = '';
    let seatStyle = '';
    let isFinalStop = false;

    // Aplicar filtro visual si está activo
    let isFiltered = false;
    if (window.filterState.active && window.filterState.data) {
        isFiltered = window.filterState.data.includes(key);
    }

    // Si el asiento está filtrado, ponerlo en rojo
    if (isFiltered) {
        seatClass = 'filtered-seat';
    } else if (seatInfo) {
        // Recopilar colores activos
        const colors = [];
        if (seatInfo.stop) colors.push('#22c55e');
        if (seatInfo.enlace) colors.push('#3b82f6');
        // aceptar tanto comentarioFlag como comentario (texto)
        if (seatInfo.comentarioFlag || seatInfo.comentario) colors.push('#f97316');
        if (seatInfo.seguir) colors.push('#eab308');

        // Verificar si es parada final según el número de tren
        const finalStopsForTrain = window.getTrainFinalStops();
        // Ajuste de paradas finales "efectivas" por número de tren
        const effectiveFinalStops = {
            "18021": "Vitoria Gasteiz",
            "18071": "Vitoria Gasteiz",
            "18079": "Castejón",
            "18073": "Castejón"
        };

        const effectiveFinalStop = effectiveFinalStops[window.state.trainNumber] || finalStopsForTrain[0];
        isFinalStop = seatInfo.stop && seatInfo.stop.full === effectiveFinalStop;

        if (colors.length > 1) {
            // Crear degradado dividido
            const percentage = 100 / colors.length;
            const gradientStops = colors.map((color, index) => {
                const start = index * percentage;
                const end = (index + 1) * percentage;
                return `${color} ${start}%, ${color} ${end}%`;
            }).join(', ');

            seatStyle = `background: linear-gradient(to right, ${gradientStops});`;
            seatClass = 'multi-color';
        } else if (colors.length === 1) {
            // Un solo color
            if (seatInfo.comentarioFlag || seatInfo.comentario) {
                seatClass = 'orange';
            } else if (seatInfo.enlace) {
                seatClass = 'blue';
            } else if (seatInfo.seguir) {
                seatClass = 'yellow';
            } else if (seatInfo.stop) {
                seatClass = 'occupied';
            }
        }
    }

    return { seatClass, seatStyle, isFinalStop, isFiltered };
}

/**
 * Renderiza un asiento individual
 */
function renderSeat(seatNum, coachId) {
    const key = window.getSeatKey(coachId, seatNum);
    const seatInfo = window.state.seatData[key];

    const { seatClass, seatStyle, isFinalStop, isFiltered } = calculateSeatStyles(key, seatInfo);

    const isPMR = String(seatNum).includes("PMR");
    const displayNum = isPMR ? String(seatNum).replace("PMR-", "") : seatNum;

    let label = seatNum;
    if (seatInfo && seatInfo.stop) {
        label = `${seatInfo.stop.abbr}<br><small style="font-size:0.6rem;">${displayNum}</small>`;
    }

    const pmrClass = isPMR ? "pmr-seat" : "";
    const finalStopClass = isFinalStop ? 'final-stop' : '';
    // Determinar clase de filtro
    const filterClass = (window.filterState.active && !isFiltered) ? 'filtered-out' : '';

    return `
    <button
        class="seat ${seatClass} ${pmrClass} ${finalStopClass} ${filterClass}"
        style="${seatStyle}"
        onmousedown="handleSeatPress('${coachId}', '${seatNum}', event)"
        onmousemove="handleSeatMove('${coachId}', '${seatNum}', event)"
        onmouseup="handleSeatRelease('${coachId}', '${seatNum}', event)"
        onmouseleave="handleSeatCancel()"
        ontouchstart="handleSeatPress('${coachId}', '${seatNum}', event)"
        ontouchmove="handleSeatMove('${coachId}', '${seatNum}', event)"
        ontouchend="handleSeatRelease('${coachId}', '${seatNum}', event)"
        ontouchcancel="handleSeatCancel()"
    >
        ${label}
    </button>
`;
}

/**
 * Renderiza una fila de asientos
 */
function renderSeatRow(row, coachId, wcCounter) {
    let html = '<div class="seat-row">';

    row.forEach((seatNum, index) => {
        if (seatNum === null) {
            // Solo mostrar flecha si es el elemento central (índice 2 en array de 5)
            const isCentralAisle = (row.length === 5 && index === 2);
            if (isCentralAisle) {
                const arrow = window.getAisleArrow(coachId);
                html += `<div class="seat empty-space aisle-arrow">${arrow}</div>`;
            } else {
                // Espacio vacío normal sin flecha
                html += '<div class="seat empty-space"></div>';
            }
        } else if (String(seatNum).includes("WC")) {
            html += renderWC(seatNum, coachId, wcCounter);
            wcCounter.value++;
        } else if (typeof seatNum === 'string') {
            // Identificar elementos especiales NO seleccionables
            const nonClickableElements = ['EQ', 'MIN', 'MESA', 'BAR', 'CAFETERIA'];
            const isNonClickable = nonClickableElements.some(elem => String(seatNum).toUpperCase().includes(elem));

            if (isNonClickable) {
                // Elementos especiales no seleccionables
                html += renderSpecialElement(seatNum);
            } else {
                // Asientos alfanuméricos seleccionables (1A, 1B, S1, S2, etc.)
                html += renderSeat(seatNum, coachId);
            }
        } else if (typeof seatNum === 'number') {
            // Solo los números son asientos seleccionables
            html += renderSeat(seatNum, coachId);
        } else {
            // Cualquier otra cosa se renderiza como elemento especial
            html += renderSpecialElement(String(seatNum));
        }
    });

    html += '</div>'; // seat-row
    return { html, wcCounter };
}

/**
 * Renderiza un grupo de asientos (sección con posiciones)
 */
function renderSeatGroup(section, coachId, doorCounter, wcCounter) {
    let html = '<div class="seat-group">';

    // Validar que section.positions existe y es un array
    if (section.positions && Array.isArray(section.positions)) {
        section.positions.forEach((row) => {
            const result = renderSeatRow(row, coachId, wcCounter);
            html += result.html;
            wcCounter.value = result.wcCounter.value;
        });
    } else {
        console.warn('[seats-renderer] Sección de asientos sin positions:', section);
    }

    html += '</div>'; // seat-group
    return { html, doorCounter, wcCounter };
}

/**
 * Renderiza una sección del layout (puerta, espacio, grupo de asientos, PMR)
 */
function renderSection(section, coachId, doorCounter, wcCounter) {
    if (section.type === "pmr-bathroom") {
        return { html: renderPMRBathroom(section, coachId), doorCounter, wcCounter };
    }

    if (section.type === "space") {
        // Determinar si es puerta
        const isDoor = section.isDoor !== undefined
            ? section.isDoor
            : (section.height >= window.DOOR_HEIGHT_THRESHOLD);

        // Verificar si el coche tiene puertas deshabilitadas
        const currentTrain = window.trainModels[window.state.selectedTrain];
        const currentCoach = currentTrain.coaches.find((c) => c.id === coachId);
        const coachHasDoors = !currentCoach.noDoors;

        if (isDoor && coachHasDoors) {
            const html = renderDoor(section, coachId, doorCounter.value);
            doorCounter.value++;
            return { html, doorCounter, wcCounter };
        } else {
            return { html: renderSpace(section), doorCounter, wcCounter };
        }
    }

    // Por defecto es un grupo de asientos
    return renderSeatGroup(section, coachId, doorCounter, wcCounter);
}

/**
 * Función principal de renderizado de asientos
 * Genera el HTML completo del layout de asientos para el coche actual
 */
function renderSeatsLayout() {
    // Verificar si los datos están cargados
    if (!window.isDataLoaded() || !window.trainModels[window.state.selectedTrain]) {
        return `<div style="text-align: center; padding: 2rem;">Cargando asientos...</div>`;
    }

    const currentTrain = window.trainModels[window.state.selectedTrain];
    const currentCoach = currentTrain.coaches.find(
        (c) => c.id === window.state.selectedCoach
    );

    const firstCoach = currentTrain.coaches[0].id;
    const lastCoach = currentTrain.coaches[currentTrain.coaches.length - 1].id;

    let html = '<div class="seats-layout">';

    // CABEZA/COLA al inicio
    if (currentCoach.id === firstCoach) {
        html += renderCabinaLabel(currentCoach.id, true);
    }

    const coachLayout = window.getCurrentCoachLayout(currentCoach);
    const doorCounter = { value: 1 }; // Objeto para pasar por referencia
    const wcCounter = { value: 1 }; // Contador global para WCs

    coachLayout.forEach((section) => {
        const result = renderSection(section, window.state.selectedCoach, doorCounter, wcCounter);
        html += result.html;
        doorCounter.value = result.doorCounter.value;
        wcCounter.value = result.wcCounter.value;
    });

    // CABEZA/COLA al final
    if (currentCoach.id === lastCoach) {
        html += renderCabinaLabel(currentCoach.id, false);
    }

    html += "</div>"; // seats-layout

    return html;
}

// Exportar funciones al scope global
Object.assign(window, {
    renderSeatsLayout,
    // Exportar también los helpers individuales por si se necesitan
    renderCabinaLabel,
    renderPMRBathroom,
    renderDoor,
    renderSpace,
    renderWC,
    renderSpecialElement,
    renderSeat,
    renderSeatRow,
    renderSeatGroup
});
