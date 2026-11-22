# Ventanas ajustables, selectores que no se cortan y tareas iguales en Tasks y en la nota

## 1. Ventanas ajustables (solo escritorio)
- Todas las ventanas superpuestas se pueden agrandar o encoger arrastrando sus bordes y esquinas. Esto incluye la nota del árbol, la nota abierta desde Tasks, Post-its, Planificador o el buscador, el detalle de una subtarea, la ficha de una tarea, el asistente, «Mover a…», «Crear hija», el historial, los ajustes de la IA, la exportación y el nombre.
- Mínimo 360 × 320 px. Máximo: lo que quepa en la pantalla, sin salirse nunca.
- Al pasar el ratón por un borde, el cursor cambia a flechas y aparece una línea fina de color. En la esquina inferior derecha hay un asa siempre visible.
- Doble clic en un borde devuelve la ventana a su tamaño original.
- Se recuerda el tamaño de cada tipo de ventana.
- En móvil no cambia nada: la ventana ocupa casi toda la pantalla.

## 2. Nada se sale de la pantalla
- El calendario de fecha y hora, el selector de prioridad y los demás desplegables se colocan siempre dentro de la pantalla. Si no caben abajo, se abren hacia arriba. Si aun así no caben, se encogen y se desplazan por dentro, con «Guardar» y «Quitar» siempre visibles.
- Lo revisaré en todas las ventanas, con tareas al final de listas largas, en escritorio y en móvil.

## 3. Mismo comportamiento en Tasks y dentro de la nota
Habrá una sola fila de tarea, la misma en Tasks y en la nota, para tareas y subtareas por igual:
- **Pulsar el nombre:** aparecen los botones de fecha y prioridad. Dentro de la nota también se puede editar el texto.
- **Flecha «ir a» junto al nombre:** abre la tarea o subtarea.
- **Fecha y prioridad visibles:** si ya tienen valor, se ven siempre como un pequeño texto junto al nombre. Si no, los botones de icono solo aparecen al pulsar el nombre, como ahora en la nota.
- Las subtareas tienen exactamente lo mismo que las tareas: fecha, hora, prioridad y «ir a».
- Los items de checklist (viñetas) siguen sin fecha ni prioridad. Al pulsarlos se edita el texto.
- En Tasks, la cabecera de cada tarjeta sigue la misma regla.

## 4. Arreglar la colocación (que nada baje de línea sin necesidad)
- En una línea, de izquierda a derecha: arrastre, casilla, nombre (ocupa el espacio libre), «ir a» y papelera. Se acaba el defecto de la segunda captura, donde la casilla, el nombre y la papelera quedaban en líneas distintas.
- Los botones de fecha y prioridad van en la misma línea, justo debajo del nombre. Solo pasan a otra línea si de verdad no caben.
- Los nombres largos se cortan con «…» en vez de empujar los controles.
- Lo comprobaré en móvil (390 px) y escritorio con capturas antes de darlo por terminado.

## Detalles técnicos
- Un nuevo `ResizableWindow` (envoltorio con 8 zonas de arrastre por puntero y `data-no-pan`) que se usa en NotePostIt, SubtaskDetails, TaskSheet, ChatPanel, MoveToDialog, CreateNodeDialog, NameInputDialog y en el DialogContent compartido (vía prop). Se desactiva por debajo de `md`. El tamaño se guarda en localStorage por clave de ventana y se limita al viewport al cambiar el tamaño de la pantalla.
- Popovers y dropdowns: `collisionPadding`, `avoidCollisions`, `max-h-[var(--radix-popover-content-available-height)]` y overflow interno, con el pie de acciones fijo.
- Un nuevo `TaskRow` compartido, usado por PostItChecklistItem (móvil y escritorio) y TasksView: selección por clic en el nombre, `TaskMetaControls` en `flex-nowrap` con wrap solo por desbordamiento, nombre `min-w-0 truncate`. Sin cambios en datos, árbol, gestos ni arrastre de reordenación.
