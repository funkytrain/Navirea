# 🧪 Guía Completa de Testing - Fase 7

## 📋 Resumen

Esta guía te mostrará cómo crear y probar configuraciones personalizadas en la aplicación principal.

---

## ✅ Opción 1: Testing en la Aplicación Principal (RECOMENDADO)

### Paso 1: Iniciar Servidor HTTP

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
# Opción 1: Python (si tienes Python instalado)
python -m http.server 8000

# Opción 2: VS Code Live Server
# Click derecho en index.html → "Open with Live Server"
```

Deberías ver algo como:
```
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

### Paso 2: Abrir la Aplicación

1. Abre tu navegador
2. Navega a: `http://localhost:8000/index.html`
3. La aplicación debería cargar normalmente

### Paso 3: Crear un Tren Personalizado

1. **Abrir el Gestor de Configuraciones:**
   - Opción A: Click en el nombre del tren → Click en "⚙️ Gestionar Configuraciones" (al final del dropdown)
   - Opción B: Click en "Más opciones" (los 3 puntos) → "Configuraciones Personalizadas"

2. **En el panel de Configuraciones:**
   - Deberías ver dos tabs: "Modelos de Tren" y "Trayectos"
   - En "Modelos de Tren", verás:
     - **Sistema (5)**: Los 5 trenes predefinidos (470, 449, 463, 464, 465)
     - **Personalizados**: Tus trenes custom (vacío al principio)

3. **Crear Nuevo Modelo:**
   - Click en el botón "➕ Nuevo Modelo" (arriba a la derecha)
   - Se abrirá el wizard de 4 pasos

4. **Wizard - Paso 1: Información Básica**
   - **Nombre**: Escribe "Mi Tren Personalizado"
   - **Descripción** (opcional): "Tren de prueba para testing"
   - Click en "Siguiente →"

5. **Wizard - Paso 2: Configuración de Coches**
   - **Número de coches**: 2
   - **Coche 1**:
     - Nombre: "Coche Turista"
   - **Coche 2**:
     - Nombre: "Coche Preferente"
   - Click en "Siguiente →"

6. **Wizard - Paso 3: Editor de Layouts**
   - **Para Coche Turista:**
     - Verás el editor visual de asientos
     - Click en "➕ Agregar Fila 2+2" varias veces (por ejemplo, 10 filas)
     - Los asientos se numerarán automáticamente: 1, 2, 3, 4, 5, 6...
     - Puedes agregar espacios (WC, equipaje) si quieres
   - Click en "Siguiente →" cuando termines el primer coche
   - **Para Coche Preferente:**
     - Click en "➕ Agregar Fila 1+2" varias veces (por ejemplo, 8 filas)
     - Click en "Siguiente →"

7. **Wizard - Paso 4: Vista Previa**
   - Verás una vista previa de cómo se verá el tren
   - Revisa que todo esté correcto
   - Click en "✓ Guardar Modelo"

8. **Verificación:**
   - El wizard se cierra
   - Deberías ver tu nuevo tren en la lista de "Personalizados"
   - Tiene botones: [⚙️ Editar] [📋 Duplicar] [🗑️ Eliminar]

### Paso 4: Probar el Tren Personalizado en la App

1. **Cerrar el gestor de configuraciones** (X en la esquina)

2. **Abrir el selector de trenes:**
   - Click en el nombre del tren actual (en el header)
   - Deberías ver:
     ```
     [Trenes del Sistema]
     • Tren 470
     • Tren 449
     • Tren 463
     • Tren 464
     • Tren 465

     ―――――――――――――――― (divisor)

     [Trenes Personalizados]
     • Mi Tren Personalizado [PERSONALIZADO]

     ―――――――――――――――― (divisor)

     ⚙️ Gestionar Configuraciones
     ```

3. **Seleccionar tu tren:**
   - Click en "Mi Tren Personalizado"
   - El selector se cierra
   - En el header ahora verás: **"Mi Tren Personalizado [CUSTOM]"**
   - Los coches aparecerán abajo: [Coche Turista] [Coche Preferente]

4. **Verificar que funciona:**
   - Click en "Coche Turista"
   - Deberías ver los asientos que configuraste
   - Prueba hacer click en un asiento
   - Funciona igual que con los trenes del sistema

### Paso 5: Crear una Ruta Personalizada

