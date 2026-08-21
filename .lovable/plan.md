# Árbol ExoBrain: geometría de segmentos, posiciones fijas y estética oscura

Rehacer la geometría del árbol y su render SVG en la vista actual (`GraphViewV2`), con `Group 8.svg` como fuente real de las curvas y el HTML adjunto como referencia de estilo, y **acabar con el baile de posiciones** fijando la ubicación de cada nota.

## Posicionamiento: sembrar una vez y no tocar nunca más

Regla dura de esta versión: **no existe ningún recálculo de posiciones**. El único momento en que el sistema calcula una posición es al crear una nota nueva que aún no tiene coordenadas.

- Cada nota guarda su posición en `pos_x` / `pos_y` (columnas ya existentes en la base de datos).
- Al arrancar la app se leen esas coordenadas y se usan tal cual. Abrir, cerrar, seleccionar, plegar, hacer zoom, crear o borrar otras notas **no mueve nada**.
- Nota nueva: recibe una posición inicial junto a su madre (siguiendo la silueta del árbol) y se guarda de inmediato. Desde ese instante es una posición fija más.
- Arrastrar: la nota se mueve y se guarda al soltar. Al arrastrar una rama se arrastra también su descendencia (offset rígido), y también se guarda.
- Notas actuales sin coordenadas: se siembran **una sola vez** en la primera carga y quedan fijadas para siempre.
- Botón "Reorganizar" (manual, con confirmación) para quien quiera resembrar todo el árbol o una rama a propósito. Es la única forma de que algo se recoloque.

No hay layout automático continuo, ni fuerzas, ni reacomodo por hermanas nuevas. Si una nota se mueve sola, es un bug.


## Geometría del árbol

Se abandona el modelo "coloco nodos y luego dibujo una curva entre madre e hija". El árbol se construye como **esqueleto de segmentos unidos por bifurcaciones**:

- Tronco vertical, ligeramente irregular, partido en tramos.
- Cada tramo termina exactamente en un punto de bifurcación y cada rama hija arranca en ese mismo punto, con idénticas coordenadas. El nodo se pinta encima. **Ningún path continuo oculto atraviesa la bifurcación.**
- Las notas raíz nacen del tronco a distintas alturas, alternando lados.
- Hijas y siguientes niveles se generan con los mismos motivos, más cortos y finos con la profundidad; copa asimétrica, sin abanicos uniformes ni hijas apiladas en vertical.
- Todo el árbol se dibuja siempre.

**Los motivos salen de la geometría real de `Group 8.svg`**: durante la implementación se parsean sus `path d`, se toman sus puntos de control Bézier tal cual y se normalizan (origen en el inicio del tramo, extremo unitario, dirección canónica). No se simplifican ni se aproximan. El resultado queda **como datos constantes dentro de `src/lib/treeGeometry.ts`**; en runtime no se lee ningún archivo SVG, el árbol es autónomo. Se reutilizan por escala, espejo y rotación; nada de fórmulas genéricas de abanico o porcentajes de dx/dy.

**La geometría es estable**: ni la selección ni el zoom recalculan posiciones ni alteran la silueta. Solo cambian opacidad, visibilidad de etiquetas, glow y cámara.

## Estilo visual

- Tema oscuro por defecto (si no hay preferencia guardada); el toggle se mantiene.
- Fondo azul-negro profundo, retícula de puntos muy tenue, halo violeta suave en la base.
- Paleta: violeta `#7A6BFF`, mint `#42E1C6`, apricot `#FFB06B`, pink `#F57BC8`, amber `#F3D75F` y tonos derivados.
- Trazos finos: tronco ~1.7px, rama principal ~1.4px, nivel 2 ~1.1px, nivel 3+ ~0.8px, extremos redondeados, glow discreto.
- Nodos: punto pequeño en la bifurcación y etiqueta compacta al lado (fondo oscuro translúcido, borde finísimo del color de rama). Raíces más prominentes; en zoom lejano solo el punto.
- Selección: ilumina su rama y atenúa el resto, sin ocultar geometría ni mover la cámara.

## Comportamiento que se conserva

Raíces por `parentNoteId === null`, render completo, doble clic para plegar/desplegar, clic que no toca pan/zoom, zoom anclado al cursor, pinch, encuadrar todo, y todos los diálogos y acciones (crear, borrar, renombrar, enlazar, "Mover a…").

## Detalles técnicos

- `src/lib/treeGeometry.ts`: motivos normalizados como constantes, tipos `TreeJunction` / `BranchSegment`, y generador de esqueleto que **acepta posiciones fijas** por nota y solo calcula las que faltan.
- `src/components/GraphViewV2.tsx`: consume el esqueleto; cada segmento se pinta como su propio `M … C …` con grosor/opacidad por profundidad; nodos anclados a sus junctions y por encima de las líneas. Drag de rama completa + guardado al soltar.
- `src/contexts/NotesContext.tsx`: persistencia de `pos_x` / `pos_y` (columnas ya existentes) y siembra única para notas sin posición.
- `src/index.css`: tokens de canvas oscuro y glow.
- `src/hooks/useTheme.tsx`: default `"dark"` sin preferencia guardada.
- Sin migraciones ni cambios de backend.

## Criterio de aceptación

Silueta reconocible respecto a `Group 8.svg`: segmentos independientes que acaban en bifurcaciones, ramas que nacen justo ahí, sin líneas cruzando uniones, copa asimétrica y estética oscura levemente luminosa. Y, sobre todo: recargar la app, seleccionar, plegar o crear notas **no mueve ninguna nota ya colocada**.
