# Registro de decisiones

Lo que está aquí no se reabre. Para cambiar una decisión se añade una entrada
nueva que diga explícitamente qué entrada supera.

Las decisiones `DEC-001` a `DEC-012` vienen del contexto inicial (26/10/2026) y
se transcriben aquí resumidas para tenerlas a mano. Las `DEC-013` en adelante se
tomaron durante el desarrollo.

---

## DEC-001 — Modelo M/M/c con cola única por sentido

- **Fecha:** 26/10/2026
- **Decisión:** cada sentido se modela como una cola única FIFO atendida por
  `c(t)` casetas idénticas. Se simulan los dos sentidos.
- **Motivo:** en campo se registró el total de vehículos esperando por sentido,
  no la cola de cada caseta. La cola única es lo que los datos soportan.
- **Descarta:** una cola por caseta y, con ella, cualquier intento de reproducir
  el desbalance entre casetas observado en campo.

## DEC-002 — Pozo común de 6 casetas de efectivo, entre 1 y 5 por sentido

- **Fecha:** 26/10/2026
- **Decisión:** las 6 casetas de efectivo se reparten entre los dos sentidos;
  cada sentido tiene mínimo 1 y máximo 5 abiertas.
- **Motivo:** es la infraestructura real del peaje. El carril TAG no entra.
- **Descarta:** casetas dedicadas a un sentido y capacidad ilimitada.

## DEC-003 — Alcance del cliente simulado

- **Fecha:** 26/10/2026
- **Decisión:** el cliente es el vehículo que paga en efectivo. Quedan fuera
  motocicletas, carril TAG y retén policial. La categoría del vehículo no entra
  al modelo.
- **Motivo:** los conteos se tomaron después del retén y solo sobre los carriles
  de efectivo; la tarifa por categoría no cambia el tiempo de atención medido.
- **Descarta:** tiempos de servicio por categoría de vehículo.

## DEC-004 — Servicio con distribución gamma (k = 4,68; θ = 2,58 s)

- **Fecha:** 26/10/2026
- **Decisión:** el tiempo de atención se genera con una gamma de forma
  `k = 4,68` y escala `θ = 2,58 s` (media 12,1016 s, desviación 5,59 s,
  CV = 0,46). El máximo observado de 29,18 s es válido y no se descarta.
- **Motivo:** las 50 mediciones tienen CV ≈ 0,46, muy lejos del CV = 1 de una
  exponencial; el servicio es claramente menos variable.
- **Descarta:** servicio exponencial y servicio determinístico.

## DEC-005 — Llegadas Poisson por tramos de 5 min

- **Fecha:** 26/10/2026
- **Decisión:** las llegadas son un proceso de Poisson no homogéneo por tramos.
  La tasa de cada intervalo de 5 min es el conteo real de ese intervalo
  (veh/5 min) multiplicado por el factor de demanda del escenario.
- **Motivo:** el conteo se levantó en intervalos de 5 min y la demanda varía
  mucho entre ellos; una tasa única de la hora borraría los picos.
- **Descarta:** una tasa constante para toda la hora y llegadas determinísticas.

## DEC-006 — Regla de apertura y cierre disparada por la cola observada

- **Fecha:** 26/10/2026
- **Decisión:** la regla se dispara por la cola del sentido (vehículos esperando
  en todas las casetas abiertas, sin contar los atendidos) y se evalúa tras cada
  llegada y cada fin de servicio. Umbrales: abrir con cola > 4 / 9 / 14 / 19
  (según haya 1 / 2 / 3 / 4 abiertas); cerrar con cola < 2 / 4 / 7 / 9 (con
  2 / 3 / 4 / 5 abiertas). Todos configurables.
- **Motivo:** la cola es lo único que el operador puede ver sin instrumentación;
  los umbrales salen de la derivación M/M/c con `Wq ≤ 1 min`.
- **Descarta:** disparar por tasa de llegadas medida, por hora del día o por
  espera estimada.

## DEC-007 — Demora de apertura, histéresis de 15 min y no interrumpir servicios

