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

## Datos existentes: tú decides
Nada se cambia automáticamente. Al abrir una nota de lista con casos que no encajan, aparece un aviso "Revisar estructura" con la lista de items afectados y una decisión por cada uno (o "aplicar a todos"):
- **Item con fecha o prioridad** (dentro de una subtarea):
  - Convertirlo en subtarea (sube de nivel y conserva fecha/prioridad).
  - Quitarle fecha y prioridad (se queda como item).
  - Dejarlo como está por ahora (el dato se guarda pero no sale en Tasks ni calendario).
- **Item de 3.er nivel o más:**
  - Subirlo a item de su subtarea.
  - Convertirlo en subtarea propia.
  - Dejarlo como está por ahora.
- El aviso se puede cerrar y volver a abrir desde la nota mientras queden casos pendientes. Cada decisión es reversible desde el historial de la nota.

## Detalles técnicos
- Migración: `notes.priority text null` (check high|medium|low), sin tocar el trigger de versiones. `Note.priority` en `src/types/notes.ts` y mapeo en `NotesContext.tsx`.
- Helper puro `src/lib/taskLevels.ts`: `isSubtask(item)` (sin `parentId`), `itemsOf(subtask)`, `findStructureIssues(checklist)` (items con fecha/prioridad y items de nivel 3+), `applyFix(checklist, itemId, action)` (promote | stripMeta | flatten | keep), `prioritizedEntries(notes)`, con test unitario por cada regla y acción.
- Nuevo `StructureReviewDialog.tsx` abierto desde `NotePostIt.tsx` cuando `findStructureIssues` no está vacío; decisiones "mantener" se recuerdan por item (`reviewKept` en el propio item del checklist jsonb).
- `NotePostIt.tsx` y `TaskSheet.tsx`: ocultar prioridad/fecha en items con `parentId`; bloquear indentación de nivel 3; prioridad de la nota en la cabecera.
- `TasksView.tsx`: sección "Prioritarias" con `prioritizedEntries`; selector de prioridad solo en subtareas.
- `PlannerView.tsx`: solo considerar subtareas (sin `parentId`) con fecha.
- Sin cambios en árbol, geometría, móvil ni asistente.
