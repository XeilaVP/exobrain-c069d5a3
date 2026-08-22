# Aislar el post-it del canvas del árbol

El post-it (NotePostIt) se renderiza dentro del contenedor del mapa, así que sus gestos llegan también a los manejadores del árbol. Se marca como zona excluida y el canvas ignora todo evento que nazca dentro de ella.

## Comportamiento resultante

- Rueda sobre la nota: hace scroll del contenido de la nota. Fuera de la nota: zoom del árbol, igual que ahora.
- Pulsar, arrastrar o mantener pulsado dentro de la nota (incluida la barra de scroll, el editor, los checklists y su reordenación): no inicia pan, zoom, pinch, arrastre de nodos ni menú contextual del canvas.
- Soltar dentro de la nota tampoco dispara el clic de fondo que quita el foco de rama ni cierra paneles.
- Nada más cambia: gestos del árbol, candado, doble clic para abrir nota, geometría y datos quedan idénticos.

## Detalles técnicos

`src/components/NotePostIt.tsx`
- Añadir `data-no-pan` al contenedor raíz (`motion.div`, línea ~280) para marcar toda la nota como zona excluida.
- Permitir scroll táctil dentro del cuerpo scrollable: `touch-action: pan-y` en el contenedor con `overflow-y-auto` (el canvas usa `touch-action: none` y lo hereda).

`src/components/GraphViewV2.tsx`
- Helper `isInNoPan(target)` que devuelve `true` si `target.closest("[data-no-pan]")`.
- Listener nativo de `wheel` del contenedor: salir sin `preventDefault` ni zoom cuando el evento nace dentro de `[data-no-pan]`, dejando que la nota haga scroll.
- Listeners de ventana `pointerdown` / `pointermove` / `pointerup` / `pointercancel`: si el `pointerdown` original nace dentro de `[data-no-pan]`, no registrar ese puntero en `pointersRef` ni iniciar pinch/pan/drag/long-press. Se guarda ese `pointerId` en un ref de punteros ignorados para descartar también sus `pointermove`/`pointerup` y limpiarlo al soltar.
- `onPointerDown` y `onClick` del contenedor: salida temprana cuando el objetivo está dentro de `[data-no-pan]` (el selector ya lo incluye para el cálculo de fondo; se convierte en descarte total, también antes del registro de punteros para pinch).
- Sin cambios de backend ni de esquema.
