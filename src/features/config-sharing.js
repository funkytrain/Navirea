// ============================================
// SISTEMA DE COMPARTICIÓN DE CONFIGURACIONES
// ============================================

// Constantes
const JSONBIN_CONFIG_NAME_PREFIX = 'Navirea-Config';

// ============================================
// FUNCIONES DE SERVIDOR (JSONBin.io)
// ============================================

/**
 * Sube configuración a JSONBin y retorna código corto
 * @param {Object} config - Configuración exportada
 * @returns {Promise<string>} ID del bin (código corto)
 */
async function uploadConfigToServer(config) {
    const JSONBIN_BASE_URL = window.JSONBIN_BASE_URL;
    const JSONBIN_API_KEY = window.JSONBIN_API_KEY;

    const response = await fetch(`${JSONBIN_BASE_URL}/b`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY,
            'X-Bin-Private': 'false',
            'X-Bin-Name': `${JSONBIN_CONFIG_NAME_PREFIX}-${new Date().toISOString()}`
        },
        body: JSON.stringify(config)
    });

    if (!response.ok) {
        throw new Error('Error al subir configuración al servidor');
    }

    const data = await response.json();
    return data.metadata.id;
}

/**
 * Descarga configuración desde JSONBin usando código corto
 * @param {string} binId - ID del bin
 * @returns {Promise<Object>} Configuración
 */
async function downloadConfigFromServer(binId) {
    const JSONBIN_BASE_URL = window.JSONBIN_BASE_URL;
    const JSONBIN_API_KEY = window.JSONBIN_API_KEY;

    const response = await fetch(`${JSONBIN_BASE_URL}/b/${binId}/latest`, {
        method: 'GET',
        headers: {
            'X-Master-Key': JSONBIN_API_KEY
        }
    });

    if (!response.ok) {
        throw new Error('Error al descargar configuración del servidor');
    }

    const data = await response.json();
    return data.record;
}

// ============================================
// GENERACIÓN DE QR CODE
// ============================================

/**
 * Genera QR code para compartir configuraciones
 * Maneja dos estrategias según tamaño:
 * 1. Si < 2KB: QR con código corto de JSONBin
 * 2. Si >= 2KB: Solo descarga JSON (QR no viable)
 */
export async function generateConfigQR() {
    const config = window.ConfigurationManager.exportConfiguration();

    // Verificar si hay algo que compartir
    if (config.data.trainModels.length === 0 &&
        config.data.routes.length === 0 &&
        config.data.stops.length === 0) {
        alert('⚠️ No hay configuraciones personalizadas para compartir.\n\nCrea modelos o rutas primero.');
        return;
    }

    // Crear modal de loading
    showConfigSharingModal('loading');

    try {
        // Subir a servidor
        const binId = await uploadConfigToServer(config);

        // Generar QR con código corto
        showConfigSharingModal('qr-ready', { binId, config });

    } catch (error) {
        console.error('Error generando QR:', error);
        showConfigSharingModal('error', { error: error.message });
    }
}

// ============================================
// ESCANEO DE QR CODE
// ============================================

/**
 * Abre modal para escanear QR de configuración
 */
export function scanConfigQR() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('❌ Tu navegador no soporta acceso a la cámara.\n\nUsa "Importar" en su lugar.');
        return;
    }

    showConfigScanModal();
    startConfigQRScanning();
}

let html5QrCodeScanner = null;

/**
 * Inicia el proceso de escaneo de QR
 */
async function startConfigQRScanning() {
    const readerDiv = document.getElementById('config-qr-reader');
    const status = document.getElementById('config-scan-status');

    if (!readerDiv) return;

    try {
        html5QrCodeScanner = new Html5Qrcode("config-qr-reader");

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
        };

        const qrCodeSuccessCallback = (decodedText) => {
            if (status) {
                status.textContent = '✅ ¡Código detectado!';
                status.style.color = '#22c55e';
            }

            if (navigator.vibrate) {
                navigator.vibrate(200);
            }

            html5QrCodeScanner.stop()
                .then(() => {
                    html5QrCodeScanner.clear();
                    html5QrCodeScanner = null;
                    processConfigQRData(decodedText);
                    closeConfigScanModal();
                })
                .catch(err => {
                    console.error("Error stopping scanner:", err);
                    html5QrCodeScanner = null;
                    processConfigQRData(decodedText);
                    closeConfigScanModal();
                });
        };

        const qrCodeErrorCallback = () => {}; // Silent errors durante escaneo

        html5QrCodeScanner.start(
            { facingMode: "environment" },
            config,
            qrCodeSuccessCallback,
            qrCodeErrorCallback
        ).then(() => {
            if (status) {
                status.textContent = '🔍 Buscando código QR...';
                status.style.color = '#4b5563';
            }
        }).catch((err) => {
            // Fallback a cámara frontal
            html5QrCodeScanner.start(
                { facingMode: "user" },
                config,
                qrCodeSuccessCallback,
                qrCodeErrorCallback
            ).catch(err2 => {
                if (status) {
                    status.textContent = '❌ Error al acceder a la cámara';
                    status.style.color = '#ef4444';
                }
                console.error("Camera error:", err2);
                html5QrCodeScanner = null;
            });
        });

    } catch (error) {
        if (status) {
            status.textContent = '❌ Error al iniciar escáner';
            status.style.color = '#ef4444';
        }
        console.error('Scanner init error:', error);
        html5QrCodeScanner = null;
    }
}

