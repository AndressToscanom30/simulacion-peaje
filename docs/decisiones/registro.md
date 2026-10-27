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
