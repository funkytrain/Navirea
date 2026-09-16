# Proxy CORS para el feed de Renfe

Worker de Cloudflare que permite a Navirea leer el feed de tiempo real de
Renfe desde el navegador.

## Por qué hace falta

El feed de Renfe es público y no requiere clave, pero **no envía cabeceras
CORS**, así que el navegador bloquea cualquier petición hecha desde otra
web. Un proxy en medio es la única forma de consumirlo desde una PWA.

Además, el origen sirve el JSON en **ISO-8859-1** aunque lo declare como
`application/json`. Sin convertirlo, los nombres de estación con acentos o
eñes llegan rotos (`LOGROÑO` → `LOGRO?O`). El Worker lo convierte a UTF-8.

## Despliegue (5 minutos, gratis)

1. Entra en [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages**
   → **Create**.
2. En la pantalla "Make something new", elige **Start with Hello World!**
   (las opciones de GitHub/GitLab conectan un repositorio y "Upload your
   static files" crea un sitio estático: ninguna sirve aquí).
3. Nombre: `navirea-renfe`. Si ofrece plantilla, deja "Hello World".
4. **Deploy**, y cuando termine abre **Edit code**.
5. Borra el código de ejemplo y pega el contenido de
   [`renfe-proxy.js`](renfe-proxy.js).
6. En `ALLOWED_ORIGINS`, descomenta y pon el dominio donde sirves Navirea.
   Deja los `localhost` si desarrollas en local.
7. **Deploy**. Copia la URL resultante
   (`https://navirea-renfe.TU-CUENTA.workers.dev`).

> El panel de Cloudflare cambia a menudo. Si los nombres no coinciden
> exactamente, busca la opción que cree un Worker **vacío o de ejemplo**,
> no la que conecta un repositorio.

## Conectarlo con Navirea

En `config.local.js` (el mismo fichero de la clave de JSONBin):

```js
window.RENFE_PROXY_URL = 'https://navirea-renfe.TU-CUENTA.workers.dev';
```

Y añade el dominio del Worker a `connect-src` en la CSP de `index.html`.

Sin estos dos pasos, la función de tiempo real simplemente no se activa:
Navirea funciona igual que antes, sin errores.

## Comprobar que va

```bash
curl "https://navirea-renfe.TU-CUENTA.workers.dev/?feed=flota" | head -c 300
```

Debe devolver JSON con `fechaActualizacion` y un array `trenes`.

## Límites

Plan gratuito de Cloudflare: 100.000 peticiones al día. Con polling cada
30 s solo mientras la app está en primer plano, una jornada de 8 horas
consume menos de 1.000. Sobra de largo.

## Aviso

Este feed es una API **no documentada** de Renfe. Funciona hoy y es de
acceso público, pero no es un servicio con soporte: puede cambiar de
formato o dejar de estar disponible sin previo aviso. Navirea está
diseñada para seguir funcionando con normalidad si eso ocurre.
