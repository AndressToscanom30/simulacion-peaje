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

## DEC-027 — Casos límite del reparto de casetas entre sentidos

- **Fecha:** 28/10/2026
- **Contexto:** la sección 4 fija la reasignación por ρ > 0,60 y el desempate,
  pero no dice cómo se reserva una caseta, qué pasa si el pozo está agotado, ni
  con qué números decide el operador. Cada caso se decidió así y tiene prueba.

1. **Un flujo de PRNG por sentido.** Cada sentido saca sus números de un flujo
   propio derivado de la semilla de la réplica (`derivarSemilla`). El **primero**
   de la lista usa la semilla tal cual, que es la de las fases 1 y 2. Así lo que
   pase en un sentido no corre los números del otro, y un escenario de dos
   sentidos en el que el segundo no tiene demanda reproduce **exactamente** el
   de un sentido solo. Con un flujo compartido eso sería imposible y las
   comparaciones entre escenarios perderían los números aleatorios comunes.
2. **Ordenar una apertura exige reservar la caseta en ese momento.** La caseta
   queda apartada desde que se da la orden y abre en `t + demora`. No se puede
   ordenar una apertura "a ver si hay carril cuando toque": el personal se mueve
   a una caseta concreta.
3. **Si el pozo está agotado, la petición queda bloqueada**, no se pierde: se
   reintenta cuando el pozo libere una caseta. Se cuenta cuántas veces pasa y
   cuántos segundos estuvo cada sentido esperando carril.
4. **Una petición bloqueada se revalida al reintentarla.** Si la cola ya bajó
   del umbral, se descarta. Esto **no** contradice DEC-026 punto 10 (una
   apertura ordenada no se revoca): ahí la orden se dio y el personal se movió;
   aquí nunca llegó a darse, porque no había carril.
5. **Una petición bloqueada cuenta como apertura pendiente**, así que no se
   acumulan dos peticiones por sentido (sección 4: una sola apertura pendiente).
6. **Orden al liberarse una caseta:** primero las **peticiones bloqueadas**, con
   el desempate de la DEC-008 si las dos están bloqueadas; después la
   **reasignación por ρ** al otro sentido; y si nadie la quiere, vuelve al pozo.
   La petición bloqueada va antes porque es demanda explícita (la cola pasó el
   umbral), mientras ρ > 0,60 es un indicador más indirecto.
7. **ρ y la espera estimada se calculan con los valores nominales**, 12,1016 s
   por vehículo y 24,8 veh por caseta y 5 min, **también en el escenario de
   servicio lento** (DEC-025). El operador decide con lo que conoce, y no conoce
   el servicio real del pico; si la regla usara los 15,5 s estaría usando
   información que en la realidad no tendría.
8. **La cola inicial no entra en la ventana móvil de ρ.** Los 23 vehículos del
   festivo son rezago, no llegadas medidas en los últimos 5 min. Contarlos
   inflaría ρ al arrancar y haría que se leyera como demanda lo que es atraso.
9. **Desempate:** entre los candidatos que superan los 2,5 min de espera
   estimada gana el de mayor espera ("empezando por el peor"); si ninguno los
   supera, el de mayor cola total; a igualdad, el de menor identificador, para
   que el resultado no dependa del orden del arreglo.
10. **Una caseta marcada para cerrar sigue siendo del sentido** hasta que
    termine su servicio en curso; solo entonces vuelve al pozo, y es en ese
    momento cuando puede reasignarse. Mientras atiende, el carril está ocupado y
    no se le puede prometer a nadie.
11. **`ofrecerPozoPorRho` por defecto `false`.** La DEC-008 solo contempla
    reasignar **al liberarse** una caseta, así que una caseta que ya estaba
    libre en el pozo no se le ofrece a nadie por iniciativa propia. El `true`
    existe solo como sensibilidad y va rotulado como tal.
12. **Totales del peaje:** `Wq` se pondera por vehículos atendidos, que es la
    espera media de un vehículo cualquiera del peaje; el % de intervalos sobre
    el máximo tolerable se calcula sobre los intervalos de los dos sentidos
    juntos; los carriles-intervalo y los cambios de `c` se suman. Las colas
    máximas se **suman** y van rotuladas como suma: los dos máximos no tienen
    por qué darse en el mismo instante, así que el total es una cota superior de
    la cola simultánea del peaje, no una medición de ella.

