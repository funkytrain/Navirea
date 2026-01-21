# 📋 Plan de Refactorización - script.js

**Objetivo**: Reducir ~5800 líneas en ~2000-2500 líneas (40-45% de reducción)

---

## 📊 Estado Actual

- **Líneas iniciales**: 5816
- **Líneas actuales**: 4159
- **Líneas reducidas**: 1657 (28.5%)
- **Líneas objetivo**: ~3300-3800
- **Progreso**: 66% ⬛⬛⬛⬛⬛⬛⬛⬜⬜⬜

---

## 🎯 Fases de Refactorización

### ✅ Fase 1: Templates HTML → src/utils/templates.js (~554 líneas)
**Estado**: ✅ Completada

**Líneas reducidas**: 554 líneas en script.js (4713 → 4159)
**Módulo creado**: src/utils/templates.js (480 líneas)
**Reducción neta**: 74 líneas

**Archivos creados**:
- `src/utils/templates.js` - Generadores de templates HTML
- `templates/readme-content.html` - Contenido Markdown de la guía

**Templates consolidados**:
- `generateHeaderTemplate()` - Header completo con menús y controles (~285 líneas de HTML)
- `generateMoreOptionsMenu()` - Menú desplegable de opciones (~95 líneas)
- `generateAboutModal()` - Modal "Acerca de" (~30 líneas)
- `generateManualTecnicoModal()` - Modal del manual técnico (~25 líneas)
- `generateServiceNotesModal()` - Modal de notas del servicio (~37 líneas)
- `generateReadmeModal()` - Modal de guía (con carga asíncrona de README)

**Funciones refactorizadas en script.js**:
- `renderHeader()` - Ahora delega generación HTML a templates.js
- `openAbout()` - Reducida a 3 líneas
- `openReadmeModal()` - Reducida a 4 líneas (async)
- `openManualTecnico()` - Reducida a 3 líneas
- `openServiceNotes()` - Reducida a 8 líneas

**Impacto**: ✅ Mejor modularización, templates centralizados y reutilizables

---

### ✅ Fase 2: Sistema de modales genérico → src/utils/modal-system.js (~400 líneas)
**Estado**: ✅ Completada

**Líneas reducidas**: 282 líneas netas en script.js (4995 → 4713)
**Módulo creado**: src/utils/modal-system.js (388 líneas)

**Funciones consolidadas**:
- `openStopFilter()`, `openRouteFilter()`, `openSeatFilter()` - Ahora usan `createInputModalWithSuggestions()` y `createSimpleInputModal()`
- `showStopFilterResults()`, `showRouteFilterResults()`, `showSeatFilterResults()` - Ahora usan `createFilterResultsModal()`
- `showFilterListModal()` - Ahora usa `createListModal()`
- `showConfirmModal()`, `closeConfirmModal()` - Movidos al módulo
- `closeGenericModal()`, `closeFilterInputModal()`, `closeFilterModal()` - Movidos al módulo

**Generadores genéricos creados**:
- `createInputModalWithSuggestions()` - Modales con autocompletado
- `createSimpleInputModal()` - Modales de entrada simples
- `createFilterResultsModal()` - Modales de resultados con opciones
- `createListModal()` - Modales con listas navegables
- `createConfirmModal()` - Modales de confirmación

**Impacto**: ✅ Elimina duplicación masiva, código mucho más mantenible

---

### ✅ Fase 3: Scroll helpers consolidado → src/utils/modal-helpers.js (~200 líneas)
**Estado**: ✅ Completada

**Líneas movidas**: 187 líneas reales

**Funciones extraídas**:
- `setupModalListScrollGuards()`
- `removeModalScrollGuards()`
- `setupModalOverlayScrollBlock()`
- `removeModalOverlayScrollBlock()`
- `setupModalScrollBehavior()`

**Resultado**: ✅ Módulo creado con sistema completo de scroll guards

---

