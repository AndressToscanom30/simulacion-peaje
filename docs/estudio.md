# Estudio de simulación del peaje Los Acacios

Documento del estudio, fase 7. Recorre las **ocho etapas** que el contexto fija
en su sección 1: definición, formulación, datos, implementación, validación,
experimentación, interpretación y documentación.

**Qué es esto y qué no.** Es el documento que se lee para entender el estudio
completo sin recorrer el repositorio. No es un informe de resultados: los
informes son los de `docs/resultados/`, se generan con sus scripts y **mandan
sobre este archivo** si alguna cifra discrepa (DEC-023). Todas las cifras que
aparecen aquí son de la corrida del **30/10/2026** y dicen de qué informe salen.

La **política recomendada** vive aparte, en
[`politica-recomendada.md`](politica-recomendada.md), porque es la salida
operativa y se consulta sola.

---

## Etapa 1 — Definición del problema

El peaje Los Acacios, en la vía Cúcuta–Pamplona, cobra en efectivo por **6
casetas** compartidas entre los dos sentidos, más un carril TAG que queda fuera
del estudio. El número de casetas abiertas en cada sentido lo decide el operador
a lo largo del día.

**El problema no es el día normal.** Un viernes al mediodía el peaje va sobrado:
238 veh/h contra una capacidad nominal de 297,48 veh/h **por caseta**. El
problema son los picos —el retorno de un festivo, la temporada alta—, donde el
sentido de retorno concentra la demanda y el contraflujo se queda con las
casetas que sobran.

**Pregunta del estudio:** ¿cuál es la política de apertura y cierre de casetas de
efectivo que, según la demanda, mantiene la espera dentro del criterio en un
pico, y con cuántas casetas?

**Criterio de desempeño** (contexto, sección 5; DEC-009):

| | Valor |
|---|---|
| Meta | `Wq ≤ 1 min` |
| Máximo tolerable | 2,5 min |
| Intervalos que pueden superar el máximo | ≤ 5 % |

**Fuera del alcance, por decisión:** motocicletas, carril TAG y retén policial
(los conteos se tomaron después de él); la categoría del vehículo; el cobro
electrónico; y cualquier obra de infraestructura que no sea abrir o cerrar las
casetas que ya existen.

---

## Etapa 2 — Formulación del modelo

### El modelo

Cola **M/M/c por sentido** con cola única FIFO, atendida por `c(t)` casetas
idénticas (DEC-001). Los dos sentidos corren a la vez sobre un **pozo común de
6 casetas**, de 1 a 5 por sentido (DEC-002).

| Elemento | Formulación |
|---|---|
| Llegadas | Poisson **por tramos** de 5 min; la tasa de cada tramo es el conteo real de ese tramo × factor de escala |
| Servicio | **Gamma**, `k = 4,68`, `θ = 2,58 s` (media 12,1016 s, CV = 0,46). No exponencial |
| Disciplina | FIFO, una cola por sentido |
| Servidores | `c(t)`, variable en el tiempo, de un pozo compartido |
| Horizonte | 1 hora, 12 intervalos de 5 min |

El servicio **no es exponencial** y eso es deliberado: las 50 mediciones dan
CV = 0,46, muy por debajo del 1 que exigiría la exponencial. Usar M/M/c en el
nombre y gamma en el motor es la decisión; el M/M/c analítico por Erlang C se
mantiene solo como **referencia** contra la que comparar.

### La cola única, que es el supuesto estructural

El modelo tiene **una cola por sentido**, no una fila por caseta. Es lo que los
datos soportan: en campo se registró el total de vehículos esperando por
sentido, no el reparto entre casetas (DEC-001). El precio de ese supuesto
aparece en la etapa 5 y es el hallazgo central del estudio.

### La regla de control

Se dispara por **cola observada** del sentido —el total esperando, sin contar a
los que están siendo atendidos— y se evalúa tras cada llegada y cada fin de
servicio (contexto, sección 4; DEC-006):

| Casetas abiertas | Abrir otra si cola > | Cerrar una si cola < |
|---|---|---|
| 1 | 4 | — |
| 2 | 9 | 2 |
| 3 | 14 | 4 |
| 4 | 19 | 7 |
| 5 | no hay más | 9 |

- **Apertura:** se programa para `t + demora` (base 5 min; sensibilidad 0 y 10).
  Una sola apertura pendiente por sentido.
- **Cierre:** la cola debe mantenerse bajo el umbral **15 min seguidos**; si
  sube, se reinicia el conteo. La caseta se marca y cierra al terminar su
  servicio, sin interrumpirlo.
- **Caseta liberada:** se reasigna al otro sentido si tiene ρ > 0,60 y `c` < 5.
- **Dos modos de `c(t)`:** *programado*, que copia lo que hizo el operador (para
  validar), y *por regla*.

Los doce casos límite que la sección 4 no cubre se decidieron uno por uno y cada
uno tiene una prueba que lo fija (DEC-026 y DEC-027): qué `c` usan los umbrales
cuando hay una caseta marcada, qué pasa si se pide abrir habiendo una marcada
para cerrar, cuándo se reinicia la ventana, cómo se desempata si los dos
sentidos piden caseta y no hay libres.