- **Descarta:** un solo flujo de PRNG para los dos sentidos; ordenar aperturas
  sin reservar carril; perder una petición cuando el pozo está agotado;
  consumarla sin revalidarla; reasignar antes de atender una petición bloqueada;
  usar el servicio real en ρ y en la espera estimada; contar la cola inicial
  como demanda reciente; y presentar la suma de colas máximas como cola
  simultánea.

## DEC-028 — PEN-014 y PEN-015 quedan como hallazgo: no se rediseña la reasignación

- **Fecha:** 28/10/2026
- **Decisión de la usuaria.** Los dos hallazgos de la fase 3 sobre la
  reasignación por ρ se **documentan y se dejan como están**:
  - **PEN-014** (ρ divide por `c`, así que favorece al sentido con menos
    casetas) y **PEN-015** (en el pico casi no se activa, porque nadie libera
    casetas) **no reabren la DEC-008**. La condición de reasignación sigue
    siendo ρ > 0,60 tal cual, sin mirar cola ni espera estimada del que recibe.
  - El **disparador anticipativo por tasa de llegadas** de PEN-011 (abrir la
    2.ª en 21 llegadas/5 min, la 3.ª en 46, la 4.ª en 70, la 5.ª en 95) queda
    para la **fase 7**, como material de interpretación. **No se implementa.**
- **Motivo:** son hallazgos del estudio, no defectos a corregir. Rediseñar la
  regla a mitad del trabajo cambiaría el objeto de estudio y dejaría sin sentido
  las comparaciones ya publicadas de las fases 2 y 3. Lo que aportan es
  precisamente mostrar los límites de la política del contexto.
- **Qué implica para los informes:** la reasignación se sigue corriendo con y
  sin activar, para que su efecto (o su inercia) quede a la vista en cada
  escenario. Que salga casi inerte es un resultado, no un fallo.
- **Descarta:** añadir cola o espera estimada a la condición de reasignación;
  permitir quitar una caseta a un sentido para dársela al otro; y añadir el
  disparador por tasa de llegadas antes de la fase 7.

## DEC-029 — La demanda de C→P en el festivo pasa a ser `viernes` × factor configurable

- **Fecha:** 28/10/2026
- **Decisión de la usuaria.** La demanda de Cúcuta→Pamplona en el festivo, que
  **no se midió**, se sustituye por defecto por el conteo del **viernes
  02/10/2026 (`viernes`, 238 veh/h)** multiplicado por un **factor
  configurable**, por defecto **1,0**. Cola inicial 0 y 1 caseta inicial, como
  antes.
- **Supera:** **solo el valor por defecto** del sustituto que fijaba la sección 7
  del contexto (que era `domingoPC`, 195 veh/h). Todo lo demás de la sección 7
  sigue en pie.
- **Motivo:** `viernes` se midió **en el sentido Cúcuta→Pamplona**, que es justo
  el que sustituye; `domingoPC` se había medido en Pamplona→Cúcuta, el sentido
  contrario (PEN-013). Cambiar al conteo del sentido correcto quita un supuesto
  de los dos que había. Sigue siendo un supuesto de similitud entre un viernes
  normal y el contraflujo de un festivo, y por eso el factor es configurable: no
  hay razón para creer que las dos demandas sean idénticas.
- **Alternativas que quedan como sensibilidad:** `domingoPC` (195 veh/h, el
  sustituto anterior) y `domingoCP` (451 veh/h, un domingo en el sentido
  correcto). Las dos se corren en la fase 4 y van rotuladas como sensibilidad.
- **Trazabilidad:** se añadió una nota en la sección 7 de
  `docs/contexto/contexto-inicial.md` que remite a esta decisión, sin cambiar
  ningún valor del documento. PEN-013 queda actualizado.
- **Descarta:** `domingoPC` como valor por defecto; y dar por hecho que la
  demanda del contraflujo del festivo es exactamente la de un viernes.

## DEC-030 — Configurabilidad total: todo valor del modelo es un parámetro

