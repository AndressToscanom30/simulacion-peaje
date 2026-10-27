# Bitácora

Una entrada por intervención, la más reciente arriba.

## 2026-10-27 — Documentación, esqueleto y fase 1 del motor

**Qué cambió:**

- Documentación desde cero: `CLAUDE.md` (25 líneas), `docs/README.md`,
  `docs/decisiones/registro.md` (DEC-001 a DEC-012 sembradas del contexto, más
  DEC-013 a DEC-020 del desarrollo), `docs/planes/plan-actual.md` con las 7
  fases, `docs/pendientes.md` y esta bitácora.
- Esqueleto Vite + React en JavaScript con Vitest en entorno `node`. Scripts
  `dev`, `test` y `simular`.
- `src/config/datos.js` con la sección 10 del contexto transcrita y verificada
  (sumas 238/451/195/1.064, colas máximas 1/7/8/32, los 50 tiempos de atención
  con suma 605,08 s, media 12,1016 s y desviación 5,593 s). `src/config/parametros.js`
  con todos los parámetros editables; ningún número queda dentro de la lógica.
- Fase 1 del motor en `src/motor/`, JS puro y corriendo en Node: PRNG mulberry32
  con semilla, gamma por Marsaglia–Tsang, llegadas Poisson por tramos que se
  regeneran con la tasa nueva al cambiar de intervalo, cola única FIFO, `c(t)`
  programado, cola y casetas iniciales como parámetros, y casetas marcadas que
  no interrumpen el servicio en curso. Medidas: caudal, `Wq` por intervalo y por
  hora, cola máxima (continua y muestreada), % de intervalos sobre 2,5 min y
  carriles-intervalo. Erlang B/C para el M/M/c de referencia.
- 58 pruebas unitarias en verde.
- `scripts/simular.js` corre 30 réplicas (semillas 1…30) de los 4 conteos más el
  festivo con cola 0 y genera `docs/resultados/validacion-fase1.md`.

**Resultados de la validación (sin ajustar ningún parámetro):** las llegadas
quedan validadas (error < 1,6 %) y los carriles-intervalo coinciden exactamente
con la operación real. La espera queda corta en los cuatro conteos: 0,42×, 0,54×
y 0,69× en los normales (coherente, porque el servicio gamma con CV = 0,46 es
menos variable que la exponencial del M/M/c) y **0,22× en el festivo**. El
M/M/c estaba 22 veces corto ahí y la simulación lo mejora a 4,6 veces, pero no
cierra la brecha.

**Qué quedó a medias:** nada de la fase 1. Quedan abiertos dos hallazgos:
PEN-008 (la cola sostenida del festivo no se reproduce; las casetas observadas
dejan un 25 % de capacidad libre, incompatible con una cola única de 14 a 32
vehículos, y sostenerla exigiría un servicio de ≈ 15,5 s en vez de 12,10 s) y
PEN-009 (según el modelo la operación real ya cumple el criterio de desempeño,
lo que contradice el propósito del estudio). Ninguno se "arregló" tocando
parámetros, que es lo que prohíbe la sección 6 del contexto.

**Qué sigue:** fase 2, la regla de apertura y cierre por cola, con la demora de
5 min y la ventana de 15 min. Leer antes PEN-008: las casetas que recomiende la
regla son una cota inferior.

<!-- Plantilla:
## AAAA-MM-DD — título
**Qué cambió:** ...
**Qué quedó a medias:** ...
**Qué sigue:** ...
-->