---

## Etapa 3 — Datos

### Lo que se midió

Cuatro conteos de una hora, en intervalos de 5 min, con llegadas, casetas
abiertas y cola (contexto, sección 10):

| Conteo | Fecha, sentido, hora | Llegadas | Casetas | Cola máx. |
|---|---|---|---|---|
| `viernes` | 02/10, C→P, 12:00–13:00 | 238 veh/h | 2 fijas | 1 |
| `domingoCP` | 13/09, C→P, 11:50–12:50 | 451 veh/h | 2–3 | 7 |
| `domingoPC` | 13/09, P→C, 11:50–12:50 | 195 veh/h | 1–2 | 8 |
| `festivoPC` | 12/10, P→C, 16:25–17:25 | **1.064 veh/h** | 4–5 | **32** |

Más **50 tiempos de atención** (media 12,1016 s, desviación 5,59 s, mínimo 4,13,
máximo 29,18) y el tráfico mensual de la ANI, que se usa solo como factor de
escala (de ahí sale el ×1,13 de temporada alta).

La columna `cola` es el **total de vehículos esperando en el sentido**, sumando
todas las casetas abiertas, en los cuatro conteos (DEC-042). Es una lectura
puntual por intervalo: 12 observaciones por conteo, tomadas en un instante
dentro de cada intervalo de 5 min.

### Lo que no se midió, y pesa

| Hueco | Cómo se cubre | Pendiente |
|---|---|---|
| **Demanda de C→P en el festivo** | Sustituto: conteo del viernes (238 veh/h) × factor configurable | **PEN-013** |
| Tiempos de atención en el pico y en P→C | Se usan los 50 de C→P, otro día | PEN-010 |
| Demora real de apertura | Sensibilidad 0 / 5 / 10 min | PEN-006 |
| Los dos sentidos a la vez | Nunca se midieron juntos: la competencia por casetas es supuesto | — |
| Reparto de la cola entre casetas | No se registró | PEN-008 |

El primero es el que decide el resultado y vuelve a aparecer en todas las etapas
que siguen.

### Una corrección de los datos que hay que contar

A mitad del estudio se interpretó la columna `cola` como «la fila más larga de
una sola caseta» en vez del total del sentido (DEC-024, del 27/10). Era
**incorrecto**, y el 30/10 se corrigió con la DEC-042. Se cuenta aquí porque el
error estuvo vigente tres días y dejó huella en los informes.

Lo que lo destapó fueron tres cosas a la vez:

1. **La confirmación del autor de las mediciones:** se registró el total en
   espera por sentido. El conteo del festivo estaba incompleto al principio y se
   corrigió después, y de ahí venía la confusión.
2. **El propio contexto ya lo decía** en dos sitios (secciones 8 y 10), y la
   DEC-024 lo contradecía.
3. **La prueba numérica**, que es la que cierra el asunto. El contexto declara
   un `Wq` observado por conteo, y nadie había documentado de dónde salía
   (PEN-002, abierto desde la fase 1). Sale de la **ley de Little** aplicada a la
   columna `cola`, y sale en los cuatro conteos a la vez:

   | Conteo | `Lq` medio de la columna | λ (veh/h) | `Wq = Lq / λ` | Declarado |
   |---|---|---|---|---|
   | `viernes` | 0,2500 | 238 | 0,0630 min | 0,06 |
   | `domingoCP` | 1,8333 | 451 | 0,2439 min | 0,24 |
   | `domingoPC` | 1,3333 | 195 | 0,4103 min | 0,41 |
   | `festivoPC` | 22,6667 | 1.064 | **1,2782 min** | **1,28** |

   Cuatro de cuatro al redondeo, y **solo cuadra si la columna es el total**. El
   repositorio había intentado reconstruir el 1,28 con la fórmula de la sección 3
   (`Lq × 12,1 / c`), había obtenido 1,01 y había concluido que no cuadraba: no
   era esa la fórmula. Esa fórmula reparte la cola entre las `c` casetas; Little
   no necesita `c` ninguna.

**Qué cambió al corregir y qué no.** El motor **siempre** simuló la cola total,
así que **ningún número de ningún informe cambió**: lo verificaron las 373
pruebas de entonces y la regeneración de los cinco informes, donde la única diferencia fue
la fecha y la prosa. Lo que cambió es lo que se puede concluir de esos números, y
eso se ve en la etapa 5.

Hay una lección metodológica y conviene no suavizarla: **durante tres días el
repositorio sostuvo, en la interfaz y en cuatro informes, lo contrario de lo que
su propia fuente de verdad decía en dos líneas.** Sobrevivió porque era
*plausible* y porque explicaba cómodamente una discrepancia molesta —el modelo
se quedaba corto, y «los datos no son comparables» cerraba la pregunta—. Lo que
lo rompió no fue releer la prosa sino **un cálculo que tenía que cuadrar y no
cuadraba** (el 1,28 de PEN-002). Un pendiente abierto y no resuelto hizo de
alarma durante tres días; de no haberse anotado, el error habría entrado en este
documento.

