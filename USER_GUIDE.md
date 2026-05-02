# Guía de Usuario - Sistema de Configuraciones Personalizadas

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Acceder al Gestor de Configuraciones](#acceder-al-gestor-de-configuraciones)
3. [Crear un Modelo de Tren Personalizado](#crear-un-modelo-de-tren-personalizado)
4. [Crear un Trayecto Personalizado](#crear-un-trayecto-personalizado)
5. [Gestionar Configuraciones](#gestionar-configuraciones)
6. [Compartir Configuraciones](#compartir-configuraciones)
7. [Importar Configuraciones](#importar-configuraciones)
8. [Preguntas Frecuentes](#preguntas-frecuentes)

---

## Introducción

El Sistema de Configuraciones Personalizadas te permite crear y gestionar tus propios **modelos de tren** y **trayectos**, personalizando completamente la disposición de asientos y las rutas según tus necesidades específicas.

### ¿Qué puedes hacer?

- ✅ Crear modelos de tren con disposiciones de asientos personalizadas
- ✅ Definir trayectos con paradas específicas
- ✅ Editar, duplicar y eliminar configuraciones
- ✅ Exportar e importar configuraciones entre dispositivos
- ✅ Compartir configuraciones mediante códigos QR
- ✅ Usar plantillas predefinidas para comenzar rápidamente

---

## Acceder al Gestor de Configuraciones

Hay **dos formas** de acceder al gestor:

### Opción 1: Desde el Selector de Trenes
1. Haz clic en el **nombre del tren** en la parte superior
2. Al final del selector verás el botón **"⚙️ Gestionar Configuraciones"**
3. Haz clic en ese botón

### Opción 2: Desde el Menú Principal
1. Haz clic en el botón **"Más opciones"** (tres puntos)
2. Selecciona **"Configuraciones Personalizadas"**

---

## Crear un Modelo de Tren Personalizado

### Paso 1: Abrir el Wizard de Creación

1. Accede al **Gestor de Configuraciones**
2. Ve a la pestaña **"Modelos de Tren"**
3. Haz clic en el botón **"+ Nuevo Modelo"**

### Paso 2: Información Básica

#### Seleccionar una Plantilla (opcional)
- Se mostrarán **5 plantillas predefinidas**:
  - 🚆 **Tren Regional (3 Coches)**: Configuración típica con 4 asientos por fila
  - 🚇 **Tren Suburbano (4 Coches)**: Alta capacidad con disposición 3+2
  - 🚄 **Tren Intercity (2 Coches)**: Asientos confortables 2+2 con mesas
  - ♿ **Tren Regional Accesible**: Con espacios PMR distribuidos
  - 📄 **Modelo en Blanco**: Comienza desde cero

- Haz clic en una plantilla para seleccionarla (aparecerá un ✓)
- Si seleccionas una plantilla, el nombre se autocompletará

#### Ingresar Información
- **Nombre del Modelo** *(requerido)*: Un nombre descriptivo (ej: "Tren Zaragoza-Huesca")
- **Descripción** *(opcional)*: Información adicional sobre el modelo

**💡 Consejo**: Los iconos **?** junto a cada campo muestran ayuda adicional al pasar el cursor sobre ellos.

### Paso 3: Configuración de Coches

1. **Número de Coches**: Define cuántos coches tendrá tu tren (1-20)
2. **Nombres de los Coches**: Asigna un nombre a cada coche
   - Por defecto se llaman "Coche 1", "Coche 2", etc.
   - Puedes personalizarlos (ej: "Coche Accesible", "Coche Premium")

**⚠️ Importante**: Si reduces el número de coches, se perderán los layouts de los coches eliminados.

### Paso 4: Editor de Layouts

Este es el paso más importante. Aquí diseñarás la disposición de asientos de cada coche.

#### Panel Izquierdo: Herramientas de Edición

**Elementos Disponibles**:
- 💺 **Asiento**: Asiento numerado normal
- 🚪 **Espacio**: Espaciador vertical (puertas, pasillos)
- 🚽 **WC**: Servicio
- 🧳 **EQ**: Equipaje
- 🍽️ **MESA**: Mesa
- ♿ **PMR**: Espacio para personas con movilidad reducida
- 🦽 **MIN**: Espacio para minusválidos

**Controles**:
- **+ Agregar Fila de Asientos**: Agrega una nueva fila de asientos
- **+ Agregar Espacio**: Agrega un espaciador vertical
- **+ Agregar Especiales**: Agrega fila con elementos especiales (WC, EQ, etc.)

#### Panel Derecho: Vista Previa

Muestra en tiempo real cómo se verá el coche con tus cambios.

#### Cómo Editar una Fila de Asientos

1. Haz clic en **"+ Agregar Fila de Asientos"**
2. En la fila aparecen **5 posiciones** editables
3. Para cada posición, haz clic en el selector y elige:
   - **Asiento**: Se numerará automáticamente
   - **null** (vacío): Pasillo o espacio vacío
   - **Elementos especiales**: WC, EQ, MESA, PMR, MIN

**Ejemplo de fila típica**:
```
[1] [2] [ ] [3] [4]
 ↑   ↑   ↑   ↑   ↑
 A   A   P   A   A

A = Asiento
P = Pasillo (null)
```

#### Numeración Automática de Asientos

- Los asientos se numeran automáticamente en orden
- Si tienes 3 coches, los números continúan entre coches:
  - Coche 1: asientos 1-20
  - Coche 2: asientos 21-40
  - Coche 3: asientos 41-60
- **No puede haber números duplicados** (el wizard te avisará si esto ocurre)

#### Cambiar entre Coches

Usa el **selector de coche** en la parte superior para cambiar entre coches y editar sus layouts.

### Paso 5: Vista Previa

Revisa toda la configuración antes de guardar:
- Información del modelo
- Vista previa de todos los coches
- Verifica que todo esté correcto

### Paso 6: Finalizar

Haz clic en **"Finalizar"** para guardar el modelo. ¡Listo! Tu modelo personalizado ya está disponible para usar.

---

## Crear un Trayecto Personalizado

### Paso 1: Abrir el Wizard de Creación

1. Accede al **Gestor de Configuraciones**
2. Ve a la pestaña **"Trayectos"**
3. Haz clic en el botón **"+ Nuevo Trayecto"**

### Paso 2: Número de Tren

Ingresa el número identificador del tren (ej: 99001, 12345).

**⚠️ Importante**: El número debe ser único. No puede haber dos trayectos con el mismo número.

### Paso 3: Definir Paradas

#### Agregar Paradas

1. Escribe el nombre de la parada en el campo de búsqueda
2. Opciones:
   - **Si la parada existe**: Aparecerá en el autocompletado, selecciónala
   - **Si la parada NO existe**: Haz clic en **"+ Agregar nueva parada: [nombre]"**

3. La parada se agregará a la lista

#### Reordenar Paradas

- Arrastra las paradas usando el icono **☰** para cambiar el orden
- El orden es importante: refleja la secuencia del trayecto

#### Eliminar Paradas

- Haz clic en el botón **🗑️** junto a la parada que deseas eliminar

**💡 Consejo**: Las paradas muestran badges indicando:
- **INICIO**: Primera parada del trayecto
- **FIN**: Última parada del trayecto
- **DESTINO**: Parada destino principal

### Paso 4: Seleccionar Destino

Elige la **parada destino** del trayecto desde un selector.

**Nota**: El destino debe ser una de las paradas del trayecto (normalmente la última).

### Paso 5: Vista Previa

Revisa:
- Número de tren
- Listado completo de paradas en orden
- Parada destino
- Total de paradas

### Paso 6: Finalizar

Haz clic en **"Finalizar"** para guardar el trayecto. ¡Tu trayecto personalizado ya está listo!

---

## Gestionar Configuraciones

### Ver Configuraciones

El Gestor de Configuraciones separa las configuraciones en dos secciones:

#### Configuraciones del Sistema
- Modelos de tren predefinidos (470, 449, 463, 464, 465)
- Trayectos predefinidos del sistema
- **No se pueden editar ni eliminar**

#### Configuraciones Personalizadas
- Tus modelos y trayectos creados
- Aparecen con el badge **"PERSONALIZADO"** o **"CUSTOM"**
- Se pueden **editar**, **duplicar** y **eliminar**

### Editar una Configuración

1. Localiza la configuración en la lista
2. Haz clic en el botón **⚙️ (Editar)**
3. Se abrirá el wizard con los datos prellenados
4. Realiza los cambios necesarios
5. Finaliza el wizard para guardar los cambios

### Duplicar una Configuración

Útil para crear variaciones de un modelo existente:

1. Haz clic en el botón **📋 (Duplicar)**
2. Se creará una copia con el nombre "Copia de [nombre original]"
3. Puedes editarla inmediatamente después

### Eliminar una Configuración

1. Haz clic en el botón **🗑️ (Eliminar)**
2. Confirma la eliminación en el diálogo
3. La configuración se eliminará permanentemente

**⚠️ Advertencia**: Esta acción no se puede deshacer. Asegúrate de exportar tus configuraciones importantes antes de eliminarlas.

---

## Compartir Configuraciones

Puedes compartir tus configuraciones personalizadas con otros dispositivos o usuarios.

### Método 1: Código QR (Recomendado para configs pequeñas)

#### Generar QR

1. Ve a la pestaña de **"Modelos de Tren"** o **"Trayectos"**
2. Localiza la configuración que deseas compartir
3. Haz clic en **"📱 Compartir QR"**
4. Si la configuración es pequeña (< 2KB):
   - Se generará un **código QR**
   - También se mostrará un **código corto** (24 caracteres hexadecimales)
5. Si es muy grande:
   - Verás un aviso sugiriendo usar exportación JSON

#### Escanear QR en Otro Dispositivo

1. Abre la aplicación en el otro dispositivo
2. Ve al **Gestor de Configuraciones**
3. Haz clic en **"📷 Escanear QR"**
4. Permite el acceso a la cámara
5. Apunta la cámara al código QR
6. La configuración se descargará e importará automáticamente

**💡 Consejo**: Si no tienes cámara, puedes usar el código corto manualmente (ver "Importar con Código").

### Método 2: Exportar/Importar JSON (Para configs grandes o múltiples)

#### Exportar Todo a JSON

1. Haz clic en el botón **"📤 Exportar Todo"**
2. Se descargará un archivo `train-configurations.json` con todas tus configuraciones personalizadas
3. Guarda este archivo en un lugar seguro

**Qué incluye la exportación**:
- Todos tus modelos de tren personalizados
- Todos tus trayectos personalizados
- Todas las paradas personalizadas
- Metadatos (versión, timestamp)

#### Importar desde JSON

1. Haz clic en el botón **"📥 Importar"**
2. Selecciona el archivo `.json` que exportaste anteriormente
3. Verás un resumen de lo que se va a importar
4. Confirma la importación
5. Las configuraciones se fusionarán con las existentes

**⚠️ Importante**:
- Si hay IDs duplicados, se mantendrá la configuración más reciente
- No se eliminarán configuraciones existentes
- Se recomienda hacer una exportación antes de importar

---

## Importar Configuraciones

### Desde Código QR (con Cámara)

Ver sección [Compartir Configuraciones > Escanear QR](#escanear-qr-en-otro-dispositivo).

### Desde Código Corto (sin Cámara)

1. Pide a quien comparte que te proporcione el **código corto** (24 caracteres hexadecimales)
2. En el Gestor, haz clic en **"📱 Compartir QR"**
3. En el modal del QR, busca la opción **"¿Tienes un código? Ingrésalo aquí"**
4. Pega el código
5. Haz clic en **"Importar"**
6. La configuración se descargará y se agregará a tu lista

### Desde Archivo JSON

Ver sección [Compartir Configuraciones > Importar desde JSON](#importar-desde-json).

---

## Preguntas Frecuentes

### ¿Dónde se almacenan mis configuraciones personalizadas?

Se almacenan localmente en el **localStorage** de tu navegador. Esto significa:
- ✅ No se requiere conexión a internet
- ✅ Son privadas y solo tuyas
- ⚠️ Se borran si limpias los datos del navegador
- ⚠️ No se sincronizan automáticamente entre dispositivos

**Recomendación**: Exporta tus configuraciones regularmente como backup.

### ¿Puedo editar los modelos predefinidos del sistema?

No directamente, pero puedes:
1. Duplicar el modelo del sistema
2. Editar la copia duplicada
3. Ahora tienes una versión personalizada que sí puedes modificar

### ¿Qué pasa si dos asientos tienen el mismo número?

El wizard **no te permitirá guardar** el modelo si hay números de asiento duplicados. Verás un mensaje de error indicando exactamente en qué coches está el problema. Debes corregirlo antes de continuar.

### ¿Puedo tener más de 20 coches?

Actualmente el límite es **20 coches** por modelo. Este límite está pensado para mantener un rendimiento óptimo de la aplicación.

### ¿Cómo sé si estoy usando una configuración personalizada?

Las configuraciones personalizadas se identifican con:
- Badge **verde** con el texto "PERSONALIZADO" o "CUSTOM"
- Aparecen en la sección "Personalizados" del selector
- En el header principal, se muestra un badge "CUSTOM" junto al nombre del tren

### ¿Qué hago si pierdo mis configuraciones?

Si borraste los datos del navegador o cambiaste de dispositivo:
1. Si hiciste una exportación JSON anteriormente, importa ese archivo
2. Si alguien más tiene las configuraciones, pídele que te las comparta por QR o JSON
3. Si no tienes backup, tendrás que recrearlas manualmente

**💡 Prevención**: Exporta regularmente tus configuraciones a un archivo JSON.

### ¿Las configuraciones compartidas por QR expiran?

Sí, los códigos QR almacenan los datos en un servicio temporal (JSONBin) que puede tener límites de tiempo o acceso. Si necesitas compartir configuraciones de forma permanente, usa la exportación JSON.

### ¿Puedo usar configuraciones personalizadas en modo offline?

¡Sí! Una vez creadas e importadas, las configuraciones funcionan completamente offline. Solo necesitas conexión para:
- Escanear/generar códigos QR
- Importar usando código corto

### ¿Cómo cambio el nombre de un coche después de crearlo?

1. Edita el modelo (botón ⚙️)
2. Ve al **Paso 2: Configuración de Coches**
3. Cambia los nombres como desees
4. Continúa hasta finalizar

### ¿Puedo cambiar el número de tren de un trayecto?

No directamente. El número de tren es el ID único del trayecto. Si necesitas cambiarlo:
1. Crea un nuevo trayecto con el número correcto
2. Copia manualmente las paradas del trayecto antiguo
3. Elimina el trayecto antiguo

### ¿Qué significan los elementos especiales?

- **WC** 🚽: Servicio/baño
- **EQ** 🧳: Espacio para equipaje
- **MESA** 🍽️: Mesa entre asientos
- **PMR** ♿: Espacio reservado para Personas con Movilidad Reducida
- **MIN** 🦽: Espacio para personas con minusvalías

### ¿Puedo crear paradas con abreviaturas personalizadas?

Actualmente, al crear nuevas paradas solo defines el nombre completo. La abreviatura se genera automáticamente tomando las primeras 3 letras del nombre.

**Ejemplo**: "Tardienta" → "TAR"

---

## Soporte y Ayuda

### ¿Necesitas más ayuda?

- **Tooltips en la aplicación**: Los iconos **?** proporcionan ayuda contextual
- **Archivo de arquitectura**: Consulta `CUSTOM_CONFIG_ARCHITECTURE.md` para detalles técnicos
- **Testing**: Usa los archivos `test-*.html` para probar funcionalidades individuales

---

**Última actualización**: 2026-01-24
**Versión del sistema**: 1.0