- **Fecha:** 28/10/2026
- **Decisión de la usuaria.** **Todo** valor del modelo debe poder configurarse,
  incluidos los que hasta ahora eran estructurales:
  - tamaño del pozo (más de 6 casetas),
  - tope por sentido (más de 5),
  - factores de demanda por sentido,
  - media y forma del servicio,
  - umbrales de abrir y cerrar, demora y ventana de cierre,
  - ρ de reasignación, meta y máximo tolerable,
  - réplicas y semillas.
- **Para qué:** permite **escenarios de estrés por configuración** (¿y si el
  peaje tuviera 8 casetas? ¿y si el tope por sentido fuera 7?) y es la base del
  formulario de configuración de la fase 5, que no puede pedirle al usuario un
  valor que el motor tenga escrito dentro.
- **Los valores por defecto siguen siendo los del contexto.** Configurable no
  significa cambiado: sin tocar nada, el modelo es el de siempre, y las pruebas
  de regresión de las fases 1, 2 y 3 lo garantizan.
- **Cómo se cumple:** un escenario es un objeto declarativo serializable a JSON
  (`src/config/escenario.js`), con escenario base más sobreescrituras, validación
  con mensajes en español, y un catálogo de parámetros en `docs/parametros.md`.
  Ningún número del modelo queda escrito dentro de `src/motor/` ni de
  `scripts/`.
- **Descarta:** constantes del modelo escritas dentro de la lógica; un pozo de 6
  o un tope de 5 fijados en el código; y escenarios que solo se puedan definir
  escribiendo JavaScript.

## DEC-031 — Extensión de las tablas de umbrales para topes mayores de 5 casetas

- **Fecha:** 28/10/2026
- **Problema:** la DEC-030 permite configurar el tope por sentido por encima de
  5, pero las tablas de umbrales del contexto (sección 4) solo llegan a 5
  casetas. Con un tope de 7 no hay umbral definido para `c` = 5 ni 6.
- **Decisión:** las tablas se generan con dos fórmulas, **rotuladas y
  editables**, que **reproducen exactamente los ocho valores del contexto** para
  `c` de 1 a 5 y los extienden hacia arriba:
  - **Abrir otra si la cola supera:** `abrir(c) = 5c − 1`
    → 4, 9, 14, 19 para `c` = 1…4, y 24, 29, 34… en adelante. En el tope, `null`.
  - **Cerrar una si la cola baja de:** `cerrar(c) = ⌊abrir(c − 1) / 2⌋`
    → 2, 4, 7, 9 para `c` = 2…5, y 12, 14… en adelante. En el mínimo, `null`.
- **Por qué estas dos y no otras:** no se eligieron para que cuadraran, se
  **derivaron de los valores del contexto y los reproducen sin excepción**:
  - abrir: 5·1−1 = 4, 5·2−1 = 9, 5·3−1 = 14, 5·4−1 = 19. Los cuatro exactos.
  - cerrar: ⌊4/2⌋ = 2, ⌊9/2⌋ = 4, ⌊14/2⌋ = 7, ⌊19/2⌋ = 9. Los cuatro exactos.
  La primera dice que cada caseta extra se justifica con unos 5 vehículos más de
  cola, que es coherente con la derivación M/M/c de la sección 4. La segunda es
  la histéresis: se cierra cuando la cola baja a la mitad del umbral con el que
  se habría abierto esa misma caseta, así que abrir y cerrar no se solapan.
- **Lo que esto NO cambia:** **ningún valor de `c` = 1 a 5.** Con el tope por
  defecto de 5, las tablas generadas son idénticas a las de la DEC-006, y las
  pruebas de regresión de las fases 2 y 3 lo comprueban.
- **Editable:** las tablas se pueden dar a mano en el escenario y entonces las
  fórmulas no se usan. Un escenario con tope mayor de 5 y tablas escritas a mano
  es válido; lo que no es válido es un tope sin umbral para algún `c`.
- **Rotulado:** cualquier informe que corra con tope mayor de 5 debe decir que
  los umbrales por encima de 5 son **extrapolados**, no del contexto.
- **Descarta:** repetir el umbral de 5 casetas para todos los topes mayores;
  dejar `null` (que impediría abrir más allá de 5 con tope 7); e inventar
  valores sin relación con los del contexto.

## DEC-032 — El tope por sentido acota el objetivo de casetas, y las casetas iniciales se validan contra él

