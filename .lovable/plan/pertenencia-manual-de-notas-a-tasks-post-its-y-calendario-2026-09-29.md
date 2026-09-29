# Pertenencia manual de notas a Tasks, Post-its y Calendario

La nota es siempre la única fuente. Tasks, Post-its y Calendario pasan a ser **colecciones manuales**: solo muestran las notas que tú añades, una a una.

## Qué cambia para ti

- En el menú de cada nota (post-it abierto y pulsación larga en el árbol) aparecen tres interruptores:
  - **Añadir a Tasks** / **Quitar de Tasks**
  - **Añadir a Post-its** / **Quitar de Post-its**
  - **Añadir a calendario** / **Quitar del calendario**
- Un pequeño indicador en la nota muestra en qué vistas está.
- En cada vista, cada tarjeta o bloque tiene «Quitar de esta vista». Solo la saca de ahí: la nota, su contenido, sus hijas y sus enlaces no cambian.
- Cada nota va por separado: añadir una madre no añade sus hijas, y añadir una hija no añade su madre ni sus hermanas.
- **Tasks**: muestra solo las notas añadidas. Si la nota es de tipo texto, aparece como una tarea única (casilla + título); si es de tipo lista, con sus tareas y subtareas. La sangría de madre/hija se mantiene solo cuando las dos están añadidas.
- **Post-its**: muestra solo las notas añadidas. Se mantienen ordenar y filtrar por rama.
- **Calendario**: al pulsar «Añadir a calendario» eliges un día (y hora si quieres). La nota aparece ese día. También se ven las tareas con fecha de las notas que estén en el calendario. Puedes cambiar la fecha desde la propia nota o desde el calendario.

## Punto de partida (sin pérdida)

Para que nada desaparezca de golpe: las notas de tipo lista que ya salen en Tasks quedan añadidas a Tasks; las que tienen tareas con fecha quedan añadidas al calendario. Post-its empieza vacío y lo llenas tú. (Si prefieres empezar todo vacío o todo lleno, dímelo.)

## Detalles técnicos

- Migración en `notes`: `in_tasks boolean not null default false`, `in_postits boolean not null default false`, `in_calendar boolean not null default false`, `calendar_at timestamptz null`, `calendar_has_time boolean not null default false`. No se añaden al trigger `snapshot_note_version` (quitar/añadir de una vista no genera versión ni toca el contenido). Datos iniciales con `run_sql` según el punto de partida.
- `src/types/notes.ts`: `Note` gana `inTasks`, `inPostits`, `inCalendar`, `calendarAt`, `calendarHasTime`. Mapeo en `NotesContext.tsx` y helper `setViewMembership(id, patch)` que solo actualiza esas columnas.
- `NotePostIt.tsx`: fila de tres botones de pertenencia + selector de fecha para calendario. Menú de pulsación larga de `GraphViewV2.tsx`: mismas tres acciones, sin tocar geometría ni gestos.
- `TasksView.tsx`, `PostItsView.tsx`, `PlannerView.tsx`: filtran por la bandera correspondiente y añaden «Quitar de esta vista». Planner combina notas con `calendarAt` y tareas con `dueAt` de notas `inCalendar`.
- Sin cambios en árbol, jerarquía, enlaces, móvil ni asistente.