### ✅ Fase 4: Pantallas estación → src/features/station-screens.js (~180 líneas)
**Estado**: ✅ Completada

**Líneas movidas**: 140 líneas reales

**Funciones extraídas**:
- `openScreensModal()`
- `closeScreensModal()`
- `removeAllScreenModals()`
- `updateScreenSearch()`
- `openStationScreen()`
- `closeStationScreen()`
- `toggleScreen()`

**Resultado**: ✅ Módulo creado y funcional

---

### ✅ Fase 5: QR/Compartir → src/features/qr-sharing.js (~450 líneas)
**Estado**: ✅ Completada

**Líneas movidas**: 433 líneas reales

**Funciones extraídas**:
- `uploadTurnToServer()`
- `downloadTurnFromServer()`
- `generateQRCode()`
- `closeQRModal()`
- `scanQRCode()`
- `startQRScanning()`
- `processQRData()`
- `closeScanModal()`
- `removeModalAndUnlock()`

**Resultado**: ✅ Módulo creado con gestión completa de QR

---

### ✅ Fase 6: Exports optimizados (~100 líneas)
**Estado**: ✅ Completada

**Líneas optimizadas**: 50 líneas reducidas

**Estrategia aplicada**:
- ✅ Objeto de exportación centralizado con `Object.assign()`
- ✅ Exports agrupados por categoría
- ✅ Código más legible y mantenible

**Resultado**: ✅ Sistema de exports mejorado

---

### ✅ Fase 7: Markdown parser → src/utils/markdown.js (~80 líneas)
**Estado**: ✅ Completada

**Líneas movidas**: 38 líneas reales

**Función extraída**:
- `parseMarkdown()`

**Resultado**: ✅ Módulo creado con parser de Markdown simple

---

## 📈 Progreso por Fase

| Fase | Descripción | Líneas | Estado | Completado |
|------|-------------|--------|--------|------------|
| 6 | Exports optimizados | 50 | ✅ Completada | 100% |
| 4 | Pantallas estación | 140 | ✅ Completada | 100% |
| 5 | QR/Compartir | 433 | ✅ Completada | 100% |
| 7 | Markdown parser | 38 | ✅ Completada | 100% |
| 3 | Scroll helpers | 187 | ✅ Completada | 100% |
| 2 | Sistema modales | 282 | ✅ Completada | 100% |
| 1 | Templates HTML | 554 | ✅ Completada | 100% |

**Total reducción alcanzada**: 1657 líneas (66% del objetivo)
**Total líneas en script.js**: 4159 (reducción del 28.5% desde inicio)

---

## 🔧 Notas Técnicas

### Dependencias entre fases
- Fase 6 debe completarse antes de Fases 4-5 (para estructura de exports)
- Fase 3 puede hacerse independiente
- Fases 1-2 son las más complejas (muchas interdependencias)

### Precauciones
- ⚠️ No romper funcionalidades existentes
- ✅ Mantener compatibilidad con localStorage
- ✅ Preservar event handlers globales
- ✅ Testear tras cada fase

---

## 📝 Log de Cambios

### [2026-01-21] - Fase 2 Completada
**Fase 2: Sistema de modales genérico**
- ✅ Creado módulo `src/utils/modal-system.js` (388 líneas)
- ✅ Consolidadas todas las funciones de modales duplicadas
- ✅ Refactorizadas funciones de filtros para usar generadores genéricos:
  - `openStopFilter()`, `openRouteFilter()`, `openSeatFilter()`
  - `showStopFilterResults()`, `showRouteFilterResults()`, `showSeatFilterResults()`
  - `showFilterListModal()` para enlaces y comentarios
- ✅ Eliminadas funciones duplicadas:
  - `closeGenericModal()`, `closeFilterInputModal()`, `closeFilterModal()`
  - `showConfirmModal()`, `closeConfirmModal()`
  - `escapeHtml()` (duplicada)
