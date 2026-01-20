/* ========================================
   STORAGE SERVICE - localStorage y backups
   ======================================== */

// Constantes de configuración
const MAX_BACKUPS = 20;
const BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

// Timer para backups automáticos
let backupTimer = null;

/**
 * Guarda un backup automático del estado actual
 */
function saveAutoBackup() {
    const timestamp = new Date().toISOString();
    const backupData = {
        trainModel: state.selectedTrain,
        seatData: state.seatData,
        trainDirection: state.trainDirection,
        serviceNotes: state.serviceNotes || "",
        incidents: state.incidents || {},
        trainNumber: state.trainNumber || null,
        currentStop: state.currentStop || null,
        timestamp: timestamp,
        ...(state.selectedTrain === "470" && {
            coach470Variants: state.coach470Variants
        })
    };

    // Obtener backups existentes
    const backupsKey = `autoBackups_${state.selectedTrain}`;
    let backups = [];

    try {
        const saved = localStorage.getItem(backupsKey);
        if (saved) backups = JSON.parse(saved);
    } catch (e) {
        console.error("Error loading backups");
    }

    // Añadir nuevo backup
    backups.push(backupData);

    // Mantener solo los últimos MAX_BACKUPS
    if (backups.length > MAX_BACKUPS) {
        backups = backups.slice(-MAX_BACKUPS);
    }

    // Guardar
    try {
        localStorage.setItem(backupsKey, JSON.stringify(backups));
        console.log(`✅ Backup automático guardado: ${new Date(timestamp).toLocaleString('es-ES')}`);
    } catch (e) {
        console.error("Error saving backup:", e);
    }
}

/**
 * Inicia el sistema de backup automático
 */
function startAutoBackup() {
    // Limpiar timer anterior si existe
    if (backupTimer) {
        clearInterval(backupTimer);
    }

    // Guardar backup inicial
    saveAutoBackup();

    // Configurar backup periódico
    backupTimer = setInterval(() => {
        saveAutoBackup();
    }, BACKUP_INTERVAL);

    console.log(`🔄 Backup automático activado (cada ${BACKUP_INTERVAL / 60000} minutos)`);
}

/**
 * Carga datos guardados desde localStorage
 */
function loadData() {
    // Cargar último tren usado
    const savedTrain = localStorage.getItem("selectedTrain");
    if (savedTrain && trainModels[savedTrain]) {
        state.selectedTrain = savedTrain;
    }

    // Cargar datos de asientos del tren actual
    const saved = localStorage.getItem(`train${state.selectedTrain}Data`);
    if (saved) {
        try {
            state.seatData = JSON.parse(saved);
        } catch (e) {
            console.error("Error loading data");
        }
    }

    // Cargar dirección del tren actual
    const savedDirection = localStorage.getItem(
        `train${state.selectedTrain}Direction`
    );
    if (savedDirection) {
        try {
            state.trainDirection = JSON.parse(savedDirection);
        } catch (e) {
            console.error("Error loading direction");
        }
    }

    // Inicializar dirección si no existe (dirección por defecto "up")
    const currentTrain = trainModels[state.selectedTrain];
    if (currentTrain && currentTrain.coaches) {
        currentTrain.coaches.forEach(coach => {
            if (!state.trainDirection[coach.id]) {
                state.trainDirection[coach.id] = "up";
            }
        });
    }

    // Cargar modo nocturno
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode) {
        state.darkMode = savedDarkMode === "true";
    }

    // Cargar número de tren
    const savedTrainNumber = localStorage.getItem(
        `train${state.selectedTrain}Number`
    );
    if (savedTrainNumber) {
        state.trainNumber = savedTrainNumber;
    }

    // Cargar parada actual
    const savedCurrentStop = localStorage.getItem(
        `train${state.selectedTrain}CurrentStop`
    );
    if (savedCurrentStop) {
        state.currentStop = savedCurrentStop;
    }

    // Cargar notas de servicio
    const savedServiceNotes = localStorage.getItem(
        `train${state.selectedTrain}ServiceNotes`
    );
    if (savedServiceNotes) {
        state.serviceNotes = savedServiceNotes;
    }

    // Cargar incidencias
    const savedIncidents = localStorage.getItem(
        `train${state.selectedTrain}Incidents`
    );
    if (savedIncidents) {
        try {
            state.incidents = JSON.parse(savedIncidents);
        } catch (e) {
            console.error("Error loading incidents");
        }
    }

    // Cargar variantes del 470
    if (state.selectedTrain === "470") {
        const savedVariants = localStorage.getItem("train470Variants");
        if (savedVariants) {
            try {
                state.coach470Variants = JSON.parse(savedVariants);
            } catch (e) {
                console.error("Error loading 470 variants");
            }
        }
    }
}

/**
 * Guarda el estado actual en localStorage
 */
function saveData() {
    // Guardar tren seleccionado
    localStorage.setItem("selectedTrain", state.selectedTrain);

    // Guardar datos de asientos
    localStorage.setItem(
        `train${state.selectedTrain}Data`,
        JSON.stringify(state.seatData)
    );

    // Guardar dirección del tren
    localStorage.setItem(
        `train${state.selectedTrain}Direction`,
        JSON.stringify(state.trainDirection)
    );

    // Guardar modo oscuro
    localStorage.setItem("darkMode", state.darkMode);

    // Guardar número de tren
    if (state.trainNumber) {
        localStorage.setItem(
            `train${state.selectedTrain}Number`,
            state.trainNumber
        );
    }

    // Guardar parada actual
    if (state.currentStop) {
        localStorage.setItem(
            `train${state.selectedTrain}CurrentStop`,
            state.currentStop
        );
    }

    // Guardar notas de servicio
    if (state.serviceNotes !== undefined) {
        localStorage.setItem(
            `train${state.selectedTrain}ServiceNotes`,
            state.serviceNotes
        );
    }

    // Guardar incidencias
    if (state.incidents) {
        localStorage.setItem(
            `train${state.selectedTrain}Incidents`,
            JSON.stringify(state.incidents)
        );
    }

    // Guardar variantes del 470
    if (state.selectedTrain === "470") {
        localStorage.setItem(
            "train470Variants",
            JSON.stringify(state.coach470Variants)
        );
    }
}
