# Navegación completa entre notas + orden y filtros en Post-its

## 1. Navegar entre madre, hijas y hermanas

Hoy, dentro de una nota abierta:

- Las migas superiores (ExoBrain > rama > subrama) son texto plano: no se puede pulsar en los niveles superiores, solo en la madre directa.
- Abajo hay accesos a "Madre", "Hijas" y "Enlazadas", pero no a las hermanas.
- Cuando la nota se abre desde Tasks, Post-its, Planificador o el buscador (post-it centrado), pulsar una nota relacionada no cambia la nota mostrada: el cambio se aplica al árbol, no al post-it abierto.

Cambios:

- Migas de pan navegables: cada nivel (ExoBrain, rama, subrama, madre) es pulsable y abre esa nota. ExoBrain lleva a la vista de árbol completo.
- Nueva sección "Hermanas" junto a Madre / Hijas / Enlazadas, con las notas que comparten madre (o las demás raíces si la nota es raíz), excluyendo la actual.
- Las migas y todas las secciones de relación cambian la nota abierta en el mismo sitio donde estás: dentro del árbol sigue igual que ahora; en el post-it centrado se sustituye el contenido por la nota elegida, sin cerrarse ni saltar de vista.
- Para no perder el hilo, el post-it centrado guarda un historial de la sesión con flecha "Atrás".

## 2. Post-its: ordenar y filtrar

Barra de controles sobre la rejilla:

- Ordenar por: actualización reciente (por defecto), creación, título, fecha de tarea más próxima, prioridad más alta. Las dos últimas usan las tareas de las notas de tipo lista; las notas sin fecha o sin prioridad quedan al final.
- Filtrar por rama: selector con las ramas raíz (color e icono). Al elegir una rama se muestran sus notas y toda su descendencia.
- Filtrar dentro de la rama: segundo selector, disponible al elegir rama, con las subramas de ese nivel para acotar más.
- Botón "Limpiar" cuando hay filtros activos y contador de notas mostradas.

## Detalles técnicos

- `NotePostIt.tsx`: `ancestorPath` pasa a botones; nueva lista `siblingNotes` (mismo `parentNoteId`, o raíces si no hay madre); nueva prop opcional `onNavigate(noteId)` que, si existe, se usa en migas y relaciones en lugar de `setSelectedNoteId`; comportamiento dentro de `GraphViewV2` sin cambios (no recibe la prop).
- `NoteOverlay.tsx`: mantiene pila de ids visitados, pasa `onNavigate` y muestra botón "Atrás" cuando hay historial; la pila se limpia al cerrar.
- `PostItsView.tsx`: estado local `sortBy`, `branchId`, `subBranchId`; derivación con `useMemo` sobre `notes` usando descendencia calculada desde `parentNoteId`; orden por prioridad con `high > medium > low` y por fecha con el `dueAt` mínimo de las tareas pendientes.
- Controles con `Select` y `Button` de shadcn y tokens actuales; sin cambios de datos, esquema ni backend, y sin tocar el móvil.