- ✅ Creados 5 generadores de modales reutilizables:
  - `createInputModalWithSuggestions()` - con autocompletado
  - `createSimpleInputModal()` - entrada simple
  - `createFilterResultsModal()` - resultados con acciones
  - `createListModal()` - listas navegables
  - `createConfirmModal()` - confirmaciones
- ✅ Añadido import en index.html (antes de modal-helpers.js)
- ✅ Reducción: **282 líneas netas** (4995 → 4713)

**Resultado**:
- 📉 De 4995 → 4713 líneas (282 líneas eliminadas)
- 📊 48% del objetivo de refactorización alcanzado (1103 líneas totales)
- ✅ Código de modales completamente DRY y mantenible
- ✅ Sistema genérico listo para reutilizar en toda la app

**Impacto**:
- Elimina ~200 líneas de HTML duplicado en modales
- Centraliza lógica de apertura/cierre de modales
- Facilita futuros cambios en diseño de modales
- Reduce complejidad cognitiva del código

**Estado**: ✅ Fase 2 completada sin incidencias

---

### [2026-01-21] - Fases 4, 5, 6 Completadas
**Fase 6: Exports optimizados**
- ✅ Consolidados 90+ exports individuales en `Object.assign()`
- ✅ Agrupados por categoría funcional (navegación, modales, filtros, etc.)
- ✅ Reducción: ~50 líneas

**Fase 4: Pantallas estación**
- ✅ Creado módulo `src/features/station-screens.js`
- ✅ Extraídas 7 funciones de gestión de pantallas
- ✅ Añadido import en index.html
- ✅ Reducción: ~140 líneas

**Fase 5: QR/Compartir**
- ✅ Creado módulo `src/features/qr-sharing.js`
- ✅ Extraídas 9 funciones de QR (generar, escanear, subir, descargar)
- ✅ Sistema completo de compartir por código QR
- ✅ Añadido import en index.html
- ✅ Reducción: ~433 líneas

**Resultado Total**:
- 📉 De 5816 → 5212 líneas (604 líneas eliminadas)
- 📊 27% del objetivo de refactorización alcanzado

**Correcciones aplicadas (1ra iteración)**:
- ✅ Corregidos imports de `lockBodyScroll`/`unlockBodyScroll` para usar `window.*`
- ✅ Reemplazada función `closeGenericModal` por implementación inline
- ✅ Eliminadas referencias a funciones movidas desde `Object.assign()` en script.js
- ✅ Corregidos typos `unwindow.lockBodyScroll` → `window.unlockBodyScroll`

**Correcciones aplicadas (2da iteración - Bugs críticos)**:
- ✅ **Bug #1**: Exportado `window.state` para acceso desde qr-sharing.js
- ✅ **Bug #1**: Exportadas funciones `getAllTrains`, `saveData`, `render` a window
- ✅ **Bug #2**: Exportado `window.stops` para búsqueda de estaciones
- ✅ **Bug #2**: Exportado `window.stationScreens` para validación de estaciones
- ✅ Corregidos 2 typos adicionales en station-screens.js:
  - `window.unwindow.lockBodyScroll()` → `window.unlockBodyScroll()`
  - `unwindow.lockBodyScroll()` → `window.unlockBodyScroll()`

**Correcciones aplicadas (3ra iteración - Bugs de carga asíncrona)**:
- ✅ **Bug #1 (QR)**: Exportado `window.JSONBIN_API_KEY` desde constants.js
- ✅ **Bug #1 (QR)**: Exportado `window.JSONBIN_BASE_URL` desde constants.js
- ✅ **Bug #2 (Estaciones)**: Cambiado exports de variables a **getters** con `Object.defineProperty()`
  - Ahora `window.state`, `window.stops`, `window.stationScreens` siempre retornan el valor actualizado
  - Soluciona problema de referencias a arrays/objetos vacíos antes de carga asíncrona

