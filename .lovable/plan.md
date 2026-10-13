# Tasks plegados y apertura directa de subtareas

## Cambios
- Mostrar las entradas de Tasks plegadas por defecto: título, estado, fecha, prioridad y «Ver nota» visibles; un control permite desplegar su contenido. Cada entrada se abre y cierra de forma independiente.
- Iniciar todas las ramas del panel lateral plegadas, sin alterar la distribución ni las interacciones del árbol.
- Para una tarea que es una nota, «Ver nota» abre esa nota. Para una subtarea como «Super» dentro de «Comprar», abre únicamente los detalles de Super y su checklist, sin mostrar primero Comprar.
- Mostrar la miga pulsable «Comprar › Super», incluyendo los antecesores de Comprar cuando corresponda. Pulsar Comprar abre la nota madre; permitir volver a Super.
- Ofrecer acceso a las notas enlazadas de la nota contenedora, identificándolas como «Enlazadas de Comprar»: no atribuir a Super enlaces propios que no tiene guardados.
- Mantener edición, fecha, prioridad y checklist de Super sobre los mismos datos existentes. Sus items se presentan como items de checklist, no como otras subtareas.

## Detalles técnicos
- `TasksView` utiliza un estado de expansión por identificador de entrada, inicialmente vacío. `SideNav` inicia su conjunto de ramas expandidas vacío.
- Actualmente las entradas de subtarea contienen tanto la nota contenedora como el item, pero «Ver nota» transmite únicamente el ID de la nota. Ampliar la apertura para transmitir también el ID de subtarea.
- Ampliar el destino e historial de `NoteOverlay` para distinguir nota y subtarea. Reutilizar los detalles de `TaskSheet` para la apertura directa, añadiendo navegación opcional sin alterar su apertura actual desde una nota.
- Guardar cambios sobre el checklist existente de Comprar; no crear notas, duplicados, enlaces ni migraciones.

## Verificación
- Comprobar que Tasks y ramas comienzan plegados y se despliegan individualmente.
- Desde una entrada Super, comprobar que «Ver nota» muestra Super y sus items; Comprar aparece como acceso, no como contenido abierto.
- Comprobar navegación a Comprar, regreso a Super y acceso a notas enlazadas cuando existan.
- Probar que editar Super actualiza el mismo item de Comprar, sin modificar su madre, hermanas ni pertenencia a vistas.
- Verificar móvil y escritorio sin cambios en árbol, chat ni en las reglas que determinan qué aparece en Tasks.