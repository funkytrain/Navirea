# 🔧 Correcciones Aplicadas - Fase 7

## Resumen de Problemas Corregidos

### ✅ Fix 1: Numeración Continua entre Coches

**Problema:** Al crear un modelo con varios coches, la numeración de asientos se reiniciaba a 1 en cada coche.

**Solución Aplicada:**
- Modificado `TrainModelWizard.js` para calcular el siguiente número basándose en TODOS los coches anteriores
- Agregada función `getNextSeatNumber(upToCoachIndex)` que:
  - Recorre todos los coches anteriores al actual
  - Encuentra el número máximo de asiento
  - Retorna `maxSeat + 1` como número inicial para el nuevo coche
- Modificado `SeatLayoutEditor.js` para aceptar parámetro `startNumber` en `init()`
- El editor ahora usa `options.startNumber` si se proporciona

**Resultado:** Los asientos se numeran continuamente: Coche 1 (1-40), Coche 2 (41-80), etc.

---

### ✅ Fix 2: Validación de Números Duplicados

**Problema:** No había validación para detectar si dos asientos tenían el mismo número.

**Solución Aplicada:**
- Modificado `validateStep3()` en `TrainModelWizard.js`
- Agregado algoritmo de detección de duplicados:
  1. Recorre TODOS los coches del tren
  2. Recopila todos los números de asientos en un objeto `seatNumbers`
  3. Si encuentra un número ya existente, detiene la validación
  4. Muestra mensaje de error con los coches donde está duplicado

**Mensaje de Error:**
```
❌ Error: El número de asiento 25 está duplicado.

Se encuentra en:
• Coche Turista
• Coche Preferente

Por favor, corrige los números duplicados antes de continuar.
```

**Resultado:** El wizard no permite avanzar si hay números duplicados.

---

### ✅ Fix 3: Elementos de Texto No Seleccionables

**Problema:** Asientos marcados con texto (WC, EQ, MESA, PMR, etc.) deberían ser no seleccionables.

**Solución Aplicada:**
- Modificado `renderSeatRow()` en `seats-renderer.js`
- Cambiada la lógica de detección:
  - **Antes:** Solo verificaba valores específicos (WC, EQ, MIN, MESA)
  - **Ahora:** Verifica el tipo de dato:
    - `typeof seatNum === 'number'` → Asiento seleccionable (renderSeat)
    - `typeof seatNum === 'string'` → Elemento especial no seleccionable (renderSpecialElement)
    - Excepción: WC se maneja especialmente con `renderWC()`

**Código Aplicado:**
```javascript
if (String(seatNum).includes("WC")) {
    html += renderWC(seatNum, coachId, index);
} else if (typeof seatNum === 'string') {
    // Cualquier string es elemento especial no seleccionable
    html += renderSpecialElement(seatNum);
} else if (typeof seatNum === 'number') {
    // Solo los números son asientos seleccionables
    html += renderSeat(seatNum, coachId);
}
```

**Resultado:** Cualquier texto en el editor (incluso textos custom como "PMR", "VIP", "RESERVED") será no seleccionable.

---

### ✅ Fix 4: Problema de Selector de Trenes y Rutas

**Problema 1:** El selector de trenes no mostraba trenes del sistema (solo botón "Gestionar Configuraciones")
**Causa:** La página se abrió con protocolo `file://` en lugar de `http://`, por lo que no cargaron los JSON del sistema.

**Problema 2:** Al crear una ruta personalizada, las paradas mostradas eran de otro tren
**Causa:** Las rutas personalizadas se guardan como objetos `{ trainNumber, stops: [...], custom, destination }`, pero el código esperaba arrays directos.

**Solución Aplicada:**
- Modificado `data-loader.js` para normalizar rutas:
  - Las rutas del sistema ya son arrays: `trainRoutes["18021"] = ["Madrid", "Zaragoza", ...]`
  - Las rutas custom son objetos: `{ stops: [...], custom: true, destination: "..." }`
  - Ahora se convierten a arrays directos pero preservando las propiedades custom