---

## Etapa 4 — Implementación

### Arquitectura

La restricción de partida es que el motor **no dependa de React ni del 3D**
(contexto, sección 9), para poder correr 30 réplicas sin interfaz.

| Capa | Qué es | Dónde |
|---|---|---|
| **Motor** | Eventos discretos en JS puro: sin React, sin DOM, sin three. Corre con Node | `src/motor/` |
| **Configuración** | Todo número del modelo, fuera de la lógica | `src/config/` |
| **Runner** | Traduce escenarios, corre réplicas, resuelve cumplimiento | `src/corridas.js` |
| **Interfaz** | React: formulario generado, tiempo real, lotes | `src/ui/` |
| **Vista 3D** | three + fiber, carga diferida, modelo de escena **puro** | `src/ui/vista3d/` |
| **Scripts** | Generan los informes de `docs/resultados/` | `scripts/` |

Dos reglas de disciplina que atraviesan todo el código:

- **Ningún número dentro de la lógica.** Los datos de campo están en
  `src/config/datos.js` y los parámetros editables en
  `src/config/parametros.js`. Son **31 parámetros**, catalogados con unidad,
  valor por defecto, origen y rango en [`parametros.md`](parametros.md), que se
  **genera** leyendo el escenario base y por eso no puede quedar desfasado.
- **Nada de `Math.random` en el motor.** PRNG propio con semilla (mulberry32) y
  gamma por Marsaglia–Tsang, con un flujo de números por sentido. Las corridas
  son reproducibles y las comparaciones entre escenarios usan **números
  aleatorios comunes** (las mismas semillas 1…30 en todos), así que las
  diferencias entre casos no son ruido de muestreo.

### El motor

Eventos discretos con un solo reloj para los dos sentidos: llegada, fin de
servicio, cambio de intervalo y muestreo de cola. El pozo de casetas es un
recurso compartido con reserva al ordenar la apertura, peticiones bloqueadas y
reintento cuando se libera.

Medidas por réplica: caudal, `Wq` por intervalo y por hora (y una variante sin
los vehículos de la cola inicial, por PEN-003), cola máxima **continua** y
máximo de las 12 lecturas puntuales (por PEN-004), % de intervalos sobre el
máximo tolerable, y carriles-intervalo.

### Interfaz y 3D

El motor corre en un **Web Worker**, así que la pantalla no se bloquea. Hay tres
pestañas: tiempo real, lotes y configuración. El formulario se **genera** desde
el catálogo de parámetros, con validación en línea y marcado de lo que difiere
del escenario base. El modo tiempo real **reproduce una traza grabada** en vez
de simular paso a paso (DEC-033), con pausa, rebobinado y velocidad
configurable; la traza está documentada en [`traza.md`](traza.md).

La vista 3D es una **función pura de la traza y del instante** (DEC-036): se
prueba en Node, sin WebGL. Dibuja **el modelo, no una foto del peaje**
(DEC-038), y lo rotula: un solo embudo por sentido porque el modelo es de cola
única, casetas reversibles porque son un recurso compartido, y desplazamientos
cosméticos porque el modelo no tiene distancias ni velocidades. Ver
[`vista3d.md`](vista3d.md) y [`ui.md`](ui.md).

### Verificación

Lo que sostiene que el programa hace lo que dice:

- **389 pruebas** en verde, con las regresiones de las fases 1 a 4 intactas.
- **Equivalencia exacta** del motor de dos sentidos contra los de uno: correr el
  peaje con un sentido inactivo da los mismos números que las fases 1 y 2.
- **El grabador de trazas no cambia ningún resultado**, comprobado en 5
  escenarios × 30 semillas.
- **La reconstrucción desde la traza coincide con el motor** en atendidos, cola
  máxima y carriles-intervalo.
- **La corrida por lotes de la interfaz da los mismos números que el informe
  publicado de la fase 4**, y hay una prueba que lee el informe y los compara.
- **El M/M/c analítico por Erlang C** como referencia independiente.

---

## Etapa 5 — Validación

Validar es confrontar el modelo con los cuatro conteos, en modo *programado*
—copiando las casetas que el operador tuvo abiertas—, con 30 réplicas y
**sin ajustar ningún parámetro** (DEC-021). Informe:
[`validacion-fase1.md`](resultados/validacion-fase1.md).

### Lo que valida bien

| Qué | Resultado |
|---|---|
| **Llegadas** | Error < 1,6 % en los cuatro conteos |
| **Carriles-intervalo** | Coinciden **exactamente** con la operación real, sin dispersión |
| **Caudal del festivo** | 1.064,4 ± 11,2 contra 1.064 contados |

Las llegadas y el control de `c(t)` están bien. Lo que no valida es la **cola**,
y con ella la espera.

### Lo que no valida: la cola del pico

