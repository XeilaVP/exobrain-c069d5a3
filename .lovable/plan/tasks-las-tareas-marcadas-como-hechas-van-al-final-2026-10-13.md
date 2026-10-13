# Tasks: las tareas marcadas como hechas van al final

En la vista Tasks, dentro de cada bloque de nota, las tareas sin marcar se quedan arriba (en su orden actual) y las marcadas como completadas pasan al final de la lista. Solo reordenamos la presentación: el orden guardado en el checklist no cambia.

## Qué cambia para ti

- Al marcar una casilla, esa tarea baja al final del bloque al instante; al desmarcarla, vuelve a su sitio entre las pendientes.
- Cada tarea sigue llevando consigo sus subtareas indentadas, también al bajar.
- El cambio es solo visual en la vista Tasks: en la nota original (post-it y hoja de tarea) el orden de la lista se mantiene igual.

## Detalles técnicos

- `src/components/TasksView.tsx`: al construir `roots` (línea 25) se reordena de forma estable — primero los items con `completed === false` en su orden original, después los `completed === true` también en su orden original. Los hijos (`children`) viajan con su tarea madre, sin reordenarlos por separado.
- Se hace con un sort estable en memoria (no se escribe `checklist`), así que nada cambia en la base de datos ni genera versiones de nota.
- Sin cambios en `NotePostIt.tsx`, `TaskSheet.tsx`, `PlannerView.tsx` ni en los datos.
