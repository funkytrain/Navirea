# Arquitectura: Sistema de Configuraciones Personalizadas

## Objetivo
Permitir a los interventores crear y gestionar sus propios modelos de trenes y trayectos personalizados, almacenados localmente y compartibles entre dispositivos.

---

## Decisiones de Diseño

### 1. Separación de Configuraciones
- **Configuraciones del Sistema**: Predefinidas, inmutables (470, 449, 463, 464, 465)
- **Configuraciones de Usuario**: Personalizadas, editables, se almacenan en localStorage

### 2. Interfaz de Creación
- **Editor Visual**: Drag & drop para disposición de asientos (prioridad)
- **Formulario Simple**: Pendiente para implementación futura

### 3. Importación/Exportación
- **Solo JSON manual** en esta fase
- **Compartir entre dispositivos**: QR code + JSON descargable

### 4. Almacenamiento
- **localStorage** para datos locales
- **Formato JSON** para compatibilidad y portabilidad

---

## Estructura de Datos

### Configuraciones de Usuario en localStorage

```json
{
  "userTrainModels": {
    "custom_001": {
      "id": "custom_001",
      "name": "Tren Regional 3 Coches",
      "custom": true,
      "createdAt": "2026-01-22T10:30:00Z",
      "coaches": [
        {
          "id": "C1",
          "name": "Coche 1",
          "layout": [
            {"type": "seats", "positions": [[1, 2, null, 3, 4]]},
            {"type": "space", "height": 80}
          ]
        }
      ]
    }
  },
  "userRoutes": {
    "99001": {
      "trainNumber": "99001",
      "custom": true,
      "createdAt": "2026-01-22T10:30:00Z",
      "stops": ["Huesca", "Tardienta", "Zaragoza Delicias"],
      "destination": "Zaragoza Delicias"
    }
  },
  "userStops": [
    {
      "full": "Tardienta",
      "abbr": "TAR",
      "custom": true
    }
  ]
}
```

---

## Arquitectura de Componentes

### Capa 1: Gestión de Configuraciones
**Archivo**: `src/services/ConfigurationManager.js`

**Responsabilidades**:
- Cargar y fusionar configuraciones del sistema + usuario
- CRUD de configuraciones personalizadas
- Validación de datos
- Gestión de IDs únicos para configuraciones custom
- Versionado y migración de configuraciones

**API Principal**:
```javascript
ConfigurationManager.getAllTrainModels()      // Retorna sistema + usuario
ConfigurationManager.getAllRoutes()           // Retorna sistema + usuario
ConfigurationManager.saveCustomTrainModel()   // Guarda modelo custom
ConfigurationManager.saveCustomRoute()        // Guarda ruta custom
ConfigurationManager.deleteCustomTrainModel() // Elimina modelo custom
ConfigurationManager.deleteCustomRoute()      // Elimina ruta custom
ConfigurationManager.exportConfiguration()    // Exporta todo a JSON
ConfigurationManager.importConfiguration()    // Importa desde JSON
```

---

### Capa 2: Wizards de Creación

#### A. Wizard de Modelo de Tren
**Archivo**: `src/wizards/TrainModelWizard.js`

**Flujo de Pasos**:
1. **Información Básica**
   - Nombre del modelo
   - ID auto-generado
   - Descripción (opcional)

2. **Configuración de Coches**
   - Número de coches
   - Nombre de cada coche
   - ¿Tiene variantes? (Sí/No)

3. **Editor de Layout** (por cada coche/variante)
   - Editor visual de disposición
   - Herramientas: agregar fila, espaciador, elementos especiales

4. **Vista Previa**
   - Renderizado real del tren
   - Validación de datos

5. **Guardar**
   - Confirmación
   - Guardar en localStorage

#### B. Wizard de Trayecto
**Archivo**: `src/wizards/RouteWizard.js`

**Flujo de Pasos**:
1. **Número de Tren**
   - Input numérico
   - Validación de duplicados

2. **Paradas**
   - Lista ordenada
   - Búsqueda/autocompletado desde stops existentes
   - Agregar nueva parada si no existe
   - Drag & drop para reordenar

