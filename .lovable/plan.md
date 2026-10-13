# Fecha unificada, prioridad dentro de la nota y edición de checklist

## Cambios
- Unificar fecha y hora en un único selector, con hora opcional. Eliminar el campo de hora separado y conservar las fechas existentes sin añadirles una hora automáticamente.
- Dentro de las notas, tareas y subtareas, mostrar el selector compacto de prioridad junto a la fecha, en el espacio que ocupaba la hora. Mantener también la edición directa de prioridad en Tasks y Post-its.
- Los items de checklist —no las tareas o subtareas— entran en edición de texto con un clic o toque sobre su texto, tanto en la nota como en el detalle de subtarea y el contenido desplegado de Tasks. Guardar al confirmar o salir y permitir cancelar, sin abrir otro detalle ni crear subtareas.
- Mantener independientes la zona izquierda de arrastre, la casilla de completado y la papelera: usarlas no activará la edición. Conservar las funciones de arrastre y borrado donde ya existen.
- Usar etiquetas estables «Tasks», «Post-its» y «Calendario» en los botones de pertenencia de la nota. El color acentuado y el estado pulsado indicarán que están activos; un segundo clic desactivará la pertenencia y quitará el acento, sin textos «Quitar» ni botón adicional de eliminación.
- Al activar Calendario, usar la fecha guardada o pedirla con el selector unificado si no existe. Al desactivarlo, conservar la fecha y el contenido de la nota. La fecha seguirá siendo editable desde su control independiente.

## Detalles técnicos
- Reutilizar los controles compartidos de fecha y prioridad para evitar diferencias entre vistas y detalles. La prioridad solo corresponde a notas de tarea y subtareas, nunca a sus items de checklist.
- Persistir fechas de nota mediante `setViewMembership` y cambios de subtareas/items en el checklist de la nota contenedora. Conservar los identificadores, las migas y el historial de navegación.
- Mantener la pertenencia manual e individual, sin propagación a madres, hijas o hermanas. No modificar el árbol, su geometría, sus gestos ni la integración de IA; Google Calendar seguirá sin accesos visibles.

## Verificación
- Probar fecha sin hora y fecha con hora, edición y eliminación de prioridad, y persistencia tras recargar.
- Verificar que editar un item no cambie su completado, sus vecinos ni su posición; que arrastrar y borrar no abran edición.
- Comprobar los botones de pertenencia activando y desactivando cada vista sin borrar ni modificar el contenido de la nota.
- Revisar que fecha y prioridad quepan en la misma fila en pantalla estrecha y escritorio, y ejecutar las pruebas relacionadas.
