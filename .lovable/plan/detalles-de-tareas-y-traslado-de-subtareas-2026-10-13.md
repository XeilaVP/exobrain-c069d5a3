# Detalles de tareas y traslado de subtareas

## Cambios
- Dar a la descripción de tareas y subtareas el aspecto de la captura: icono de texto a la izquierda y texto editable sin recuadro relleno ni etiqueta «Notas», con altura que se ajuste al contenido y un indicador discreto cuando esté vacío. Conservar los textos existentes. La captura será solo una referencia visual.
- Hacer los selectores de fecha/hora y prioridad algo más grandes y espaciados, con borde fino y flecha de desplegar. Mostrar la fecha y hora elegidas dentro del selector; cuando esté vacío, mostrar «Añadir fecha/hora». Mantener la hora opcional y eliminar la fecha repetida debajo. No añadir fecha límite ni un segundo tipo de fecha.
- Colocar fecha/hora y prioridad en la misma fila, pasando a otra línea únicamente cuando no quepan. Aplicar los mismos controles en Tasks y en el interior de notas, tareas y subtareas.
- Colorear la bandera según la prioridad: alta en rojo, media en ámbar y baja en verde; sin prioridad, color neutro. Mantener también el nombre de la prioridad, para no depender solo del color.
- En el detalle de una subtarea, mostrar arriba el nombre de su tarea madre con una flecha de desplegar. Al pulsarlo, abrir un selector con búsqueda de otras tareas madre existentes. Mantener las migas de pan como accesos de navegación independientes.
- Mover la subtarea **con todos sus items de checklist**, conservando título, descripción, completado, orden interno, fecha, hora, prioridad e identificadores. No copiarla ni crear una nueva nota. Las tareas madre y los items de checklist no tendrán este selector de traslado; no cambiar la acción existente «Mover a…» de la jerarquía de notas.
- Tras moverla, mantener abierto su detalle bajo la nueva madre y actualizar las migas y las vistas. No cambiar las fechas, la pertenencia a Tasks/Post-its ni los demás contenidos de ninguna de las dos madres.

## Detalles técnicos
- Reutilizar `DateControl`, `PriorityControl` y `TaskMetaControls`, con disposición flexible y colores semánticos definidos para ambas apariencias de la aplicación.
- Reutilizar la presentación de descripción entre `TaskSheet` y las notas madre de tipo checklist. Guardar la descripción de subtarea en `ChecklistItem.notes` y la de la nota madre en `Note.content`, sin añadir registros paralelos ni alterar el editor enriquecido de las notas de texto. Preservar cualquier contenido enriquecido existente.
- Añadir un traslado transaccional en Lovable Cloud que actualice ambos checklists juntos y compruebe que origen y destino pertenecen al usuario, son notas de checklist y la entrada es una subtarea válida. No crear tablas ni columnas nuevas. Conceder únicamente los permisos necesarios para ejecutarlo.
- Coordinar el traslado con los guardados pendientes para evitar que una edición anterior reponga la subtarea en su antigua madre. Mostrar estado de guardado, impedir envíos repetidos y, si falla, conservar el detalle y los datos sin anunciar éxito.
- Mantener la navegación mediante `noteId` más `subtaskId` y ajustar el historial afectado para que «Atrás» no apunte a una subtarea que ya no está en su antigua madre. Cubrir tanto la apertura desde las vistas como desde el interior de la nota.
- Ofrecer como destinos otras notas madre de tipo checklist, aunque no estén añadidas a Tasks. No modificar automáticamente datos irregulares ni niveles adicionales: si aparecen casos incompatibles, consultarlos en el chat antes de intervenir.
- Mantener intactos el árbol, sus posiciones y gestos, las relaciones entre notas y la IA. El calendario seguirá dependiendo únicamente de la fecha propia de cada entrada.

## Verificación
- Comprobar en móvil y escritorio que la descripción crezca con el texto, que ambos selectores compartan fila cuando haya espacio y que no se duplique la fecha debajo.
- Probar fecha con y sin hora y los cuatro estados de prioridad; confirmar que los cambios persistan tras recargar.
- Mover una subtarea con varios items y metadata entre dos madres reales, comprobar que desaparezca del origen y exista una sola vez en el destino, y verificar su detalle, migas, Tasks y Planificador tras recargar.
- Añadir y ejecutar pruebas de conservación de identificadores, metadata, items y orden, de no modificación de las madres y de rechazo de destinos inválidos o ajenos. Comprobar también que un fallo de guardado no produzca un traslado parcial.