3. **Destino Final**
   - Selección de última parada (para filtros)

4. **Vista Previa y Guardar**

---

### Capa 3: Editor Visual de Asientos
**Archivo**: `src/components/SeatLayoutEditor.js`

**Características**:
- Canvas de edición con scroll
- Paleta de elementos:
  - Asiento normal (numerado)
  - Espacio vertical
  - WC
  - Equipaje (EQ)
  - Mesa (MESA)
  - PMR
  - Minusválidos (MIN)
- Operaciones:
  - Agregar fila de asientos
  - Eliminar fila
  - Configurar altura de espacios
  - Numeración automática/manual
- Vista previa en tiempo real

**Componentes Relacionados**:
- `SeatRowEditor.js`: Editor de una fila individual
- `ElementPalette.js`: Paleta de elementos disponibles
- `LayoutPreview.js`: Vista previa del layout

---

### Capa 4: UI de Gestión
**Archivo**: `src/components/ConfigurationManager.js`

**Pantalla Principal**:
```
╔════════════════════════════════════════╗
║    GESTIONAR CONFIGURACIONES          ║
╠════════════════════════════════════════╣
║                                        ║
║  📋 MODELOS DE TREN                    ║
║  ┌──────────────────────────────────┐  ║
║  │ Sistema (5)                      │  ║
║  │  • Tren 470                      │  ║
║  │  • Tren 449                      │  ║
║  │  ...                             │  ║
║  ├──────────────────────────────────┤  ║
║  │ Personalizados (2)      [+ Nuevo]│  ║
║  │  • Mi Tren Regional    [⚙️][🗑️] │  ║
║  │  • Tren Corto 3C       [⚙️][🗑️] │  ║
║  └──────────────────────────────────┘  ║
║                                        ║
║  🚂 TRAYECTOS                          ║
║  ┌──────────────────────────────────┐  ║
║  │ Sistema (17)                     │  ║
║  │  • 18021: ZMI → VIT              │  ║
║  │  ...                             │  ║
║  ├──────────────────────────────────┤  ║
║  │ Personalizados (1)      [+ Nuevo]│  ║
║  │  • 99001: HUE → ZDE    [⚙️][🗑️] │  ║
║  └──────────────────────────────────┘  ║
║                                        ║
║  [📤 Exportar Todo] [📥 Importar]     ║
╚════════════════════════════════════════╝
```

---

### Capa 5: Sistema de Compartición
**Archivo**: `src/features/config-sharing.js`

**Métodos de Compartición**:
1. **QR Code**: Genera QR con URL que contiene configuración comprimida
2. **Descarga JSON**: Descarga archivo `.json` con configuraciones
3. **Importar desde Archivo**: Sube archivo `.json`
4. **Importar desde QR**: Escanea QR con cámara

**Formato de Compartición**:
```json
{
  "version": "1.0",
  "type": "train-config-export",
  "timestamp": "2026-01-22T10:30:00Z",
  "data": {
    "trainModels": [...],
    "routes": [...],
    "stops": [...]
  }
}
```

---

## Archivos a Crear

### Nuevos Archivos

```
src/
├── services/
│   └── ConfigurationManager.js          ✅ NUEVO
├── wizards/
│   ├── TrainModelWizard.js              ✅ NUEVO
│   ├── RouteWizard.js                   ✅ NUEVO
│   └── WizardCore.js                    ✅ NUEVO (componente base común)
├── components/
│   ├── SeatLayoutEditor.js              ✅ NUEVO
│   ├── SeatRowEditor.js                 ✅ NUEVO
│   ├── ElementPalette.js                ✅ NUEVO
│   ├── LayoutPreview.js                 ✅ NUEVO
│   └── ConfigurationManagerUI.js        ✅ NUEVO
├── features/
│   └── config-sharing.js                ✅ NUEVO
└── utils/
    ├── config-validator.js              ✅ NUEVO
    ├── config-exporter.js               ✅ NUEVO
    └── id-generator.js                  ✅ NUEVO
```

