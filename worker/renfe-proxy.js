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
// Además sirve ?feed=incidencias: las incidencias de la página "Estado de la
// red" de Adif, extraídas de su HTML y devueltas como JSON (ver más abajo).
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

// ---- Estado de la red de Adif ---------------------------------------------
// Adif no publica un feed: las incidencias van dentro del HTML de la página.
// La caché es más larga que la de Renfe (las incidencias cambian en horas, no
// en segundos) para que cada consulta de la app no se traduzca en una
// petición a Adif, que además protege su web contra el tráfico automático.
const ADIF_URL = 'https://www.adif.es/viajeros/estado-de-la-red';
const ADIF_CACHE_SECONDS = 180;

// Comunidades que aparecen como pestañas de la página. Sirven para reconocer
// las cabeceras de grupo ("Navarra / Aragón") sin depender del marcado HTML.
const ADIF_COMUNIDADES = [
    'Andalucía', 'Aragón', 'Asturias', 'Cantabria', 'Castilla y León',
    'Castilla-La Mancha', 'Cataluña', 'Comunidad Valenciana', 'Extremadura',
    'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarra', 'País Vasco'
];

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

// ============================================================================
// PARSER DE "ESTADO DE LA RED"
// ============================================================================
// No se apoya en clases ni en la estructura del DOM, que Adif puede cambiar
// sin avisar: convierte el HTML en líneas de texto y reconoce el patrón que
// ve el usuario, que es mucho más estable:
//
//     Castilla-La Mancha / Madrid        ← cabecera: solo nombres de comunidad
//     Incidencia en la línea ...         ← título
//     Se encuentra interrumpida ...      ← cuerpo (una o más líneas)
//
// Si el patrón no aparece (cambio de página, bloqueo, página de error) el
// parser lo dice con ok:false en lugar de devolver una lista vacía, porque
// "sin incidencias" y "no he entendido la página" no pueden confundirse.
// ============================================================================

const ENTIDADES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
    Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
    ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', iexcl: '¡', iquest: '¿',
    ordm: 'º', ordf: 'ª', ndash: '–', mdash: '—', hellip: '…',
    laquo: '«', raquo: '»'
};

function decodeEntities(text) {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
        if (e[0] === '#') {
            const code = e[1].toLowerCase() === 'x'
                ? parseInt(e.slice(2), 16)
                : parseInt(e.slice(1), 10);
            try { return String.fromCodePoint(code); } catch { return m; }
        }
        return Object.prototype.hasOwnProperty.call(ENTIDADES, e) ? ENTIDADES[e] : m;
    });
}

/** HTML → líneas de texto limpias y no vacías. */
function htmlToLines(html) {
    const text = html
        .replace(/<!--[\s\S]*?-->/g, ' ')
        .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?(p|div|li|ul|ol|h[1-6]|section|article|header|footer|nav|main|aside|tr|table|button|label|option|form)\b[^>]*>/gi, '\n')
        .replace(/<[^>]+>/g, '');

    return decodeEntities(text)
        .split('\n')
        .map(l => l.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
}

