// ============================================================================
// CONVERT-ADIF-DATA.JS - Script para convertir CSV de ADIF a JSON
// ============================================================================
// Convierte el archivo estaciones.csv de ADIF a un formato JSON optimizado
// para búsqueda por código y nombre de estación

const fs = require('fs');
const path = require('path');

// Rutas de archivos
const CSV_PATH = path.join(__dirname, '..', 'estaciones.csv');
const SCREENS_PATH = path.join(__dirname, '..', 'data', 'station-screens.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'adif-stations.json');

/**
 * Lee y parsea el CSV de ADIF
 * @returns {Array} Array de objetos con code y name
 */
function parseCSV() {
    // Intentar con latin1 (ISO-8859-1) que es común en archivos españoles
    const content = fs.readFileSync(CSV_PATH, 'latin1');
    const lines = content.split('\n');

    // Saltar la primera línea (encabezados)
    const dataLines = lines.slice(1);

    const stations = [];

    for (const line of dataLines) {
        // Ignorar líneas vacías
        if (!line.trim()) continue;

        // Parsear línea con separador ;
        // Las columnas están entre comillas dobles
        const match = line.match(/^"([^"]+)";"([^"]+)"/);

        if (match) {
            const code = match[1].trim();
            const name = match[2].trim();

            // Validar que el código sea numérico
            if (code && name && /^\d+$/.test(code)) {
                stations.push({ code, name });
            }
        }
    }

    console.log(`✓ Parseadas ${stations.length} estaciones del CSV`);
    return stations;
}

/**
 * Carga los códigos de pantallas existentes
 * @returns {Object} Mapa de nombre de estación a código de pantalla
 */
function loadScreenCodes() {
    try {
        const content = fs.readFileSync(SCREENS_PATH, 'utf-8');
        const screens = JSON.parse(content);
        console.log(`✓ Cargados ${Object.keys(screens).length} códigos de pantalla`);
        return screens;
    } catch (error) {
        console.warn('⚠ No se pudo cargar station-screens.json:', error.message);
        return {};
    }
}

/**
 * Normaliza un nombre de estación para comparación
 * @param {string} name - Nombre a normalizar
 * @returns {string} Nombre normalizado
 */
function normalizeName(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[\/\-\s]/g, '') // Eliminar /, -, espacios
        .trim();
}

/**
 * Intenta mapear códigos de pantalla con estaciones ADIF
 * @param {Array} adifStations - Estaciones de ADIF
 * @param {Object} screenCodes - Códigos de pantalla existentes
 * @returns {Object} Mapa de código ADIF a datos completos
 */
