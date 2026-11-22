# Ventanas ajustables, selectores que no se cortan y Tasks igual que la nota

## 1. Ventanas ajustables (solo escritorio)
- Se pueden agrandar o encoger arrastrando bordes y esquinas solo las ventanas de contenido: notas, tareas, subtareas, Post-its y lo que se abre desde Tasks, el Planificador o el buscador.
- No se amplían el asistente, «Mover a…», «Crear hija» ni los ajustes que salen de los tres puntos.
- Mínimo 360 × 320 px. Máximo: lo que quepa en la pantalla, sin salirse nunca.
- Al pasar por un borde, el cursor cambia a flechas y aparece una línea fina de color. En la esquina inferior derecha hay un asa visible. Doble clic en un borde devuelve la ventana a su tamaño original.
- Se recuerda el tamaño elegido.
- En móvil no cambia nada: la ventana ocupa casi toda la pantalla.

## 2. Nada se sale de la pantalla
- El calendario de fecha y hora, la prioridad y los demás desplegables se abren siempre dentro de la pantalla. Si no caben abajo, se abren hacia arriba. Si aun así no caben, se desplazan por dentro, con «Guardar» y «Quitar» siempre visibles.

## 3. Tasks muestra las mismas notas, no algo distinto
- Tasks deja de tener su propia versión de las filas. Muestra dentro las mismas notas añadidas a Tasks, con el mismo comportamiento y las mismas funciones que al abrir la nota: pulsar el nombre, «ir a», fecha, prioridad, arrastrar, sangrado de subtareas y papelera.
- Siempre: al marcar como completada, la tarea pasa al final de la lista, tanto en Tasks como en la nota.
- Pulsar el nombre muestra la fecha y la prioridad, y permite editar el texto. La flecha «ir a» abre la tarea.
- Subtareas e items de checklist son lo mismo: todos tienen fecha, hora, prioridad, «ir a», edición del texto al pulsar y paso al final al completarse.

## 4. Colocación
- La fecha y la prioridad van junto al nombre siempre que quepan. Si fueran a tapar el nombre, bajan a la línea siguiente. El nombre se ve siempre.
- Los nombres largos no se cortan: primero bajan de línea los demás elementos. Solo se recortan si aun así no caben.
- Se acaba el defecto de la captura del móvil, donde la casilla, el nombre y la papelera quedaban en líneas distintas.
- Lo comprobaré con capturas en móvil y escritorio.

## Detalles técnicos
- `ResizableWindow` con zonas de arrastre por puntero y `data-no-pan`, aplicado solo a NotePostIt, SubtaskDetails y TaskSheet. Se desactiva por debajo de `md`, con el tamaño en localStorage y limitado al viewport.
- Popovers y dropdowns: `collisionPadding`, `avoidCollisions` y altura máxima con `--radix-*-available-height`, con scroll interno y pie fijo.
- TasksView reutiliza la lista de checklist de NotePostIt (PostItChecklistItem + Reorder + sortChecklistByCompletion) por cada nota en Tasks.
- Fila en flex-wrap: el nombre usa `flex-[1_1_auto] min-w-[min(100%,12rem)] break-words` y los controles `shrink-0`, de modo que bajan de línea antes de comprimir el nombre.
