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

    // Cargar parada importante
    const savedImportantStop = localStorage.getItem(
        `train${state.selectedTrain}ImportantStop`
    );
    if (savedImportantStop) {
        state.importantStop = savedImportantStop;
    }

    // Cargar segunda parada importante
    const savedImportantStop2 = localStorage.getItem(
        `train${state.selectedTrain}ImportantStop2`
    );
    if (savedImportantStop2) {
        state.importantStop2 = savedImportantStop2;
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

    // Guardar parada importante
    if (state.importantStop) {
        localStorage.setItem(
            `train${state.selectedTrain}ImportantStop`,
            state.importantStop
        );
    } else {
        // Eliminar si se borra la parada importante
        localStorage.removeItem(`train${state.selectedTrain}ImportantStop`);
    }

    // Guardar segunda parada importante
    if (state.importantStop2) {
        localStorage.setItem(
            `train${state.selectedTrain}ImportantStop2`,
            state.importantStop2
        );
    } else {
        localStorage.removeItem(`train${state.selectedTrain}ImportantStop2`);
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

// ============================================
// FUNCIONES ESPECÍFICAS DE PERSISTENCIA
// ============================================

/**
 * Guarda la dirección del tren actual
 */
function saveTrainDirection() {
    try {
        localStorage.setItem(
            `train${state.selectedTrain}Direction`,
            JSON.stringify(state.trainDirection)
        );
    } catch (e) {
        console.warn('Error al guardar dirección del tren', e);
    }
}

/**
 * Guarda el modo oscuro
 */
function saveDarkMode() {
    try {
        localStorage.setItem("darkMode", state.darkMode);
    } catch (e) {
        console.warn('Error al guardar modo oscuro', e);
    }
}

/**
 * Guarda la rotación de asientos
 */
function saveSeatRotation() {
    try {
        localStorage.setItem("rotateSeats", state.rotateSeats);
    } catch (e) {
        console.warn('Error al guardar rotación de asientos', e);
    }
}

/**
 * Guarda el número de tren
 */
function saveTrainNumber() {
    try {
        if (state.trainNumber) {
            localStorage.setItem('trainNumber', state.trainNumber);
        }
    } catch (e) {
        console.warn('Error al guardar número de tren', e);
    }
}

/**
 * Guarda la parada actual
 */
function saveCurrentStop() {
    try {
        if (state.currentStop) {
            localStorage.setItem('currentStop', state.currentStop);
        }
    } catch (e) {
        console.warn('Error al guardar parada actual', e);
    }
}

/**
 * Guarda las variantes del tren 470
 */
function save470Variants() {
    try {
        localStorage.setItem('coach470Variants', JSON.stringify(state.coach470Variants));
    } catch (e) {
        console.warn('Error al guardar variantes del 470', e);
    }
}

/**
 * Guarda el estado de colapso del header
 */
function saveHeaderCollapsed() {
    try {
        localStorage.setItem('headerCollapsed', state.headerCollapsed);
    } catch (e) {
        console.warn('Error al guardar estado del header', e);
    }
}

/**
 * Borra todos los datos del tren actual
 */
function clearCurrentTrainData() {
    try {
        localStorage.removeItem(`train${state.selectedTrain}Data`);
        localStorage.removeItem(`train${state.selectedTrain}Direction`);
        localStorage.removeItem(`train${state.selectedTrain}Notes`);
        localStorage.removeItem(`train${state.selectedTrain}Incidents`);
        localStorage.removeItem(`train${state.selectedTrain}CopiedData`);
        localStorage.removeItem('currentStop');
        localStorage.removeItem(`autoBackups_${state.selectedTrain}`);
    } catch (e) {
        console.warn('Error al eliminar datos de localStorage', e);
    }
}

/**
 * Borra datos específicos al limpiar asientos
 */
function clearSeatsData() {
    try {
        localStorage.removeItem('currentStop');
        localStorage.removeItem(`train${state.selectedTrain}Notes`);
        localStorage.removeItem(`train${state.selectedTrain}Incidents`);
        localStorage.removeItem(`train${state.selectedTrain}CopiedData`);
        localStorage.removeItem(`autoBackups_${state.selectedTrain}`);
    } catch (e) {
        console.warn('Error al limpiar datos de asientos', e);
    }
}

/**
 * Guarda datos importados desde QR/JSON
 */
function saveImportedData(turnData) {
    try {
        // Guardar tren seleccionado
        if (turnData.trainModel) {
            localStorage.setItem("selectedTrain", turnData.trainModel);
        }

        // Guardar número de tren si existe
        if (turnData.trainNumber) {
            localStorage.setItem('trainNumber', turnData.trainNumber);
        }

        // Guardar parada actual si existe
        if (turnData.currentStop) {
            localStorage.setItem('currentStop', turnData.currentStop);
        }

        // Si es tren 470, importar variantes
        if (turnData.trainModel === "470" && turnData.coach470Variants) {
            localStorage.setItem('coach470Variants', JSON.stringify(turnData.coach470Variants));
        }

        // Guardar datos de asientos
        if (turnData.seatData) {
            localStorage.setItem(
                `train${turnData.trainModel}Data`,
                JSON.stringify(turnData.seatData)
            );
        }

        // Guardar dirección del tren
        if (turnData.trainDirection) {
            localStorage.setItem(
                `train${turnData.trainModel}Direction`,
                JSON.stringify(turnData.trainDirection)
            );
        }

        // Guardar notas de servicio
        if (turnData.serviceNotes !== undefined) {
            localStorage.setItem(
                `train${turnData.trainModel}Notes`,
                turnData.serviceNotes
            );
        }

        // Guardar incidencias
        if (turnData.incidents) {
            localStorage.setItem(
                `train${turnData.trainModel}Incidents`,
                JSON.stringify(turnData.incidents)
            );
        }
    } catch (e) {
        console.warn('Error al guardar datos importados', e);
    }
}

/**
 * Obtiene los backups automáticos guardados
 */
function getAutoBackups() {
    const backupsKey = `autoBackups_${state.selectedTrain}`;
    let backups = [];

    try {
        const saved = localStorage.getItem(backupsKey);
        if (saved) backups = JSON.parse(saved);
    } catch (e) {
        console.error('Error al cargar backups', e);
    }

    return backups;
}

/**
 * Restaura un backup específico
 */
function restoreFromBackup(backup) {
    try {
        // Restaurar datos del backup
        state.seatData = backup.seatData || {};
        state.trainDirection = backup.trainDirection || {};
        state.serviceNotes = backup.serviceNotes || "";
        state.incidents = backup.incidents || {};

        if (backup.trainNumber) {
            state.trainNumber = backup.trainNumber;
            localStorage.setItem('trainNumber', backup.trainNumber);
        }

        if (backup.currentStop) {
            state.currentStop = backup.currentStop;
            localStorage.setItem('currentStop', backup.currentStop);
        }

        if (state.selectedTrain === "470" && backup.coach470Variants) {
            state.coach470Variants = backup.coach470Variants;
            localStorage.setItem('coach470Variants', JSON.stringify(backup.coach470Variants));
        }

        // Guardar en localStorage
        saveData();
    } catch (e) {
        console.error('Error al restaurar backup', e);
        throw e;
    }
}

/**
 * Borra todos los backups automáticos
 */
function clearAllAutoBackups() {
    try {
        const backupsKey = `autoBackups_${state.selectedTrain}`;
        localStorage.removeItem(backupsKey);
    } catch (e) {
        console.warn('Error al borrar backups', e);
    }
}

// ============================================
// FUNCIONES DE CONFIGURACIONES PERSONALIZADAS
// ============================================

/**
 * Guarda un modelo de tren personalizado
 */
function saveCustomTrainModel(trainModel) {
    if (!window.ConfigurationManager) {
        console.error('ConfigurationManager no está disponible');
        return { success: false, error: 'ConfigurationManager no disponible' };
    }
    return window.ConfigurationManager.saveCustomTrainModel(trainModel);
}

/**
 * Elimina un modelo de tren personalizado
 */
function deleteCustomTrainModel(modelId) {
    if (!window.ConfigurationManager) {
        console.error('ConfigurationManager no está disponible');
        return { success: false, error: 'ConfigurationManager no disponible' };
    }
    return window.ConfigurationManager.deleteCustomTrainModel(modelId);
}

/**
 * Guarda una ruta personalizada
 */
function saveCustomRoute(route) {
    if (!window.ConfigurationManager) {
        console.error('ConfigurationManager no está disponible');
        return { success: false, error: 'ConfigurationManager no disponible' };
    }
    return window.ConfigurationManager.saveCustomRoute(route);
}

/**
 * Elimina una ruta personalizada
 */
function deleteCustomRoute(trainNumber) {
    if (!window.ConfigurationManager) {
        console.error('ConfigurationManager no está disponible');
        return { success: false, error: 'ConfigurationManager no disponible' };
    }
    return window.ConfigurationManager.deleteCustomRoute(trainNumber);
}

/**
 * Guarda una parada personalizada
 */
function saveCustomStop(stop) {
    if (!window.ConfigurationManager) {
        console.error('ConfigurationManager no está disponible');
        return { success: false, error: 'ConfigurationManager no disponible' };
    }
    return window.ConfigurationManager.saveCustomStop(stop);
}

/**
 * Elimina una parada personalizada
 */
function deleteCustomStop(abbr) {
    if (!window.ConfigurationManager) {
        console.error('ConfigurationManager no está disponible');
        return { success: false, error: 'ConfigurationManager no disponible' };
    }
    return window.ConfigurationManager.deleteCustomStop(abbr);
}

/**
 * Exporta todas las configuraciones personalizadas
 */
function exportCustomConfigurations() {
    if (!window.ConfigurationManager) {
        console.error('ConfigurationManager no está disponible');
        return null;
    }
    return window.ConfigurationManager.exportConfiguration();
}

/**
 * Importa configuraciones desde un objeto
 */
function importCustomConfigurations(config, merge = true) {
    if (!window.ConfigurationManager) {
        console.error('ConfigurationManager no está disponible');
        return { success: false, error: 'ConfigurationManager no disponible' };
    }
    return window.ConfigurationManager.importConfiguration(config, merge);
}

// Exportar funciones a window para uso global
Object.assign(window, {
    // Funciones principales
    saveData,
    loadData,
    startAutoBackup,
    saveAutoBackup,

    // Funciones específicas
    saveTrainDirection,
    saveDarkMode,
    saveSeatRotation,
    saveTrainNumber,
    saveCurrentStop,
    save470Variants,
    saveHeaderCollapsed,

    // Limpieza
    clearCurrentTrainData,
    clearSeatsData,

    // Importación/Backups
    saveImportedData,
    getAutoBackups,
    restoreFromBackup,
    clearAllAutoBackups,

    // Configuraciones personalizadas
    saveCustomTrainModel,
    deleteCustomTrainModel,
    saveCustomRoute,
    deleteCustomRoute,
    saveCustomStop,
    deleteCustomStop,
    exportCustomConfigurations,
    importCustomConfigurations
});
