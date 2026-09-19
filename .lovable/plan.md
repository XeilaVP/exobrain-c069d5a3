# Nueva navegación de ExoBrain: Árbol, Tasks, Post-its y Planificador (escritorio)

Una sola fuente de datos (las notas actuales) mostrada de cuatro formas distintas. Nada se duplica: editar en cualquier vista cambia la nota real. Solo escritorio en esta fase; el móvil se mantiene como está ahora.

## Panel lateral izquierdo

Fijo y plegable, presente en todas las vistas:

- Accesos: Árbol, Tasks, Post-its, Planificador.
- Buscador global: escribe y encuentra notas y tareas por título y contenido; al elegir un resultado se abre.
- Navegador de ramas: las ramas reales de ExoBrain, desplegables nivel a nivel (madre → hijas → nietas), con su color e icono. Al pulsar una nota se abre.

## Vista Árbol

El mapa actual, sin cambios de distribución ni de gestos. Solo se integra dentro del nuevo marco con el lateral.

## Vista Tasks

Estilo Google Tasks respetando la jerarquía de ExoBrain:

- Las notas de tipo lista aparecen como bloques; sus elementos son tareas y sus elementos anidados, subtareas.
- Las notas hija de tipo lista se muestran indentadas bajo su madre.
- Cada línea: casilla, título, fecha (si tiene) y prioridad (si tiene).
- Marcar, editar texto, fecha y prioridad afecta a la tarea original.
- Botón "Ver nota" en cada bloque para abrir la nota completa.

Se añade prioridad (alta / media / baja, opcional) a las tareas. Se guarda dentro de la propia tarea, junto a su fecha y notas, y también se ve y se edita en el post-it y en la ficha de tarea actuales.

## Vista Post-its

Estilo Google Keep: rejilla de tarjetas con título, fragmento del contenido (o primeros elementos si es lista), icono y color de su rama. Al pulsar una tarjeta se amplía como post-it; botón "Ver nota" para abrirla completa.

## Vista Planificador

Calendario con las tareas que tienen fecha:

- Vista mensual y vista semanal, con navegación entre periodos y "Hoy".
- Cada tarea aparece en su día (y a su hora si la tiene), con el color de su rama.
- Al pulsar se ve la tarea con su detalle y un botón "Ver nota" hacia la nota original.
- No hay eventos propios: todo sale de las tareas existentes.

## Detalles técnicos

- `src/pages/Index.tsx`: pasa a un layout con `AppShell` (lateral + área de contenido) y estado de vista activa (`tree | tasks | postits | planner`) en la URL o en el contexto.
- Nuevos componentes en `src/components/`: `AppShell.tsx`, `SideNav.tsx` (accesos + buscador + árbol de ramas plegable), `TasksView.tsx`, `PostItsView.tsx`, `PlannerView.tsx`, y `NoteOverlay.tsx` que monta `NotePostIt` centrado fuera del canvas para el botón "Ver nota" de cualquier vista.
- `GraphViewV2.tsx` se reutiliza tal cual como contenido de la vista Árbol; se mantiene `data-no-pan` y sus gestos.
- Todas las vistas leen y escriben con `useNotes()` (`notes`, `updateNote`, `toggleChecklistItem`, `setSelectedNoteId`). Sin estado paralelo.
- Prioridad: campo opcional `priority` en `ChecklistItem` (`src/types/notes.ts`), persistido en el `checklist` jsonb existente. Sin migración de esquema.
- Calendario construido con `date-fns` (ya en el proyecto) sobre `dueAt`/`hasTime`; sin librería nueva de calendario.
- Estilos con los tokens actuales de `index.css`; sin cambios de backend, edge functions ni geometría del árbol.
- Móvil: el layout existente se mantiene; el lateral y las nuevas vistas se activan solo en escritorio.