| Conteo | Cola máx. obs. | Cola máx. muestreada sim. | `Wq` obs. (min) | `Wq` sim. (min) | Razón |
|---|---|---|---|---|---|
| `viernes` | 1 | 0,8 | 0,06 | 0,025 | 0,42× |
| `domingoCP` | 7 | 5,8 | 0,24 | 0,130 | 0,54× |
| `domingoPC` | 8 | 4,6 | 0,41 | 0,282 | 0,69× |
| `festivoPC` | **32** | **21,4** | **1,28** | **0,276** | **0,22×** |

El modelo se queda corto en los cuatro, y en el festivo **4,6 veces corto**. El
M/M/c analítico estaba 22 veces corto, así que la simulación cierra buena parte
de la brecha, pero no toda.

El diagnóstico intervalo por intervalo
([`diagnostico-festivo.md`](resultados/diagnostico-festivo.md)) cuantifica el
sesgo:

| | Intervalos | Subestima en media | Subestima en las 30 réplicas |
|---|---|---|---|
| Los cuatro conteos | 48 | **21** | **10** |
| Solo el festivo | 12 | **12** | **8** |

Y el dato que lo convierte en sesgo y no en dispersión: en **0 de los 48**
intervalos la lectura de campo queda por debajo del rango de las 30 réplicas.
**El error tiene un solo signo.** Donde el modelo se separa del campo, se separa
quedándose corto, nunca sobrando.

> Este último resultado es el que la lectura anterior de los datos **no podía
> ver**. Mientras la columna `cola` se interpretó como la fila de una sola
> caseta (DEC-024), lo único afirmable era una desigualdad: los intervalos en que
> la simulación quedaba por encima salían rotulados «no concluyente», así que no
> había forma de comprobar si el sesgo era asimétrico o ruido en los dos
> sentidos. Corregida la lectura (DEC-042), las dos series son la misma variable
> y la comparación es directa en los dos sentidos. **Los números son los mismos;
> lo que cambió es que ahora dicen algo.**

Además, la brecha en cola y la brecha en espera son **la misma brecha vista dos
veces**, no dos problemas: el `Wq` observado es el que implica la cola observada
por Little, así que ligar una con otra es aritmética, no coincidencia.

### Las tres explicaciones, y por qué ninguna gana

El modelo tiene capacidad de sobra en el papel —5 casetas × 297,48 = 1.487 veh/h
contra 1.064 de demanda, ρ ≈ 0,72— y por eso vacía una cola que en campo se
mantuvo entre 14 y 32 vehículos toda la hora. Tres hipótesis lo explicarían, y
los datos no descartan ninguna (PEN-008):

1. **El servicio del pico fue más lento que los 12,10 s medidos.** Los 50
   tiempos son de otro sentido y otro día. Si la cola nunca se vació, las
   casetas estuvieron ocupadas toda la hora, y el servicio que eso implica es
   `55 caseta-intervalos × 300 s ÷ 1.064 veh = 15,51 s`, un 1,28× más lento.
2. **Las filas estaban desbalanceadas entre casetas**, y la cola única no lo
   reproduce: con el mismo total esperando, si unas casetas están vacías
   mientras otras acumulan fila, la capacidad aprovechada es menor que la
   nominal.
3. **Las lecturas cuentan vehículos que el modelo no cuenta:** motocicletas, o
   vehículos de TAG en la misma fila.

**Ninguna está privilegiada**, y esto también cambió con la DEC-042. Mientras la
lectura se leía como la fila de una caseta, la hipótesis 2 explicaba el dato por
construcción y el repositorio la marcaba como «la más probable»; la 1 estaba
expresamente **anulada**, porque su derivación suponía cola única. Con la lectura
correcta, el supuesto que la derivación del 15,51 s necesitaba es justo el que
los datos tienen, así que vuelve a valer, y las tres quedan al mismo nivel.

El 15,5 s se usa como **escenario de sensibilidad rotulado**, nunca como valor
por defecto y nunca para dimensionar la política (DEC-025). Sigue sin ser una
medición: se deriva de un balance de capacidad, no de cronometrar atenciones, y
supone que **toda** la holgura se explica por el servicio y nada por las otras
dos hipótesis.

### Veredicto de la validación

**El modelo es válido para las llegadas y el uso de casetas, y no es válido como
predictor de la espera en el pico.** Dicho con precisión: es válido para
**ordenar escenarios entre sí** —todos comparten el mismo sesgo, el mismo signo
y las mismas semillas— y no lo es para **predecir valores absolutos**. Esa
distinción gobierna toda la interpretación.

Y tiene una consecuencia incómoda que no se esconde (PEN-009): según el modelo,
la operación real **ya cumple** el criterio en el festivo (0,0 % de intervalos
por encima de 2,5 min, contra un 5 % tolerado), lo que diría que no hay nada que
optimizar. No es un resultado aparte: es el sesgo de la cola visto desde el
criterio. Si el modelo subestima la congestión, subestima el incumplimiento.

---

## Etapa 6 — Experimentación

Cuatro bloques de experimentos, siempre con 30 réplicas y las semillas 1…30.

### Fase 2 — La regla contra el operador, un sentido

[`fase2-regla.md`](resultados/fase2-regla.md), 16 casos.

