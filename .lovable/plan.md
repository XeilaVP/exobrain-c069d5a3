# Tareas, subtareas e items: tres niveles fijos

## Cómo queda la estructura
```text
Nota de lista  = TAREA          ("Comprar")      -> fecha y prioridad
  Item raíz    = SUBTAREA       ("Super", "Pizarra") -> fecha y prioridad
    Item hijo  = ITEM checklist ("leche", "pan")  -> solo casilla, reordenable, sin fecha ni prioridad
```
- Solo hay dos niveles dentro de la nota: subtareas y sus items. Un item no puede tener items dentro (no hay subtareas infinitas).
- La tarea (la nota) puede tener fecha (la del calendario) y prioridad propia.

## Qué cambia en la nota y en el panel de tarea
- Subtareas: siguen mostrando fecha y prioridad.
- Items de una subtarea: se quita el selector de prioridad y de fecha; solo casilla, texto y arrastrar para reordenar (como ahora). Las marcadas siguen bajando al final.
- No se permite crear un item dentro de otro item (se quita la opción de sangrar un nivel más).
- En la cabecera de la nota de lista aparece prioridad de la tarea junto a su fecha.

## Qué cambia en Tasks
Arriba aparece una sección **Prioritarias** que muestra solo lo que tiene fecha o prioridad:
- Una tarea (nota) con fecha o prioridad aparece con todo su contenido.
- Una subtarea con fecha o prioridad aparece sola, con sus items dentro, y el nombre de su tarea como etiqueta pequeña. La tarea madre no aparece si no tiene fecha ni prioridad.
- Orden: prioridad alta primero, después por fecha más próxima.
Debajo se mantienen los bloques actuales de las notas añadidas a Tasks.

## Datos existentes
- Los items que hoy tengan prioridad o fecha y estén dentro de una subtarea conservan el dato guardado pero dejan de mostrarse/usarse.
- Items anidados en un tercer nivel se suben a items de su subtarea (sin perder texto ni estado).

## Detalles técnicos
- Migración: `notes.priority text null` (check high|medium|low), sin tocar el trigger de versiones. `Note.priority` en `src/types/notes.ts` y mapeo en `NotesContext.tsx`.
- Helper puro `src/lib/taskLevels.ts`: `isSubtask(item)` (sin `parentId`), `itemsOf(subtask)`, `flattenToTwoLevels(checklist)`, `prioritizedEntries(notes)` con test unitario (subtarea con fecha sale sin madre; madre sin fecha no sale; items nunca salen solos; orden por prioridad y fecha).
- `NotePostIt.tsx` y `TaskSheet.tsx`: ocultar prioridad/fecha en items con `parentId`; bloquear indentación de nivel 3; prioridad de la nota en la cabecera.
- `TasksView.tsx`: sección "Prioritarias" con `prioritizedEntries`; selector de prioridad solo en subtareas.
- `PlannerView.tsx`: solo considerar subtareas (sin `parentId`) con fecha.
- Sin cambios en árbol, geometría, móvil ni asistente.
