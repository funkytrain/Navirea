# Spec: Resumen de Turno y Notas por Coche

**Fecha:** 2026-06-20  
**Estado:** Pendiente de implementación

---

## Contexto

Navirea es una PWA para interventores de Cercanías y Media Distancia. Este spec cubre dos features complementarias:

1. **Resumen de Turno** — registro temporal del turno y resumen de cierre accesible desde el menú de 3 puntos.
2. **Notas por Coche** — extensión del modal "Notas del servicio" con pestañas por coche.

---

## Feature 1: Resumen de Turno

### Comportamiento del reloj de turno

**Inicio del turno:**  
Se registra `state.shiftStartTime` (timestamp ISO) la primera vez que `state.trainNumber` pasa de `null` (o vacío) a un valor real durante una sesión. También se resetea cuando el usuario cambia el número de tren mediante `changeTrainNumber()`. Se persiste en `localStorage` con clave `train${selectedTrain}ShiftStartTime` para sobrevivir recargas de página sin cambio de número.

**Fin del turno:**  
Se registra en el momento en que el usuario pulsa "Finalizar turno" en el menú de 3 puntos. No se persiste — solo existe durante la visualización del resumen.

**Reset automático:**  
Al llamar a `changeTrainNumber()`, se borra `shiftStartTime` de `localStorage` y se asigna el timestamp actual como nuevo inicio. Así, si el interventor abre la app al día siguiente con otro número de tren, el turno anterior queda descartado automáticamente.

**Recarga sin cambio de número:**  
Si el usuario recarga la app con el mismo número de tren activo, `shiftStartTime` se recupera de `localStorage` — el turno continúa desde su inicio original.

### Entrada en el menú de 3 puntos

Se añade una nueva entrada en el menú `more-options-dropdown`, antes del primer separador:

```
⏹ Finalizar turno
```

Solo visible cuando `state.trainNumber` tiene valor (no tiene sentido sin un servicio activo). Si no hay número de tren, la opción está oculta o deshabilitada.

### Modal de resumen

Al pulsar "Finalizar turno" se abre un modal (usando el sistema de modales existente) con el siguiente contenido:

**Cabecera:**
- Título: "Resumen de turno"
- Botón de cierre (X)

**Cuerpo:**

```
Tren:        [nombre del modelo] · [número de tren]
Inicio:      [HH:MM del shiftStartTime]
Fin:         [HH:MM del momento actual]
Duración:    [X h XX min]

─── Ocupación ───
Asientos ocupados al cierre: XX / YY (ZZ%)
Paradas con más bajadas:
  1. [Parada A] — XX viajeros
  2. [Parada B] — XX viajeros
  3. [Parada C] — XX viajeros

─── Incidencias activas ───
[Si no hay]: Sin incidencias registradas
[Si hay]:
  · Puerta D1-L · C2
  · WC1 · C3
  · ...

─── Notas del servicio ───
[Si no hay]: Sin notas
[Si hay]: texto completo de state.serviceNotes

─── Notas por coche ───
[Solo coches con nota, formato "C1: texto"]
[Si no hay ninguna]: Sin notas por coche
```

**Pie del modal:**
- Botón "Compartir como texto" — genera un texto plano con el mismo contenido y llama a `navigator.share()` si está disponible, o copia al portapapeles con `navigator.clipboard.writeText()` como fallback.
- Botón "Exportar JSON" — llama al `exportTurn()` existente.
- Botón "Cerrar" — cierra el modal. Los datos del tren **no se borran**.

### Cambios en state y storage

**Añadir a `state`:**
```js
shiftStartTime: null  // ISO string o null
```

**Añadir a `loadData()`** en `StorageService.js`:
```js
const savedShiftStart = localStorage.getItem(`train${state.selectedTrain}ShiftStartTime`);
if (savedShiftStart) state.shiftStartTime = savedShiftStart;
```

**Añadir a `saveData()`** en `StorageService.js`:
```js
if (state.shiftStartTime) {
    localStorage.setItem(`train${state.selectedTrain}ShiftStartTime`, state.shiftStartTime);
} else {
    localStorage.removeItem(`train${state.selectedTrain}ShiftStartTime`);
}
```

**En `script.js`**, detectar primera asignación de número de tren (función `setTrainNumber` / zona donde se asigna `state.trainNumber`):
- Si `state.shiftStartTime` es null → asignar `new Date().toISOString()`

**En `changeTrainNumber()`**:
- Resetear `state.shiftStartTime = new Date().toISOString()` (nuevo turno, nuevo inicio)
- Limpiar la clave anterior de localStorage

### Nuevo módulo

Crear `src/features/shift-summary.js` con:
- `initShiftStart()` — asigna `shiftStartTime` si es null
- `openShiftSummary()` — genera y muestra el modal de resumen
- `generateSummaryText()` — genera el texto plano para compartir
- Exportar todas al scope global vía `Object.assign(window, {...})`

---

## Feature 2: Notas por Coche

### Cambios en state y storage

**Añadir a `state`:**
```js
coachNotes: {}  // { "C1": "texto...", "C2": "..." }
```

**Añadir a `loadData()`**:
```js
const savedCoachNotes = localStorage.getItem(`train${state.selectedTrain}CoachNotes`);
if (savedCoachNotes) {
    try { state.coachNotes = JSON.parse(savedCoachNotes); } catch(e) {}
}
```

**Añadir a `saveData()`**:
```js
localStorage.setItem(`train${state.selectedTrain}CoachNotes`, JSON.stringify(state.coachNotes || {}));
```

**Reset en `changeTrainNumber()`**: limpiar `state.coachNotes = {}`.

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

Pasar los nuevos parámetros al template:
```js
window.Templates.generateServiceNotesModal(
    state.serviceNotes,
    state.coachNotes || {},
    trainModels[state.selectedTrain].coaches
)
```

### Nueva función `updateCoachNote(coachId, value)`

En `script.js`:
```js
function updateCoachNote(coachId, value) {
    if (!state.coachNotes) state.coachNotes = {};
    state.coachNotes[coachId] = value;
    saveData();
}
```

Exportar a `window` junto al resto.

### Cambio en `changeTrainNumber()` y `selectTrain()`

En ambas funciones, limpiar `state.coachNotes = {}` y eliminar la clave de localStorage.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/features/shift-summary.js` | Nuevo módulo |
| `src/services/StorageService.js` | `loadData` / `saveData` para `shiftStartTime` y `coachNotes` |
| `src/utils/templates.js` | `generateServiceNotesModal` con pestañas; nueva función `generateShiftSummaryModal` |
| `script.js` | `state` con nuevos campos; `changeTrainNumber`; `openServiceNotes`; nueva función `updateCoachNote`; lógica `initShiftStart` al asignar número de tren |
| `index.html` | Incluir `src/features/shift-summary.js` |
| `styles.css` | Estilos para pestañas del modal de notas y para el modal de resumen |

---

## Lo que NO cambia

- Los datos del tren (asientos, incidencias) no se borran al ver el resumen.
- El flujo de "Compartir turno" / "Exportar JSON" existente no se modifica.
- El badge de notas en el botón del header sigue funcionando como hoy (basado solo en `serviceNotes`).
- No se añade ningún indicador visual nuevo en los botones de coche del header.
