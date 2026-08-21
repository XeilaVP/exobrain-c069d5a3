# Posiciones manuales permanentes en el árbol actual

Conservar **exactamente el diseño de árbol que ya existe**. No rehacer geometría, estilo, ramas, nodos ni interfaz. `Group 8.svg` y el HTML adjunto quedan fuera de este trabajo.

## Regla fundamental

**Una nota que ya tiene posición nunca vuelve a ser colocada por ningún algoritmo.**

- Al cargar la app se leen sus coordenadas guardadas y se dibuja ahí.
- Seleccionar, hacer zoom o pan, plegar/desplegar, abrir una nota, crear/borrar otra nota, cambiar el tamaño de pantalla o recargar la página no altera ninguna coordenada.
- No habrá botón «Reorganizar», «Restablecer posiciones» ni ninguna acción que pueda recalcular el árbol.
- El encuadre inicial puede ajustar únicamente la cámara (zoom/pan); jamás las posiciones del árbol.

## Posiciones actuales

La implementación actual recalcula un esqueleto completo con `buildTreeSkeleton(...)` en cada cambio y después suma `posDx`/`posDy`. Eso explica que las posiciones base puedan cambiar aunque exista un desplazamiento guardado.

Se sustituirá únicamente esa fuente de coordenadas:

- Las posiciones que el árbol muestra actualmente se convertirán una sola vez en coordenadas absolutas `pos_x` / `pos_y` para las notas que todavía no las tengan.
- Esa conversión inicial conserva la disposición visual actual; no intenta mejorarla ni rediseñarla.
- Una vez guardadas, `GraphViewV2` usará siempre `pos_x` / `pos_y` y no volverá a pasar esas notas por el generador automático.

## Crear una nota

Este es el **único** caso de asignación automática:

- Al crear una nota, se propone una posición libre próxima a su madre.
- Si es raíz, se propone el siguiente punto disponible del árbol actual, alternando el lado y la altura como ya hace el diseño.
- Se guardan `pos_x` / `pos_y` en la misma creación o inmediatamente después, antes de incorporarla al mapa.
- La búsqueda de hueco solo lee las posiciones existentes: **no mueve ni recalcula ninguna otra nota**.
- Desde ese momento la nueva nota queda tan fija como todas las demás.

## Arrastre manual

- Arrastrar una nota guarda su nueva posición absoluta al soltar.
- Si la nota es madre, se obtiene su descendencia y se aplica exactamente el mismo delta `Δx / Δy` a cada hija, nieta y nivel inferior.
- Así, toda la rama conserva las distancias y posiciones relativas que tenía antes del arrastre.
- No se mueve ninguna hermana, ancestro, otra raíz ni rama ajena.
- Se guardan las coordenadas absolutas de la madre y de todos los descendientes afectados.

## Tronco

- Se mantiene el tronco vertical recto del árbol actual.
- Empieza en la base de ExoBrain y termina exactamente en la intersección de la rama raíz situada más arriba.
- Nunca se dibuja una punta o prolongación por encima de esa última intersección.
- Mover notas manualmente no dispara un layout; el tramo visible del tronco solo conecta la base con las intersecciones raíz existentes.

## Cambios técnicos mínimos

- `src/types/notes.ts`: exponer `posX` / `posY` en `Note`.
- `src/contexts/NotesContext.tsx`: mapear `pos_x` / `pos_y`; guardar coordenadas absolutas; asignarlas al crear; eliminar del flujo de UI la función que borra posiciones.
- `src/components/GraphViewV2.tsx`: conservar el render visual actual, pero usar coordenadas absolutas persistidas; eliminar el recálculo global y el botón de restablecimiento; al arrastrar, persistir la nota y solo sus descendientes.
- `src/lib/treeGeometry.ts`: no se rediseña. Solo podrá usarse para la conversión inicial y para proponer la posición de una nota nueva; nunca para recomponer notas ya posicionadas. Se elimina la prolongación `trunk-tip` del resultado visible.
- Sin cambios de estética, tema, notas, chat, tareas ni backend; `pos_x` / `pos_y` ya existen en la base de datos.

## Verificación

1. Registrar las coordenadas de todas las notas.
2. Seleccionar, plegar/desplegar, hacer zoom/pan, recargar y cambiar el viewport: deben permanecer idénticas.
3. Crear una nota: solo aparece la nueva; ninguna coordenada anterior cambia.
4. Arrastrar una hoja: solo cambia esa nota.
5. Arrastrar una madre: cambian ella y sus descendientes por el mismo delta; nada más.
6. Recargar: todas las posiciones manuales se conservan exactamente.
7. Confirmar visualmente que el tronco termina en la última intersección raíz y no sobresale.

## Guardado en base de datos (comprobado)

Sí, se guardan en la base de datos, y de hecho ya hay datos: las 65 notas actuales tienen `pos_x` / `pos_y` rellenados (y ninguna usa ya `pos_dx` / `pos_dy`). No hace falta crear nada nuevo ni migrar la estructura; solo falta que la vista lea y escriba esas columnas en vez de recalcular.

Con eso las posiciones sobreviven a recargar, cerrar sesión, cambiar de dispositivo y a la exportación de datos.

Un único hueco real: el historial de versiones (`note_versions`) no guarda `pos_x` / `pos_y`, así que restaurar una versión antigua o recuperar una nota borrada la deja sin posición. Se añaden esas dos columnas al historial y a las funciones de restaurar/recuperar, para que también ahí la posición se conserve. Es la única modificación de base de datos del plan.