**Código Aplicado:**
```javascript
// Normalizar rutas: convertir objetos { stops: [...] } a arrays directos
const normalizedRoutes = {};
for (const [trainNumber, route] of Object.entries(allTrainRoutes)) {
    if (Array.isArray(route)) {
        // Ya es un array (ruta del sistema)
        normalizedRoutes[trainNumber] = route;
    } else if (route && route.stops && Array.isArray(route.stops)) {
        // Es un objeto de ruta personalizada con propiedad stops
        normalizedRoutes[trainNumber] = route.stops;
        // Guardar metadata en un objeto separado
        normalizedRoutes[trainNumber].custom = route.custom;
        normalizedRoutes[trainNumber].destination = route.destination;
    } else {
        // Formato desconocido, mantener como está
        normalizedRoutes[trainNumber] = route;
    }
}
```

- Modificado `script.js` para detectar rutas custom correctamente:
```javascript
const isCustomRoute = currentRoute &&
    (currentRoute.custom === true ||
     (Array.isArray(currentRoute) && currentRoute.custom === true));
```

**Resultado:**
- Los trenes personalizados aparecen en el selector cuando se usa servidor HTTP
- Las rutas personalizadas ahora muestran las paradas correctas al clickear un asiento

---

## 📝 Archivos Modificados

1. **src/wizards/TrainModelWizard.js**
   - Líneas 375-420: Nueva función `getNextSeatNumber()` y lógica de numeración continua
   - Líneas 455-516: Validación de números duplicados

2. **src/components/SeatLayoutEditor.js**
   - Líneas 18-36: Soporte para parámetro `startNumber`

3. **src/renderers/seats-renderer.js**
   - Líneas 239-269: Lógica mejorada para detectar elementos no seleccionables

4. **src/utils/data-loader.js**
   - Líneas 42-62: Normalización de rutas custom a arrays

5. **script.js**
   - Líneas 1307-1310: Detección mejorada de rutas custom

---

## 🧪 Cómo Probar los Fixes

### Preparación:
1. Asegúrate de tener un servidor HTTP corriendo:
   ```bash
   python -m http.server 8000
   ```

2. Abre la aplicación:
   ```
   http://localhost:8000/index.html
   ```

### Test 1: Numeración Continua

1. Abre "Gestionar Configuraciones"
2. Crea un nuevo modelo con 3 coches
3. **Coche 1:** Agrega 10 filas 2+2 (asientos 1-40)
4. Click "Siguiente →" para ir al Coche 2
5. **Verifica:** El primer asiento debe ser **41** (no 1)
6. Agrega 8 filas 2+2 (asientos 41-72)
7. Click "Siguiente →" para ir al Coche 3
8. **Verifica:** El primer asiento debe ser **73** (no 1)

✅ **Resultado esperado:** Numeración continua en todos los coches.

### Test 2: Validación de Duplicados

1. En el Coche 2 del test anterior
2. Click en un asiento (ej: 50) y cámbialo manualmente a "25"
3. Intenta avanzar al siguiente paso
4. **Verifica:** Aparece popup de error:
   ```
   ❌ Error: El número de asiento 25 está duplicado.

   Se encuentra en:
   • Coche 1
   • Coche 2

   Por favor, corrige los números duplicados antes de continuar.
   ```
5. Cambia el 25 de vuelta a 50
6. Ahora sí debe permitir avanzar

✅ **Resultado esperado:** No permite guardar con duplicados.

### Test 3: Elementos de Texto No Seleccionables

1. Crea un nuevo tren simple
2. En el editor, agrega una fila
3. Cambia manualmente un asiento a texto: "VIP"
4. Guarda el modelo
5. Selecciona ese tren en la app principal
6. **Verifica:** El elemento "VIP" aparece pero NO es clickeable
7. Intenta hacer click → No pasa nada
8. Click en un asiento numérico → Se abre el popup de parada

✅ **Resultado esperado:** Solo números son seleccionables.

### Test 4: Rutas Personalizadas Funcionan

1. Crea una ruta personalizada:
   - Número: 99001
   - Paradas: Madrid → Zaragoza → Barcelona
