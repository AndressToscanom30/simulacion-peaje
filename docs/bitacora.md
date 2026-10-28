# Bitácora

Una entrada por intervención, la más reciente arriba.

## 2026-10-28 (2.ª intervención) — Fase 4: escenarios, corridas por lotes y configurabilidad total

**Qué cambió:**

- **Decisiones de la usuaria.** **DEC-028**: PEN-014 y PEN-015 quedan como
  hallazgo, no se rediseña la reasignación, y el disparador anticipativo por
  tasa de PEN-011 queda para la fase 7. **DEC-029**: la demanda de C→P en el
  festivo pasa a ser el conteo del viernes (238 veh/h, medido en **ese**
  sentido) × un factor configurable; supera solo el valor por defecto de la
  sección 7, con nota en el contexto que remite a la decisión. **DEC-030**:
  configurabilidad total.
- **`src/config/escenario.js`:** un escenario es un objeto declarativo
  serializable a JSON, sin funciones. Escenario base más sobreescrituras,
  `validarEscenario` que devuelve todos los problemas juntos y en castellano, y
  JSON de ida y vuelta sin pérdida.
- **DEC-031:** las tablas de umbrales siguen al tope por sentido con dos
  fórmulas rotuladas, `abrir(c) = 5c − 1` y `cerrar(c) = ⌊abrir(c−1)/2⌋`, que
  **reproducen exactamente los ocho valores del contexto** para `c` de 1 a 5 y
  los extienden hacia arriba.
- **Auditoría de números en la lógica:** `src/motor/` no tenía ninguno del
  modelo, solo constantes de los métodos. Se añadieron las conversiones de
  unidades como constantes exportadas, las etiquetas de los regímenes se derivan
  de sus propios números, y el árbitro del peaje acepta por configuración el
  servicio y la capacidad nominales.
- **`docs/parametros.md`** (`npm run parametros`): los 30 parámetros con
  significado, unidad, **valor por defecto leído del escenario base**, origen y
  rango. Es la especificación del formulario de la fase 5.
- **Catálogo de 160 escenarios** (80 casos × 2 regímenes) en
  `src/config/escenarios.js`, y **`src/corridas.js`** como runner que traduce
  escenarios a configuración del motor.
- **198 pruebas** (75 nuevas). Encontraron dos fallos reales, corregidos en
  **DEC-032**: en modo programado un sentido podía abrir más casetas que su tope
  (con tope 2 y las casetas iniciales del base tomaba 4 del pozo), y la
  validación de umbrales usaba `valor >= 0`, que en JavaScript acepta `null`.
- **`scripts/fase4.js`** (`npm run fase4`) →
  `docs/resultados/fase4-escenarios.md`.

**Qué muestra la matriz:** con el servicio medido cumplen **33 de 80**
escenarios; con el servicio lento, **4 de 80**. El quiebre está en **×1,10** de
demanda con el pozo de 6 (las dos configuraciones de control), y con servicio
lento ya no se cumple ni al factor 1,0. Un **pozo de 8 desplaza el quiebre a
×1,55 solo si la regla puede mover las casetas**: con casetas fijas no lo
desplaza nada, porque el cuello de botella es C→P clavado en 1 caseta y dar más
casetas a P→C no lo arregla. La sensibilidad que más mueve el resultado es el
**sustituto de C→P** (+6,94 min con domingoCP), por encima de cualquier
parámetro de la regla; la demora apenas mueve 0,15 min. La reasignación por ρ
sigue casi inerte también con demanda alta, lo que confirma PEN-015.

**Hallazgo nuevo (PEN-016):** quitar la cola inicial del festivo **empeora** la
espera de P→C, de 0,47 a 1,07 min. La cola de arranque le hacía de aviso
temprano a una regla que es reactiva: sin ella P→C abre 0,67 casetas en vez de
1,40, y la que no pide se la queda el contraflujo. Es PEN-011 y PEN-014
actuando a la vez, y medido.

