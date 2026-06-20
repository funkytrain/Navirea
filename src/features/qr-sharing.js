// ============================================
// SISTEMA DE COMPARTIR POR QR
// ============================================
// Si config.local.js define window.JSONBIN_API_KEY, los datos se suben a
// JSONBin y el QR lleva solo el ID corto (24 chars) — soporta turnos grandes.
// Si no hay key, se usa compresión LZ-String directa en el QR (límite ~2900 bytes).

// Variable de estado del escáner QR
let html5QrCode = null;

/**
 * Sube un turno a JSONBin y devuelve el ID del bin.
 */
async function uploadTurnToServer(turnData) {
    const apiKey = window.JSONBIN_API_KEY;
    const response = await fetch('https://api.jsonbin.io/v3/b', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': apiKey,
            'X-Bin-Private': 'false',
            'X-Bin-Name': `Navirea-${turnData.trainName}-${Date.now()}`
        },
        body: JSON.stringify(turnData)
    });
    if (!response.ok) throw new Error(`JSONBin error ${response.status}`);
    const data = await response.json();
    return data.metadata.id;
}

/**
 * Descarga un turno desde JSONBin usando su ID.
 */
async function downloadTurnFromServer(binId) {
    const apiKey = window.JSONBIN_API_KEY;
    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: { 'X-Master-Key': apiKey }
    });
    if (!response.ok) throw new Error(`JSONBin error ${response.status}`);
    const data = await response.json();
    return data.record;
}

/**
 * Genera un código QR para compartir el turno actual.
 * Con JSONBIN_API_KEY: sube los datos y el QR lleva solo el ID corto.
 * Sin key: comprime con LZ-String directamente en el QR.
 */