- **Fecha:** 28/10/2026
- **Problema encontrado al configurar pozos y topes distintos (DEC-030):** en
  modo programado, un sentido podía abrir **más casetas que su tope**. Con un
  tope de 2 y unas casetas iniciales de 4 (las del escenario base), el sentido
  tomaba 4 casetas del pozo, porque `ajustarCasetas` solo miraba lo que el
  conteo pedía y lo que quedaba en el pozo, no el tope del sentido. Con los
  valores por defecto no se veía, porque el tope era el máximo del propio
  conteo.
- **Decisión, en dos partes:**
  1. **El motor acota** el objetivo de casetas al mínimo y al tope del sentido.
     Ni el conteo ni las casetas iniciales pueden hacer que un sentido pase de
     su tope, porque el tope es un límite físico del peaje (DEC-002).
  2. **La validación rechaza** unas `casetasIniciales` fuera del rango
     mínimo–tope, y unas `casetasFijas` con valores fuera de ese rango, diciendo
     cuáles están mal.
- **Motivo:** el invariante `1 ≤ c ≤ tope` es del modelo, no de los datos. Un
  conteo o unas casetas iniciales que no cuadren con el tope son un error de
  configuración, y vale más decirlo que simularlo mal en silencio.
- **Lo que esto NO cambia:** con el tope por defecto (el máximo del propio
  conteo en las fases 1 y 2, y 5 en la fase 3) el acotado no hace nada. Los
  informes de las tres fases se regeneran idénticos.
- **De paso:** la validación comprobaba los umbrales con `valor >= 0`, y en
  JavaScript `null >= 0` es `true`, así que un `null` a media tabla se colaba
  como umbral puesto. Ahora se comprueba que sea un número.
- **Descarta:** dejar que el conteo o las casetas iniciales manden sobre el
  tope; y validar umbrales con una comparación que acepte `null`.

## DEC-033 — El modo tiempo real reproduce una traza grabada, no simula paso a paso

- **Fecha:** 29/10/2026
- **Decisión de la usuaria.** El modo tiempo real **no** acopla el motor a la
  interfaz. Funciona en dos tiempos:
  1. El motor corre **una réplica completa** en un Web Worker, con un
     **grabador** que anota cada evento en una traza.
  2. La interfaz **reproduce** esa traza con un **reloj de reproducción**:
     velocidades 1×, 10×, 60× y una configurable, pausa, reinicio y salto a un
     instante cualquiera.
- **Motivo:** la reproducción es determinista (la traza ya está completa),
  pausable y **rebobinable**, que es imposible con un motor por pasos: para
  volver atrás habría que rehacer la simulación. Y la fase 6 pinta el 3D desde
  la misma traza, sin tocar el motor ni duplicar la lógica.
- **Lo que esto cuesta:** hay que esperar a que la réplica termine antes de
  empezar a ver nada. Con una hora simulada eso son decenas de milisegundos, así
  que no se nota. Si en la fase 6 hiciera falta reproducir horizontes mucho más
  largos, habría que grabar por tramos; con el horizonte del estudio no aplica.
- **Descarta:** un motor que avance de evento en evento desde la interfaz;
  `setInterval` empujando al motor; y simular dentro del hilo de la interfaz.

## DEC-034 — Dependencias mínimas: gráficos en SVG propio y jsdom solo en la interfaz

- **Fecha:** 29/10/2026
- **Decisión de la usuaria.** No se añade ninguna librería de gráficos ni de
  componentes. Los tableros se dibujan con **SVG escrito a mano**, y las únicas
  dependencias siguen siendo React, Vite y Vitest (más `jsdom` para probar la
  interfaz).
- **Motivo:** los tres gráficos que pide la fase 5 (cola contra el tiempo,
  casetas abiertas en escalón y espera por intervalo con dos líneas de
  referencia) son polilíneas y rectángulos. Una librería de gráficos costaría
  más en peso y en API que las ~200 líneas de SVG que hacen falta, y el escalón
  de casetas abiertas habría que forzarlo igual.
- **Las pruebas quedan separadas por entorno:** las del motor y de lo puro
  siguen en entorno `node`, que es lo que garantiza la DEC-012 (si alguien le
  cuela una dependencia del DOM al motor, fallan). Las de la interfaz corren en
  `jsdom`, y solo ellas.
- **La interfaz está en español**, como el resto del proyecto.
- **Descarta:** Recharts, D3, Chart.js y cualquier librería de componentes;
  y poner todas las pruebas en `jsdom`, que taparía la independencia del motor.