**Qué quedó a medias:** nada de la fase 4.

**Qué sigue:** fase 5, la interfaz de configuración y el modo tiempo real. La
base está puesta: el escenario es serializable y validable, `parametros.md` es
la especificación del formulario, y `simularPeaje` ya acepta un `observador`
que se llama tras cada evento, que es lo que necesita el modo tiempo real.

## 2026-10-28 — Fase 3: reparto de casetas entre sentidos

**Qué cambió:**

- **Refactor para no duplicar la regla.** `src/motor/sentido.js` se queda con
  toda la lógica de un sentido, sin reloj ni bucle propios; `src/motor/pozo.js`
  es dueño de las casetas físicas y de quién tiene cada una; `simularSentido`
  pasa a ser un envoltorio delgado con un pozo de su tamaño, y su API no cambia.
  Verificado que el refactor es transparente: las 86 pruebas de antes siguen en
  verde y los tres informes anteriores se regeneran con todas las cifras
  idénticas (solo cambia la línea de la fecha).
- **`src/motor/peaje.js`:** `simularPeaje` corre los dos sentidos en un solo
  reloj sobre el pozo de 6. Que `c1 + c2 ≤ 6` se cumpla sale de que no hay más
  casetas, no de una comprobación aparte. El árbitro implementa la DEC-008:
  reserva al ordenar la apertura, peticiones bloqueadas con reintento,
  desempate, y reasignación por ρ > 0,60 con la misma demora. Acepta un
  `observador` que se llama tras cada evento, que es lo que usan las pruebas de
  invariantes y lo que la fase 5 reutilizará para el modo tiempo real.
- **`src/config/escenarios.js`:** el escenario del festivo (P→C el conteo real,
  C→P el sustituto) y el de sanidad de día normal, compartidos por scripts y
  pruebas.
- **DEC-027** con los 12 casos límite que el contexto no cubre, y **DEC-024 a
  DEC-026** sin tocar. **PEN-013** (el sustituto de C→P se midió en el sentido
  contrario), **PEN-014** y **PEN-015** (la reasignación favorece al sentido con
  menos casetas y casi no se activa en el pico).
- **123 pruebas** (37 nuevas), incluida la equivalencia exacta con las fases 1 y
  2 en los 4 conteos, los dos modos y las 30 semillas.
- **`scripts/fase3.js`** (`npm run fase3`) → `docs/resultados/fase3-reparto.md`,
  con 20 casos × 30 réplicas.

**Qué muestra la comparación:** el pozo está agotado **56 de los 60 minutos**
del festivo, con 1,7 peticiones bloqueadas por réplica y 32 min de espera por
carril: la competencia que la fase 2 no podía ver es real. Con servicio base los
tres controles cumplen la meta en los dos sentidos; la regla cuesta espera a P→C
(0,28 → 0,44 min) y se la ahorra a C→P (0,40 → 0,34). Con servicio lento ninguno
cumple, pero la regla baja `Wq` de P→C de 2,90 a 1,26 min. La reasignación por ρ
no cierra la brecha reactiva de PEN-011: la **ensancha** con servicio base
(0,07 → 0,16 min) y con servicio lento no se activa ni una vez. Y el sustituto
de C→P decide el resultado: con domingoCP (451 veh/h) C→P pasa a 5,76 min de
espera y 66 % de intervalos sobre el máximo tolerable, y deja de cumplir.

**Qué quedó a medias:** nada de la fase 3. El escenario de sanidad confirmó que
en día normal el pozo no se agota en ninguna de las 30 réplicas, así que la
competencia del festivo no es un artefacto del modelo.

**Qué sigue:** fase 4, escenarios y corridas por lotes: la demanda alta con los
factores 1,10, 1,13 y 1,20, la sensibilidad de la meta y de la cola inicial, y
la tabla comparativa de escenarios. Antes conviene leer PEN-013: sin medir C→P
en un festivo, cualquier política que salga de la fase 4 cuelga de un supuesto.

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