**Estado**: ✅ Módulos funcionales con datos cargados correctamente

---

### [2026-01-21] - Fase 7 Completada
**Fase 7: Markdown parser**
- ✅ Creado módulo `src/utils/markdown.js`
- ✅ Extraída función `parseMarkdown()` (líneas 2043-2081)
- ✅ Añadido import en index.html
- ✅ Reducción: 38 líneas

**Resultado**:
- 📉 De 5212 → 5182 líneas (30 líneas netas eliminadas)
- 📊 28% del objetivo de refactorización alcanzado
- ✅ Parser de Markdown modularizado y reutilizable

**Estado**: ✅ Fase 7 completada sin incidencias

---

### [2026-01-21] - Fase 3 Completada
**Fase 3: Scroll helpers consolidado**
- ✅ Reescrito módulo `src/utils/modal-helpers.js` con funciones completas
- ✅ Extraídas 5 funciones de gestión de scroll:
  - `setupModalListScrollGuards()` - Guards para scroll en listas
  - `removeModalScrollGuards()` - Limpieza de listeners de lista
  - `setupModalOverlayScrollBlock()` - Bloqueo de scroll en overlay
  - `removeModalOverlayScrollBlock()` - Limpieza de listeners de overlay
  - `setupModalScrollBehavior()` - Configuración unificada de scroll
- ✅ Incluye variables globales de handlers (modalWheelHandler, overlayTouchMoveHandler, etc.)
- ✅ Import ya existente en index.html (línea 57)
- ✅ Reducción: 187 líneas

**Resultado**:
- 📉 De 5182 → 4995 líneas (187 líneas eliminadas)
- 📊 36% del objetivo de refactorización alcanzado
- ✅ Sistema de scroll guards completamente modularizado
- ✅ Elimina duplicación de lógica de scroll en modales

**Estado**: ✅ Fase 3 completada sin incidencias

---

### [2026-01-21] - Fase 1 Completada
**Fase 1: Templates HTML consolidados**
- ✅ Creado módulo `src/utils/templates.js` (480 líneas)
- ✅ Extraído archivo `templates/readme-content.html` con contenido Markdown
- ✅ Consolidados 6 generadores de templates HTML grandes:
  - `generateHeaderTemplate()` - Header completo (~285 líneas HTML)
  - `generateMoreOptionsMenu()` - Menú de opciones (~95 líneas)
  - `generateAboutModal()` - Modal "Acerca de" (~30 líneas)
  - `generateManualTecnicoModal()` - Modal manual técnico (~25 líneas)
  - `generateServiceNotesModal()` - Modal notas servicio (~37 líneas)
  - `generateReadmeModal()` - Modal guía (carga asíncrona)
- ✅ Refactorizadas 5 funciones de script.js para usar templates:
  - `renderHeader()` - Simplificada a lógica + llamada a generador
  - `openAbout()` - Reducida de 32 → 3 líneas
  - `openReadmeModal()` - Reducida de 201 → 4 líneas
  - `openManualTecnico()` - Reducida de 29 → 3 líneas
  - `openServiceNotes()` - Reducida de 47 → 8 líneas
- ✅ Añadido import en index.html (línea 60)
- ✅ Reducción: 554 líneas brutas (74 líneas netas)

**Resultado**:
- 📉 De 4713 → 4159 líneas (554 líneas eliminadas de script.js)
- 📊 66% del objetivo de refactorización alcanzado (1657 líneas totales)
- ✅ Templates HTML completamente modularizados
- ✅ Código más mantenible y DRY
- ✅ README content externalizado para fácil edición

**Impacto**:
- Centraliza todos los templates HTML grandes en un módulo
- Facilita futuros cambios en diseño de modales y header
- Mejora legibilidad de script.js al eliminar HTML extenso inline
- Permite reutilización de templates en futuras features

**Estado**: ✅ Fase 1 completada sin incidencias