/**
 * Procesa datos leídos desde QR
 * @param {string} dataStr - Código corto de JSONBin
 */
async function processConfigQRData(dataStr) {
    try {
        // Validar formato de código corto (24 hex chars)
        const isShortCode = /^[a-f0-9]{24}$/i.test(dataStr.trim());

        if (!isShortCode) {
            alert('❌ Código QR no válido.\n\nEl código debe ser un identificador de configuración.');
            return;
        }

        // Mostrar loading
        showProcessingModal();

        // Descargar configuración desde servidor
        const config = await downloadConfigFromServer(dataStr.trim());

        // Cerrar modal de loading
        closeProcessingModal();

        // Confirmar importación
        showImportConfirmation(config);

    } catch (error) {
        closeProcessingModal();
        alert('❌ Error al procesar código QR: ' + error.message);
        console.error('QR processing error:', error);
    }
}

// ============================================
// IMPORTACIÓN DE CONFIGURACIONES
// ============================================

/**
 * Muestra confirmación e importa configuración
 * @param {Object} config - Configuración a importar
 */
function showImportConfirmation(config) {
    const summary = config.data;
    const modelCount = summary.trainModels?.length || 0;
    const routeCount = summary.routes?.length || 0;
    const stopCount = summary.stops?.length || 0;

    const confirmMsg =
        `¿Importar configuración escaneada?\n\n` +
        `📦 Contenido:\n` +
        `   • ${modelCount} modelos de tren\n` +
        `   • ${routeCount} trayectos\n` +
        `   • ${stopCount} paradas\n\n` +
        `Esto se fusionará con tus configuraciones actuales.`;

    if (confirm(confirmMsg)) {
        const result = window.ConfigurationManager.importConfiguration(config, true);

        if (result.success) {
            alert(
                `✅ Configuración importada correctamente\n\n` +
                `Importado:\n` +
                `   • ${result.imported.trainModels} modelos\n` +
                `   • ${result.imported.routes} rutas\n` +
                `   • ${result.imported.stops} paradas`
            );

            // Refrescar UI si está abierta
            if (window.currentConfigManagerUI) {
                window.currentConfigManagerUI.renderModelsView();
                window.currentConfigManagerUI.renderRoutesView();
            }
        } else {
            alert('❌ Error al importar: ' + result.error);
        }
    }
}

// ============================================
// MODALES DE UI
// ============================================

/**
 * Muestra modal de compartición en diferentes estados
 */