1. **Abrir el gestor de configuraciones de nuevo**

2. **Ir a la pestaña "Trayectos"**
   - Click en el tab "Trayectos"
   - Verás las rutas del sistema (17 rutas)

3. **Crear Nueva Ruta:**
   - Click en "➕ Nueva Ruta"
   - Se abre el wizard de rutas

4. **Wizard - Paso 1: Número de Tren**
   - **Número de tren**: 99001
   - Click en "Siguiente →"

5. **Wizard - Paso 2: Paradas**
   - En el campo de búsqueda, escribe "Madrid"
   - Selecciona "Madrid-Chamartín-Clara Campoamor"
   - Click en "➕ Agregar"
   - Repite para:
     - "Zaragoza-Delicias"
     - "Barcelona-Sants"
   - Las paradas aparecerán en orden
   - Puedes arrastrar para reordenar si quieres
   - Click en "Siguiente →"

6. **Wizard - Paso 3: Destino Final**
   - Selecciona "Barcelona-Sants" como destino
   - Click en "Siguiente →"

7. **Wizard - Paso 4: Vista Previa**
   - Verás la ruta completa con badges de INICIO/FIN/DESTINO
   - Click en "✓ Guardar Ruta"

8. **Verificación:**
   - La ruta aparece en "Personalizados (1)"
   - Formato: "99001: MAD → BCN [⚙️] [🗑️]"

### Paso 6: Probar la Ruta Personalizada

1. **Cerrar el gestor de configuraciones**

2. **Cambiar el número de tren:**
   - En el header, click en "Nº [número actual]"
   - Escribe: **99001**
   - Confirma el cambio (te advertirá que borrará datos)

3. **Verificar badge de ruta custom:**
   - Una vez cambiado el número
   - Deberías ver aparecer la sección "Parada actual:"
   - Junto a "Parada actual:" aparece el badge **"[RUTA CUSTOM]"**

4. **Probar selector de paradas:**
   - Click en el campo "Parada actual"
   - Deberías ver solo las paradas de tu ruta:
     - Madrid-Chamartín-Clara Campoamor
     - Zaragoza-Delicias
     - Barcelona-Sants
   - Selecciona una parada
   - ¡Funciona!

---

## ✅ Opción 2: Testing con test-integration.html

### ⚠️ Problema Conocido

El archivo `test-integration.html` tiene un problema al abrirse directamente sin servidor:
- Los scripts se cargan pero puede haber problemas de timing
- **Solución:** Usa un servidor HTTP

### Paso 1: Usar con Servidor HTTP

```bash
python -m http.server 8000
```

### Paso 2: Abrir el Test

```
http://localhost:8000/test-integration.html
```

### Paso 3: Ejecutar Tests

1. **Test 1**: Click en "Ejecutar Test"
   - Debería mostrar configuraciones cargadas

2. **Test 2**: Click en "Crear Tren de Prueba"
   - Crea un tren llamado "Tren Test Integración"
   - Click en "Crear Ruta de Prueba"
   - Crea la ruta 99999

3. **Test 3**: Click en "Verificar Badges"
   - Encuentra badges en la página

4. **Test 4**: Click en "Probar Botón"
   - Click en "Abrir Gestor de Configuraciones"
   - Se abre el gestor completo

5. **Test 5**: Click en "Verificar Separación"
   - Muestra trenes del sistema vs personalizados

6. **Test 6**: Click en "Limpiar Datos"
   - Elimina las configuraciones de prueba

---

## ✅ Opción 3: Testing Manual Rápido desde Consola

Si los tests no funcionan, puedes probar directamente desde la consola del navegador:

### Paso 1: Abrir la Aplicación Principal

```
http://localhost:8000/index.html
```

### Paso 2: Abrir Consola del Navegador

- **Chrome/Edge**: F12 → pestaña "Console"
- **Firefox**: F12 → pestaña "Consola"

### Paso 3: Crear Tren de Prueba

Pega este código en la consola:

```javascript
// Crear tren de prueba
const testTrain = {
    name: "Tren Consola Test",
    custom: true,
    coaches: [
        {
            id: "C1",
            name: "Coche 1",
            layout: [
                { type: "seats", positions: [[1, 2, null, 3, 4], [5, 6, null, 7, 8]] },
                { type: "space", height: 80 },
                { type: "seats", positions: [[9, 10, null, 11, 12]] }
            ]
        }
    ]
};

window.ConfigurationManager.saveCustomTrainModel(testTrain);
console.log("✅ Tren creado:", testTrain.name);
```