2. Guarda la ruta
3. En la app, cambia número de tren a "99001"
4. **Verifica:** Aparece "Parada actual: [RUTA CUSTOM]"
5. Click en un asiento
6. **Verifica:** Solo aparecen las 3 paradas (Madrid, Zaragoza, Barcelona)
7. Selecciona "Zaragoza"
8. **Verifica:** El asiento se marca con "ZDE" (abreviatura correcta)

✅ **Resultado esperado:** Las paradas son las correctas de la ruta custom.

### Test 5: Renumeración Automática al Eliminar

1. Crea un nuevo tren simple
2. En el editor, agrega 3 filas de asientos (debería haber 1-12)
3. **Verifica:** Los asientos están numerados 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
4. Elimina la segunda fila (asientos 5-8)
5. **Verifica:** Los asientos se renumeran automáticamente a 1, 2, 3, 4, 5, 6, 7, 8
6. Agrega una nueva fila
7. **Verifica:** La nueva fila comienza en 9 (no en 13)

✅ **Resultado esperado:** Numeración siempre consecutiva, sin saltos.

### Test 6: Paradas Custom en Dropdown

1. Asegúrate de tener una ruta custom creada (ej: 99001 con paradas Madrid → Zaragoza → Barcelona)
2. En la app principal, cambia el número de tren a 99001
3. **Verifica:** Aparece el badge "RUTA CUSTOM"
4. Click en el campo "Parada actual"
5. Escribe "mad" en el campo de búsqueda
6. **Verifica en consola:** Deberían aparecer logs como:
   ```
   [getCurrentRoute] trainNumber: 99001
   [getCurrentRoute] route: {stops: Array(3), custom: true, ...}
   [getCurrentRoute] ✅ Ruta es array, length: 3
   ```
7. **Verifica en UI:** El dropdown muestra "Madrid-Chamartín-Clara Campoamor"
8. Selecciona la parada
9. **Verifica:** El asiento se marca con la parada correcta

✅ **Resultado esperado:** Las paradas custom aparecen en el autocompletado y se pueden seleccionar.

**Nota:** Los logs de debug se pueden eliminar una vez verificado que todo funciona.

---

### ✅ Fix 5: Renumeración Automática al Eliminar Filas

**Problema:** Al eliminar filas de asientos y agregar nuevas, los números continuaban en lugar de reutilizar los números eliminados.

**Solución Aplicada:**
- Modificado `deleteRow()` en `SeatLayoutEditor.js` para llamar a `renumberAllSeats()` automáticamente
- Modificado `addRow()` para recalcular el siguiente número antes de crear la nueva fila
- Los asientos ahora se renumeran automáticamente para ser siempre consecutivos

**Código Aplicado:**
```javascript
// En deleteRow()
deleteRow(sectionIndex, rowIndex) {
    const section = this.state.layout[sectionIndex];
    if (!section || section.type !== 'seats') return;

    section.positions.splice(rowIndex, 1);

    // Renumerar todos los asientos para que sean consecutivos
    if (this.state.autoNumber) {
        this.renumberAllSeats();
    } else {
        this.refresh();
    }
}

// En addRow()
addRow(sectionIndex) {
    // Si la autonumeración está activa, recalcular el siguiente número
    if (this.state.autoNumber) {
        this.recalculateNextSeatNumber();
    }
    // ... resto del código
}
```

**Resultado:**
- Al eliminar la fila con asientos 5-8, los siguientes asientos se renumeran
- Al agregar una nueva fila, comienza desde el número correcto (siguiente al último existente)
- Ejemplo: Si tienes [1-4] y [9-12], y eliminas [1-4], se renumeran a [1-4] automáticamente

---

### ✅ Fix 6: Paradas Custom No Aparecen en Popup de Asiento

**Problema:** Al introducir un número de tren con ruta personalizada y hacer click en un asiento, el popup aparecía vacío sin lista de paradas.