/** Minúsculas sin acentos: "Aragón " y "ARAGON" comparan igual. */
function norm(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const COMUNIDADES_NORM = new Map(ADIF_COMUNIDADES.map(c => [norm(c), c]));

/** Lista de comunidades si la línea es solo eso ("A / B / C"); si no, null. */
function parseRegionLine(line) {
    const parts = line.split('/').map(norm);
    if (!parts.every(p => COMUNIDADES_NORM.has(p))) return null;
    return parts.map(p => COMUNIDADES_NORM.get(p));
}

/**
 * Línea que junta varias pestañas ("General Andalucía Aragón ...") cuando el
 * marcado no las separa. No es una cabecera: hay que descartarla.
 */
function isTabsLine(line) {
    let rest = ' ' + norm(line) + ' ';
    for (const name of ['general', ...COMUNIDADES_NORM.keys()]) {
        rest = rest.split(' ' + name + ' ').join('  ');
    }
    return rest.trim() === '' && line.trim().includes(' ') && !parseRegionLine(line);
}

async function shortHash(text) {
    const data = new TextEncoder().encode(norm(text).replace(/\s+/g, ' '));
    const digest = await crypto.subtle.digest('SHA-1', data);
    return [...new Uint8Array(digest)].slice(0, 6)
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @returns {Promise<{ok: boolean, actualizado: string|null, incidencias: Array}>}
 *   incidencias[]: {id, rev, regiones[], titulo, texto}
 *   id  → estable por título: identifica "la misma incidencia"
 *   rev → cambia si Adif edita el texto de una incidencia ya publicada
 */
async function parseAdifIncidents(html) {
    const lines = htmlToLines(html);

    // Comprobación de cordura: la página real siempre trae el título y las
    // pestañas de comunidades. Sin ellas es una página de error o de bloqueo
    // y no hay que fiarse de nada de lo que parezca contener.
    const tieneTitulo = lines.some(l => /^estado de la red$/i.test(l));
    const comunidadesSueltas = new Set(
        lines.filter(l => !l.includes('/') && parseRegionLine(l)).map(norm)
    );
    const tieneTabs = comunidadesSueltas.size >= 5 || lines.some(isTabsLine);
    if (!tieneTitulo || !tieneTabs) {
        return { ok: false, actualizado: null, incidencias: [] };
    }

    const actualizado = lines.find(l => /^\d{2}-\d{2}-\d{4}\s*\/\s*\d{1,2}:\d{2}$/.test(l)) || null;

    const esFin = l => /m[aá]s informaci[oó]n sobre avisos/i.test(l) ||
                       /^sede electr[oó]nica$/i.test(l);

    // Cabecera de grupo = línea de comunidades seguida de algo que NO es otra
    // línea de comunidades: las pestañas van todas seguidas, mientras que una
    // cabecera real va seguida del título de su incidencia.
    const heads = [];
    for (let i = 0; i < lines.length - 1; i++) {
        const regiones = parseRegionLine(lines[i]);
        if (!regiones) continue;
        const next = lines[i + 1];
        if (parseRegionLine(next) || isTabsLine(next) || /^general$/i.test(next)) continue;
        heads.push({ i, regiones });
    }

    const porTitulo = new Map();
    heads.forEach((head, h) => {
        const start = head.i + 1;
        let end = h + 1 < heads.length ? heads[h + 1].i : lines.length;
        for (let j = start; j < end; j++) {
            if (esFin(lines[j])) { end = j; break; }
        }
        if (end <= start) return;

        const titulo = lines[start];
        const texto = lines.slice(start + 1, end).join('\n');

        // Las pestañas pueden repetir la misma incidencia bajo otra cabecera:
        // se fusiona por título y se unen las comunidades.
        const previa = porTitulo.get(titulo);
        if (previa) {
            head.regiones.forEach(r => {
                if (!previa.regiones.includes(r)) previa.regiones.push(r);
            });
        } else {
            porTitulo.set(titulo, { titulo, texto, regiones: [...head.regiones] });
        }
    });

    const incidencias = [];
    for (const inc of porTitulo.values()) {
        incidencias.push({
            id: await shortHash(inc.titulo),
            rev: await shortHash(inc.texto),
            regiones: inc.regiones,
            titulo: inc.titulo,
            texto: inc.texto
        });
    }

    return { ok: true, actualizado, incidencias };
}

async function handleIncidencias(cors) {
    const jsonHeaders = { ...cors, 'Content-Type': 'application/json; charset=utf-8' };
    const fail = (error, status) => new Response(
        JSON.stringify({ error, ...(status ? { status } : {}) }),
        { status: 502, headers: jsonHeaders }
    );

    try {
        const upstream = await fetch(ADIF_URL, {
            headers: {
                'Accept': 'text/html',
                'Accept-Language': 'es-ES,es;q=0.9',
                'User-Agent': 'Navirea/1.0 (+https://navirea.vercel.app)'
            },
            // Solo se cachean las respuestas buenas: un bloqueo puntual no
            // debe quedarse pegado durante minutos.
            cf: {
                cacheTtlByStatus: { '200-299': ADIF_CACHE_SECONDS, '400-599': 0 },
                cacheEverything: true
            }
        });
        if (!upstream.ok) return fail('Origen no disponible', upstream.status);

        const parsed = await parseAdifIncidents(await upstream.text());
        if (!parsed.ok) return fail('Formato de página no reconocido');

        return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { ...jsonHeaders, 'Cache-Control': `public, max-age=${ADIF_CACHE_SECONDS}` }
        });
    } catch (err) {
        return fail('Fallo al contactar con el origen');
    }
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
        if (feed === 'incidencias') return handleIncidencias(cors);

        const target = FEEDS[feed];
        if (!target) {
            return new Response(
                JSON.stringify({ error: 'Feed desconocido. Usa ?feed=flota, ?feed=rutas o ?feed=incidencias' }),
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
