# 📋 Plan de Refactorización - script.js

**Objetivo**: Reducir ~5800 líneas en ~2000-2500 líneas (40-45% de reducción)

---

## 📊 Estado Actual

- **Líneas iniciales**: 5816
- **Líneas actuales**: 5212
- **Líneas reducidas**: 604 (10.4%)
- **Líneas objetivo**: ~3300-3800
- **Progreso**: 27% ⬛⬛⬛⬜⬜⬜⬜⬜⬜⬜

---

## 🎯 Fases de Refactorización

### ✅ Fase 1: Templates HTML → templates/ (~800 líneas)
**Estado**: ⬜ Pendiente

**Archivos a crear**:
- `templates/header.html`
- `templates/seats.html`
- `templates/modal.html`
- `templates/filter-modals.html`
- `templates/readme-content.html`

**Impacto**: Alta reducción de líneas, mejor mantenibilidad

---

### ✅ Fase 2: Sistema de modales genérico → src/utils/modal-system.js (~400 líneas)
**Estado**: ⬜ Pendiente

**Funciones a consolidar**:
- `openStopFilter()`, `openRouteFilter()`, `openSeatFilter()`
- `showStopFilterResults()`, `showRouteFilterResults()`, `showSeatFilterResults()`
- Múltiples funciones `close*Modal()`

**Impacto**: Elimina duplicación masiva, código más mantenible

---

### ✅ Fase 3: Scroll helpers consolidado → src/utils/modal-helpers.js (~200 líneas)
**Estado**: ⬜ Pendiente

**Funciones a consolidar**:
- `setupModalListScrollGuards()` (líneas 3741-3791)
- `setupModalOverlayScrollBlock()` (líneas 3814-3863)
- `setupModalScrollBehavior()` (líneas 5580-5628)

**Impacto**: Elimina lógica repetida de scroll

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
**Estado**: ⬜ Pendiente

**Líneas a mover**: 2043-2081

**Función a extraer**:
- `parseMarkdown()`

**Impacto**: Bajo, pero mejor organización

---

## 📈 Progreso por Fase

| Fase | Descripción | Líneas | Estado | Completado |
|------|-------------|--------|--------|------------|
| 6 | Exports optimizados | 50 | ✅ Completada | 100% |
| 4 | Pantallas estación | 140 | ✅ Completada | 100% |
| 5 | QR/Compartir | 433 | ✅ Completada | 100% |
| 7 | Markdown parser | ~80 | ⬜ Pendiente | 0% |
| 3 | Scroll helpers | ~200 | ⬜ Pendiente | 0% |
| 2 | Sistema modales | ~400 | ⬜ Pendiente | 0% |
| 1 | Templates HTML | ~800 | ⬜ Pendiente | 0% |

**Total reducción alcanzada**: 604 líneas (27% del objetivo)
**Total reducción estimada**: 2210 líneas (38% del archivo)

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
