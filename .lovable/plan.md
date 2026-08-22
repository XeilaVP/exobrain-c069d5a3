# Candado de posiciones + nuevo gesto para abrir notas

Dos ajustes de interacción en el mapa. No cambia la geometría del árbol, ni el estilo, ni los datos.

## 1. Botón candado (bloquear posiciones)

- Botón flotante en los controles del mapa, con icono de candado cerrado/abierto.
- **Bloqueado por defecto en todos los dispositivos:** ninguna nota ni nodo se puede arrastrar. El pinch-zoom, el pan y los clics siguen funcionando igual. Así, al hacer zoom con dos dedos, es imposible mover un nodo sin querer.
- **Desbloqueado:** arrastre manual normal (y las hijas siguen a la madre, como ahora).
- El estado se recuerda en el navegador, así que si lo dejas bloqueado sigue bloqueado al volver.
- Indicador visual claro: candado cerrado resaltado cuando está bloqueado.

## 2. Un clic = activar rama, doble clic = abrir nota

Hoy un clic abre la nota (y tapa la pantalla en móvil antes de poder ver la rama resaltada), y el doble clic pliega/despliega.

Nuevo comportamiento:

- **Un clic** sobre una nota: solo la activa visualmente (resalta su rama con hijas y atenúa el resto). No abre nada.
- **Doble clic** sobre una nota: abre el post-it de esa nota.
- Se elimina el plegado/desplegado por doble clic: las hijas quedan siempre visibles, como pides.
- El nodo raíz mantiene su comportamiento (abrir el nombre del cerebro), ahora con doble clic.
- Clic en el fondo del mapa: quita la activación (deja de haber rama resaltada).
- El resto de gestos no cambia: mantener pulsado sigue abriendo el menú contextual, y enlazar notas sigue funcionando con el mismo clic de selección.

## Detalles técnicos

- `src/components/GraphViewV2.tsx`:
  - Nuevo estado `positionsLocked` (inicial: `true` si `size.w < 640`, persistido en `localStorage`), y salida temprana en el inicio de arrastre de nodo cuando está bloqueado.
  - Botón en la barra de controles existente con `Lock` / `LockOpen` de lucide-react.
  - `handleNodeClick`: el temporizador de clic simple pasa a hacer solo `setFocusNoteId`; la rama de doble clic pasa a `setOpenPostIt` (y `setShowBrainDialog` para `root`).
  - Se retira la llamada a `toggleNoteCollapsed` y el uso de `collapsedIds` para plegar por gesto (se conserva la estructura de datos para no romper nada más).
- Sin cambios de backend ni de esquema.
