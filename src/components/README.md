# Componentes del Editor Visual de Asientos

Este directorio contiene los componentes del editor visual de layouts de asientos para la funcionalidad de configuraciones personalizadas.

## Componentes

### 1. ElementPalette.js
Paleta de elementos disponibles para crear layouts.

**Elementos soportados:**
- 💺 Asiento (numerado)
- ⬜ Espacio vertical
- 🚽 WC (baño)
- 🧳 EQ (equipaje)
- 🪑 MESA
- ♿ PMR (asiento PMR)
- ♿ MIN (espacio minusválidos)
- ⚪ Vacío (null)

### 2. SeatRowEditor.js
Editor de una fila individual de asientos.

**Funcionalidades:**
- Edición en línea de posiciones
- Agregar/eliminar posiciones
- Mover fila arriba/abajo
- Detección automática de tipo de elemento
- Formato: `space:80` para espacios con altura

### 3. LayoutPreview.js
Vista previa en tiempo real del layout.

**Funcionalidades:**
- Renderizado visual del layout completo
- Validación de estructura
- Estadísticas (asientos, elementos especiales, etc.)
- Detección de errores

### 4. SeatLayoutEditor.js
Editor principal que integra todos los componentes.

**Funcionalidades:**
- Panel dual: editor + vista previa
- Numeración automática de asientos
- Agregar/eliminar secciones
- Operaciones CRUD en filas
- Callback onChange para cambios
- Export/import de layouts

## Uso Básico

```javascript
// Crear editor
const editor = window.SeatLayoutEditor.init({
    layout: [
        {
            type: 'seats',
            positions: [
                [1, 2, null, 3, 4],
                [5, 6, null, 7, 8]
            ]
        },
        {
            type: 'space',
            height: 80
        }
    ],
    coachName: 'Coche 1',
    autoNumber: true,
    onChange: (layout) => {
        console.log('Layout actualizado:', layout);
    }
});

// Agregar al DOM
document.getElementById('container').appendChild(editor);

// Obtener layout actual
const currentLayout = window.SeatLayoutEditor.getLayout();

// Cambiar layout
window.SeatLayoutEditor.setLayout(newLayout);
```

## Estructura de Layout

```javascript
[
    // Sección de asientos
    {
        type: 'seats',
        positions: [
            [1, 2, null, 3, 4],      // Fila 1
            [5, 6, 'MESA', 7, 8],    // Fila 2 con mesa
            ['PMR', 'PMR', null, 9, 10]  // Fila 3 con PMR
        ]
    },

    // Espacio vertical
    {
        type: 'space',
        height: 80
    },

    // Puerta
    {
        type: 'door',
        height: 120
    },

    // Baño PMR
    {
        type: 'pmr-bathroom',
        height: 100,
        label: 'BAÑO PMR'
    }
]
```

## Testing

Abre `test-seat-editor.html` en el navegador para probar el editor:

```bash
# En el navegador, abre:
file:///ruta/al/proyecto/test-seat-editor.html
```

### Funciones de Testing

- **💾 Guardar Layout**: Guarda el layout actual en localStorage
- **📋 Cargar Ejemplo**: Carga un layout de ejemplo complejo
- **📄 Ver JSON**: Muestra el JSON del layout actual
- **🗑️ Limpiar**: Reinicia el editor
- **✅ Validar**: Valida el layout y muestra estadísticas

## Integración con ConfigurationManager

```javascript
// Crear modelo de tren con el layout
const trainModel = {
    id: window.IdGenerator.generateUniqueId('train', []),
    name: 'Mi Modelo Personalizado',
    custom: true,
    createdAt: new Date().toISOString(),
    coaches: [
        {
            id: 'C1',
            name: 'Coche 1',
            layout: window.SeatLayoutEditor.getLayout()
        }
    ]
};

// Guardar
const result = window.ConfigurationManager.saveCustomTrainModel(trainModel);
if (result.success) {
    console.log('✅ Modelo guardado');
}
```

## Estilos

Los estilos se encuentran en `css/components/seat-editor.css` e incluyen:
- Diseño responsive
- Soporte para modo oscuro
- Animaciones y transiciones
- Estilos por tipo de elemento

## Próximos Pasos

- **Fase 3**: Integración con TrainModelWizard
- **Fase 4**: Wizard de trayectos
- **Fase 5**: UI de gestión completa