## DEC-035 — La demanda y las casetas del operador se pueden escribir a mano en el escenario

- **Fecha:** 29/10/2026
- **Problema:** la fase 5 pide un formulario con la **demanda editable por
  intervalo** (12 valores por sentido), pero hasta ahora un escenario describía
  la demanda solo como `conteo` + `factorDemanda`, y las llegadas se leían del
  conteo de campo.
- **Decisión:** `sentidos[i].llegadas` se añade al escenario como arreglo
  opcional. `null` (el valor por defecto) significa "las del conteo"; un arreglo
  las sustituye. El `factorDemanda` se aplica igual en los dos casos, así que
  conteo + factor sigue siendo la forma corta. `casetasFijas` ya existía y hace
  lo mismo con las casetas del operador.
- **Motivo:** el formulario tiene que poder plantear demandas que no son ningún
  conteo (DEC-030), y el escenario es lo que se guarda y se exporta, así que la
  demanda escrita a mano tiene que viajar dentro de él o se perdería al exportar.
- **Trazabilidad:** un escenario con `llegadas` propias **deja de ser el conteo
  de campo**, y la interfaz lo marca como modificado. El conteo se conserva en
  `conteo` para saber de dónde se partió.
- **Lo que esto NO cambia:** con `llegadas: null` el comportamiento es el de
  siempre, y los informes de las fases 1 a 4 se regeneran idénticos.
- **Descarta:** editar los conteos de campo de `datos.js` (que son la fuente de
  verdad y no se tocan); y guardar la demanda editada fuera del escenario.

## DEC-036 — La escena 3D es una función pura de la traza y del instante

- **Fecha:** 30/10/2026
- **Decisión de la usuaria.** La visualización 3D **no habla con el motor**. Lo
  único que consume es la **traza** (DEC-033) y un instante: de ahí sale todo lo
  que se dibuja.
- **Cómo se cumple:**
  - `src/ui/vista3d/modeloEscena.js` traduce traza + `t` en un modelo de escena
    (vehículos con su fase, casetas con su estado, contadores). **No importa
    three, ni React, ni el motor.** Se prueba en entorno `node`.
  - Avanza con el **cursor de `crearReproductor`** de la fase 5, así que no
    recorre todos los eventos en cada fotograma.
  - Usa el **reloj de reproducción de la fase 5**; no se crea otro. La vista 3D
    y los tableros 2D comparten el mismo instante, así que no pueden
    desincronizarse.
- **Motivo:** mantiene la independencia del motor que fija la DEC-012 y hace la
  escena determinista y probable sin WebGL: con la misma traza y el mismo `t`,
  el modelo de escena es siempre el mismo.
- **Descarta:** un segundo reloj para la escena; que la escena consulte el motor
  o el escenario; y animaciones que dependan del tiempo real del navegador para
  decidir **qué** se ve (solo deciden cómo se interpola).

## DEC-037 — three + @react-three/fiber de la serie 8, carga diferida y geometría procedural

- **Fecha:** 30/10/2026
- **Decisión de la usuaria, con las versiones verificadas:**
  - `three@0.170.0` y `@react-three/fiber@8.18.0`, **versiones exactas** como el
    resto del `package.json`. Se comprobó que la serie 9 de fiber exige
    `react >=19` en sus `peerDependencies`, así que con React 18.3.1 la serie
    correcta es la **8**.
  - **`@react-three/drei` no se instala.** Lo único que hacía falta de ahí era
    `OrbitControls`, y three lo trae en
    `three/examples/jsm/controls/OrbitControls.js`, que se registra con el
    `extend` de fiber. Para los letreros, `drei` habría traído `troika-three-text`
    y una fuente, que son peso y un activo externo.
  - **Carga diferida** con `React.lazy`: three no entra en el paquete principal.
    Quien no abra la vista 3D no lo descarga.
  - **Sin modelos ni texturas externas.** Toda la geometría es procedural
    (cajas, cilindros, planos) y el texto de los letreros se dibuja en un
    `<canvas>` 2D y se usa como `CanvasTexture`: procedural también, sin ningún
    archivo que cargar.
- **Descarta:** fiber 9 (incompatible con React 18), drei, modelos glTF, texturas
  o fuentes externas, y meter three en el paquete principal.

