# Peaje Los Acacios — simulación

Simulación de eventos discretos del peaje Los Acacios (vía Cúcuta–Pamplona): cola
única FIFO por sentido, servicio gamma y `c(t)` casetas de efectivo de un pozo común
de 6. El fin es diseñar la política de apertura y cierre según la demanda, en React + 3D.

## Antes de actuar

- Lee `docs/README.md` y `docs/planes/plan-actual.md`; trabaja solo la fase que toca.
- `docs/contexto/contexto-inicial.md` es la fuente de verdad: no inventes
  parámetros ni cambies valores decididos allí.
- No reabras lo que esté en `docs/decisiones/registro.md`. Para cambiar una
  decisión se añade otra que diga qué supera.
- Si algo es ambiguo, **no lo decidas solo**: anótalo en `docs/pendientes.md`,
  sigue con la opción más razonable y deja dicho cuál tomaste.

## Reglas del código

- Ningún número dentro de la lógica: datos de campo en `src/config/datos.js`,
  parámetros editables en `src/config/parametros.js`.
- `src/motor/` es JS puro y corre con Node: sin React, sin DOM, sin Three.js.
- Prohibido `Math.random` en el motor; se usa el PRNG con semilla.
- No ajustes parámetros para que la validación cuadre: se reporta lo que salga.

Al terminar: marca el plan, añade entrada a `docs/bitacora.md` y registra las decisiones nuevas.
