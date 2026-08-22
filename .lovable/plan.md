# Mejorar el tacto y el rendimiento del árbol en móvil

El árbol se mueve a tirones porque cada `pointermove` de pinch/pan provoca un re-render de React con todos los nodos y ramas. Además el long-press (550 ms) puede dispararse mientras estás empezando un gesto de zoom o desplazamiento.

## Qué cambia

- **Long-press más largo**: 800 ms, tanto sobre un nodo como sobre el fondo del lienzo.
- **Long-press cancelado por gesto**: en cuanto hay 2 dedos en pantalla o el dedo se desplaza más de ~8 px, el temporizador se cancela y queda bloqueado hasta que se levantan todos los dedos. No podrá "resucitar" al final del pinch.
- **Zoom/desplazamiento fluido**: durante el gesto, el árbol se transforma directamente por CSS a través de `requestAnimationFrame` (una sola actualización por frame, sin repintar nodos). Al soltar, el estado de React se sincroniza con la posición final, así que nada más cambia.
- **2 dedos siguen siendo zoom + desplazamiento**, igual que ahora; 1 dedo sobre el fondo sigue sin desplazar.

Apertura de notas, estructura, geometría, candado, foco de rama y arrastre de nodos quedan intactos.

## Detalles técnicos

`src/components/GraphViewV2.tsx`

- `LONG_PRESS_MS = 800` para `startLongPress` (nodo) y el temporizador de fondo (`canvasLongPressTimer`).
- Nuevo ref `gestureBlockRef` (bool). Se pone a `true` cuando `pointersRef.size >= 2` o cuando el desplazamiento supera 8 px; se limpia solo cuando `pointersRef.size === 0` en `onUp`/`pointercancel`. `startLongPress` y el arranque del long-press de fondo salen sin programar temporizador si está activo; el callback del temporizador también comprueba el ref antes de actuar.
- Al iniciar pinch (en `onDown` de ventana y en `onPointerDown` del contenedor) se cancelan ambos temporizadores y se activa `gestureBlockRef`.
- Vista en vivo: refs `panRef`/`viewZoomRef` como fuente de verdad durante el gesto. `pinch` y `pan` escriben en esos refs y solicitan un frame (`rafRef`) que aplica `worldRef.current.style.transform = matrix(...)` sobre el div de mundo (línea ~1054), sin `setPan`/`setViewZoom`.
- Al terminar el gesto (`pointersRef.size === 0`): cancelar el rAF pendiente y hacer `setPan(panRef.current)` / `setViewZoom(viewZoomRef.current)` una sola vez, además de `setIsPanning(false)`.
- El `transform` en JSX sigue derivando de `pan`/`viewZoom`; un `useEffect` lo re-sincroniza en los refs cuando cambian por otras vías (`fitFullTree`, zoom de rueda), para que el estilo imperativo y el declarativo no se contradigan.
- El zoom de rueda usa la misma ruta rAF, evitando un re-render por tick de trackpad.
- Sin cambios de backend ni de esquema.