export async function generateQRCode() {
    const state = window.state;
    const getAllTrains = window.getAllTrains;

    const turnData = {
        trainModel: state.selectedTrain,
        seatData: state.seatData,
        trainDirection: state.trainDirection,
        serviceNotes: state.serviceNotes || "",
        incidents: state.incidents || {},
        trainNumber: state.trainNumber || null,
        currentStop: state.currentStop || null,
        exportDate: new Date().toISOString(),
        trainName: getAllTrains()[state.selectedTrain].name,
        ...(state.selectedTrain === "470" && {
            coach470Variants: state.coach470Variants
        })
    };

    const modal = `
        <div class="modal-overlay" onclick="closeQRModal(event)">
            <div class="modal qr-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Compartir turno por QR</h3>
                        <button class="close-btn" onclick="closeQRModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="qr-content">
                    <p style="text-align: center; margin-bottom: 1rem; color: #6b7280;">
                        ⏳ Generando código QR...
                    </p>
                    <div id="qrcode-container" style="display: flex; justify-content: center; align-items: center; min-height: 280px; background: #ffffff; padding: 1.5rem; border-radius: 12px; margin: 0 auto; max-width: fit-content;">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeQRModal()">Cerrar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    window.lockBodyScroll();

    try {
        const hasJsonbin = typeof window.JSONBIN_API_KEY === 'string' && window.JSONBIN_API_KEY.length > 10;

        if (hasJsonbin) {
            // Modo JSONBin: sube los datos y el QR lleva solo el ID corto
            const message = document.querySelector('.qr-content > p');
            if (message) message.textContent = '⏳ Subiendo datos...';

            const binId = await uploadTurnToServer(turnData);
            renderQRInContainer(binId, QRCode.CorrectLevel.H);

            if (message) {
                message.innerHTML = `
                    ✅ Código QR generado correctamente<br>
                    <small style="color: #6b7280;">Escanéalo con otro dispositivo Navirea · Válido 30 días</small>
                `;
            }
            appendTurnInfo(turnData, binId);
        } else {
            // Modo local: comprime con LZ-String directamente en el QR
            if (typeof LZString === 'undefined') throw new Error('Librería de compresión no disponible');

            const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(turnData));

            if (compressed.length > 2900) {
                const container = document.getElementById('qrcode-container');
                if (container) {
                    container.innerHTML = `
                        <p style="color: #f59e0b; text-align: center; padding: 1rem;">
                            ⚠️ El turno tiene demasiados datos para un QR.<br><br>
                            <small style="color: #6b7280;">Usa "Exportar por archivo JSON" para compartir este turno.</small>
                        </p>
                    `;
                }
                const message = document.querySelector('.qr-content > p');
                if (message) message.remove();
                return;
            }

            renderQRInContainer(compressed, QRCode.CorrectLevel.L);

            const message = document.querySelector('.qr-content > p');
            if (message) {
                message.innerHTML = `
                    ✅ Código QR generado correctamente<br>
                    <small style="color: #6b7280;">Escanéalo con otro dispositivo Navirea</small>
                `;
            }
            appendTurnInfo(turnData);
        }
    } catch (error) {
        const container = document.getElementById('qrcode-container');
        if (container) {
            container.innerHTML = `
                <p style="color: #ef4444; text-align: center;">
                    ❌ Error al generar código QR<br>
                    <small>${window.escapeHtml(error.message)}</small><br><br>
                    <small style="color: #6b7280;">Usa "Exportar por archivo JSON" como alternativa</small>
                </p>
            `;
        }
    }
}

function renderQRInContainer(text, correctLevel) {
    const container = document.getElementById('qrcode-container');
    if (!container || typeof QRCode === 'undefined') return;
    container.innerHTML = '';
    new QRCode(container, {
        text,
        width: 320,
        height: 320,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel
    });
}

function appendTurnInfo(turnData, binId) {
    const container = document.getElementById('qrcode-container');
    if (!container) return;
    const codeHtml = binId
        ? `<p style="font-size:0.75rem;color:#9ca3af;margin-top:0.5rem;">Código: <code style="background:#f3f4f6;padding:0.2rem 0.4rem;border-radius:4px;">${window.escapeHtml(binId)}</code></p>`
        : '';
    container.insertAdjacentHTML('afterend', `
        <div style="text-align:center;margin-top:1rem;">
            <p style="font-size:0.9rem;color:#4b5563;">
                <strong>${window.escapeHtml(turnData.trainName)}</strong>
                ${turnData.trainNumber ? ` - Nº ${window.escapeHtml(String(turnData.trainNumber))}` : ''}
            </p>
            <p style="font-size:0.85rem;color:#6b7280;margin-top:0.25rem;">
                ${Object.keys(turnData.seatData).length} asientos registrados
            </p>
            ${codeHtml}
        </div>
    `);
}

/**
 * Cierra el modal de código QR
 */
export function closeQRModal(event) {
    if (!event || event.target === event.currentTarget ||
        event.target.classList.contains('close-btn') ||
        event.target.closest('.close-btn')) {
        const modal = document.querySelector('.qr-modal')?.closest('.modal-overlay');
        if (modal) modal.remove();
        window.unlockBodyScroll();
    }
}

/**
 * Abre el modal para escanear código QR
 */
export function scanQRCode() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('❌ Tu navegador no soporta acceso a la cámara.\n\nUsa "Importar desde archivo JSON" en su lugar.');
        return;
    }

    const modal = `
        <div class="modal-overlay" onclick="closeScanModal(event)">
            <div class="modal scan-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="modal-header-top">
                        <h3 class="modal-title">Escanear código QR</h3>
                        <button class="close-btn" onclick="closeScanModal()">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="scan-content">
                    <p style="text-align: center; margin-bottom: 1rem; color: #6b7280; font-size: 0.9rem;">
                        📷 Apunta la cámara al código QR
                    </p>
                    <div id="qr-reader" style="width: 100%; max-width: 500px; margin: 0 auto;"></div>
                    <p id="scan-status" style="text-align: center; margin-top: 1rem; color: #4b5563; font-size: 0.85rem;">
                        Iniciando cámara...
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="clear-btn" onclick="closeScanModal()">Cancelar</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
    window.lockBodyScroll();

    startQRScanning();
}

/**
 * Inicia el proceso de escaneo de QR
 */
async function startQRScanning() {
    const readerDiv = document.getElementById('qr-reader');
    const status = document.getElementById('scan-status');

    if (!readerDiv) return;

    try {
        html5QrCode = new Html5Qrcode("qr-reader");

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

            html5QrCode.stop()
                .then(() => {
                    html5QrCode.clear();
                    html5QrCode = null;
                    processQRData(decodedText);
                    setTimeout(() => {
                        const overlay = document.querySelector('.scan-modal')?.closest('.modal-overlay');
                        if (overlay) overlay.remove();
                        if (!document.querySelector('.modal-overlay')) window.unlockBodyScroll();
                    }, 500);
                })
                .catch(err => {
                    console.error("Error stopping scanner:", err);
                    html5QrCode = null;
                    processQRData(decodedText);
                    setTimeout(() => {
                        const overlay = document.querySelector('.scan-modal')?.closest('.modal-overlay');
                        if (overlay) overlay.remove();
                        if (!document.querySelector('.modal-overlay')) window.unlockBodyScroll();
                    }, 500);
                });
        };

        const qrCodeErrorCallback = () => {};

        html5QrCode.start(
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
            html5QrCode.start(
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
                html5QrCode = null;
            });
        });

    } catch (error) {
        if (status) {
            status.textContent = '❌ Error al iniciar escáner';
            status.style.color = '#ef4444';
        }
        console.error('Scanner init error:', error);
        html5QrCode = null;
    }
}

