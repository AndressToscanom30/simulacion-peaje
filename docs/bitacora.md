# Bitácora

Una entrada por intervención, la más reciente arriba.

## 2026-10-27 (2.ª intervención) — Fase 2: regla de apertura y cierre

**Qué cambió:**

- **DEC-024** fija que las lecturas de cola de los conteos son la **fila más
  larga de una caseta**, no el total del sentido, y saca las consecuencias: la
  lectura es cota inferior de la cola total, la cola única del motor debería
  quedar por encima, la fórmula `Wq_est = Lq × 12,1 / c` no aplica a esas
  lecturas, los umbrales de la regla siguen siendo sobre cola total, y queda
  **anulado** el cálculo de "servicio implícito" de 15,5 s de la fase 1, que
  suponía cola única. Se quitó del informe de validación.
- Nuevo `scripts/diagnostico-festivo.js` (`npm run diagnostico`) →
  `docs/resultados/diagnostico-festivo.md`, con la comparación intervalo por
  intervalo y la marca de dónde la cola simulada queda por debajo de la
  observada.
- **DEC-025** supera **solo** la parte de la DEC-021 que descartaba correcciones
  al festivo, y añade el escenario de sensibilidad "servicio lento": media
  15,5 s con el mismo CV (`k = 4,68`, `θ = 3,3120 s`). Nunca es el valor por
  defecto, solo se aplica al pico y se reporta siempre junto al caso base.
- **Modo `c(t)` por regla** en el motor, sin romper el programado, que sigue
  siendo el valor por defecto: evaluación tras cada llegada y cada fin de
  servicio, apertura a `t + demora` con una sola pendiente y sin revocar la
  orden, cierre solo tras 15 min seguidos bajo el umbral y sin interrumpir
  servicios. Nuevo evento `APERTURA_CASETA`. Medidas nuevas: aperturas, cierres,
  cierres cancelados, cambios de `c` y tiempo por número de casetas abiertas.
- **DEC-026** registra los 10 casos límite que el contexto no cubre y que hubo
  que decidir (la `c` de los umbrales es la efectiva, se cancela un cierre
  marcado antes de ordenar una apertura, la ventana de 15 min se reinicia a cada
  cambio de `c`, se prefiere cerrar una caseta libre, y los contadores excluyen
  el arranque, entre otros).
- 28 pruebas nuevas (86 en total), incluida una de **regresión** que lee
  `validacion-fase1.md` y comprueba que el modo programado sigue dando esos
  mismos números. Verificada por contraste: mover `θ` la hace fallar.
- Nuevo `scripts/fase2.js` (`npm run fase2`) → `docs/resultados/fase2-regla.md`,
  con 16 casos × 30 réplicas y las mismas semillas en todos.

**Qué mostró el diagnóstico:** el festivo subestima en **12 de 12 intervalos** en
media, y en **8 de 12** ni la peor de las 30 réplicas alcanza la lectura de
campo. En los cuatro conteos, 21 de 48 intervalos en media y 10 de 48 en las 30.

**Qué concluye la comparación:** depende del régimen de servicio. Con el medido
(12,10 s) operador y regla cumplen el criterio en los cuatro conteos, y en el
festivo la regla queda algo peor (`Wq` 0,32 contra 0,28 min) gastando un 7,4 %
más de carriles-intervalo. Con el lento de sensibilidad (15,5 s) ninguno cumple,
pero la regla baja `Wq` de 2,90 a 1,23 min y el % de intervalos sobre 2,5 min de
50,0 % a 9,2 %, por un 7 % más de carriles. Con demora 0 la regla sí mejora al
operador también en el caso base, lo que señala el retardo de reacción como la
causa.

**Qué quedó a medias:** nada de la fase 2. Pendientes nuevos: PEN-010 (el
servicio lento es hipótesis, no medición), PEN-011 (la regla es reactiva y el
operador fue anticipativo) y PEN-012 (la ventana de 15 min cuesta un 7,4 % de
carriles-intervalo). PEN-002 queda parcialmente cerrado y PEN-008 reescrito.

**Qué sigue:** fase 3, el reparto de casetas entre sentidos sobre el pozo común
de 6, con la reasignación por ρ > 0,60 y el desempate cuando los dos sentidos
piden caseta. Ahí hará falta el sustituto de demanda de Cúcuta→Pamplona en el
festivo (195 veh/h del domingo, arrancando con 1 caseta).

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
