# Fecha unificada, prioridad dentro de la nota y edición de checklist

## Cambios
- Unificar fecha y hora en un único selector, con hora opcional. Eliminar el campo de hora separado y conservar las fechas existentes sin añadirles una hora automáticamente.
- Dentro de las notas, tareas y subtareas, mostrar el selector compacto de prioridad junto a la fecha, en el espacio que ocupaba la hora. Mantener también la edición directa de prioridad en Tasks y Post-its.
- Los items de checklist —no las tareas o subtareas— entran en edición de texto con un clic o toque sobre su texto, tanto en la nota como en el detalle de subtarea y el contenido desplegado de Tasks. Guardar al confirmar o salir y permitir cancelar, sin abrir otro detalle ni crear subtareas.
- Mantener independientes la zona izquierda de arrastre, la casilla de completado y la papelera: usarlas no activará la edición. Conservar las funciones de arrastre y borrado donde ya existen.
- Usar etiquetas estables «Tasks» y «Post-its» en los botones de pertenencia de la nota. El color acentuado y el estado pulsado indicarán que están activos; un segundo clic desactivará la pertenencia y quitará el acento, sin textos «Quitar».
- Eliminar el botón de pertenencia a Calendario: guardar una fecha en una nota, tarea o subtarea la mostrará automáticamente en el Planificador en esa fecha. Cambiar la fecha la moverá y borrar la fecha quitará únicamente esa entrada del calendario, sin borrar contenido ni alterar Tasks o Post-its.
- Una subtarea con fecha aparecerá aunque su madre no tenga fecha ni esté marcada para Calendario; no se añadirá la madre ni sus hermanas. Eliminar también la acción del Planificador que actualmente quita la nota contenedora completa del calendario: la presencia de cada entrada dependerá de su propia fecha.

## Detalles técnicos
- Reutilizar los controles compartidos de fecha y prioridad para evitar diferencias entre vistas y detalles. La prioridad solo corresponde a notas de tarea y subtareas, nunca a sus items de checklist.
- Persistir fechas de nota mediante `setViewMembership` y cambios de subtareas/items en el checklist de la nota contenedora. Conservar los identificadores, las migas y el historial de navegación.
- Mantener la pertenencia a Tasks y Post-its manual e individual, sin propagación a madres, hijas o hermanas. En Calendario, derivar las entradas de las fechas propias, sin depender de la pertenencia de la nota madre ni crear eventos independientes. Conservar las fechas existentes y ajustar sus lecturas para que no dependan del antiguo botón de Calendario.
- Registrar el calendario automático en la lista de trabajo al iniciar la implementación. No modificar el árbol, su geometría, sus gestos ni la integración de IA; Google Calendar seguirá sin accesos visibles.

## Verificación
- Probar fecha sin hora y fecha con hora, edición y eliminación de prioridad, y persistencia tras recargar.
- Verificar que editar un item no cambie su completado, sus vecinos ni su posición; que arrastrar y borrar no abran edición.
- Comprobar los botones de Tasks y Post-its activando y desactivando cada vista sin borrar ni modificar el contenido de la nota.
- Verificar que poner fecha a una subtarea sin fecha en su madre la muestre sola en Calendario; cambiarla la mueva y quitarla retire solo esa entrada. Confirmar lo mismo para fechas de notas y que sobreviva a una recarga.
- Revisar que fecha y prioridad quepan en la misma fila en pantalla estrecha y escritorio, y ejecutar las pruebas relacionadas.
