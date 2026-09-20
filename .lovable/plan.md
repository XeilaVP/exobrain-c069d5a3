# Restaurar el árbol y la navegación completa en móvil

## Diagnóstico confirmado

En móvil se montan dos copias de `GraphViewV2`: la del escritorio queda oculta solo mediante CSS y otra copia se muestra como vista móvil. Ambas generan identificadores SVG iguales para los degradados y filtros del tronco y las ramas. Los nodos HTML sí aparecen, pero las líneas SVG móviles pueden resolver sus colores contra la copia oculta y quedar invisibles.

Además, Árbol, Tasks, Post-its y Planificador están dentro de `AppShell`, que actualmente se oculta por completo por debajo del ancho de escritorio. La vista móvil monta únicamente Árbol + chat, por eso no ofrece el panel de navegación nuevo.

## Cambios

- Montar una sola instancia del árbol por tamaño de pantalla, evitando identificadores SVG duplicados y recuperando tronco, uniones y todas las ramas en la vista genérica móvil.
- Integrar móvil en el mismo sistema de vistas existente: Árbol, Tasks, Post-its y Planificador seguirán mostrando los mismos datos, sin copias.
- Convertir la navegación lateral en un panel móvil que se abre desde un botón visible y se cierra al elegir una vista o una nota.
- Mantener el panel fijo/plegable actual en escritorio.
- Abrir desde móvil las notas encontradas en búsqueda o navegación jerárquica mediante el mismo `NoteOverlay` ya usado en las vistas de escritorio.
- Mantener el chat dentro de Árbol y conservar su disposición móvil actual; no mostrarlo encima de Tasks, Post-its o Planificador.
- No cambiar posiciones, geometría, arrastre, zoom, selección ni contenido de notas.

## Verificación

- En móvil: comprobar visualmente tronco, puntos de unión y líneas de todas las ramas en el árbol completo.
- Abrir y cerrar el panel móvil; entrar en Árbol, Tasks, Post-its y Planificador.
- Buscar y abrir una nota desde el panel móvil, y cerrarla sin perder la vista activa.
- Confirmar que gestos del árbol y chat siguen funcionando en móvil.
- En escritorio: confirmar que el panel y las cuatro vistas permanecen iguales y que solo existe una copia activa del árbol.
