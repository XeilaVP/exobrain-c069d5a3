# Recuperar el tronco y las líneas al aislar una rama

## Diagnóstico confirmado

El árbol completo sigue dibujando correctamente el tronco y las conexiones. La pérdida ocurre al aislar una rama principal: el filtro actual conserva únicamente los nodos de notas, por lo que excluye la raíz ExoBrain, los puntos de unión del tronco y las aristas que conectan esa rama con él.

## Cambios

- Corregir el conjunto de elementos visibles de una rama aislada para incluir también su recorrido jerárquico hasta ExoBrain.
- Mantener visibles la raíz, el tramo necesario del tronco, el punto de unión de la rama seleccionada y la línea entre ese punto y la nota principal.
- Conservar todas las conexiones madre-hija dentro de la rama aislada.
- No modificar posiciones, geometría Bézier, arrastre, zoom, selección ni apertura de notas.

## Verificación

- Comprobar el árbol completo sin aislamiento.
- Aislar cada rama principal y confirmar que conserva tronco, unión y ramificaciones internas.
- Salir del aislamiento y confirmar que reaparece el árbol completo sin cambios de posición.
- Revisar escritorio y la vista móvil existente.
