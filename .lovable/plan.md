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

## Código exacto

### 1. Anclaje inclinado — `src/components/GraphViewV2.tsx` (~línea 348-352)

Actual:

```ts
// --- Tronco recto: de la base hasta la intersección de la raíz más alta. ---
const visibleRootList = (childrenOf.get(null) ?? []).filter((r) => visible.has(r.id));
const attachments = visibleRootList
  .map((r) => ({ root: r, y: Math.min(coord.get(r.id)!.y, base!.y - 40) }))
  .sort((a, b) => b.y - a.y); // de abajo (mayor y) hacia arriba
```

Nuevo:

```ts
// --- Tronco recto: de la base hasta la intersección de la raíz más alta. ---
// La rama nace por debajo de su nota para subir ~27° en vez de salir horizontal.
const BRANCH_RISE = Math.tan((27 * Math.PI) / 180);
const visibleRootList = (childrenOf.get(null) ?? []).filter((r) => visible.has(r.id));
const attachments = visibleRootList
  .map((r) => {
    const p = coord.get(r.id)!;
    const drop = Math.abs(p.x - base!.x) * BRANCH_RISE;
    return { root: r, y: Math.min(p.y + drop, base!.y - 40) };
  })
  .sort((a, b) => b.y - a.y); // de abajo (mayor y) hacia arriba
```

### 2. Punto en la intersección — `src/components/GraphViewV2.tsx` (~línea 1114, tras el `map` de ramas)

Se inserta este bloque justo después de `})}` que cierra el render de `branchEdges` y antes del comentario `{/* Cross-links ... */}`:

```tsx
{/* Punto de unión rama-tronco: suaviza el quiebre en cada intersección. */}
{positionsWithOffsets
  .filter((n) => n.isVirtual && n.id.startsWith("attach-"))
  .map((n) => (
    <circle
      key={`att-${n.id}`}
      cx={n.x}
      cy={n.y}
      r={3}
      fill="url(#tree-trunk-gradient)"
      style={{ opacity: dimFor(n.id), transition: "opacity 260ms ease" }}
    />
  ))}
```

No hay más ficheros implicados: los nodos `attach-*` ya existen y siguen excluidos del render de etiquetas por `if (node.isVirtual) return null;`.