| Conteo | `Wq` operador | `Wq` regla | Carriles op. | Carriles regla |
|---|---|---|---|---|
| `viernes` | 0,03 | 0,07 | 24,0 | 22,7 |
| `domingoCP` | 0,13 | 0,10 | 28,0 | 30,7 |
| `domingoPC` | 0,28 | 0,09 | 14,0 | 21,0 |
| `festivoPC` | 0,28 | **0,32** | 55,0 | 55,6 |

Con el servicio medido **las dos cumplen en los cuatro conteos**, y en el
festivo la regla queda algo **peor**. Con el servicio lento de sensibilidad
ninguna cumple, pero la regla baja `Wq` de **2,90 a 1,23 min** y los intervalos
sobre el máximo de **50,0 % a 9,2 %**, por 3,9 carriles-intervalo más.

La sensibilidad de la demora explica por qué la regla pierde en el festivo:

| Demora | `Wq` base | `Wq` lento |
|---|---|---|
| 0 min | **0,19** | **0,95** |
| 5 min | 0,32 | 1,23 |
| 10 min | 0,31 | 1,40 |
| *operador* | *0,28* | *2,90* |

Con demora 0 la regla **gana** al operador. Toda su desventaja es el retardo de
reacción: la regla es **reactiva** y el operador fue **anticipativo** —abrió la
quinta caseta al empezar el intervalo 6 sin esperar a que la cola lo exigiera—
(PEN-011). En el régimen lento, la latencia vale 0,45 min de espera.

### Fase 3 — El pozo compartido

[`fase3-reparto.md`](resultados/fase3-reparto.md). Aquí aparece la competencia
que las fases 1 y 2 no podían ver: **el pozo está agotado 56,5 de los 60
minutos** del festivo, con 1,7 peticiones bloqueadas por réplica.

| | P→C: `Wq` / carriles | C→P: `Wq` / carriles |
|---|---|---|
| operador (C→P fijo en 1) | 0,28 / 55,0 | 0,40 / 12,0 |
| regla sin reasignación | 0,35 / 54,8 | 0,39 / 13,0 |
| regla con reasignación | **0,44** / 54,1 | **0,34** / 14,8 |

Los tres cumplen con servicio base; ninguno con servicio lento. Y la
reasignación por ρ, que debía repartir mejor, **empeora** la brecha de P→C
contra el operador, de 0,07 a 0,16 min, porque mueve casetas **hacia** C→P: ρ
divide por `c`, así que con 1 caseta C→P tiene ρ = 0,66 y siempre cumple la
condición, aunque su demanda sea una fracción. **ρ normalizado por `c` favorece
sistemáticamente al sentido con menos casetas** (PEN-014), y además casi nunca
se activa en el pico porque nadie libera casetas (PEN-015). Quedó como hallazgo
y no se rediseñó (DEC-028).

### Fase 4 — La matriz de escenarios

[`fase4-escenarios.md`](resultados/fase4-escenarios.md): **214 escenarios** con
IC al 95 %, en cinco grupos (operador; regla, con y sin reasignación y con el
disparador por tasa; demanda alta ×1,10/×1,13/×1,20; dieciocho sensibilidades; y
un barrido de estrés de ×1,00 a ×1,60 con pozo de 6 y de 8).

**Cumplimiento:** 47 de 107 con el servicio medido (43,9 %); **8 de 107** con el
lento (7,5 %). La matriz creció de 160 a 214 escenarios al añadir el disparador
por tasa (DEC-046); los resultados de los escenarios que ya estaban **no
cambiaron**, solo el denominador.

**El punto de quiebre:**

| Control | Servicio | Pozo 6 | Pozo 8 | Desplazamiento |
|---|---|---|---|---|
| regla | base | **×1,10** | ×1,55 | +0,45 |
| regla | lento | ×1,00 | ×1,20 | +0,20 |
| casetas fijas | base | ×1,10 | ×1,10 | **0,00** |
| casetas fijas | lento | ×1,00 | ×1,00 | **0,00** |

Dos lecturas, y la segunda es la importante. Una: **no hay holgura**, un 10 % más
de tráfico rompe el criterio con el pozo de 6. Dos: las dos casetas extra
**solo valen si la regla las puede mover**; con casetas fijas no desplazan el
quiebre ni un punto, porque el cuello de botella es C→P clavado en 1 caseta.
*Comprar* capacidad sin *gestionarla* no compra nada. (Con el pozo de 8 los
umbrales de `c` = 5 y 6 son extrapolados, DEC-031, así que ese ×1,55 depende de
la extrapolación.)

**Las sensibilidades, ordenadas por cuánto mueven el `Wq` del peaje:**

| Sensibilidad | Δ base | Δ lento | Mayor efecto |
|---|---|---|---|
| Sustituto `domingoCP` para C→P | +1,60 | +6,94 | **6,94 min** |
| Factor C→P ×1,5 | +0,55 | +3,12 | 3,12 min |
| Cola inicial 0 | +0,44 | +1,56 | 1,56 min |
| Ventana de cierre 5 min | +0,39 | +1,06 | 1,06 min |
| Umbrales ×1,4 | +0,21 | +0,31 | 0,31 min |
| Umbrales ×0,6 | -0,20 | -0,15 | 0,20 min |
| Demora 0 min | -0,07 | -0,15 | 0,15 min |

