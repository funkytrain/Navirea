// Copia este archivo como "config.local.js" y rellena tu API key de JSONBin.
// IMPORTANTE: config.local.js está en .gitignore — nunca lo commitees.
//
// Cómo obtener la key:
//   1. Ve a https://jsonbin.io y entra en tu cuenta
//   2. Dashboard → API Keys → copia tu X-Master-Key
//
window.JSONBIN_API_KEY = 'TU_X_MASTER_KEY_AQUI';

// ---------------------------------------------------------------------------
// Tiempo real (opcional)
// ---------------------------------------------------------------------------
// URL del Worker de Cloudflare que hace de proxy con el feed de Renfe.
// Ver worker/README.md para desplegarlo.
//
// Si no defines esto, Navirea funciona con normalidad: la información de
// tiempo real simplemente no aparece.
//
// window.RENFE_PROXY_URL = 'https://navirea-renfe.TU-CUENTA.workers.dev';