**Solución Aplicada:**
- Modificado `getCurrentRoute()` en `script.js` para manejar correctamente rutas custom
- Agregada lógica para detectar si la ruta es un array o un objeto con propiedad `stops`
- Modificado `getFilteredStops()` para usar `getCurrentRoute()` en lugar de acceder directamente a `trainRoutes`
- Modificado `renderModal()` para usar `getCurrentRoute()` en lugar de acceder directamente a `trainRoutes`
- Agregados logs de debug para verificar el formato de las rutas

**Código Aplicado:**
```javascript
// En getCurrentRoute()
function getCurrentRoute() {
    if (!state.trainNumber) return [];
    const route = trainRoutes[state.trainNumber];

    // Si no existe la ruta, retornar array vacío
    if (!route) return [];

    // Si ya es un array, retornarlo directamente
    if (Array.isArray(route)) return route;

    // Si es un objeto con propiedad stops, retornar stops
    if (route.stops && Array.isArray(route.stops)) return route.stops;

    // Fallback: array vacío
    return [];
}

// En getFilteredStops()
if (state.trainNumber && trainRoutes[state.trainNumber]) {
    const routeStops = getCurrentRoute(); // <-- Usar getCurrentRoute()
    availableStops = stops.filter(stop => routeStops.includes(stop.full));
}

// En renderModal()
const route = getCurrentRoute(); // <-- Usar getCurrentRoute()
const currentRouteStop = state.currentStop || null;
const currentRouteIndex = currentRouteStop ? route.indexOf(currentRouteStop) : -1;
```

**Resultado:** Las rutas custom ahora muestran correctamente sus paradas tanto en el dropdown del header como en el popup de selección de asiento.

---

## ⚠️ Notas Importantes

### Sobre el Selector Vacío

Si ves solo el botón "Gestionar Configuraciones" sin trenes del sistema:
- **Causa:** Estás usando `file://` en lugar de `http://`
- **Solución:** Usa servidor HTTP (`python -m http.server 8000`)

### Sobre Compatibilidad

- ✅ Los 6 fixes son **retrocompatibles**
- ✅ Los modelos y rutas existentes siguen funcionando
- ✅ No se requiere migración de datos

### Sobre Incidencias en Bloques

**Pendiente para Fase 8:**
- Los bloques contiguos de WC, EQ, etc. aún no se agrupan para incidencias
- Esto requiere modificar el sistema de incidencias
- Se implementará en la Fase 8 (Pulido)

---

## ✅ Checklist de Verificación

Antes de confirmar que todo funciona:

- [ ] Numeración continua entre coches ✓
- [ ] Validación de duplicados funciona ✓
- [ ] Elementos de texto no seleccionables ✓
- [ ] Rutas custom muestran paradas correctas ✓
- [ ] Trenes del sistema aparecen (con servidor HTTP) ✓
- [ ] Trenes custom aparecen con badge "PERSONALIZADO" ✓
- [ ] Badge "RUTA CUSTOM" aparece correctamente ✓
- [ ] Renumeración automática al eliminar filas ✓
- [ ] Nueva fila comienza desde el número correcto ✓
- [ ] Paradas custom aparecen en dropdown ✓

---

## 📝 Archivos Modificados (Actualizado)

1. **src/wizards/TrainModelWizard.js**
   - Líneas 375-420: Nueva función `getNextSeatNumber()` y lógica de numeración continua
   - Líneas 455-516: Validación de números duplicados
   - Líneas 62-73: Preload de editModel data
   - Líneas 219-230: Load coaches from editModel

2. **src/components/SeatLayoutEditor.js**
   - Líneas 18-36: Soporte para parámetro `startNumber`
   - Líneas 401-410: createDefaultLayout con startNumber
   - Líneas 482-504: addRow recalcula nextSeatNumber
   - Líneas 504-516: deleteRow renumera automáticamente

3. **src/renderers/seats-renderer.js**
   - Líneas 239-269: Lógica mejorada para detectar elementos no seleccionables
   - Líneas 277-284: Validación de positions undefined

4. **src/utils/data-loader.js**
   - Líneas 42-62: Normalización de rutas custom a arrays

