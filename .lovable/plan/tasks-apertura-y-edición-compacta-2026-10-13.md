# Tasks: apertura y edición compacta

## Cambios
- Quitar de la interfaz las opciones de conectar, importar y sincronizar con Google Calendar, tanto del menú del árbol como del detalle de tareas. Mantener el Planificador propio. No borrar conexiones, eventos ni datos existentes.
- En Tasks, quitar la etiqueta de la tarea madre de las subtareas. La madre seguirá accesible al abrir la subtarea, mediante sus migas y navegación actuales.
- Sustituir «Ver nota» por el nombre pulsable con una pequeña flecha de apertura al lado. Ambos abrirán la tarea o subtarea correspondiente; no editarán el nombre.
- Mantener el icono izquierdo exclusivamente para plegar/desplegar contenido, con las entradas plegadas inicialmente. Las casillas seguirán marcando completado sin abrir la nota.
- Mostrar fecha y hora juntas en una sola línea, sin cortes ni desbordamientos en móvil. Pulsarlas abrirá su selector para cambiar o quitar fecha y hora, sin abrir la nota.
- Debajo de fecha/hora, mostrar un control de prioridad del tamaño de la etiqueta actual: icono de bandera y Alta, Media o Baja. Si no hay fecha, ocupará su lugar bajo el nombre; si no hay prioridad, un control discreto permitirá añadirla.
- Pulsar prioridad abrirá un menú con Sin prioridad, Alta, Media y Baja. Aplicar estos controles también a las subtareas mostradas dentro de una tarea desplegada; los items de checklist no tendrán prioridad ni fecha.
- Quitar la prioridad del interior de las notas y del detalle de subtareas, incluidas sus etiquetas y selectores. Conservar sus valores: se consultarán y editarán desde Tasks y Post-its.
- En Post-its, añadir el mismo control compacto de prioridad, independiente de la apertura de la tarjeta, y hacer que ordenar por prioridad considere también la prioridad propia de la nota.

## Detalles técnicos
- Reutilizar los controles de botón, menú y selector de fecha de la aplicación, con acciones independientes que no activen apertura o desplegado accidentalmente.
- Guardar prioridad y fecha de tareas en los campos existentes de la nota; para subtareas, actualizar su item dentro del checklist de la nota contenedora. Sin notas duplicadas ni cambios de esquema.
- Actualizar TasksView, PostItsView, TaskSheet, NotePostIt y ViewMembershipBar; retirar únicamente los accesos a Google Calendar del menú del árbol, sin cambiar su funcionamiento interno.
- Mantener la pertenencia manual a vistas, jerarquía, enlaces, orden de completado, historial de navegación y geometría/gestos del árbol.

## Verificación
- Comprobar en móvil y escritorio que fecha y hora caben en una línea y prioridad aparece debajo sin botones grandes.
- Verificar apertura de una subtarea por nombre/flecha, navegación a su madre y desplegado independiente mediante el icono izquierdo.
- Cambiar y quitar fecha/hora y cada prioridad directamente en Tasks, confirmar persistencia y comprobar el mismo valor en Post-its.
- Añadir pruebas de actualización independiente de tareas/subtareas y de ordenación de Post-its por prioridad propia, sin modificar familiares ni contenido.
- Confirmar que no quedan accesos visibles a Google Calendar ni prioridades dentro de la nota y que el Planificador propio sigue disponible.