### Archivos a Modificar

```
src/
├── utils/
│   └── data-loader.js                   🔧 MODIFICAR (fusionar configs)
├── services/
│   └── StorageService.js                🔧 MODIFICAR (nuevas funciones)
└── (Selectores de UI)                   🔧 MODIFICAR (separar sistema/custom)
```

---

## Plan de Implementación

### Fase 1: Fundamentos ✅ COMPLETADA
- [x] Crear branch `feature/custom-configurations`
- [x] Crear documentación de arquitectura
- [x] Crear `ConfigurationManager.js`
- [x] Crear `id-generator.js`
- [x] Crear `config-validator.js`
- [x] Modificar `data-loader.js` para fusionar configuraciones
- [x] Modificar `StorageService.js` para custom configs
- [x] Modificar `index.html` para cargar nuevos scripts
- [x] Crear `test-config-manager.html` para testing básico

### Fase 2: Editor Visual de Asientos ✅ COMPLETADA
- [x] Crear componente base `SeatLayoutEditor.js`
- [x] Crear `ElementPalette.js`
- [x] Crear `SeatRowEditor.js`
- [x] Implementar lógica de numeración automática
- [x] Crear `LayoutPreview.js`
- [x] Testing del editor

### Fase 3: Wizard de Modelo de Tren ✅ COMPLETADA
- [x] Crear `WizardCore.js` (base común)
- [x] Crear `TrainModelWizard.js`
- [x] Integrar con `SeatLayoutEditor`
- [x] Implementar validación de modelos
- [x] Testing de creación de modelos

### Fase 4: Wizard de Trayecto ✅ COMPLETADA
- [x] Crear `RouteWizard.js`
- [x] Implementar autocompletado de paradas
- [x] Permitir agregar nuevas paradas
- [x] Implementar drag & drop para reordenar
- [x] Testing de creación de rutas

### Fase 5: UI de Gestión ✅ COMPLETADA
- [x] Crear `ConfigurationManagerUI.js`
- [x] Listados de modelos y rutas
- [x] Operaciones CRUD (editar, eliminar, duplicar)
- [x] Integrar wizards
- [x] Testing de gestión completa

### Fase 6: Sistema de Compartición ✅ COMPLETADA
- [x] Crear `config-sharing.js`
- [x] Implementar generación de QR
- [x] Implementar lectura de QR
- [x] Implementar exportación JSON (ya existente, integrado)
- [x] Implementar importación JSON (ya existente, integrado)
- [x] Testing de compartición

### Fase 7: Integración Final
- [ ] Modificar selectores de tren para mostrar custom
- [ ] Modificar selectores de ruta para mostrar custom
- [ ] Añadir indicadores visuales (badges)
- [ ] Actualizar UI existente
- [ ] Testing de integración completa

### Fase 8: Pulido y Documentación
- [ ] Añadir templates predefinidos
- [ ] Añadir ayudas/tooltips en wizards
- [ ] Crear guía de usuario
- [ ] Testing E2E completo
- [ ] Merge a main

---

## Notas Técnicas

### Generación de IDs
```javascript
// Formato: custom_<timestamp>_<random>
// Ejemplo: custom_1737543000_a3f9
function generateCustomId(prefix = 'custom') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 4);
  return `${prefix}_${timestamp}_${random}`;
}
```

### Validación de Configuraciones
```javascript
// Validar modelo de tren
- ID único
- Nombre no vacío
- Al menos 1 coche
- Layout válido en cada coche
- Posiciones de asientos válidas
- No duplicados de números de asiento

// Validar ruta
- Número de tren único
- Al menos 2 paradas
- Destino existe en lista de paradas
```

### Compresión para QR
- Usar LZString o similar para comprimir JSON
- Límite de ~2KB para QR
- Si excede, solo permitir descarga JSON

---

## Decisiones Pendientes

1. ¿Permitir editar modelos del sistema para crear variantes?
2. ¿Límite máximo de configuraciones personalizadas?
3. ¿Sincronización en la nube en el futuro?

---

## Registro de Cambios