## DEC-038 — La escena representa el modelo, no una foto del peaje

- **Fecha:** 30/10/2026
- **Decisión de la usuaria.** La escena dibuja **lo que el modelo simula**, no lo
  que se ve en el peaje real. Donde las dos cosas difieren, manda el modelo y la
  escena lo rotula.
  1. **Cola única por sentido.** Un solo embudo por sentido, **no una fila por
     caseta**, porque el modelo es de cola única (DEC-001) y la cola de campo que
     se midió era la fila más larga de una caseta (DEC-024). Dibujar filas por
     caseta sugeriría que el modelo las tiene.
  2. **Casetas reversibles.** Cada caseta lleva un indicador de a qué sentido
     sirve, porque en el modelo las casetas son un recurso compartido que cambia
     de dueño (DEC-002, DEC-008). No hay casetas "de un sentido".
  3. **Los desplazamientos son cosméticos.** El modelo no tiene distancias ni
     velocidades: un vehículo pasa de la cola a la caseta en el instante del
     evento. La entrada desde el borde y el tránsito cola→caseta son
     interpolación visual y **no afectan a ninguna medida**. La escena lo dice
     con una nota fija.
  4. **Todos los vehículos son de la misma clase.** La categoría no entra al
     modelo (DEC-003), así que la variación de color y tamaño es solo para poder
     seguir un vehículo con la vista, derivada del `vehiculoId`.
- **Consecuencia para las fases que midan:** nada de lo que se ve en 3D es un
  resultado. Los resultados están en `docs/resultados/`.
- **Descarta:** filas por caseta; casetas fijas por sentido; dar a los
  desplazamientos un significado que el modelo no tiene; y distinguir categorías
  de vehículo.

## DEC-039 — Las constantes visuales viven en `src/config/escena3d.js`, y el color nunca es la única señal

- **Fecha:** 30/10/2026
- **Decisión de la usuaria.** Las dimensiones, separaciones, duraciones visuales
  y colores de la escena están en `src/config/escena3d.js`, no repartidos por
  los componentes. Es el mismo principio de la DEC-030 aplicado a lo visual.
- **El color no codifica estado por sí solo.** Cada estado de caseta se
  distingue además por **forma** (altura y figura del indicador del letrero) y
  por **texto** en el letrero. Así la escena se lee sin depender de distinguir
  colores, y las capturas en escala de grises siguen siendo interpretables.
- **`prefers-reduced-motion`** reduce lo decorativo (interpolación de entrada y
  de tránsito, marcadores que laten), **nunca la simulación**: los mismos
  eventos en los mismos instantes.
- **Descarta:** constantes visuales dentro de los componentes; y estados que
  solo se distingan por color.

## DEC-040 — Los vehículos usan `public/models/carro.glb`, simplificado al cargarlo

- **Fecha:** 29/10/2026
- **Decisión de la usuaria.** Los vehículos se dibujan con el **modelo 3D de
  carro** que ella puso en `public/models/carro.glb`, no con cajas.
- **Supera la DEC-037 en un punto y solo en uno.** Deja de valer «sin modelos ni
  texturas externas»: hay un modelo glTF y se carga. Todo lo demás de la DEC-037
  sigue en pie —fiber de la serie 8, sin `drei`, carga diferida, letreros
  dibujados en un `<canvas>` sin fuentes externas— y el resto de la escena
  (calzada, casetas, letreros, indicadores) sigue siendo **procedural**.
- **El archivo no se usa tal cual.** Trae 47 primitivas, 26 materiales,
  26 texturas PNG y **82 602 triángulos**: dibujarlo así para ciento y pico de
  vehículos no se sostiene. Al cargarlo (`src/ui/vista3d/modeloCarro.js`):
  1. se hornea la matriz de mundo de cada malla en sus vértices, que se puede
     porque la piel del archivo es un resto del exportador (ningún nodo la
     referencia y ninguna primitiva trae `JOINTS_0`);
  2. los 26 materiales se agrupan por nombre en seis **papeles** —carrocería,
     cromados, cristales, neumáticos, faros y plásticos—, y se tiran los que no
     se ven desde fuera (interior, motor y chasis: el 22 % de la malla);
  3. el modelo se escala del tamaño con que viene (4,8 cm) al largo de vehículo
     de la escena, con la base a ras de suelo y el morro hacia delante; el eje
     largo se **detecta**, no se da por sabido;
  4. cada papel se fusiona en una geometría y se **simplifica por rejilla**
     (agrupamiento por celdas: una celda, un vértice). Resultado: **10 727
     triángulos** y **6 objetos de dibujo** para toda la escena, con
     `InstancedMesh`.
