# Tareas, subtareas e items: tres niveles fijos

```text
Nota de lista  = TAREA          ("Comprar")          -> fecha y prioridad
  Item raíz    = SUBTAREA       ("Super", "Pizarra") -> fecha y prioridad
    Item hijo  = ITEM checklist ("leche", "pan")     -> solo casilla, reordenable
```

## En la nota y el panel de tarea
- La cabecera de la nota de lista muestra fecha y prioridad de la tarea.
- Subtareas: mantienen fecha y prioridad.
- Items: sin fecha ni prioridad; casilla, texto y arrastrar como ahora. Las marcadas siguen bajando al final.
- No se puede crear un item dentro de otro item ni dar fecha/prioridad a un item (las opciones desaparecen).
- Tus notas actuales ya cumplen esto: no hay nada que convertir.

## En Tasks
Solo aparece lo que tiene fecha o prioridad:
- Tarea (nota) con fecha o prioridad: con todo su contenido.
- Subtarea con fecha o prioridad: sola, con sus items dentro y el nombre de su tarea como etiqueta. La tarea madre no sale si no tiene fecha ni prioridad.
- Orden: prioridad alta primero, luego fecha más próxima.

## Detalles técnicos
- Migración: `notes.priority text null` (high|medium|low). `Note.priority` en `src/types/notes.ts` y mapeo en `NotesContext.tsx`.
- `src/lib/taskLevels.ts`: `isSubtask`, `itemsOf`, `prioritizedEntries(notes)` + test (subtarea con fecha sale sin madre; madre sin fecha/prioridad no sale; items nunca solos; orden).
- `NotePostIt.tsx` / `TaskSheet.tsx`: ocultar fecha/prioridad e indentación en items con `parentId`; prioridad en cabecera.
- `TasksView.tsx`: reemplazar bloques por la lista de `prioritizedEntries`.
- `PlannerView.tsx`: solo subtareas con fecha.
- Sin cambios en árbol, móvil ni asistente.