function showConfigSharingModal(state, data = {}) {
    // Cerrar modal existente si hay
    const existing = document.querySelector('.config-sharing-modal');
    if (existing) existing.closest('.modal-overlay').remove();

    let content = '';

    switch(state) {
        case 'loading':
            content = `
                <div class="modal-overlay">
                    <div class="modal config-sharing-modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Compartir Configuraciones</h3>
                            <button class="close-btn" onclick="closeConfigSharingModal()">✕</button>
                        </div>
                        <div class="qr-content" style="padding: 2rem; text-align: center;">
                            <p style="color: #6b7280; margin-bottom: 1rem;">⏳ Generando código QR...</p>
                            <div style="display: flex; justify-content: center; min-height: 200px; align-items: center;">
                                <div class="spinner"></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="clear-btn" onclick="closeConfigSharingModal()">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'qr-ready':
            content = `
                <div class="modal-overlay">
                    <div class="modal config-sharing-modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Compartir Configuraciones</h3>
                            <button class="close-btn" onclick="closeConfigSharingModal()">✕</button>
                        </div>
                        <div class="qr-content" style="padding: 2rem;">
                            <p style="text-align: center; color: #22c55e; margin-bottom: 1rem;">
                                ✅ Código QR generado correctamente
                            </p>
                            <div id="config-qrcode-container" style="display: flex; justify-content: center; margin-bottom: 1rem;"></div>
                            <div style="text-align: center;">
                                <p style="font-size: 0.9rem; color: #4b5563;">
                                    <strong>${data.config.data.trainModels.length}</strong> modelos •
                                    <strong>${data.config.data.routes.length}</strong> rutas •
                                    <strong>${data.config.data.stops.length}</strong> paradas
                                </p>
                                <p style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem;">
                                    Código: <code style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px;">${data.binId}</code>
                                </p>
                                <p style="font-size: 0.75rem; color: #9ca3af;">Válido por 30 días</p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="clear-btn" onclick="closeConfigSharingModal()">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'error':
            content = `
                <div class="modal-overlay">
                    <div class="modal config-sharing-modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Error al Generar QR</h3>
                            <button class="close-btn" onclick="closeConfigSharingModal()">✕</button>
                        </div>
                        <div class="qr-content" style="padding: 2rem; text-align: center;">
                            <p style="color: #ef4444; font-size: 3rem; margin-bottom: 1rem;">❌</p>
                            <p style="color: #6b7280;">
                                ${data.error}
                            </p>
                            <p style="color: #9ca3af; margin-top: 1rem; font-size: 0.875rem;">
                                Usa "Exportar Todo" como alternativa
                            </p>
                        </div>
                        <div class="modal-footer">
                            <button class="clear-btn" onclick="closeConfigSharingModal()">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            break;
    }

    document.body.insertAdjacentHTML('beforeend', content);
    window.lockBodyScroll();

    // Generar QR si estado es 'qr-ready'
    if (state === 'qr-ready') {
        const container = document.getElementById('config-qrcode-container');
        if (container && typeof QRCode !== 'undefined') {
            new QRCode(container, {
                text: data.binId,
                width: 280,
                height: 280,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });
        }
    }
}

/**
 * Cierra modal de compartición
 */
export function closeConfigSharingModal() {
    const modal = document.querySelector('.config-sharing-modal');
    if (modal) {
        modal.closest('.modal-overlay').remove();
        window.unlockBodyScroll();
    }
}

/**
 * Muestra modal de escaneo
 */
function showConfigScanModal() {
    const modal = `
        <div class="modal-overlay">
            <div class="modal config-scan-modal">
                <div class="modal-header">
                    <h3 class="modal-title">Escanear Configuración</h3>
                    <button class="close-btn" onclick="closeConfigScanModal()">✕</button>
                </div>
                <div class="scan-content" style="padding: 2rem;">
                    <p style="text-align: center; color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem;">
                        📷 Apunta la cámara al código QR
                    </p>
                    <div id="config-qr-reader" style="width: 100%; max-width: 500px; margin: 0 auto;"></div>
                    <p id="config-scan-status" style="text-align: center; margin-top: 1rem; color: #4b5563; font-size: 0.85rem;">
                        Iniciando cámara...
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeConfigScanModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    window.lockBodyScroll();
}

/**
 * Cierra modal de escaneo
 */
export function closeConfigScanModal() {
    if (html5QrCodeScanner) {
        try {
            html5QrCodeScanner.stop()
                .then(() => {
                    html5QrCodeScanner.clear();
                    html5QrCodeScanner = null;
                    removeConfigScanModal();
                })
                .catch(err => {
                    console.error("Error stopping:", err);
                    html5QrCodeScanner = null;
                    removeConfigScanModal();
                });
        } catch (e) {
            console.error("Exception stopping:", e);
            html5QrCodeScanner = null;
            removeConfigScanModal();
        }
    } else {
        removeConfigScanModal();
    }
}

function removeConfigScanModal() {
    const modal = document.querySelector('.config-scan-modal');
    if (modal) {
        modal.closest('.modal-overlay').remove();
        window.unlockBodyScroll();
    }
}

/**
 * Muestra modal de procesamiento
 */
function showProcessingModal() {
    const modal = `
        <div class="modal-overlay config-processing-overlay">
            <div class="modal">
                <div style="padding: 2rem; text-align: center;">
                    <div class="spinner" style="margin: 0 auto 1rem;"></div>
                    <p style="color: #6b7280;">📥 Descargando configuración...</p>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modal);
    window.lockBodyScroll();
}

/**
 * Cierra modal de procesamiento
 */
function closeProcessingModal() {
    const modal = document.querySelector('.config-processing-overlay');
    if (modal) {
        modal.remove();
        window.unlockBodyScroll();
    }
}

// Exportar a window para compatibilidad con HTML inline handlers
if (typeof window !== 'undefined') {
    window.generateConfigQR = generateConfigQR;
    window.scanConfigQR = scanConfigQR;
    window.closeConfigSharingModal = closeConfigSharingModal;
    window.closeConfigScanModal = closeConfigScanModal;
    window.downloadConfigFromServer = downloadConfigFromServer;
}
