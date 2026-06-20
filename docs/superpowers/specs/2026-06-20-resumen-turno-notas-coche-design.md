# Spec: Resumen de Turno y Notas por Coche

**Fecha:** 2026-06-20  
**Estado:** Pendiente de implementación

---

## Contexto

Navirea es una PWA para interventores de Cercanías y Media Distancia. Este spec cubre dos features complementarias:

1. **Resumen de Turno** — historial acumulado de trenes trabajados en la jornada, con resumen de cierre accesible desde el menú de 3 puntos.
2. **Notas por Coche** — extensión del modal "Notas del servicio" con pestañas por coche.

---

## Feature 1: Resumen de Turno

### Modelo de jornada acumulada

Un turno real de interventor incluye varios trenes distintos en la misma jornada (normalmente 2-3). El diseño acumula un **historial de trenes trabajados** durante la jornada en lugar de resetear al cambiar de número de tren.

**Estructura del historial (`shiftHistory`):**
```js
// Guardado en localStorage con clave "navereaShiftHistory"
[
  {
    trainModel: "463",
    trainName: "Cercanías 463",
    trainNumber: "18021",
    startTime: "2026-06-20T07:14:00.000Z",
    endTime: "2026-06-20T09:30:00.000Z",   // null si es el tren activo
    totalSeats: 240,
    occupiedSeats: 187,
    topStops: [
      { name: "Zaragoza-Delicias", count: 34 },
      { name: "Utebo", count: 20 },
      { name: "Casetas", count: 11 }
    ],
    incidents: ["Puerta D1-L · C2", "WC1 · C3"],
    serviceNotes: "Retraso 5 min en Utebo",
    coachNotes: { "C1": "Olor a quemado", "C3": "" }
  },
  // ... trenes siguientes
]
```

El último elemento del array es siempre el tren activo (con `endTime: null`). Los anteriores tienen `endTime` registrado.

### Ciclo de vida del historial

**Al introducir el primer número de tren de la jornada:**
- Si `shiftHistory` está vacío (o no existe en localStorage), crear el primer elemento con `startTime = now`, `endTime = null`.

**Al cambiar de número de tren (`changeTrainNumber()`):**
- Registrar `endTime = now` y una snapshot de ocupación/incidencias/notas en el elemento actual del historial.
- Añadir un nuevo elemento al historial con el nuevo número de tren y `startTime = now`, `endTime = null`.
- Los datos de asientos/incidencias del tren anterior se borran del state como ya ocurre hoy.

**Al cambiar modelo de tren (`selectTrain()`):**
- Mismo comportamiento que `changeTrainNumber()`: cierra el elemento actual y abre uno nuevo.

**Al recargar la app:**
- `shiftHistory` se recupera de localStorage tal cual. El tren activo (último elemento, `endTime: null`) continúa desde su `startTime` original.

**Nueva jornada (`startNewShift()`):**
- Limpia `shiftHistory` de localStorage y del state.
- Añade entrada en el menú de 3 puntos: **"Nueva jornada"** (con confirmación).
- Solo visible cuando existe historial.

### Entradas en el menú de 3 puntos

Antes del primer separador, se añaden dos nuevas entradas:

```
⏹  Finalizar turno       (visible siempre que exista shiftHistory con algún elemento)
🔄  Nueva jornada         (visible solo cuando existe shiftHistory con algún elemento)
```

### Modal de resumen

Al pulsar "Finalizar turno":
1. Se registra `endTime = now` en el último elemento del historial (snapshot final).
2. Se abre el modal de resumen. Los datos del tren en `state` **no se borran**.

El modal muestra una sección por cada tren trabajado en la jornada, en orden cronológico:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESUMEN DE JORNADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── Tren 1 ──────────────────────
Modelo:    Cercanías 463
Servicio:  18021
Inicio:    07:14   Fin: 09:30   (2 h 16 min)

Ocupación al cierre: 187 / 240 (78%)
Top bajadas:
  1. Zaragoza-Delicias — 34
  2. Utebo — 20
  3. Casetas — 11

Incidencias: Puerta D1-L · C2 · WC1 · C3
Notas servicio: Retraso 5 min en Utebo
Notas C1: Olor a quemado

── Tren 2 ──────────────────────
...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL JORNADA
Duración total: 8 h 12 min
Trenes trabajados: 3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Pie del modal:**
- Botón "Compartir como texto" — genera texto plano con el contenido completo y llama a `navigator.share()` si está disponible, o copia al portapapeles con `navigator.clipboard.writeText()` como fallback.
- Botón "Cerrar" — cierra el modal. El historial y los datos del tren activo **no se borran**.

### Storage