Presiona Enter. Deberías ver: `✅ Tren creado: Tren Consola Test`

### Paso 4: Verificar en la UI

1. Recarga la página (F5)
2. Click en selector de trenes
3. Deberías ver tu tren con badge "PERSONALIZADO"

### Paso 5: Crear Ruta de Prueba

```javascript
// Crear ruta de prueba
const testRoute = {
    trainNumber: "88888",
    custom: true,
    stops: ["Valencia Nord", "Castelló de la Plana", "Barcelona-Sants"],
    destination: "Barcelona-Sants"
};

window.ConfigurationManager.saveCustomRoute(testRoute);
console.log("✅ Ruta creada: Tren", testRoute.trainNumber);
```

### Paso 6: Verificar Ruta

1. Cambiar número de tren a: **88888**
2. Debería aparecer "Parada actual: [RUTA CUSTOM]"

---

## 🎯 Funcionalidades Completas Disponibles

### ✅ Lo que YA funciona:

1. **Crear trenes personalizados** con wizard visual
2. **Crear rutas personalizadas** con wizard
3. **Ver badges** diferenciando sistema vs custom
4. **Editar** configuraciones existentes
5. **Duplicar** configuraciones
6. **Eliminar** configuraciones
7. **Exportar** todas las configs a JSON
8. **Importar** configs desde JSON
9. **Compartir** mediante QR code
10. **Usar** trenes y rutas custom en la app principal
11. **Selector de trenes** con separación visual
12. **Selector de paradas** filtrado por ruta

### ✅ Todo está integrado:

- ✅ Los trenes custom aparecen en el selector
- ✅ Las rutas custom funcionan con números de tren
- ✅ Los badges se muestran correctamente
- ✅ El gestor está accesible desde 2 lugares
- ✅ Los datos se guardan en localStorage
- ✅ Compatible con modo oscuro
- ✅ Responsive en móviles

---

## 🐛 Solución de Problemas

### Problema: El test no hace nada al hacer click

**Causa**: Archivos no cargados o error en consola

**Solución**:
1. Abre la consola del navegador (F12)
2. Busca errores en rojo
3. Verifica que estés usando servidor HTTP
4. Usa la Opción 1 (app principal) en su lugar

### Problema: No veo mis configuraciones personalizadas

**Causa**: localStorage vacío o diferente dominio

**Solución**:
1. Verifica que estés en el mismo dominio (localhost:8000)
2. Abre consola y ejecuta: `localStorage.getItem('userTrainModels')`
3. Si es `null`, crea una configuración nueva
4. No uses modo incógnito (borra localStorage al cerrar)

### Problema: El badge no aparece

**Causa**: La propiedad `custom: true` no está en el objeto

**Solución**:
1. Verifica en consola: `ConfigurationManager.getAllTrainModels()`
2. Busca tu tren y verifica que tenga `custom: true`
3. Si no, elimínalo y créalo de nuevo con el wizard

### Problema: Los estilos no se cargan

**Causa**: Servidor no iniciado o rutas incorrectas

**Solución**:
1. Verifica que el servidor esté corriendo
2. Abre `http://localhost:8000` (no file://)
3. Verifica que existan los archivos CSS en la carpeta

---

## 📝 Resumen Ejecutivo

**Para crear y probar configuraciones personalizadas:**

1. ✅ **Inicia servidor**: `python -m http.server 8000`
2. ✅ **Abre app**: `http://localhost:8000/index.html`
3. ✅ **Abre gestor**: Click en tren → "⚙️ Gestionar Configuraciones"
4. ✅ **Crea tren**: Tab "Modelos" → "➕ Nuevo Modelo" → Sigue wizard
5. ✅ **Crea ruta**: Tab "Trayectos" → "➕ Nueva Ruta" → Sigue wizard
6. ✅ **Prueba**: Selecciona tu tren y número custom en la app principal
7. ✅ **Verifica badges**: Deberías ver "CUSTOM" y "RUTA CUSTOM"

**¡Todo está listo para usar! No falta nada.**

---

_Última actualización: 2026-01-23_
