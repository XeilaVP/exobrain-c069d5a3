# Favoritas y reorganización de controles de ExoBrain

## 1. Notas favoritas

- Añadir un corazón en la cabecera de cada nota: pulsarlo marca o desmarca esa nota como favorita. El corazón queda relleno y acentuado cuando está activo.
- Guardar la selección en la cuenta para conservarla al recargar y en otros dispositivos. Es individual: no marca madres, hijas ni subtareas del checklist.
- Añadir un botón de corazón arriba del árbol, junto al control de mostrar/ocultar, y un filtro «Favoritas» en el menú lateral, también accesible cuando está plegado.
- Ambos controles comparten el filtro; un segundo clic vuelve a mostrar todas las notas permitidas por los otros filtros.
- **Conservar el camino**, como has elegido: mostrar las favoritas y sus madres atenuadas, con el tronco y las ramas que las conectan. No incluir automáticamente sus hijas o hermanas.
- En el lateral, conservar también las madres como contexto y permitir desplegar el camino hasta las favoritas. La búsqueda respeta este filtro.
- El filtro solo cambia la visibilidad del árbol y de las ramas del lateral; no altera Tasks, Post-its, Planificador ni los datos.

## 2. Recolocar los controles

- Mover el candado desde la parte superior a la zona inferior, justo encima del visor de posición del árbol.
- Mostrar «Editar árbol» junto al candado cerrado o abierto. Mantener exactamente el bloqueo y su persistencia actuales; no cambiar arrastre, zoom ni desplazamiento.
- Mover el botón de usuario al pie del menú lateral. Conservar sus opciones actuales: cuenta, renombrar el cerebro, historial, descargar notas y cerrar sesión.
- El menú de usuario se abre hacia arriba y sigue disponible en móvil y con el lateral plegado, desde cualquiera de las cuatro vistas.
- Evitar solapamientos con el visor, el chat y los controles superiores.

## 3. Opciones de la nota

- Añadir al menú de tres puntos **«Copiar nota»**: copiar título y contenido como texto sin etiquetas HTML. Para notas Tasks, incluir descripción, subtareas e items con su orden e indentación. No copiar archivos adjuntos ni notas hijas.
- Añadir **«Duplicar»**: crear una nota independiente bajo la misma madre; si es una nota raíz, crear otra nota raíz, manteniendo su color. Abrir la copia al terminar.
- La copia conserva tipo, texto, descripción, icono, checklist, completado, fechas y prioridades; recibe un identificador nuevo y el título terminado en «(copia)».
- Regenerar los identificadores del checklist y sus referencias internas para que editar la copia nunca afecte al original.
- Duplicar únicamente la nota, no su rama, adjuntos ni enlaces a otras notas. La copia empieza sin favorita y sin pertenencia a Tasks/Post-its; las fechas conservadas aparecen automáticamente en el Planificador.
- Dar a la copia una posición inicial cercana y distinta, sin mover ni recalcular posiciones de notas existentes.
- Unificar «Añadir hija» y «Añadir lista hija» en **«+ hija»**. Al pulsar, abrir «Crear hija» con elección **Tasks / Texto** y nombre; la madre será la nota desde la que se crea.
- Cambiar «Enlazar con otra nota» por **«Enlazar nota»**, sin modificar el comportamiento de los enlaces.

## Detalles técnicos

- Añadir `is_favorite boolean NOT NULL DEFAULT false` a las notas mediante una migración aditiva de Lovable Cloud. Mantener los permisos de cada usuario y no modificar registros existentes salvo el valor predeterminado del nuevo campo.
- Incorporar `isFavorite` en `Note` y en las conversiones y guardados de `NotesContext`.
- Centralizar el filtro compartido en el shell; calcular favoritas y ancestros como una capa de visibilidad sobre el árbol existente, sin cambiar `treeGeometry`, curvas, posiciones, escala ni gestos.
- Reutilizar `NotePostIt` para favoritos y nuevas acciones en todas sus presentaciones, y el diálogo de creación para la selección de tipo.
- Separar el menú de usuario del árbol para reutilizarlo al pie de `SideNav`, manteniendo el cambio de nombre del cerebro desde el nodo raíz.
- Guardar la duplicación completa en una sola creación, después de coordinar guardados pendientes, con manejo de errores sin dejar copias incompletas.

## Comprobación

- Pruebas de favoritas individuales, ancestros conservados y filtros combinados; quitar una favorita nunca borra la nota.
- Pruebas de copia de texto enriquecido y checklist; duplicación bajo la misma madre o como raíz, con identificadores independientes y sin duplicar descendientes.
- Verificar en móvil y escritorio: corazón y persistencia, filtros desde ambos lugares, tronco conectado, candado encima del visor, menú de usuario abajo, copiar al portapapeles, duplicar y crear hijas de ambos tipos.
- Confirmar que las cuatro vistas, los enlaces, la edición y los gestos del árbol mantienen su funcionamiento.