- **Fecha:** 26/10/2026
- **Decisión:** al cumplirse la condición de apertura se programa la caseta para
  `t + demora` (caso base 5 min; sensibilidad 0 y 10), con una sola apertura
  pendiente por sentido. Para cerrar, la cola debe mantenerse bajo el umbral
  **15 min seguidos**; si sube, el conteo se reinicia. La caseta se marca y se
  cierra al terminar su servicio: **nunca se interrumpe una atención en curso**.
- **Motivo:** abrir una caseta exige mover personal, y cerrar y reabrir a cada
  rato sería inoperable. Cortar un cobro a medias no ocurre en la realidad.
- **Descarta:** apertura y cierre instantáneos y preempción del servicio.

## DEC-008 — Reasignación de caseta liberada con ρ > 0,60

- **Fecha:** 26/10/2026
- **Decisión:** cuando se libera una caseta, si el otro sentido tiene ρ > 0,60
  (con ρ = llegadas de los últimos 5 min ÷ (c × 24,8)) y tiene `c < 5`, la
  caseta se reasigna a ese sentido con la misma demora de apertura. Si no, se
  cierra y vuelve al pozo. Si los dos sentidos piden una caseta y no hay libres,
  gana el que supere 2,5 min de espera estimada, empezando por el peor; si
  ninguno la supera, gana donde más baje la cola total.
- **Motivo:** las casetas son un recurso compartido y hay que decidir el reparto
  con algo observable. 0,60 deja margen antes de que la cola se dispare.
- **Descarta:** reparto fijo mitad y mitad, y reasignación inmediata sin demora.

## DEC-009 — Criterio de desempeño: meta 1 min, máximo tolerable 2,5 min

- **Fecha:** 26/10/2026
- **Decisión:** la meta es `Wq ≤ 1 min` promedio en cola. El máximo tolerable es
  2,5 min (≈ 12 carros por caseta) y se acepta superarlo en a lo sumo el 5 % de
  los intervalos.
- **Motivo:** fija un objetivo de diseño y un techo de incumplimiento con los
  que comparar escenarios.
- **Descarta:** criterios basados solo en la cola máxima o en la utilización.

## DEC-010 — 30 réplicas, semillas 1…30, mismas semillas en todos los escenarios

- **Fecha:** 26/10/2026
- **Decisión:** el horizonte es la hora observada. Se corren 30 réplicas con una
  semilla distinta por réplica (1 a 30) y se usan **las mismas semillas** en
  todos los escenarios. La cola inicial y las casetas iniciales son parámetros:
  el festivo arranca con 23 vehículos en cola y 4 casetas en Pamplona→Cúcuta;
  los demás conteos con cola 0 y las casetas del primer intervalo observado.
- **Motivo:** 30 réplicas dan un intervalo de confianza razonable, y repetir las
  semillas entre escenarios reduce la varianza al comparar (números aleatorios
  comunes).
- **Descarta:** una sola corrida, semillas tomadas del reloj, y arrancar siempre
  con el sistema vacío.

## DEC-011 — Aleatoriedad con generador propio y semilla

- **Fecha:** 26/10/2026
- **Decisión:** toda la aleatoriedad sale de un generador propio con semilla.
  Está prohibido `Math.random`. La gamma se genera por Marsaglia–Tsang.
- **Motivo:** sin reproducibilidad no se puede validar ni usar números
  aleatorios comunes entre escenarios. `Math.random` no acepta semilla.
- **Descarta:** `Math.random` y librerías de aleatoriedad sin semilla.

## DEC-012 — Motor independiente de React y del 3D

- **Fecha:** 26/10/2026
- **Decisión:** el motor de simulación es JavaScript puro, sin React, sin DOM y
  sin Three.js, y debe correr con Node. Hay dos modos de ejecución: tiempo real
  con tiempo simulado (1×, 10×, 60×, con pausa y reinicio) y por lotes sin 3D.
  Todo número del contexto vive en una configuración editable, no escrito dentro
  de la lógica. React + JavaScript, no TypeScript.
- **Motivo:** las 30 réplicas tienen que poder correrse sin interfaz, y así el
  motor se puede probar con Vitest desde Node.
- **Descarta:** lógica de simulación dentro de componentes React, y TypeScript.

---

## DEC-013 — Vite como herramienta de construcción y Vitest para pruebas

- **Fecha:** 27/10/2026
- **Decisión:** el proyecto se arma con Vite + React en JavaScript (plantilla
  `react`, no `react-ts`) y las pruebas corren con Vitest en entorno `node`.