/**
 * Procesa los datos leídos desde un código QR.
 * Si es un ID de JSONBin (24 chars hex) lo descarga del servidor.
 * Si no, intenta descomprimir con LZ-String.
 */
async function processQRData(dataStr) {
    const state = window.state;
    const getAllTrains = window.getAllTrains;
    const saveData = window.saveData;
    const render = () => window.AppState.notify();

    try {
        let turnData;
        const isJsonbinId = /^[a-f0-9]{24}$/i.test(dataStr.trim());

        if (isJsonbinId && typeof window.JSONBIN_API_KEY === 'string' && window.JSONBIN_API_KEY.length > 10) {
            const statusEl = document.getElementById('scan-status');
            if (statusEl) {
                statusEl.textContent = '📥 Descargando datos del servidor...';
                statusEl.style.color = '#4f46e5';
            }
            turnData = await downloadTurnFromServer(dataStr.trim());
        } else {
            if (typeof LZString === 'undefined') throw new Error('Librería de descompresión no disponible');
            const decompressed = LZString.decompressFromEncodedURIComponent(dataStr.trim());
            if (!decompressed) throw new Error('No se pudo descomprimir el código QR');
            turnData = JSON.parse(decompressed);
        }
        const allTrains = getAllTrains();

        if (!turnData.trainModel || !allTrains[turnData.trainModel]) {
            alert('❌ Código QR no válido o modelo de tren no reconocido');
            return;
        }

        const trainName = turnData.trainName || turnData.trainModel;
        const exportDate = turnData.exportDate ?
            new Date(turnData.exportDate).toLocaleString('es-ES') :
            'desconocida';

        if (confirm(
            `¿Importar turno escaneado?\n\n` +
            `Tren: ${trainName}\n` +
            `Fecha: ${exportDate}\n` +
            `Asientos: ${Object.keys(turnData.seatData || {}).length}\n\n` +
            `Esto reemplazará los datos actuales.`
        )) {
            if (state.selectedTrain !== turnData.trainModel) {
                state.selectedTrain = turnData.trainModel;
                state.selectedCoach = allTrains[turnData.trainModel].coaches[0].id;
                localStorage.setItem('selectedTrain', turnData.trainModel);
            }

            state.seatData = turnData.seatData || {};
            state.trainDirection = turnData.trainDirection || {};
            state.serviceNotes = turnData.serviceNotes || "";
            state.incidents = turnData.incidents || {};

            if (turnData.trainNumber) {
                state.trainNumber = turnData.trainNumber;
                localStorage.setItem('trainNumber', turnData.trainNumber);
            }

            if (turnData.currentStop) {
                state.currentStop = turnData.currentStop;
                localStorage.setItem('currentStop', turnData.currentStop);
            }

            if (turnData.trainModel === "470" && turnData.coach470Variants) {
                state.coach470Variants = turnData.coach470Variants;
                localStorage.setItem('coach470Variants', JSON.stringify(turnData.coach470Variants));
            }

            saveData();
            render();
            alert('✅ Turno importado correctamente desde QR');
        }

    } catch (error) {
        alert('❌ Error al procesar código QR: ' + error.message);
        console.error('QR processing error:', error);
    }
}

/**
 * Cierra el modal de escaneo QR
 */
export function closeScanModal(event) {
    const isButtonClick = event && event.target && (
        event.target.classList.contains('close-btn') ||
        event.target.closest('.close-btn') ||
        event.target.classList.contains('clear-btn') ||
        event.target.closest('.clear-btn')
    );
    const isOverlayClick = event && event.target === event.currentTarget;

    if (event && !isButtonClick && !isOverlayClick) return;

    if (html5QrCode) {
        try {
            html5QrCode.stop()
                .then(() => {
                    html5QrCode.clear();
                    html5QrCode = null;
                    removeModalAndUnlock();
                })
                .catch(err => {
                    console.error("Error stopping:", err);
                    html5QrCode = null;
                    removeModalAndUnlock();
                });
        } catch (e) {
            console.error("Exception stopping:", e);
            html5QrCode = null;
            removeModalAndUnlock();
        }
    } else {
        removeModalAndUnlock();
    }
}

/**
 * Remueve el modal de escaneo y desbloquea scroll
 */
export function removeModalAndUnlock() {
    const overlay = document.querySelector('.scan-modal')?.closest('.modal-overlay');
    if (overlay) overlay.remove();
    if (!document.querySelector('.modal-overlay')) window.unlockBodyScroll();
}

// Exportar al objeto window para compatibilidad con HTML inline handlers
if (typeof window !== 'undefined') {
    window.generateQRCode = generateQRCode;
    window.closeQRModal = closeQRModal;
    window.scanQRCode = scanQRCode;
    window.closeScanModal = closeScanModal;
    window.removeModalAndUnlock = removeModalAndUnlock;
}