**Las tres que más mueven el resultado no son parámetros de la regla.** Dos son
la demanda no medida de C→P y la tercera es la cola inicial. Los umbrales
—lo único que el estudio podría «ajustar»— mueven 0,31 min como mucho, un orden
de magnitud menos que el dato que falta.

**Y un resultado que parece al revés:** quitar la cola inicial **empeora** la
espera de P→C, de 0,47 a 1,07 min. El mecanismo está en las otras columnas: con
los 23 vehículos heredados P→C abre 1,40 casetas de media y acumula 53,4
carriles-intervalo; empezando vacío abre 0,67 y se queda en 48,4. **La cola
inicial le hace de aviso temprano a una regla reactiva** (PEN-016): sin ella el
umbral se cruza más tarde y, cuando la caseta abre cinco minutos después, la cola
ya creció. Es la misma reactividad de PEN-011 por otra vía.

---

## Etapa 7 — Interpretación

### Las cinco conclusiones del estudio

**1. El modelo subestima la congestión del pico, con sesgo de un solo signo, y
eso condiciona todo lo demás.**
En 0 de 48 intervalos la cola de campo queda por debajo de las 30 réplicas. Por
tanto: las casetas que cualquier política recomiende son una **cota inferior**, y
todo factor de quiebre es una **cota superior**. El peaje real quiebra con menos
demanda de la que dice la matriz.

**2. El resultado lo decide un dato que no se midió, no la regla.**
El sustituto de la demanda de C→P mueve el `Wq` del peaje hasta 6,94 min; el
parámetro de la regla que más mueve, los umbrales, llega a 0,31 min. Son más de
veinte veces. **Afinar la regla es irrelevante al lado de contar C→P en un
festivo** (PEN-013). Esta es, probablemente, la conclusión más útil del estudio,
y es incómoda porque dice que la parte vistosa del trabajo —la regla, los
umbrales, la reasignación— no es donde está la palanca.

**3. El valor de la regla no es mejorar el día bueno, es sostener el día malo.**
Con el servicio medido, la regla no mejora a un operador que ya anticipaba
(0,32 contra 0,28 min en el festivo) y gasta un **7,4 %** más de
carriles-intervalo. Con el servicio lento, baja `Wq` de 2,90 a 1,23 min y los
intervalos malos de 50,0 % a 9,2 %. **La regla es un seguro.** Se justifica por
lo que evita en el escenario adverso, no por lo que mejora en el habitual, y
conviene presentarla así y no como una optimización.

**4. El defecto de la regla era la latencia, y ya está corregido.**
Es reactiva: espera a que la cola cruce el umbral y luego tarda la demora en
abrir. Con demora 0 pasaba por delante del operador (0,19 contra 0,28), y entre
0 y 10 min de demora hay 0,45 min de espera en el régimen que importa. PEN-016 lo
confirmaba por la puerta de atrás: lo que salva a P→C es tener cola **antes** de
empezar, es decir, un aviso temprano.
El **disparador anticipativo por tasa** (DEC-046) es ese aviso, y está medido:
baja `Wq` de 0,32 a **0,23 min** en el festivo y **pone a la regla por delante
del operador**. Confirma el diagnóstico por contraste, además: con servicio lento
es casi inerte (0,03 aperturas anticipadas), porque con la cola ya desbordada el
umbral de cola se cruza solo y no queda nada que anticipar. **Pero no mueve el
punto de quiebre** (×1,10 sigue siendo ×1,10): mejora el punto de operación, no
el techo de capacidad. Con esto se cierra PEN-011.

**5. Ampliar el pozo no sirve de nada sin la regla.**
De 6 a 8 casetas el quiebre se corre de ×1,10 a ×1,55 **con** la regla y
**0,00** con casetas fijas. La capacidad instalada no es el cuello de botella; el
cuello es que el contraflujo se queda en 1 caseta. Es un argumento contra
resolver esto con obra.

### Por qué los resultados se presentan en términos relativos

El modelo dice que la operación real **ya cumple** (PEN-009). Si se tomaran los
`Wq` absolutos como predicción, la conclusión del estudio sería «no hay nada que
hacer», que contradice su propio propósito y, sobre todo, contradice una cola
observada de 14 a 32 vehículos sostenida una hora. Lo que es sólido es la
**comparación**: todos los escenarios comparten el sesgo, su signo y las
semillas, así que las diferencias entre ellos son reales aunque los niveles no
lo sean. De ahí que la política se formule como «esta alternativa contra aquella»
y nunca como «la espera será de X minutos».

### La política recomendada

En [`politica-recomendada.md`](politica-recomendada.md), en detalle y con las
cifras que la sostienen. En resumen: mantener la regla por cola **como seguro**,
arrancar el pico con las 4 casetas ya abiertas, añadir un **disparador por tasa
de llegadas** —la derivación de la sección 4 del contexto: 21 / 46 / 70 / 95
llegadas por 5 min— y **no** usar la reasignación por ρ tal como está
especificada. Antes de dimensionar nada sobre ella, contar C→P en un festivo.

