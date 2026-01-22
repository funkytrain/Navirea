# ✅ Fase 5: UI de Gestión - Completada

## Resumen

La Fase 5 implementa la interfaz de usuario completa para gestionar configuraciones personalizadas de modelos de tren y trayectos. Permite crear, editar, duplicar, eliminar, importar y exportar configuraciones de forma visual e intuitiva.

---

## Archivos Implementados

### Componente Principal
- **`src/components/ConfigurationManagerUI.js`** - UI completa de gestión de configuraciones
  - Listados separados de modelos y rutas (sistema vs personalizados)
  - Operaciones CRUD completas
  - Integración con wizards
  - Sistema de exportación/importación
  - Notificaciones toast

### Estilos
- **`css/components/config-manager.css`** - Estilos completos para la UI
  - Modal responsive
  - Sistema de tabs
  - Cards de configuraciones
  - Animaciones y transiciones
  - Diseño mobile-first

### Archivos de Testing
- **`test-config-manager-ui.html`** - Panel de pruebas completo

### Archivos Modificados
- **`index.html`** - Agregado componente y estilos
- **`src/utils/templates.js`** - Agregado botón de acceso en menú "Más opciones"
- **`script.js`** - Agregada función `openConfigurationManager()`

---

## Características Implementadas

### 1. Vista de Modelos de Tren
- ✅ Listado de modelos del sistema (solo lectura)
- ✅ Listado de modelos personalizados
- ✅ Información de cada modelo (nombre, número de coches, fecha de creación)
- ✅ Botones de acción por modelo:
  - ⚙️ **Editar** - Abre el wizard con los datos del modelo
  - 📋 **Duplicar** - Crea una copia editable
  - 🗑️ **Eliminar** - Elimina el modelo (con confirmación)

### 2. Vista de Trayectos
- ✅ Listado de trayectos del sistema (solo lectura)
- ✅ Listado de trayectos personalizados
- ✅ Información de cada trayecto (número, origen → destino, paradas, fecha)
- ✅ Botones de acción por trayecto:
  - ⚙️ **Editar** - Abre el wizard con los datos del trayecto
  - 📋 **Duplicar** - Crea una copia editable
  - 🗑️ **Eliminar** - Elimina el trayecto (con confirmación)

### 3. Integración con Wizards
- ✅ Creación de nuevos modelos mediante TrainModelWizard
- ✅ Creación de nuevos trayectos mediante RouteWizard
- ✅ Edición de modelos/trayectos existentes
- ✅ Flujo fluido: el manager se oculta mientras el wizard está abierto
- ✅ Refresh automático de la vista al completar wizard

### 4. Exportación/Importación
- ✅ **Exportar Todo** - Descarga JSON con todas las configuraciones personalizadas
- ✅ **Importar** - Carga configuraciones desde archivo JSON
- ✅ Validación de archivos importados
- ✅ Resumen de importación (contadores de items importados)

### 5. UX y Feedback
- ✅ Notificaciones toast de éxito para operaciones
- ✅ Confirmaciones antes de eliminar
- ✅ Formato de fechas relativas ("hace 5min", "hace 2h", "hace 3d")
- ✅ Estadísticas en tiempo real (contadores)
- ✅ Diseño responsive (mobile y desktop)
- ✅ Animaciones suaves

---

## Cómo Usar

### Acceso desde la Aplicación Principal

1. Abre la aplicación (`index.html`)
2. Haz clic en el botón **⋮** (Más opciones) en el header
3. Selecciona **"Configuraciones Personalizadas"**

### Crear un Modelo de Tren Personalizado

1. En el Configuration Manager, ve a la pestaña **"📋 Modelos de Tren"**
2. Haz clic en **"➕ Nuevo Modelo"**
3. El wizard te guiará por 4 pasos:
   - Información básica (nombre)
   - Configuración de coches
   - Editor visual de layouts
   - Vista previa
4. Al guardar, el modelo aparecerá en la lista de personalizados

### Editar un Modelo Existente

1. Localiza el modelo en la lista de personalizados
2. Haz clic en el botón **⚙️**
3. El wizard se abrirá con los datos actuales
4. Modifica lo que necesites y guarda

### Duplicar un Modelo

