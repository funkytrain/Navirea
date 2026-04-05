// ============================================
// SISTEMA DE COMPARTICIÓN DE CONFIGURACIONES (LOCAL - SIN SERVIDOR)
// ============================================
// Las configuraciones se comprimen con LZ-String directamente en el QR,
// sin necesidad de servidor externo.

// Referencia local a escapeHtml (definida en modal-system.js y exportada a window)
const escapeHtml = (str) => window.escapeHtml(str);

// ============================================
// GENERACIÓN DE QR CODE
// ============================================

/**
 * Genera QR code para compartir configuraciones.
 * Los datos se comprimen con LZ-String para caber en el QR.
 * Si la configuración es demasiado grande, ofrece solo descarga JSON.
 */
export async function generateConfigQR() {
    const config = window.ConfigurationManager.exportConfiguration();

    if (config.data.trainModels.length === 0 &&
        config.data.routes.length === 0 &&
        config.data.stops.length === 0) {
        alert('⚠️ No hay configuraciones personalizadas para compartir.\n\nCrea modelos o rutas primero.');
        return;
    }

    if (typeof LZString === 'undefined') {
        alert('❌ Librería de compresión no disponible.');
        return;
    }

    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(config));

    if (compressed.length > 2900) {
        showConfigSharingModal('too-large', { config });
        return;
    }

    showConfigSharingModal('qr-ready', { compressed, config });
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

            if (navigator.vibrate) navigator.vibrate(200);

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

        const qrCodeErrorCallback = () => {};

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
        }).catch(() => {
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
 * Procesa datos leídos desde QR (comprimidos con LZ-String)
 * @param {string} dataStr - Datos comprimidos del QR
 */
function processConfigQRData(dataStr) {
    try {
        if (typeof LZString === 'undefined') {
            throw new Error('Librería de descompresión no disponible');
        }

        const decompressed = LZString.decompressFromEncodedURIComponent(dataStr.trim());
        if (!decompressed) {
            alert('❌ Código QR no válido.\n\nEl código no contiene una configuración Navirea.');
            return;
        }

        const config = JSON.parse(decompressed);
        showImportConfirmation(config);

    } catch (error) {
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
    const existing = document.querySelector('.config-sharing-modal');
    if (existing) existing.closest('.modal-overlay').remove();

    let content = '';

    switch(state) {
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
                            <div id="config-qrcode-container" style="display: flex; justify-content: center; margin-bottom: 1rem; background: #ffffff; padding: 1.5rem; border-radius: 12px;"></div>
                            <div style="text-align: center;">
                                <p style="font-size: 0.9rem; color: #4b5563;">
                                    <strong>${data.config.data.trainModels.length}</strong> modelos •
                                    <strong>${data.config.data.routes.length}</strong> rutas •
                                    <strong>${data.config.data.stops.length}</strong> paradas
                                </p>
                                <p style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.5rem;">
                                    Escanéalo con otro dispositivo Navirea
                                </p>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="clear-btn" onclick="closeConfigSharingModal()">Cerrar</button>
                        </div>
                    </div>
                </div>
            `;
            break;

        case 'too-large':
            content = `
                <div class="modal-overlay">
                    <div class="modal config-sharing-modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Configuración demasiado grande</h3>
                            <button class="close-btn" onclick="closeConfigSharingModal()">✕</button>
                        </div>
                        <div class="qr-content" style="padding: 2rem; text-align: center;">
                            <p style="color: #f59e0b; font-size: 2rem; margin-bottom: 1rem;">⚠️</p>
                            <p style="color: #6b7280;">
                                La configuración es demasiado grande para un código QR.
                            </p>
                            <p style="color: #9ca3af; margin-top: 1rem; font-size: 0.875rem;">
                                Usa "Exportar Todo" para compartir como archivo JSON.
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

    if (state === 'qr-ready') {
        const container = document.getElementById('config-qrcode-container');
        if (container && typeof QRCode !== 'undefined') {
            new QRCode(container, {
                text: data.compressed,
                width: 320,
                height: 320,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.L
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

// Exportar a window para compatibilidad con HTML inline handlers
if (typeof window !== 'undefined') {
    window.generateConfigQR = generateConfigQR;
    window.scanConfigQR = scanConfigQR;
    window.closeConfigSharingModal = closeConfigSharingModal;
    window.closeConfigScanModal = closeConfigScanModal;
}