El disparador por tasa **está implementado y medido** (DEC-046), que es lo que
cerró PEN-011: con el servicio medido la regla con el disparador baja `Wq` de
0,32 a **0,23 min** en el festivo y **pasa por delante del operador** (0,28),
que es justo lo que no conseguía con la demora de 5 min. La DEC-046 supera de la
DEC-006 solo la parte que descartaba disparar por tasa; el disparador por cola
sigue siendo el principal, y los dos actúan en paralelo —se dispara lo que
ocurra primero—. Va **apagado por defecto**, de modo que el escenario base sigue
siendo la regla tal como la especifica el contexto y los resultados de las fases
1 a 4 siguen comparables.

**Pero no cambia la conclusión 2, y conviene no confundirse:** el disparador
mueve el `Wq` del peaje 0,09 min y **no mueve el punto de quiebre ni un punto**
—×1,10 sigue siendo ×1,10 con el pozo de 6—. No añade casetas: reparte en el
tiempo las que ya hay. El sustituto no medido de C→P, en cambio, mueve 6,94 min.
La palanca sigue estando en los datos que faltan.

---

## Etapa 8 — Documentación

El estudio se documenta en el propio repositorio, con una división deliberada
entre lo que se escribe y lo que se genera:

| Archivo | Papel |
|---|---|
| [`contexto/contexto-inicial.md`](contexto/contexto-inicial.md) | **Fuente de verdad.** Modelo, parámetros, regla, criterios, datos. No se edita para arreglar un resultado |
| [`decisiones/registro.md`](decisiones/registro.md) | **46 decisiones** con fecha, motivo y qué descartan. No se reabren: para cambiar una se añade otra que diga qué supera |
| [`pendientes.md`](pendientes.md) | **22 preguntas abiertas.** Lo que no está decidido, con la opción tomada mientras tanto |
| [`planes/plan-actual.md`](planes/plan-actual.md) | Plan por fases, con casillas |
| [`bitacora.md`](bitacora.md) | Una entrada por intervención |
| [`resultados/`](resultados/) | **Generados.** Cinco informes, se regeneran con sus scripts y no se editan a mano |
| [`parametros.md`](parametros.md) | **Generado.** Los 31 parámetros leídos del escenario base |
| `estudio.md`, `politica-recomendada.md` | Este documento y la política: prosa, con las cifras transcritas y su fuente nombrada |
| [`ui.md`](ui.md), [`vista3d.md`](vista3d.md), [`traza.md`](traza.md) | Cómo funciona lo que se construyó |
| [`capturas/`](capturas/) | Quince capturas de la escena 3D |

Tres convenciones hicieron casi todo el trabajo, y vale la pena nombrarlas
porque son transferibles:

- **Las conclusiones se generan, no se escriben** (DEC-023). Una conclusión
  escrita a mano envejece en silencio en cuanto cambia un parámetro; generada,
  cualquier cambio se ve en la siguiente corrida. Es lo que permitió comprobar,
  al corregir la DEC-024, que **ningún número** había cambiado.
- **Las decisiones no se reabren, se superan.** La DEC-042 no borró la DEC-024:
  dice qué supera, qué consecuencias anula y por qué. El error queda a la vista
  con su fecha, que es la única forma de que un lector futuro entienda por qué
  cuatro informes decían lo que decían.
- **Lo ambiguo se anota en vez de decidirse en silencio.** Los 22 pendientes son
  el registro de lo que no se sabe. Uno de ellos —PEN-002, el origen del 1,28—
  estuvo tres días abierto sin resolver y fue lo que acabó destapando el error de
  interpretación de los datos. **La utilidad de un pendiente no es que se cierre,
  es que siga ahí molestando.**

---

## Limitaciones

Las que afectan a qué se puede afirmar, ordenadas por cuánto pesan.

### 1. La demanda de C→P en el festivo no se midió — PEN-013

**La incertidumbre dominante del estudio.** Hoy se sustituye por el conteo del
viernes (238 veh/h) × un factor configurable (DEC-029); antes era el domingo
1:00–2:00 p. m., que resultó estar medido en el **sentido contrario**. Con el
sustituto `domingoCP` (451 veh/h), C→P pasa de 0,34 a **5,76 min** y de 0,8 % a
**66,4 %** de intervalos sobre el máximo tolerable: deja de cumplir por mucho, y
arrastra a P→C. Mueve el `Wq` del peaje hasta 6,94 min, más que cualquier otra
cosa del estudio.

### 2. El modelo de cola única subestima el pico — PEN-008

Con sesgo de un solo signo, como se midió en la etapa 5. **Las casetas que el
estudio recomienda son una cota inferior y los factores de quiebre, cotas
superiores.** Pesa más de lo que parece en la fase 3: con el pozo agotado 56,5 de
60 minutos, la congestión que el modelo no ve es capacidad que **no está
pidiendo**.

### 3. El régimen de servicio del pico no se midió — PEN-010