1. Localiza el modelo a duplicar
2. Haz clic en el botón **📋**
3. Se abrirá el wizard con una copia (nombre: "Modelo Original (Copia)")
4. Modifica y guarda como nuevo modelo

### Eliminar un Modelo

1. Localiza el modelo a eliminar
2. Haz clic en el botón **🗑️**
3. Confirma la acción (⚠️ no se puede deshacer)

### Crear un Trayecto Personalizado

1. En el Configuration Manager, ve a la pestaña **"🚂 Trayectos"**
2. Haz clic en **"➕ Nuevo Trayecto"**
3. El wizard te guiará por 4 pasos:
   - Número de tren
   - Paradas (con autocompletado y drag & drop)
   - Destino final
   - Vista previa
4. Al guardar, el trayecto aparecerá en la lista

### Exportar Configuraciones

1. Haz clic en **"📤 Exportar Todo"** en el footer del manager
2. Se descargará un archivo JSON con todas tus configuraciones personalizadas
3. Guarda el archivo en un lugar seguro

### Importar Configuraciones

1. Haz clic en **"📥 Importar"** en el footer del manager
2. Selecciona un archivo JSON previamente exportado
3. Se validarán y cargarán las configuraciones
4. Verás un resumen de lo importado

---

## Testing

### Panel de Pruebas

Abre `test-config-manager-ui.html` para acceder al panel de testing completo:

#### Test 1: Abrir Configuration Manager
- Abre la UI completa del gestor de configuraciones

#### Test 2: Generar Datos de Prueba
- **Generar 3 Modelos de Prueba** - Crea modelos de ejemplo
- **Generar 3 Rutas de Prueba** - Crea trayectos de ejemplo
- **Limpiar Todo** - Elimina todas las configuraciones personalizadas

#### Test 3: Exportar e Importar
- **Exportar Configuraciones** - Descarga JSON
- **Ver JSON de Exportación** - Muestra el JSON en pantalla

### Tests Recomendados

```javascript
// 1. Crear modelo personalizado
openConfigurationManager()
// -> Click "Nuevo Modelo"
// -> Completar wizard
// -> Verificar que aparece en la lista

// 2. Editar modelo
// -> Click ⚙️ en un modelo
// -> Modificar nombre/coches
// -> Verificar cambios guardados

// 3. Duplicar modelo
// -> Click 📋 en un modelo
// -> Verificar que se crea copia

// 4. Eliminar modelo
// -> Click 🗑️ en un modelo
// -> Confirmar eliminación
// -> Verificar que desaparece

// 5. Exportar/Importar
// -> Crear varios modelos y rutas
// -> Exportar Todo
// -> Limpiar Todo
// -> Importar archivo
// -> Verificar que se restauran
```

---

## Estructura del Código

### ConfigurationManagerUI

```javascript
class ConfigurationManagerUI {
    constructor()
    render(parentElement)           // Renderiza la UI completa
    switchView(view)                // Cambia entre modelos/rutas
    renderModelsView()              // Renderiza vista de modelos
    renderRoutesView()              // Renderiza vista de rutas

    // Modelos
    openTrainWizard(modelData)      // Abre wizard de modelo
    editModel(modelId)              // Edita modelo existente
    duplicateModel(modelId)         // Duplica modelo
    deleteModel(modelId)            // Elimina modelo

    // Rutas
    openRouteWizard(routeData)      // Abre wizard de ruta
    editRoute(trainNumber)          // Edita ruta existente
    duplicateRoute(trainNumber)     // Duplica ruta
    deleteRoute(trainNumber)        // Elimina ruta

    // Import/Export
    exportAll()                     // Exporta a JSON
    importConfiguration()           // Importa desde JSON

    // UI Helpers
    showSuccessMessage(message)     // Toast de éxito
    formatDate(dateString)          // Formato de fecha relativa
    close()                         // Cierra la UI
}
```

### Flujo de Integración con Wizards

```javascript
// Al crear/editar modelo:
1. ConfigurationManagerUI se oculta (display: none)
2. Se abre TrainModelWizard
3. Usuario completa el wizard
4. Al guardar: wizard.onComplete se ejecuta
5. Wizard se cierra
6. ConfigurationManagerUI se muestra de nuevo
7. Vista se refresca automáticamente
8. Toast de confirmación
```