- **Motivo:** el contexto fija React + JavaScript y un motor que corre en Node,
  pero no la herramienta de construcción (sección 9: la arquitectura se decide
  en el desarrollo). Vite arranca rápido y Vitest comparte su resolución de
  módulos, así que el mismo código ESM del motor se prueba sin transpilación
  aparte. Vitest con entorno `node` deja que las pruebas del motor fallen si
  alguien le mete una dependencia del DOM.
- **Descarta:** Create React App (sin mantenimiento), Jest (necesitaría Babel
  para ESM) y Next.js (no hace falta servidor).

## DEC-014 — Estructura de carpetas

- **Fecha:** 27/10/2026
- **Decisión:** `src/motor/` solo motor en JS puro; `src/config/` datos y
  parámetros; `scripts/` entradas de Node para corridas por lotes;
  `docs/resultados/` salidas generadas. El motor expone su API por
  `src/motor/index.js` y las pruebas viven en `src/motor/__tests__/`.
- **Motivo:** separar motor, configuración e interfaz hace cumplible la
  independencia de React de la DEC-012, y un solo punto de entrada evita que la
  interfaz dependa de archivos internos del motor.
- **Descarta:** motor dentro de `src/components/`, y datos de campo repartidos
  entre varios archivos.

## DEC-015 — Módulos ESM en todo el repo

- **Fecha:** 27/10/2026
- **Decisión:** `"type": "module"` en `package.json`; todo el código usa
  `import`/`export`, incluidos los scripts de Node.
- **Motivo:** así el motor es un único cuerpo de código que corre igual en el
  navegador, en Vitest y en Node, sin una compilación intermedia ni dos
  versiones del mismo archivo.
- **Descarta:** CommonJS (`require`) y una compilación aparte para los scripts.

## DEC-016 — PRNG mulberry32

- **Fecha:** 27/10/2026
- **Decisión:** el generador es mulberry32, con semilla entera de 32 bits.
- **Motivo:** la DEC-011 pide generador propio con semilla pero no cuál.
  mulberry32 cabe en 10 líneas de aritmética de 32 bits, pasa las pruebas
  estadísticas que este trabajo necesita y tiene periodo 2³², de sobra para
  una hora de simulación (del orden de 10⁴ números por réplica).
- **Descarta:** Mersenne Twister (mucho código para lo que se gana) y
  generadores congruenciales lineales simples tipo `LCG` de 16 bits (periodo y
  correlaciones en bits bajos insuficientes).

## DEC-017 — Orden de desempate entre eventos simultáneos

- **Fecha:** 27/10/2026
- **Decisión:** cuando dos eventos caen en el mismo instante se atienden en este
  orden: fin de servicio, cambio de intervalo, llegada, muestreo de cola. A
  igual tipo, el que se programó primero.
- **Motivo:** el contexto no fija el desempate y el resultado cambia según el
  orden. Liberar primero las casetas y ajustar `c(t)` antes de la llegada evita
  encolar un vehículo que tenía caseta libre; muestrear al final hace que la
  lectura de la cola refleje el estado ya resuelto del instante, que es lo que
  vería un observador en campo.
- **Descarta:** desempate arbitrario o por orden de inserción en el montículo.

## DEC-018 — La cola inicial entra como vehículos con llegada en t = 0

- **Fecha:** 27/10/2026
- **Decisión:** los vehículos de la cola inicial se crean en `t = 0` con tiempo
  de llegada 0, se atribuyen al primer intervalo y su espera cuenta desde 0. Las
  medidas se reportan con y sin ellos.
- **Motivo:** la DEC-010 fija la cola inicial como parámetro pero no desde
  cuándo cuenta su espera. No se sabe cuánto llevaban esperando esos 23
  vehículos del festivo, así que contar desde 0 es la opción que no inventa
  dato; subestima su espera real, y por eso se reporta también sin ellos.
- **Descarta:** darles una espera previa supuesta, y excluirlos del cálculo de
  `Wq` sin reportarlo.

## DEC-019 — Las llegadas se cortan en el horizonte y la cola se drena