### 2026-01-22 - Fase 1 Completada
- ✅ Creado branch `feature/custom-configurations`
- ✅ Documentada arquitectura completa
- ✅ Definida estructura de datos
- ✅ Planificadas 8 fases de implementación
- ✅ **Implementados archivos base:**
  - `src/utils/id-generator.js` - Generación de IDs únicos
  - `src/utils/config-validator.js` - Validación completa de configuraciones
  - `src/services/ConfigurationManager.js` - Gestor centralizado de configs
  - Modificado `src/utils/data-loader.js` - Fusión de configs sistema + custom
  - Modificado `src/services/StorageService.js` - Funciones de acceso a configs
  - Modificado `index.html` - Carga de nuevos scripts
  - `test-config-manager.html` - Panel de testing completo

**Estado actual:** Sistema base completamente funcional. Listo para Fase 2 (Editor Visual).

### 2026-01-22 - Fase 2 Completada
- ✅ Creado directorio `src/components/`
- ✅ **Implementados componentes del editor:**
  - `src/components/ElementPalette.js` - Paleta de elementos disponibles (asientos, WC, PMR, etc.)
  - `src/components/SeatRowEditor.js` - Editor de fila individual con controles de posición
  - `src/components/LayoutPreview.js` - Vista previa en tiempo real del layout
  - `src/components/SeatLayoutEditor.js` - Editor principal con panel dual
- ✅ Creado `css/components/seat-editor.css` - Estilos completos del editor
- ✅ Modificado `index.html` - Cargados componentes y estilos
- ✅ Creado `test-seat-editor.html` - Panel de testing completo con ejemplos

**Características implementadas:**
- Editor visual drag & drop de layouts de asientos
- Numeración automática de asientos
- Soporte para elementos especiales (WC, EQ, MESA, PMR, MIN)
- Vista previa en tiempo real
- Validación de layouts
- Operaciones CRUD en filas y posiciones
- Guardado en ConfigurationManager

**Estado actual:** Editor visual completamente funcional. Listo para Fase 3 (Wizard de Modelo de Tren).

### 2026-01-22 - Fase 3 Completada
- ✅ Creado directorio `src/wizards/`
- ✅ **Implementados componentes del wizard:**
  - `src/wizards/WizardCore.js` - Sistema base para wizards multi-paso con navegación, validación y gestión de estado
  - `src/wizards/TrainModelWizard.js` - Asistente completo para crear/editar modelos de tren
- ✅ Creado `css/components/wizard.css` - Estilos completos del sistema de wizards
- ✅ Modificado `index.html` - Cargados scripts y estilos de wizards
- ✅ Creado `test-train-wizard.html` - Panel de testing completo del wizard

**Características implementadas:**
- Wizard de 4 pasos para crear modelos de tren:
  1. Información básica (nombre, descripción)
  2. Configuración de coches (cantidad, nombres)
  3. Editor de layouts (integrado con SeatLayoutEditor)
  4. Vista previa completa antes de guardar
- Navegación entre pasos con validación
- Integración completa con ConfigurationManager
- Capacidad de editar modelos existentes
- Indicadores de progreso visuales
- Diseño responsive y accesible
- Animaciones y transiciones fluidas

**Estado actual:** Wizard de Modelo de Tren completamente funcional. Listo para Fase 4 (Wizard de Trayecto).

### 2026-01-22 - Fase 4 Completada
- ✅ Creado directorio `src/wizards/` (ya existente de Fase 3)
- ✅ **Implementado RouteWizard completo:**
  - `src/wizards/RouteWizard.js` - Asistente para crear/editar rutas personalizadas
  - Sistema de 4 pasos: Número de Tren → Paradas → Destino → Vista Previa
  - Autocompletado inteligente de paradas con búsqueda
  - Capacidad de agregar paradas nuevas desde el wizard
  - Drag & drop para reordenar paradas del trayecto
  - Validación completa de rutas y números de tren
  - Etiquetas visuales de INICIO/FIN/DESTINO
