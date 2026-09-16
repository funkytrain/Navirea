// ============================================================================
// RENFE-PROXY.JS - Cloudflare Worker: proxy CORS para el visor de Renfe
// ============================================================================
// El feed de tiempo real de Renfe NO envía cabeceras CORS, por lo que el
// navegador bloquea la petición directa desde Navirea. Este Worker actúa de
// intermediario y resuelve tres problemas:
//
//   1. CORS      → añade Access-Control-Allow-Origin para nuestro dominio
//   2. Encoding  → el origen sirve ISO-8859-1; sin convertir, "LOGROÑO"
//                  llega como "LOGRO?O" y los nombres de estación salen rotos
//   3. Caché     → 30s, igual que el max-age del origen, para no saturarlo
//
// Despliegue: ver worker/README.md
// ============================================================================

// Dominios autorizados a usar este proxy.
// Añade aquí el dominio donde sirvas Navirea (sin barra final, y con
// coma al final de cada línea salvo la última).
const ALLOWED_ORIGINS = [
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'https://navirea.vercel.app'
];

// Feeds permitidos. Lista blanca cerrada: el Worker no es un proxy abierto.
const FEEDS = {
    flota: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json',
    rutas: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json'
};

const CACHE_SECONDS = 30;

/**
 * Construye las cabeceras CORS para un origen dado.
 * Si el origen no está autorizado no se emite la cabecera y el navegador
 * bloqueará la respuesta (comportamiento deseado).
 */
function corsHeaders(origin) {
    const headers = {
        'Vary': 'Origin'
    };
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return headers;
}

export default {
    async fetch(request) {
        const origin = request.headers.get('Origin');
        const cors = corsHeaders(origin);

        // Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    ...cors,
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }

        if (request.method !== 'GET') {
            return new Response('Method not allowed', { status: 405, headers: cors });
        }

        const feed = new URL(request.url).searchParams.get('feed');
        const target = FEEDS[feed];
        if (!target) {
            return new Response(
                JSON.stringify({ error: 'Feed desconocido. Usa ?feed=flota o ?feed=rutas' }),
                { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }

        try {
            const upstream = await fetch(target, {
                cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true }
            });

            if (!upstream.ok) {
                return new Response(
                    JSON.stringify({ error: 'Origen no disponible', status: upstream.status }),
                    { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
                );
            }

            // El origen declara application/json pero el cuerpo viene en
            // ISO-8859-1. Decodificar explícitamente antes de reenviar.
            const buffer = await upstream.arrayBuffer();
            const text = new TextDecoder('iso-8859-1').decode(buffer);

            return new Response(text, {
                status: 200,
                headers: {
                    ...cors,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Cache-Control': `public, max-age=${CACHE_SECONDS}`
                }
            });
        } catch (err) {
            return new Response(
                JSON.stringify({ error: 'Fallo al contactar con el origen' }),
                { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
            );
        }
    }
};