- **Fecha:** 27/10/2026
- **Decisión:** no se generan llegadas después de los 3.600 s, pero la
  simulación sigue hasta atender a todos los vehículos que ya llegaron. El
  caudal de la hora cuenta solo las salidas dentro de los 3.600 s; la cola
  máxima y los carriles-intervalo también se miden solo en ese tramo. `Wq`
  incluye a todos los vehículos llegados, también a los atendidos después.
- **Motivo:** si la simulación se cortara en seco a los 3.600 s, los vehículos
  que quedan en cola no tendrían inicio de servicio y su espera se perdería,
  sesgando `Wq` hacia abajo justo en el caso congestionado que interesa.
- **Descarta:** cortar en seco y descartar la cola remanente; y extender las
  llegadas más allá de la hora observada.

## DEC-020 — M/M/c de referencia con Erlang C al nivel de la hora

- **Fecha:** 27/10/2026
- **Decisión:** el M/M/c de referencia que acompaña a la validación se calcula
  con Erlang C usando `λ` = total de la hora ÷ 3.600 s, `μ` = 1/12,1016 s⁻¹ y
  `c` = número modal de casetas abiertas en el conteo. Junto a él se imprimen
  los valores declarados en la sección 6 del contexto.
- **Motivo:** el contexto declara los valores de referencia (0,06 / 0,24 / 0,41
  y 0,06 min) pero no el procedimiento exacto. Reconstruirlo con `c` modal
  reproduce esos cuatro valores con diferencias de centésimas de minuto, así que
  es la lectura más probable. Un M/M/c por intervalo no sirve: varios intervalos
  del festivo quedan con ρ ≥ 1 y la fórmula diverge.
- **Descarta:** M/M/c por intervalo promediado, y usar `c` promedio no entero.

## DEC-021 — La validación se reporta sin ajustar parámetros, incluida la brecha del festivo

- **Fecha:** 27/10/2026
- **Decisión:** la validación de la fase 1 se publicó tal como salió. El tiempo
  medio de atención se queda en 12,1016 s aunque subirlo a ≈ 15,5 s haría cuadrar
  la cola observada del festivo. La brecha queda documentada en
  `docs/resultados/validacion-fase1.md`, en PEN-008 y en PEN-009.
- **Motivo:** la sección 6 del contexto lo prohíbe expresamente. Un parámetro
  movido para que el modelo cuadre deja de ser una medición y el modelo deja de
  poder predecir nada fuera del caso con el que se ajustó.
- **Descarta:** calibrar el tiempo de servicio contra la cola observada, y
  cualquier factor de corrección aplicado solo al festivo.

## DEC-022 — Se reportan dos colas máximas y dos caudales

- **Fecha:** 27/10/2026
- **Decisión:** cada réplica reporta la cola máxima **continua** de la hora y el
  máximo de las 12 **lecturas puntuales** en instantes aleatorios; además
  reporta las llegadas de la hora y las salidas dentro de la hora.
- **Motivo:** las colas máximas observadas (32 / 8 / 7 / 1) salen de 12 lecturas
  puntuales por conteo, así que lo comparable con ellas es el máximo muestreado,
  no el continuo, que por construcción es mayor (PEN-004). Y el 1.064 del
  festivo es un total de llegadas, no un caudal de salidas (PEN-005): con cola
  inicial de 23 las dos cifras no coinciden y hace falta decir cuál es cuál.
- **Descarta:** reportar una sola cola máxima, y llamar "caudal" a las llegadas.

## DEC-023 — El informe de validación es un archivo generado

- **Fecha:** 27/10/2026
- **Decisión:** `docs/resultados/validacion-fase1.md` lo escribe
  `scripts/simular.js`, incluida la sección de lectura de los resultados, que
  calcula sus cifras de las réplicas en vez de llevarlas escritas. No se edita a
  mano.
- **Motivo:** una conclusión escrita a mano envejece en silencio en cuanto
  cambia un parámetro o el motor. Generándola, cualquier cambio se ve en la
  siguiente corrida.
- **Descarta:** redactar las conclusiones a mano en el archivo de resultados.

## DEC-024 — Las lecturas de cola de campo son la fila más larga de una caseta, no el total del sentido

