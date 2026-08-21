# Ramas principales inclinadas 25-30° hacia arriba

Ajuste visual mínimo sobre el árbol actual. No se recalcula ninguna posición de nota: solo cambia el punto del tronco donde nace cada rama principal.

## Qué cambia

- Hoy cada rama principal sale del tronco a la misma altura que su nota, por eso se ve perpendicular al tronco.
- Pasará a nacer más abajo en el tronco, de modo que la rama suba con una inclinación aproximada de 27° hasta llegar a la nota.
- Cuanto más lejos esté la nota del tronco, más abajo nace su rama (misma pendiente para todas), como en un árbol real.
- En cada intersección rama-tronco se dibuja un punto pequeño del color del tronco, para suavizar el encuentro y evitar el quiebre brusco.
- El tronco sigue terminando exactamente en la intersección más alta, sin sobresalir.

## Lo que NO cambia

- Las coordenadas `pos_x` / `pos_y` de las notas no se tocan: nada se recoloca ni al cargar, ni al plegar, ni al hacer zoom.
- Arrastrar sigue funcionando igual (la madre arrastra su descendencia con el mismo desplazamiento).
- Estética, colores, curvas y resto de la interfaz intactos.

## Editor de estructura

Lo descartamos por ahora: con las posiciones ya fijas en la base de datos y el arrastre persistente, un editor aparte duplicaría la misma función y añadiría riesgo de recolocaciones. Si más adelante quieres una vista de edición dedicada, se plantea como trabajo aparte.

## Detalle técnico

En `src/components/GraphViewV2.tsx`, dentro del cálculo de `attachments`:

- Altura de anclaje: `yAttach = min(yNota + tan(27°) * |xNota - xTronco|, base.y - 40)`, en vez del actual `min(yNota, base.y - 40)`.
- Se mantiene el orden de anclajes de abajo hacia arriba y el encadenado de tramos del tronco, de modo que el tronco llegue solo hasta el anclaje superior.
- Los nodos virtuales `attach-*` pasan a renderizarse como un punto de radio ~3 px con el color/gradiente del tronco (hoy son invisibles).