5. **script.js**
   - Líneas 1307-1310: Detección mejorada de rutas custom
   - Líneas 728-759: getCurrentRoute maneja objetos y arrays
   - Líneas 1207-1236: getFilteredStops usa getCurrentRoute
   - Líneas 1392-1403: renderModal usa getCurrentRoute

---

### ✅ Fix 7: Bloques de WC Contiguos se Marcan Juntos

**Problema:** Al tener 4 WCs contiguos en configuración 2x2, solo se marcaban 2 visualmente en rojo al hacer click en cualquiera de ellos. Debían marcarse los 4 juntos como una sola incidencia.

**Causa Raíz:** El sistema de generación de IDs para WCs no era consistente:
- En `renderWC()` se usaba `index` (posición en la fila, 0-4) para generar IDs
- Esto causaba IDs duplicados: WCs en posiciones [3,4] de fila 0 y [3,4] de fila 1 generaban `WC4`, `WC5`, `WC4`, `WC5`
- En `getContiguousWCBlock()` se usaba un contador global que generaba `WC1`, `WC2`, `WC3`, `WC4`
- El mismatch impedía detectar correctamente qué WCs pertenecían al mismo bloque

**Solución Aplicada:**

**1. Implementar contador global de WCs en el renderizado:**

Modificado [src/renderers/seats-renderer.js](src/renderers/seats-renderer.js):

- **Línea 364**: Agregado `wcCounter` global
  ```javascript
  const wcCounter = { value: 1 }; // Contador global para WCs
  ```

- **Línea 367-370**: Pasar `wcCounter` a través de la cadena de renderizado
  ```javascript
  const result = renderSection(section, window.state.selectedCoach, doorCounter, wcCounter);
  wcCounter.value = result.wcCounter.value;
  ```

- **Línea 96-99**: `renderWC()` ahora usa el contador global
  ```javascript
  function renderWC(seatNum, coachId, wcCounter) {
      const wcId = String(seatNum).includes("-") ? String(seatNum) : `WC${wcCounter.value}`;
  ```

- **Línea 269-270**: Incrementar contador después de renderizar cada WC
  ```javascript
  html += renderWC(seatNum, coachId, wcCounter);
  wcCounter.value++;
  ```

**2. Detectar grupos predefinidos (WC-A, WC-B):**

Modificado [src/features/incidents.js](src/features/incidents.js):

- **Líneas 462-483**: Detectar WCs con IDs compartidos (formato `WC-A`, `WC-B`)
  ```javascript
  if (wcId.includes('-')) {
      const allMatchingWCs = [];
      coach.layout.forEach((section) => {
          if (section.type === 'seats' && section.positions) {
              section.positions.forEach((row) => {
                  row.forEach((seat) => {
                      if (String(seat) === wcId) {
                          allMatchingWCs.push(wcId);
                      }
                  });
              });
          }
      });

      if (allMatchingWCs.length > 0) {
          return allMatchingWCs; // Todos comparten el mismo ID
      }
  }
  ```

**Cómo funciona ahora:**

1. **WCs con ID personalizado** (ej: `"WC-A"` en tren 470):
   - Todos los WCs con el mismo valor `"WC-A"` comparten el ID
   - Al clickear cualquiera, se detectan TODOS los que tienen ese valor
   - Se marcan todos juntos automáticamente

2. **WCs sin ID personalizado** (ej: `"WC"` genérico):
   - Se generan IDs únicos secuenciales: `WC1`, `WC2`, `WC3`, `WC4`
   - El algoritmo de contigüidad detecta cuáles están adyacentes
   - Se marca el bloque completo de WCs contiguos

**Resultado:**
- Bloques de 4 WCs (2x2) se marcan completamente al hacer click en cualquiera
- Funciona igual que en tren 470 Coche 2 (referencia del usuario)
- Una sola incidencia agrupa todos los WCs del bloque
- Compatible con WCs personalizados (WC-A, WC-B) y genéricos (WC)

---

**Estado:** Todos los 7 fixes aplicados. Servidor HTTP iniciado en puerto 8000 para testing.

_Última actualización: 2026-01-24_