- **Fecha:** 27/10/2026
- **Decisión:** el arreglo `cola` de cada conteo (sección 10 del contexto) se
  interpreta como **el número de vehículos en la fila más larga de una sola
  caseta** durante ese intervalo, no como el total de vehículos esperando en el
  sentido. Esta entrada **supera** la lectura implícita que la fase 1 le dio a
  esas cifras.
- **Motivo:** así se tomaron en campo. La diferencia cambia por completo lo que
  significa comparar la simulación con ellas.
- **Consecuencias, que son las que importan:**
  1. **La lectura observada es una cota inferior de la cola total real.** Si la
     fila más larga tenía 32 vehículos, el total del sentido era ≥ 32, y con 5
     casetas abiertas podía ser bastante más.
  2. **El motor simula cola única (DEC-001), así que su cola total debería ser
     mayor o igual que la lectura observada.** Donde la cola simulada queda por
     debajo de la lectura, el modelo **subestima**, y no hay interpretación que
     lo salve: es la comparación de un total contra una de sus partes.
  3. **La fórmula `Wq_est = Lq × 12,1 / c` de la sección 3 no aplica tal cual a
     estas lecturas.** Esa fórmula espera `Lq` = cola total del sentido; aplicada
     a la fila más larga de una caseta da una cifra sin interpretación clara. El
     recálculo de PEN-002 queda anulado por esto.
  4. **Los umbrales de la regla (4 / 9 / 14 / 19) siguen siendo sobre cola
     total**, como dice la sección 4 ("total de vehículos esperando en todas las
     casetas abiertas del sentido"). No se reescalan.
  5. **Queda anulado el cálculo de "servicio implícito" de ≈ 15,5 s** que la
     fase 1 derivó en su informe. Ese cálculo suponía que haber cola implicaba
     casetas ocupadas, lo que solo vale en cola única. Con filas por caseta, una
     caseta puede estar libre mientras otra tiene cola, así que la holgura de
     capacidad se explica por el desbalance y no exige un servicio más lento.
- **Limitación declarada:** hay un **desajuste de definición** entre el dato de
  campo (fila más larga de una caseta) y la variable del modelo (cola total de
  una cola única). Las dos no son comparables de frente; solo se puede afirmar
  la desigualdad de la consecuencia 2. Mientras no se registre la cola total por
  sentido, la validación de la cola no puede pasar de ahí.
- **Descarta:** leer el arreglo `cola` como total del sentido; usar esas
  lecturas para estimar `Wq` observado con la fórmula de la sección 3; y derivar
  un tiempo de servicio implícito a partir de ellas.

## DEC-025 — Escenario de sensibilidad "servicio lento" (15,5 s), nunca por defecto

- **Fecha:** 27/10/2026
- **Supera:** **solo** la parte de la DEC-021 que descartaba "cualquier factor de
  corrección aplicado solo al festivo". El resto de la DEC-021 sigue en pie: la
  validación se reporta sin ajustar parámetros y no se calibra el servicio contra
  la cola observada.
- **Decisión:** se añade un escenario de sensibilidad con tiempo medio de
  atención de **15,5 s** y el **mismo coeficiente de variación** del servicio
  medido: `k = 4,68` y `θ = 15,5 / 4,68 = 3,3120 s` (desviación 7,17 s,
  CV = 0,46, igual que el base). **El modelo base no cambia:** sigue en
  12,1016 s con `k = 4,68` y `θ = 2,58 s`.
- **Reglas de uso, que son parte de la decisión:**
  1. Vive en `src/config/parametros.js` como parámetro de escenario
     (`parametros.servicioLento`) y **nunca** es el valor por defecto.
  2. Se aplica **solo a escenarios de pico**: el festivo y, en la fase 4, la
     temporada alta. Los conteos normales siguen con 12,1016 s.
  3. Se reporta **siempre junto al caso base** y rotulado como **hipótesis de
     sensibilidad**, no como calibración.
- **Motivo:** PEN-008 deja tres explicaciones posibles para la congestión del
  festivo y conviene poder aislar la primera (servicio más lento en el pico) en
  vez de solo nombrarla. Como escenario rotulado y acompañado del caso base, eso
  es análisis de sensibilidad; sustituyendo el valor medido, sería calibración.
  La diferencia está en que el valor por defecto no se mueve y en que las dos
  cifras se publican juntas.
- **De dónde sale el 15,5 s:** es el tiempo medio que haría falta para que las
  casetas abiertas en el festivo estuvieran ocupadas todo el tiempo atendiendo
  los 1.064 vehículos contados. Era el "servicio implícito" de la fase 1.
  **Esa derivación ya no se sostiene** (DEC-024, consecuencia 5), así que el
  15,5 s se usa como valor de referencia de "cuánto más lento tendría que ser",
  no como estimación del servicio real. Ver PEN-010.
- **Descarta:** usar 15,5 s como valor por defecto; aplicarlo a los conteos
  normales; presentarlo sin el caso base al lado; y dimensionar la política
  recomendada sobre él.

## DEC-026 — Casos límite de la regla de apertura y cierre

- **Fecha:** 27/10/2026
- **Contexto:** la sección 4 fija los umbrales, la demora, la ventana de 15 min y
  los puntos de evaluación, pero deja casos sin cubrir. Cada uno se decidió así y
  tiene una prueba que lo fija.

1. **La `c` de los umbrales es la de las casetas que van a atender**, es decir
   abiertas y **no** marcadas para cerrar. Una caseta marcada sigue físicamente
   abierta y terminando su servicio, pero ya no tomará vehículos nuevos, así que
   contarla daría umbrales de una capacidad que no existe. Para los
   carriles-intervalo, en cambio, cuenta como abierta, porque el carril está
   ocupado y el personal está ahí.
2. **Antes de ordenar una apertura, si hay una caseta marcada para cerrar se
   cancela ese cierre.** Es capacidad instantánea y gratis; ordenar una apertura
   nueva costaría la demora de 5 min teniendo una caseta abierta a mano. Se
   cuenta aparte como `cierresCancelados`.
3. **La ventana de 15 min se reinicia cada vez que cambia `c`**, no solo tras un
   cierre. Al cambiar `c` cambia el umbral de cierre, así que el tiempo
   acumulado bajo el umbral anterior no dice nada del nuevo. La sección 4 solo
   exige reiniciar cuando la cola sube; esto lo extiende al cambio de `c`.
4. **Para cerrar se prefiere una caseta libre** sobre marcar una ocupada. Si hay
   una sin atender a nadie, cerrarla no hace esperar a nadie. Solo si todas las
   abiertas están ocupadas se marca una, y esa se cierra al terminar su servicio.
5. **Abrir tiene prioridad sobre cerrar** cuando se evalúa la regla. Con los
   umbrales del contexto las dos condiciones no se pueden cumplir a la vez
   (abrir pide cola > 14 con `c` = 3, cerrar pide cola < 4), pero el orden queda
   fijado para que umbrales editados por el usuario no dejen el resultado al
   azar.
6. **La regla se evalúa solo tras cada llegada y cada fin de servicio**, como
   dice la sección 4. Consecuencia: el cumplimiento de los 15 min se detecta en
   el primer evento posterior, no en el instante exacto. Con la demanda de los
   conteos los eventos van a segundos de distancia, así que el retraso es
   despreciable; se deja así por seguir la fuente de verdad en vez de añadir un
   temporizador que el contexto no contempla.
7. **`APERTURA_CASETA` se atiende entre el cambio de intervalo y la llegada**
   (extiende el orden de DEC-017). Si una apertura y una llegada caen en el
   mismo instante, la caseta ya ordenada abre primero y el vehículo puede usarla.
8. **Los contadores de aperturas y cierres no cuentan el arranque.** Las casetas
   que se abren en `t = 0` son el punto de partida. El conteo funciona igual en
   los dos modos, así que `cambiosDeC` compara al operador con la regla.
9. **En modo regla las casetas iniciales son las del primer intervalo
   observado** de cada conteo, para que la regla arranque donde arrancó el
   operador y la comparación sea justa.
10. **La orden de apertura no se revoca.** Si la cola baja durante la demora, la
    caseta abre igual: la orden ya se dio y el personal ya se movió. Es lo que
    dice "se programa para `t + demora`" leído literalmente.

- **Descarta:** usar la `c` física para los umbrales; ordenar una apertura
  teniendo una caseta marcada; conservar la ventana de 15 min al cambiar `c`;
  marcar una caseta ocupada habiendo una libre; revocar una apertura ordenada; y
  contar las casetas del arranque como aperturas.