---

## Estilos CSS

### Clases Principales

- `.config-manager-overlay` - Overlay con blur
- `.config-manager-modal` - Modal principal
- `.config-manager-header` - Header con título y botón cerrar
- `.config-manager-tabs` - Sistema de pestañas
- `.config-manager-content` - Contenedor del contenido
- `.config-section` - Sección (sistema/personalizados)
- `.config-list` - Lista de items
- `.config-item` - Card de configuración individual
- `.config-item-system` - Card de sistema (solo lectura)
- `.config-item-custom` - Card personalizada (editable)
- `.config-action-btn` - Botones de acción (⚙️📋🗑️)
- `.config-toast` - Notificación temporal

### Responsive

- Desktop (>640px): Layout de 2 columnas, modal centrado
- Mobile (≤640px): Layout de 1 columna, modal fullscreen

---

## Integración con el Sistema

### Carga de Configuraciones Personalizadas

Las configuraciones personalizadas se cargan automáticamente en `script.js`:

```javascript
async function loadJSONData() {
    // 1. Cargar datos del sistema
    const stops = await fetch('data/stops.json');
    const trainModels = await loadAllTrains();

    // 2. ConfigurationManager fusiona automáticamente
    //    datos del sistema + personalizados
    const allModels = ConfigurationManager.getAllTrainModels(trainModels);
    const allRoutes = ConfigurationManager.getAllRoutes(trainRoutes);

    // 3. La app funciona con datos fusionados
}
```

### Acceso desde el Menú

En `src/utils/templates.js`:
```javascript
function generateMoreOptionsMenu() {
    return `
        ...
        <button class="more-option" onclick="openConfigurationManager();">
            Configuraciones Personalizadas
        </button>
        ...
    `;
}
```

En `script.js`:
```javascript
function openConfigurationManager() {
    const managerUI = new ConfigurationManagerUI();
    managerUI.onClose = () => {
        render(); // Refrescar interfaz
    };
    managerUI.render(document.body);
}
```

---

## Próximos Pasos

La Fase 5 está **completamente funcional**. Los próximos pasos son:

### Fase 6: Sistema de Compartición
- Generar QR codes con configuraciones comprimidas
- Escanear QR codes para importar
- Compartir configuraciones entre dispositivos
- Ver: `CUSTOM_CONFIG_ARCHITECTURE.md` - Fase 6

### Fase 7: Integración Final
- Badges en selectores de tren/ruta para indicar configuraciones personalizadas
- Filtros para mostrar solo personalizados/sistema
- Ordenamiento personalizado

### Fase 8: Pulido
- Templates predefinidos de modelos comunes
- Guía de usuario integrada
- Testing E2E completo
- Merge a main

---

## Notas Técnicas

### Persistencia
- Todas las configuraciones se guardan en `localStorage`
- Claves: `userTrainModels`, `userRoutes`, `userStops`
- Formato JSON con metadatos (createdAt, version)

### Validación
- Se valida al guardar en ConfigurationManager
- Se valida al importar desde JSON
- Errores se muestran en alerts (mejorar en futuras fases)

### Performance
- Las configuraciones se cargan una sola vez al inicio
- ConfigurationManager mantiene cache en memoria
- No hay impacto en el rendimiento de la app principal

---

## Troubleshooting

### "El botón no aparece en el menú"
- Verifica que `src/utils/templates.js` esté modificado
- Verifica que `script.js` tenga la función `openConfigurationManager()`
- Haz hard refresh (Ctrl+F5)

### "No puedo editar modelos"
- Verifica que `src/wizards/TrainModelWizard.js` esté cargado
- Revisa la consola para errores de JavaScript
- Verifica que ConfigurationManager esté inicializado

### "Al importar no se cargan los datos"
- Verifica que el JSON tenga el formato correcto
- Revisa la consola para errores de validación
- El archivo debe ser un JSON exportado previamente

### "Los modelos personalizados no aparecen en la app"
- Verifica que `data-loader.js` esté fusionando correctamente
- Revisa que ConfigurationManager.getAllTrainModels() se llame
- Haz refresh de la app después de crear modelos

---

_Última actualización: 2026-01-22_
_Fase 5 - Completada ✅_