function buildStationMap(adifStations, screenCodes) {
    const result = {};
    let matchedScreens = 0;

    // Mapeos manuales para casos especiales (código ADIF -> código pantalla)
    // Solo incluir estaciones que SABEMOS que tienen pantalla disponible
    const manualMappings = {
        // Madrid (principales)
        '17000': 17000,  // MADRID-CHAMARTÍN-CLARA CAMPOAMOR
        '18000': 18000,  // MADRID-PUERTA DE ATOCHA-ALMUDENA GRANDES
        '18001': 18001,  // MADRID-ATOCHA CERCANÍAS
        '10000': 10000,  // MADRID-PRÍNCIPE PÍO
        '18002': 18002,  // MADRID-NUEVOS MINISTERIOS
        '18001': 18001,  // MADRID-RECOLETOS
        '18101': 18101,  // SOL

        // Barcelona
        '71801': 71801,  // BARCELONA-SANTS
        '71802': 71802,  // BARCELONA-PASSEIG DE GRÀCIA
        '72400': 72400,  // EL PRAT AEROPORT

        // Sevilla
        '51003': 51003,  // SEVILLA-SANTA JUSTA

        // Valencia
        '03216': 3216,   // VALÈNCIA-JOAQUÍN SOROLLA

        // Málaga
        '54413': 54413,  // MÁLAGA MARÍA ZAMBRANO
        '54500': 54500,  // MÁLAGA M.Z. CERCANÍAS

        // Zaragoza
        '04040': 4040,   // ZARAGOZA DELICIAS

        // Valladolid
        '10600': 10600,  // VALLADOLID-CAMPO GRANDE

        // Alicante
        '60911': 60911,  // ALICANTE/ALACANT-TERMINAL

        // Bilbao
        '13200': 13200,  // BILBAO-INTERMOD. ABANDO INDALECIO PRIETO
        '05451': 13200,  // BILBAO LA CONCORDIA (código alternativo)

        // Santander
        '14223': 14223,  // SANTANDER
        '05601': 14223,  // SANTANDER RAM (código alternativo)

        // Oviedo
        '15211': 15211,  // OVIEDO

        // León
        '15100': 15100,  // LEÓN

        // Córdoba
        '50500': 50500,  // CÓRDOBA-JULIO ANGUITA

        // Granada
        '05000': 5000,   // GRANADA

        // Salamanca
        '30100': 30100,  // SALAMANCA
        '30110': 30100,  // SALAMANCA-LA ALAMEDILLA (código alternativo)

        // Segovia
        '08004': 8004,   // SEGOVIA-GUIOMAR
        '12100': 8004,   // SEGOVIA (código alternativo)

        // Palencia
        '14100': 14100,  // PALENCIA

        // Burgos
        '11014': 11014,  // BURGOS-ROSA MANZANO

        // Zamora
        '30200': 30200,  // ZAMORA

        // Pamplona / Iruña
        '80100': 80100,  // PAMPLONA IRUÑA

        // Vitoria / Gasteiz
        '11208': 11208,  // VITORIA GASTEIZ

        // Miranda de Ebro
        '11200': 11200,  // MIRANDA DE EBRO

        // La Puebla de Arganzón
        '11204': 11204,  // LA PUEBLA DE ARGANZÓN

        // Tarragona
        '04104': 4104,   // CAMP DE TARRAGONA

        // Guadalajara
        '04007': 4007,   // GUADALAJARA-YEBES

        // Cuenca
        '03208': 3208,   // CUENCA-FERNANDO ZÓBEL

        // Albacete
        '60600': 60600,  // ALBACETE-LOS LLANOS

        // Murcia
        '61200': 61200,  // MURCIA DEL CARMEN

        // Elche / Elx
        '03410': 3410,   // ELCHE/ELX AV

        // Castellón
        '65300': 65300,  // CASTELLÓ DE LA PLANA

        // Vigo
        '08223': 8223,   // VIGO URZÁIZ
        '22308': 22308,  // VIGO-GUIXAR

        // A Coruña
        '31412': 31412,  // A CORUÑA

        // Santiago de Compostela
        '31400': 31400,  // SANTIAGO DE COMPOSTELA-DANIEL CASTELAO

        // Pontevedra
        '23004': 23004,  // PONTEVEDRA

        // Ourense
        '22100': 22100,  // OURENSE

        // Ferrol
        '21010': 21010,  // FERROL

        // Logroño
        '81100': 81100,  // LOGROÑO

        // Tudela
        '81202': 81202,  // TUDELA

        // Huesca
        '74200': 74200,  // HUESCA

        // Teruel
        '67200': 67200,  // TERUEL

        // Cáceres
        '35400': 35400,  // CÁCERES

        // Badajoz
        '37606': 37606,  // BADAJOZ

        // Mérida
        '37500': 37500,  // MÉRIDA

        // Puebla de Sanabria
        '31200': 31200,  // PUEBLA DE SANABRIA
        '08247': 31200,  // SANABRIA AV (código alternativo)

        // Medina del Campo
        '10500': 10500,  // MEDINA DEL CAMPO
        '08240': 10500,  // MEDINA DEL CAMPO AV (código alternativo)

        // Antequera
        '02030': 2030,   // ANTEQUERA AV

        // Figueres / Vilafant
        '04307': 4307,   // FIGUERES-VILAFANT

        // Girona
        '79300': 79300,  // GIRONA

        // Lleida
        '78400': 78400,  // LLEIDA-PIRINEUS

        // Reus
        '71400': 71400,  // REUS

        // Tortosa
        '65400': 65400,  // TORTOSA
    };

    // Crear mapa inverso de nombres normalizados a códigos de pantalla
    const screenMap = {};
    for (const [stationName, screenCode] of Object.entries(screenCodes)) {
        const normalized = normalizeName(stationName);
        screenMap[normalized] = { screenCode, originalName: stationName };
    }

    // Mapear cada estación ADIF
    for (const { code, name } of adifStations) {
        const normalized = normalizeName(name);

        // Verificar mapeos manuales primero
        let screenData = null;
        if (manualMappings[code]) {
            const screenCode = manualMappings[code];
            const originalName = Object.entries(screenCodes).find(([_, c]) => c === screenCode)?.[0];
            screenData = { screenCode, originalName: originalName || 'Manual mapping' };
        }

        // Si no hay mapeo manual, intentar matching exacto
        if (!screenData) {
            screenData = screenMap[normalized];
        }

        // Si no hay match exacto, intentar match por palabras significativas
        // Solo hacer match si el nombre normalizado EMPIEZA con el screen name
        // Esto evita falsos positivos como "IRUN" vs "PAMPLONA/IRUÑA"
        if (!screenData) {
            for (const [normScreen, data] of Object.entries(screenMap)) {
                // El nombre de ADIF debe empezar con el nombre de screen O contenerlo como palabra completa
                if (normalized.startsWith(normScreen) ||
                    normalized === normScreen ||
                    // Match para casos como "LA PUEBLA" en "LAPUEBLA"
                    (normScreen.length > 4 && normalized.includes(normScreen))) {
                    screenData = data;
                    break;
                }
            }
        }

        // Solo asignar screenCode si se encontró un mapeo explícito
        // O si está en los mapeos manuales
        const finalScreenCode = screenData ? screenData.screenCode : null;

        result[code] = {
            code,
            name,
            screenCode: finalScreenCode
        };

        if (screenData) {
            matchedScreens++;
            console.log(`  → Mapeada: ${name} (${code}) → pantalla ${screenData.screenCode} (desde "${screenData.originalName}")`);
        }
    }

    const totalStations = Object.keys(result).length;
    const withScreenCode = Object.values(result).filter(s => s.screenCode !== null).length;
    const withoutScreenCode = totalStations - withScreenCode;

    console.log(`✓ Mapeadas ${matchedScreens} estaciones con código de pantalla específico`);
    console.log(`✓ Total de estaciones: ${totalStations}`);
    console.log(`  - Con pantalla disponible: ${withScreenCode}`);
    console.log(`  - Sin pantalla (tachadas): ${withoutScreenCode}`);
    return result;
}

/**
 * Guarda el resultado en JSON
 * @param {Object} data - Datos a guardar
 */
function saveJSON(data) {
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(OUTPUT_PATH, json, 'utf-8');
    console.log(`✓ Archivo guardado en: ${OUTPUT_PATH}`);
    console.log(`✓ Total de estaciones: ${Object.keys(data).length}`);
}

// Ejecutar proceso
function main() {
    console.log('=== Conversión de datos ADIF ===\n');

    try {
        const adifStations = parseCSV();
        const screenCodes = loadScreenCodes();
        const stationMap = buildStationMap(adifStations, screenCodes);
        saveJSON(stationMap);

        console.log('\n✅ Conversión completada con éxito');

        // Mostrar ejemplos
        const codes = Object.keys(stationMap).slice(0, 3);
        console.log('\nEjemplos de estaciones generadas:');
        codes.forEach(code => {
            console.log(JSON.stringify(stationMap[code], null, 2));
        });

    } catch (error) {
        console.error('❌ Error durante la conversión:', error.message);
        process.exit(1);
    }
}

main();