- **Las texturas del archivo no se usan.** A la escala de la escena un coche
  ocupa unos pocos píxeles; cada papel lleva un material plano de
  `ESCENA_3D.carro.roles`. Solo la **carrocería** recibe el color del vehículo,
  para poder seguir uno con la vista (DEC-038, punto 4): los cristales y los
  neumáticos conservan el suyo.
- **Las cajas siguen siendo la red de seguridad.** Mientras el modelo se
  descarga, si el archivo falta o si falla la carga, y en la calidad baja, los
  vehículos se dibujan como antes. El panel dice en texto qué se está
  dibujando. La escena **nunca** se queda vacía por un archivo.
- **No cambia ninguna medida.** El modelo entra donde estaba la caja, con el
  mismo largo y la misma posición: el trazado de la plaza y de las colas no se
  ha tocado, y el motor no sabe que existe.
- **Descarta:** dibujar el archivo sin simplificarlo; usar sus 26 materiales y
  sus texturas; recortar el archivo original (es de la usuaria y se usa tal como
  está); y quitar el camino de cajas.

## DEC-041 — La cámara es libre: se orbita el modelo desde cualquier ángulo

- **Fecha:** 29/10/2026
- **Decisión de la usuaria.** La vista tiene que ser **libre**: el modelo se ve
  desde cualquier ángulo, entero.
- **Lo que estaba mal.** La cámara se interpolaba hacia el preajuste en **todos
  los fotogramas**, así que cualquier órbita se deshacía sola en medio segundo:
  `OrbitControls` estaba puesto, pero no servía de nada.
- **Los preajustes pasan a ser viajes, no modos.** Un clic lleva la cámara a ese
  encuadre; en cuanto se arrastra, el viaje se corta y manda el ratón. Un clic
  en el mismo botón vuelve a pedir el viaje, así que los botones **también
  sirven para recentrar**. El panel rotula «Vista libre» cuando la cámara ya no
  está en un preajuste.
- **Se puede mirar desde donde sea**, incluido **por debajo de la calzada**: el
  ángulo polar va de casi cenital a casi nadiral. Eso obliga a cambiar la
  calzada, que se dibuja ahora dos veces: la cara de arriba opaca, como estaba,
  y un **reverso translúcido** que no escribe profundidad. Desde abajo se ven
  las casetas y los vehículos **a través** de la calzada, que sigue leyéndose
  como suelo. Con una losa opaca —o con el plano a dos caras— lo único visible
  desde abajo sería el asfalto, y lo pedido es ver el modelo desde cualquier
  ángulo, no quedarse mirando el reverso. Las marcas de carril sí van a dos
  caras: dibujan la planta sobre el velo. Y se añade una **luz de hemisferio**,
  que es la que ilumina las caras que miran hacia abajo.
- **Lo único acotado es el punto al que mira**, que se queda dentro de un cubo
  centrado en la plaza, y el acercamiento y el alejamiento. Así se cumple la
  otra mitad de lo pedido —«viendo todo el modelo»—: no hay forma de
  desplazarse hasta perder el peaje de vista. Los topes **no son números
  fijos**: `limitesDeNavegacion` los saca del tamaño del contenido, igual que
  los encuadres (DEC-039), así que con un pozo de 10 se abren solos.
- **La niebla se aparta.** Empieza más allá de cualquier encuadre de preajuste,
  y al tope de alejamiento vela el centro de la escena menos de un 10 %: mirar
  el peaje entero no lo deja en bruma. Sigue sirviendo para que los extremos de
  la calzada se pierdan en vez de cortarse en seco.
- **`prefers-reduced-motion` sigue mandando** (DEC-039): con él, el viaje al
  preajuste es instantáneo en vez de suave. La navegación a mano no se recorta.
- **Descarta:** una cámara que vuelva sola al preajuste; limitar la órbita al
  hemisferio de arriba; y topes de distancia fijos.
