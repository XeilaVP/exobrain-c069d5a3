# Tareas marcadas bajan al final dentro de la nota

Hoy el reordenado solo existe en la vista Tasks. Dentro de la nota abierta (lista de tareas y subtareas del panel de tarea) las marcadas se quedan en su sitio.

## Qué cambia
- En la nota tipo lista: al marcar una tarea, baja debajo de las pendientes (con sus subtareas). Al desmarcarla vuelve arriba, al final de las pendientes.
- En el panel de una tarea: las subtareas marcadas bajan debajo de las no marcadas.
- El orden se guarda en la nota, así se ve igual en Tasks, árbol y cualquier vista.
- Arrastrar para reordenar sigue funcionando entre las pendientes.

## Detalles técnicos
- `NotesContext.toggleChecklistItem` y el toggle de `NotePostIt.tsx` (línea ~737): tras cambiar `completed`, reordenar el array `checklist` de forma estable dentro de cada grupo de hermanos (mismo `parentId`): pendientes primero, completadas después; los hijos siguen a su madre.
- Helper puro `sortChecklistByCompletion` en `src/lib/` con test unitario (marcar mueve al final, desmarcar vuelve tras pendientes, subtareas acompañan).
- `TaskSheet.tsx`: lista de subtareas ordenada con el mismo criterio.