Los 50 tiempos son de otro sentido y otro día. Los dos regímenes dan
recomendaciones distintas (47 de 107 escenarios cumplen contra 8 de 107), y el
15,5 s de la sensibilidad **no es una medición** (DEC-025): se deriva de un
balance de capacidad y supone que toda la holgura del pico es servicio.

### 4. Nunca se midieron los dos sentidos a la vez

Toda la fase 3 —la competencia por el pozo, que es el mecanismo central del
problema— descansa en un supuesto. Y el modo *operador* de C→P es una
**reconstrucción**: solo se sabe que arrancó con 1 caseta, así que se mantiene en
1 toda la hora. Si el operador real hubiera abierto una segunda, la comparación
cambiaría a su favor.

### 5. Limitaciones menores, con su pendiente

| Limitación | Pendiente |
|---|---|
| No se sabe si los datos de la ANI incluyen el carril TAG, y de ahí sale el factor ×1,13 | PEN-001 |
| No se sabe cuánto llevaban esperando los 23 vehículos de la cola inicial; se les asigna llegada en `t = 0`, lo que **subestima** su espera | PEN-003 |
| La demora real de apertura no está medida | PEN-006 |
| No se sabe si la `c` del conteo es la abierta o la que atendía | PEN-007 |
| Con pozo de 8, los umbrales de `c` = 5 y 6 son extrapolados | DEC-031 |
| La ventana de cierre de 15 min hace que la regla gaste más carriles que el operador | PEN-012 |
| El horizonte del modo tiempo real está acotado por la memoria de la traza | PEN-017 |
| El rendimiento de la vista 3D solo está medido con WebGL por software | PEN-019 |

### 6. Alcance del modelo, por decisión

Un solo tipo de cliente (sin categorías de vehículo), sin motocicletas, sin
carril TAG, sin retén policial, horizonte de una hora, y las casetas como único
recurso. Nada de esto es un defecto —son las fronteras declaradas—, pero acota lo
que el estudio puede responder.

---

## Trabajo futuro

### Mediciones, que es donde está el retorno

1. **Contar C→P en un festivo.** La medición de mayor retorno del estudio, con
   diferencia: sin ella la recomendación es condicional (PEN-013).
2. **Cronometrar atenciones en un festivo y en P→C.** Decide en qué régimen está
   el peaje, y los dos regímenes dan recomendaciones distintas (PEN-010).
3. **Registrar la cola por caseta en un pico.** Es lo único que separaría la
   hipótesis del desbalance de la del servicio lento (PEN-008). La cola **total**
   por sentido ya está medida: es la columna `cola` (DEC-042).
4. **Medir la demora real de apertura**, que es justo lo que el disparador
   anticipativo intenta compensar (PEN-006).
5. **Medir los dos sentidos a la vez**, para que la fase 3 deje de descansar en
   un supuesto.

### Modelo

6. ~~Implementar y medir el disparador anticipativo por tasa.~~ **Hecho**
   (DEC-046, PEN-011 cerrado). Lo que queda de aquí: **medir el arranque en
   frío** con el disparador encendido —un festivo que empiece con el peaje vacío
   y la demanda subiendo—, porque durante los primeros 5 min la ventana móvil
   está a medio llenar y el disparador no puede actuar a plena potencia justo
   cuando más falta haría (PEN-016). Y decidir si pasa a ser el valor por
   defecto del modelo, que es otra decisión.
7. **Rediseñar el criterio de reasignación.** ρ normalizado por `c` favorece al
   sentido con menos casetas, que no es el que más lo necesita (PEN-014). Un
   criterio por cola absoluta, o por espera estimada, no tendría ese defecto.
8. **Modelar filas por caseta**, que es la única forma de poner a prueba la
   hipótesis 2 de PEN-008 dentro del modelo. Cambia el supuesto estructural
   (DEC-001), así que es un modelo nuevo, no una variante.
9. **Extender el horizonte más allá de una hora**, para ver la formación y el
   vaciado del pico completo en vez de una ventana.

### Herramienta

10. **Reducir el modelo del vehículo**, que pesa 10,9 MB y se descarga entero
    (PEN-021), y ajustar su escala al lado de las casetas (PEN-022).
11. **Medir el rendimiento del 3D con WebGL por hardware** (PEN-019).
12. **Trocear la traza** para que el horizonte no esté acotado por la memoria
    (PEN-017).

---

## Cierre

El estudio entrega una herramienta de simulación completa —motor reproducible,
33 parámetros configurables, 214 escenarios, interfaz con vista 3D y 389
pruebas— y una política recomendada que sostiene el escenario adverso. Pero su
resultado más sólido es de otro tipo: **la palanca no está en la regla, está en
los datos que faltan.** Un dato no medido mueve el resultado veinte veces más
que el mejor parámetro ajustable, y el modelo subestima justo el fenómeno que se
quería estudiar.

Eso no invalida el trabajo: lo sitúa. El estudio sirve para **ordenar
alternativas** y para decir con precisión qué habría que medir para poder
recomendar una política como predicción y no como seguro. Y deja constancia,
con fecha, de los tres días en que sostuvo lo contrario de lo que sus propios
datos decían, porque esa también es parte del método.