- ✅ Agregados estilos CSS en `css/components/wizard.css`:
  - Estilos para editor de paradas con drag & drop
  - Sistema de autocompletado con sugerencias
  - Vista previa de rutas con badges
  - Animaciones y feedback visual
- ✅ Creado `test-route-wizard.html` - Panel de testing completo
- ✅ Modificado `index.html` - Cargado RouteWizard.js

**Características implementadas:**
- Wizard de 4 pasos para crear/editar rutas personalizadas
- Búsqueda y autocompletado de paradas existentes
- Creación de nuevas paradas desde el wizard
- Reordenamiento visual con drag & drop
- Vista previa completa antes de guardar
- Integración completa con ConfigurationManager
- Validación de números de tren duplicados
- Diseño responsive y accesible

**Estado actual:** Wizard de Trayecto completamente funcional. Listo para Fase 5 (UI de Gestión).

### 2026-01-22 - Fase 5 Completada
- ✅ **Implementado ConfigurationManagerUI completo:**
  - `src/components/ConfigurationManagerUI.js` - UI principal de gestión de configuraciones
  - Sistema de tabs para alternar entre modelos y rutas
  - Listados separados de configuraciones del sistema y personalizadas
  - Operaciones CRUD completas (crear, editar, duplicar, eliminar)
  - Integración completa con TrainModelWizard y RouteWizard
  - Sistema de exportación/importación de configuraciones
  - Notificaciones toast de feedback al usuario
- ✅ Creado `css/components/config-manager.css` - Estilos completos de la UI
- ✅ Modificado `index.html` - Cargados componente y estilos
- ✅ Creado `test-config-manager-ui.html` - Panel de testing completo

**Características implementadas:**
- UI modal completa con tabs para modelos y rutas
- Visualización separada de configuraciones del sistema vs. personalizadas
- Botones de acción para cada item (editar, duplicar, eliminar)
- Integración fluida con wizards (oculta el manager mientras está el wizard abierto)
- Exportación de todas las configuraciones a JSON descargable
- Importación desde archivos JSON con validación
- Estadísticas en tiempo real (contadores de configuraciones)
- Formato de fechas relativas (hace Xh, hace Xd)
- Diseño responsive y accesible
- Animaciones y transiciones suaves
- Confirmaciones antes de eliminaciones
- Sistema de notificaciones toast

**Estado actual:** UI de Gestión completamente funcional. Listo para Fase 6 (Sistema de Compartición).

### 2026-01-22 - Fase 6 Completada
- ✅ **Implementado Sistema de Compartición completo:**
  - `src/features/config-sharing.js` - Sistema completo de compartición mediante QR y JSON
  - Generación de QR con código corto de JSONBin (límite 2KB)
  - Escaneo de QR desde cámara con Html5Qrcode
  - Fallback a descarga JSON para configuraciones grandes
  - Importación manual con código corto
  - Validación completa de datos importados
- ✅ Creado `css/components/config-sharing.css` - Estilos completos de modales QR
- ✅ Modificado `ConfigurationManagerUI.js` - Agregados botones "Compartir QR" y "Escanear QR"
- ✅ Modificado `index.html` - Cargada librería LZString y módulo config-sharing
- ✅ Creado `test-config-sharing.html` - Panel de testing completo con 5 casos de prueba

**Características implementadas:**
- Generación de QR con código corto (24 hex chars) para configs < 2KB
- Modal de advertencia para configs grandes con botón a exportar JSON
- Escaneo QR desde cámara con fallback de cámara trasera → frontal
- Descarga de configuraciones desde JSONBin con código corto
- Importación con confirmación mostrando resumen de contenido
- Fusión automática con configuraciones existentes
- Actualización automática de UI tras importación
- Manejo robusto de errores (sin cámara, código inválido, red, etc.)
- Modales con estados: loading, success, error, too-large
- Testing completo: crear datos, generar QR, escanear, importar manual

**Estado actual:** Sistema de compartición completamente funcional. Configuraciones se pueden compartir mediante QR codes o archivos JSON. Listo para Fase 7 (Integración Final).

---

_Última actualización: 2026-01-22_
