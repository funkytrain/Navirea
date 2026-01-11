// ============================================================================
// CONSTANTS.JS - Constantes de configuración de la aplicación
// ============================================================================

// API Configuration
export const JSONBIN_API_KEY = '$2a$10$3YCi4nQFoATLzGZmwjRjF.y53EMkriBeiUBU8PwIQnaW0RkJw61iC';
export const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3';

// Timing Constants (milliseconds)
export const TIMINGS = {
    SEAT_LONG_PRESS: 500,
    COACH_DOUBLE_TAP_DELAY: 300,
    SCROLL_THRESHOLD: 5,
    BACKUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
    MODAL_SWIPE_THRESHOLD: 100,
    DEBOUNCE_DELAY: 300
};

// UI Constants
export const UI = {
    MAX_BACKUPS: 10,
    QR_SIZE: 280,
    MAX_DROPDOWN_ITEMS: 5,
    SEAT_WIDTH: '3.5rem',
    SEAT_HEIGHT: '2.75rem'
};

// Storage Keys
export const STORAGE_KEYS = {
    SELECTED_TRAIN: 'selectedTrain',
    DARK_MODE: 'darkMode',
    ROTATE_SEATS: 'rotateSeats',
    TRAIN_NUMBER: 'trainNumber',
    CURRENT_STOP: 'currentStop',
    HEADER_COLLAPSED: 'headerCollapsed',
    COACH_470_VARIANTS: 'coach470Variants',
    getTrainData: (trainId) => `train${trainId}Data`,
    getTrainDirection: (trainId) => `train${trainId}Direction`,
    getTrainNotes: (trainId) => `train${trainId}Notes`,
    getTrainIncidents: (trainId) => `train${trainId}Incidents`,
    getTrainCopiedData: (trainId) => `train${trainId}CopiedData`,
    getAutoBackups: (trainId) => `autoBackups_${trainId}`
};

// Default Values
export const DEFAULTS = {
    TRAIN_MODEL: '463',
    TRAIN_DIRECTION: 'up',
    COACH_470_VARIANTS: {
        'C1': 'A',
        'C2': 'A',
        'C3': 'A'
    }
};

// Data Paths
export const DATA_PATHS = {
    TRAINS_DIR: 'data/trains/',
    STOPS: 'data/stops.json',
    TRAIN_NUMBERS: 'data/train-numbers.json',
    TRAIN_ROUTES: 'data/train-routes.json',
    STATION_SCREENS: 'data/station-screens.json',
    getTrain: (trainId) => `data/trains/train-${trainId}.json`
};

// Train IDs
export const TRAIN_IDS = ['463', '464', '465', '449', '470'];

// Color Classes
export const SEAT_COLORS = {
    FREE: '',
    OCCUPIED: 'occupied',
    BLUE: 'blue',
    ORANGE: 'orange',
    YELLOW: 'yellow',
    FILTERED: 'filtered-seat',
    HIGHLIGHT: 'seat-highlight',
    FOCUS: 'focus-seat'
};

// Modal Types
export const MODAL_TYPES = {
    SEAT: 'seat',
    FILTER: 'filter',
    ABOUT: 'about',
    QR: 'qr',
    SCAN: 'scan',
    SCREENS: 'screens',
    INCIDENTS: 'incidents',
    SERVICE_NOTES: 'service-notes',
    BACKUPS: 'backups',
    README: 'readme',
    MANUAL: 'manual',
    VARIANT_SELECTOR: 'variant-selector'
};

// Filter Types
export const FILTER_TYPES = {
    STOP: 'stop',
    ROUTE: 'route',
    SEAT: 'seat',
    LINKS: 'links',
    COMMENTS: 'comments',
    CUSTOM: 'custom'
};

// Incident Types
export const INCIDENT_TYPES = {
    WC: 'WC',
    DOOR: 'Puerta',
    AC: 'Climatización',
    MEGAFONIA: 'Megafonía',
    PMR: 'PMR',
    ELECTRICAL: 'Eléctrico',
    OTHER: 'Otro'
};
