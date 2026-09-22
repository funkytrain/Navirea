// ============================================================================
// CONFIG.JS - Configuración pública de la aplicación
// ============================================================================
// Este fichero SÍ se versiona y se despliega. Solo debe contener valores que
// no sean secretos.
//
// Las credenciales (como la clave de JSONBin) van en config.local.js, que
// está en .gitignore y por tanto no llega a producción.
// ============================================================================

// URL del proxy que sirve los datos de circulación en tiempo real.
//
// No es un secreto: es un endpoint público que solo reenvía datos públicos
// de Renfe, y además solo responde a los dominios autorizados en su propia
// lista blanca (ver worker/README.md). Por eso vive aquí y no en
// config.local.js, que no se despliega.
//
// Si se deja vacío, Navirea funciona con normalidad y la información de
// tiempo real simplemente no aparece.
window.RENFE_PROXY_URL = 'https://navirea-renfe.afebu.workers.dev';