- Clave `navereaShiftHistory` en localStorage — array JSON del historial completo de la jornada.
- Independiente de la clave por tren (`train${selectedTrain}...`), ya que persiste a través de cambios de tren.

### Snapshot al cambiar de tren

Cuando se cierra un elemento del historial (al cambiar número o modelo de tren), se captura el estado actual:
- `occupiedSeats` / `totalSeats` — calculados desde `state.seatData` y el layout del tren
- `topStops` — top 3 paradas por número de asientos con esa bajada
- `incidents` — array de strings descriptivos generados desde `state.incidents`
- `serviceNotes` — copia de `state.serviceNotes`
- `coachNotes` — copia de `state.coachNotes`

### Nuevo módulo

Crear `src/features/shift-summary.js` con:
- `initShiftEntry(trainModel, trainName, trainNumber)` — crea o continúa el elemento activo del historial
- `closeCurrentShiftEntry()` — registra `endTime` y snapshot en el elemento activo
- `openShiftSummary()` — cierra el elemento activo, genera y muestra el modal de resumen
- `startNewShift()` — limpia el historial (con confirmación)
- `generateSummaryText()` — genera el texto plano para compartir
- `loadShiftHistory()` / `saveShiftHistory()` — persistencia en localStorage
- Exportar todas al scope global vía `Object.assign(window, {...})`

---

## Feature 2: Notas por Coche

### Cambios en state y storage

**Añadir a `state`:**
```js
coachNotes: {}  // { "C1": "texto...", "C2": "..." }
```

**Añadir a `loadData()`** en `StorageService.js`:
```js
const savedCoachNotes = localStorage.getItem(`train${state.selectedTrain}CoachNotes`);
if (savedCoachNotes) {
    try { state.coachNotes = JSON.parse(savedCoachNotes); } catch(e) {}
}
```

**Añadir a `saveData()`** en `StorageService.js`:
```js
localStorage.setItem(`train${state.selectedTrain}CoachNotes`, JSON.stringify(state.coachNotes || {}));
```

**Reset en `changeTrainNumber()` y `selectTrain()`**: limpiar `state.coachNotes = {}` y eliminar la clave de localStorage.

### Modificación del modal "Notas del servicio"

El modal actual (`generateServiceNotesModal` en `src/utils/templates.js`) se convierte en un modal con pestañas. Recibe adicionalmente la lista de coches del tren activo y el objeto `coachNotes`.

**Estructura de pestañas:**
```
[ Servicio ] [ C1 ] [ C2 ] [ C3 ] ...
```

- La pestaña activa se resalta visualmente.
- La pestaña "Servicio" muestra el textarea actual sin cambios.
- Cada pestaña de coche muestra un textarea con `placeholder="Notas del coche CX..."`.
- El cambio de pestaña es solo visual (mostrar/ocultar divs), sin cerrar ni reabrir el modal.

**Firma actualizada:**
```js
function generateServiceNotesModal(notes, coachNotes, coaches)
```

Donde `coaches` es el array de coches del tren activo (`trainModels[state.selectedTrain].coaches`).

### Actualización de `openServiceNotes()` en `script.js`

```js
window.Templates.generateServiceNotesModal(
    state.serviceNotes,
    state.coachNotes || {},
    trainModels[state.selectedTrain].coaches
)
```

### Nueva función `updateCoachNote(coachId, value)`

```js
function updateCoachNote(coachId, value) {
    if (!state.coachNotes) state.coachNotes = {};
    state.coachNotes[coachId] = value;
    saveData();
}
```

Exportar a `window` junto al resto.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/features/shift-summary.js` | Nuevo módulo (historial de jornada) |
| `src/services/StorageService.js` | `loadData` / `saveData` para `coachNotes`; el historial tiene su propia persistencia en el módulo |
| `src/utils/templates.js` | `generateServiceNotesModal` con pestañas; nueva función `generateShiftSummaryModal` |
| `script.js` | `state` con `coachNotes`; hooks en `changeTrainNumber` y `selectTrain`; `openServiceNotes`; nueva función `updateCoachNote`; llamada a `initShiftEntry` al asignar número de tren |
| `index.html` | Incluir `src/features/shift-summary.js` |
| `styles.css` | Estilos para pestañas del modal de notas y para el modal de resumen de jornada |

---

## Lo que NO cambia

- Los datos del tren activo (asientos, incidencias) no se borran al ver el resumen.
- El flujo de "Compartir turno" / "Exportar JSON" existente no se modifica.
- El badge de notas en el botón del header sigue funcionando como hoy (basado solo en `serviceNotes`).
- No se añade ningún indicador visual nuevo en los botones de coche del header.
