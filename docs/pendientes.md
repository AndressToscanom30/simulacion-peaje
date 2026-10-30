# Pendientes

Preguntas abiertas y ambigüedades. Lo que está aquí **no** está decidido. Cuando
haga falta avanzar se toma la opción más razonable, se deja dicho cuál y se
mantiene la pregunta abierta hasta que alguien la responda.

## Pendiente con la profesora

### PEN-001 — ¿Los datos de tráfico de la ANI incluyen el carril TAG?

- **Origen:** contexto inicial, sección 8 (limitaciones declaradas).
- **Por qué importa:** el factor 1,13 (enero contra el promedio de febrero a
  julio) se aplica a la demanda de efectivo. Si las cifras de la ANI incluyen
  TAG y la proporción de TAG cambia entre meses, el factor está mal atribuido.
- **Mientras tanto:** se usa el 1,13 tal cual, solo como factor de escala, y en
  el escenario 3 se corre también con 1,10 y 1,20 para acotar el efecto.

## Abiertas del desarrollo

### PEN-002 — De dónde sale el 1,28 min declarado del festivo ✅ CERRADO

- **Origen:** fase 1. El contexto declara en la sección 6 una espera observada de
  1,28 min en el festivo contra 0,06 min del M/M/c (unas 20 veces).
- **Cerrado el 30/10/2026 por DEC-042.** El 1,28 min sale de aplicar la **ley de
  Little** a la columna `cola` del festivo, leída como el total de vehículos
  esperando en el sentido:

  ```
  Lq medio de la columna cola del festivo = 272 / 12 = 22,6667 vehículos
  λ = 1.064 veh/h
  Wq = Lq / λ = 22,6667 / 1.064 = 0,021303 h = 1,2782 min  →  1,28 min
  ```

- **Y no solo el festivo: los cuatro conteos salen del mismo cálculo**, lo que
  descarta que sea coincidencia:

  | Conteo | `Lq` medio | λ (veh/h) | `Wq = Lq/λ` | Declarado |
  |---|---|---|---|---|
  | viernes | 0,2500 | 238 | 0,0630 min | 0,06 |
  | domingoCP | 1,8333 | 451 | 0,2439 min | 0,24 |
  | domingoPC | 1,3333 | 195 | 0,4103 min | 0,41 |
  | festivoPC | 22,6667 | 1.064 | 1,2782 min | 1,28 |

- **Por qué el repo no lo había encontrado:** se intentó reconstruirlo con la
  fórmula de la sección 3 (`Wq_est = Lq × 12,1 / c`), que dio 1,01 min, y se
  concluyó que no cuadraba. No era esa la fórmula: la de la sección 3 reparte la
  cola entre las `c` casetas, y Little no necesita `c` ninguna. Con Little da
  exacto.
- **Qué significa para la comparación:** el 1,28 min **no es una espera medida
  con cronómetro**, es una espera **estimada por Little a partir de la cola
  observada**. Así que comparar el `Wq` simulado contra él es comparar el `Wq`
  del modelo contra el que implica la cola de campo — lo cual es legítimo, y es
  consistente con que el modelo quede corto justo donde su cola queda corta
  (PEN-008). Deja de ser "una razón contra un valor cuyo origen no está
  documentado".
- **Segunda vía de confirmación de DEC-042:** que el cálculo solo cuadre con la
  columna leída como total es, por sí mismo, prueba de que lo es.

### PEN-003 — ¿Desde cuándo cuenta la espera de los vehículos de la cola inicial?

- **Origen:** fase 1. El festivo arranca con 23 vehículos en cola (DEC-010), pero
  no se sabe cuánto llevaban esperando.
- **Mientras tanto (DEC-018):** se les asigna llegada en `t = 0`, así que su
  espera cuenta desde el arranque. Eso **subestima** su espera real. Para que la
  diferencia sea visible, cada réplica reporta `Wq` de dos formas: con todos los
  vehículos y solo con los que llegan durante la hora.

### PEN-004 — ¿La cola máxima observada es de una lectura puntual o un máximo continuo?

- **Origen:** fase 1. Las colas máximas observadas (32 / 8 / 7 / 1) salen de
  lecturas puntuales, una por intervalo de 5 min: 12 observaciones por conteo.
- **Qué pasa:** el motor registra la cola máxima **continua** de la hora, que por
  construcción es mayor o igual que el máximo de 12 lecturas puntuales. Comparar
  las dos cosas de frente sesga la simulación hacia arriba.
- **Mientras tanto:** la validación reporta las dos: la cola máxima continua y
  el máximo de las 12 lecturas muestreadas en instantes aleatorios, que es la
  comparable con lo observado.
- **Corregido el 30/10/2026 (DEC-042):** se retira la nota del 27/10 que decía
  que "ni siquiera el máximo muestreado es comparable de frente", porque se
  apoyaba en la DEC-024. La lectura observada **es** el total del sentido, así
  que el máximo de las 12 lecturas muestreadas **sí** es la cifra comparable.
  Lo que sigue abierto es lo de este pendiente y nada más: la distinción entre
  una lectura puntual y un máximo continuo, que es real y es la razón de
  reportar las dos cifras.

### PEN-005 — ¿Qué es exactamente el "caudal de la hora"?

- **Origen:** fase 1. El contexto pide validar el caudal del festivo contra
  1.064 veh/h, que es el **total de llegadas** contado en campo.
- **Qué pasa:** el caudal de un sistema con cola son las salidas, no las
  llegadas, y con cola inicial de 23 y cola final distinta de cero las dos
  cifras no coinciden.
- **Mientras tanto:** se reportan las dos: llegadas simuladas en la hora
  (comparable con el 1.064 del conteo) y salidas dentro de la hora (el caudal
  propiamente dicho).

### PEN-006 — Valor por defecto de la demora de apertura en las corridas de fase 1

- **Origen:** fase 1. La demora (5 min, con sensibilidad 0 y 10) solo aplica a la
  regla de la fase 2.
- **Mientras tanto:** en la fase 1 `c(t)` es programado y copia el conteo
  observado, así que los cambios de casetas ocurren en el instante del cambio de
  intervalo, sin demora. El parámetro ya está en `parametros.js` esperando la
  fase 2.

### PEN-007 — ¿La `c` observada del conteo es la que estaba abierta o la que atendía?

- **Origen:** fase 1. En el festivo el arreglo `casetas` pasa de 4 a 5 en el
  intervalo 6, pero no se sabe si el operador la abrió en ese instante o si ya
  estaba abierta y empezó a atender ahí.
- **Mientras tanto:** se toma como el número de casetas **abiertas** durante el
  intervalo, y el motor las abre al comenzar el intervalo.

### PEN-008 — El modelo de cola única subestima la congestión del pico

- **Origen:** validación de la fase 1. **Reescrito el 30/10/2026** tras DEC-042,
  que fija que la columna `cola` es el total de vehículos esperando por sentido.
  La versión anterior (27/10) estaba escrita sobre la DEC-024 y razonaba por
  desigualdad; el hallazgo sobrevive, el razonamiento no.
- **La conclusión sigue en pie:** el modelo subestima la congestión del pico.
- **Qué cambia en el razonamiento.** Antes la afirmación se apoyaba en que la
  cola total es mayor o igual que cualquiera de sus filas, así que solo los
  intervalos en que la simulación quedaba **por debajo** de la lectura decían
  algo, y el resto salía «no concluyente». Ahora la serie de campo y la del
  modelo son **la misma variable** —cola total del sentido— y se comparan de
  frente, en los dos sentidos. Los números del diagnóstico no cambian (el motor
  siempre simuló la cola total); cambia que ya no hay que pedir disculpas por la
  comparación.
- **Qué se ve con la comparación directa:** en el festivo la cola simulada queda
  por debajo de la observada en los **12 de 12 intervalos** en media, y en **8 de
  12** ni la más congestionada de las 30 réplicas alcanza la lectura de campo. En
  los cuatro conteos juntos son 21 de 48 intervalos en media y 10 de 48 en las 30
  réplicas. El desglose está en `docs/resultados/diagnostico-festivo.md`
  (`npm run diagnostico`).
- **Hallazgo nuevo del 30/10/2026, que la lectura anterior no permitía ver: el
  sesgo tiene un solo signo.** En **0 de los 48 intervalos** la lectura de campo
  queda por debajo del rango de las 30 réplicas. O sea que donde el modelo se
  separa del campo se separa **siempre quedándose corto**, nunca sobrando. Con la
  DEC-024 esto era incomprobable: todo intervalo en que la simulación quedaba por
  encima salía rotulado «no concluyente», así que no se podía saber si el sesgo
  era asimétrico o solo ruido en los dos sentidos. Ahora se sabe, y **refuerza**
  la conclusión de este pendiente: no es dispersión, es sesgo.
- **En espera:** `Wq` sale 0,28 min en el festivo contra los 1,28 min del
  contexto, 4,6 veces corto. El M/M/c estaba 22 veces corto, así que la
  simulación cierra parte de la brecha pero no toda. **Y ahora se sabe de dónde
  sale el 1,28:** es el `Wq` que implica la cola observada por la ley de Little
  (PEN-002, cerrado). Así que la brecha en `Wq` y la brecha en cola son **la
  misma brecha vista dos veces**, no dos discrepancias independientes: Little
  liga una con la otra. Eso refuerza el hallazgo en lugar de debilitarlo.
- **Tres explicaciones posibles, ninguna descartable con los datos que hay y
  ninguna privilegiada:**
  1. **El servicio en el pico fue más lento que los 12,10 s medidos.** Los 50
     tiempos son de otro sentido y otro día (limitación declarada en la sección
     8). Esta hipótesis **recupera sustento con DEC-042**: la derivación del
     "servicio implícito" de ≈ 15,5 s suponía cola única, y la cola medida es
     justamente la de la cola única, así que la derivación vuelve a ser válida.
     Sigue sin ser una medición. Ver DEC-025 y PEN-010.
  2. **Las filas estaban desbalanceadas entre casetas, y la cola única no lo
     reproduce** (también declarado en la sección 8). Sigue siendo un mecanismo
     real: con el mismo total en espera, si unas casetas están desocupadas
     mientras otras acumulan fila, la capacidad que se aprovecha es menor que la
     nominal y la cola se sostiene más alta. **Lo que pierde es el lugar
     privilegiado que le daba la DEC-024.** Mientras la lectura se leía como la
     fila de una sola caseta, el desbalance explicaba el dato por construcción y
     este pendiente lo marcaba como "la más probable". Con la lectura correcta
     esa ventaja desaparece: el desbalance es una hipótesis más, al lado de las
     otras dos.
  3. **Las lecturas cuentan vehículos que el modelo no cuenta** (motocicletas, o
     vehículos de TAG en la misma fila).
- **Lo que este pendiente volvió a afirmar:** la fase 1 había derivado de aquí un
  "tiempo de servicio implícito" de ≈ 15,5 s, razonando que haber cola implica
  casetas ocupadas. La DEC-024 lo había anulado por valer "solo en cola única";
  **la DEC-042 lo restituye**, porque el dato es de cola única. El cálculo vuelve
  a los informes como lo que es: un valor de referencia, no una medición
  (PEN-010).
- **Mientras tanto:** **no se tocó ningún parámetro** (DEC-021). Se reporta la
  diferencia y se sigue.
- **Qué haría falta:** medir la cola **por caseta** en un conteo de pico, que es
  lo único que separaría la hipótesis 2 de la 1. El total por sentido ya está
  medido: era lo que se pedía aquí antes de la DEC-042, y ya no hace falta.
- **Consecuencia para las fases siguientes:** la regla de la fase 2 se dimensiona
  sobre un modelo que subestima la congestión del pico. Las casetas que
  recomiende hay que leerlas como **cota inferior**.

### PEN-009 — Según la simulación la operación observada ya cumple el criterio de desempeño

- **Origen:** validación de la fase 1.
- **Qué pasa:** el porcentaje de intervalos por encima del máximo tolerable de
  2,5 min sale 0,0 % en el festivo (en las 30 réplicas) y 0,3 % de media en
  domingoPC, muy por debajo del 5 % aceptado. O sea que, según el modelo, la
  operación real ya cumple el criterio y **no habría nada que optimizar**, lo
  que contradice el propósito del estudio.
- **Es la otra cara de PEN-008:** si el modelo subestima la congestión del pico,
  también subestima el incumplimiento.
- **Mientras tanto:** se reporta tal cual. La comparación entre escenarios de la
  fase 4 sigue siendo válida en términos **relativos** (todos los escenarios
  comparten el mismo sesgo y las mismas semillas), pero los valores absolutos de
  `Wq` no se pueden presentar como predicción de la espera real.

### PEN-010 — La hipótesis de servicio lento (15,5 s) es sensibilidad, no calibración

- **Origen:** fase 2, DEC-025.
- **Qué es:** un escenario de sensibilidad con tiempo medio de atención de
  **15,5 s** y el mismo coeficiente de variación del servicio medido
  (`k = 4,68`, `θ = 15,5 / 4,68 = 3,3120 s`), aplicado solo a escenarios de pico.
  El modelo base **no cambia**: sigue en 12,1016 s con `θ = 2,58 s`.
- **Por qué 15,5 s y no otro valor:** es el tiempo medio que haría falta para que
  las casetas que el operador tuvo abiertas en el festivo estuvieran ocupadas
  todo el tiempo atendiendo los 1.064 vehículos contados. Era el "servicio
  implícito" que la fase 1 derivó suponiendo cola única.
- **Actualizado el 30/10/2026 (DEC-042): la derivación vuelve a ser válida.** La
  DEC-024 la había anulado porque "solo vale en cola única"; la columna `cola`
  **es** el total en espera de la cola única, así que el supuesto que la
  derivación necesitaba es el que los datos tienen. El 15,5 s deja de ser un
  número anulado y pasa a tener sustento: es el servicio que hace cuadrar la
  capacidad abierta con la cola que de verdad se midió.
- **Lo que sigue igual, y es lo que importa:** el 15,5 s **no es una medición**.
  Se deriva de un balance de capacidad, no de cronometrar atenciones, y descansa
  en suponer que toda la holgura del pico se explica por el servicio y nada por
  el desbalance o por el conteo (las otras dos hipótesis de PEN-008). Por eso el
  escenario **sigue siendo de sensibilidad** y no pasa a calibración: lo que
  cambia es que ahora tiene un sustento que antes estaba anulado, no su estatus.
- **Qué pendiente responde:** cuál de las tres hipótesis de PEN-008 explica la
  congestión del festivo. El escenario aísla la primera (servicio más lento). Si
  con 15,5 s la simulación reprodujera la congestión observada, la hipótesis 1
  quedaría como candidata; si no, apunta a la 2 (desbalance) o la 3.
- **Reglas de uso, que son parte de la decisión:**
  - Vive en `parametros.js` como parámetro de escenario y **nunca** es el valor
    por defecto.
  - Se aplica solo a escenarios de pico (festivo y, en la fase 4, temporada
    alta). Los conteos normales siguen en 12,1016 s.
  - Se reporta **siempre junto al caso base** y rotulado como hipótesis de
    sensibilidad.
- **Lo que no se puede hacer con él:** presentarlo como el servicio real del
  peaje, usarlo para dimensionar la política recomendada, o quitarle el rótulo.
  Eso sería la calibración que la sección 6 del contexto prohíbe.
- **Qué haría falta para cerrarlo:** medir tiempos de atención en un festivo y en
  el sentido Pamplona→Cúcuta.

### PEN-011 — El defecto de la regla era la latencia ✅ CERRADO

- **Origen:** experimentos de la fase 2 (`docs/resultados/fase2-regla.md`).
- **Qué decía:** con servicio base (12,10 s) el operador y la regla cumplen el
  criterio en los cuatro conteos, y en el festivo la regla quedaba ligeramente
  **peor**: `Wq` 0,32 contra 0,28 min. El diagnóstico era que la regla es
  **reactiva** —espera a que la cola cruce el umbral y después tarda la demora de
  5 min en abrir— mientras el operador fue **anticipativo**: abrió la quinta
  caseta al empezar el intervalo 6 sin esperar a que la cola lo exigiera. Con
  demora 0 la regla sí mejoraba al operador (0,19 contra 0,28), lo que ya
  apuntaba a que la diferencia era el retardo y no los umbrales.
- **Qué quedaba abierto:** si convenía añadirle a la regla un disparador
  anticipativo por tasa de llegadas. El contexto trae la derivación en la
  sección 4 (abrir la 2.ª con 21 llegadas/5 min, la 3.ª con 46, la 4.ª con 70 y
  la 5.ª con 95), pero la DEC-006 había decidido disparar por cola y descartado
  la tasa. La DEC-028 dejó la pregunta para la fase 7 y la DEC-044 la recomendó
  sin medirla.
- **Cerrado el 30/10/2026 por DEC-046: sí convenía, y el diagnóstico era
  correcto.** El disparador está implementado y medido:

  | | Festivo, servicio base | Festivo, servicio lento |
  |---|---|---|
  | operador | 0,28 min | 2,90 min |
  | regla por cola | 0,32 min | 1,23 min |
  | **regla + tasa** | **0,23 min** | **1,19 min** |

  Con el servicio base la regla **pasa por delante del operador**, que es
  exactamente lo que este pendiente decía que no conseguía. Cuesta 1,7
  carriles-intervalo y hace 1,63 aperturas anticipadas por réplica.
- **Y confirma el mecanismo por una tercera vía.** Con el servicio lento el
  disparador apenas mueve nada (1,23 → 1,19 min, 0,03 aperturas anticipadas),
  porque con la cola ya desbordada el umbral de cola se cruza solo y **no queda
  nada que anticipar**. Es decir: el disparador sirve justo donde el operador le
  ganaba a la regla, y es inerte donde la regla ya ganaba. Si la causa hubiera
  sido otra —los umbrales, por ejemplo— no habría por qué esperar ese patrón.
- **Lo que este pendiente NO resuelve, y hay que llevarse:** el disparador mejora
  el punto de operación y **no compra holgura de capacidad**. El punto de quiebre
  sigue en **×1,10** con el pozo de 6, exactamente igual que sin él
  (`fase4-escenarios.md`). No añade casetas: reparte en el tiempo las que ya hay.
- **Y una contrapartida en el pozo compartido:** P→C baja de 0,35 a 0,23 min,
  pero C→P pierde 0,7 carriles-intervalo y el pozo queda agotado 8,4 min más.
  Parte de la mejora sale de pedir antes las casetas que el otro sentido podría
  usar (`fase3-reparto.md`). Con la demanda de C→P sin medir (PEN-013), cuánto
  importa eso no se sabe.
- **No se tocaron los umbrales de cola** para que la regla ganara (DEC-021): lo
  que se añadió es un disparador nuevo con los umbrales que el contexto ya traía
  derivados.

### PEN-012 — La ventana de 15 min hace que la regla gaste más carriles-intervalo que el operador

- **Origen:** experimentos de la fase 2.
- **Qué pasa:** sumando los cuatro conteos con servicio base, la regla gasta
  **130,0 carriles-intervalo contra 121,0** del operador, un 7,4 % más. El caso
  extremo es domingoPC: **21,0 contra 14,0**, un 50 % más, porque el operador
  bajó a 1 caseta en el intervalo 3 y se quedó ahí, mientras la regla tardó casi
  una hora en poder cerrar.
- **Por qué:** para cerrar, la cola tiene que mantenerse bajo el umbral 15 min
  **seguidos**, y el conteo se reinicia cada vez que sube (DEC-007) o cambia `c`
  (DEC-026, punto 3). Con demanda baja la cola roza el umbral de vez en cuando y
  cada repunte reinicia la espera.
- **Es el precio de la histéresis, no un defecto:** la ventana está justamente
  para que no se abra y cierre a cada rato, que sería inoperable. El resultado
  cuantifica cuánto cuesta.
- **Qué está abierto:** si 15 min es el valor adecuado, y si el costo en
  personal de ese 7,4 % compensa. El parámetro `ventanaCierreSegundos` ya es
  editable; la fase 4 puede correrlo como sensibilidad, igual que la demora.
- **Mientras tanto:** se deja en los 15 min del contexto. **No se ajustó.**

### PEN-013 — El sustituto de la demanda de Cúcuta→Pamplona se midió en el sentido contrario

- **Origen:** fase 3. La sección 7 del contexto fija que la demanda de
  Cúcuta→Pamplona en el festivo **no se midió** y que se use el conteo del
  domingo 1:00–2:00 p. m. (195 veh/h) como sustituto.
- **Qué pasa:** ese conteo (`domingoPC`) se tomó en **Pamplona→Cúcuta**, que es
  justo el sentido opuesto al que sustituye. Se está usando el flujo de un
  sentido para representar al otro, en otro día y otra franja horaria. Es un
  **supuesto de similitud de flujo, no una medición de C→P.**
- **Por qué importa aquí y no antes:** en las fases 1 y 2 cada sentido se
  simulaba solo, así que este dato no entraba. En la fase 3 los dos sentidos
  compiten por el pozo de 6 casetas, y **cuánta demanda tiene C→P decide cuántas
  casetas le quedan a P→C**. Todo el resultado del reparto cuelga de este
  supuesto.
- **Mientras tanto:** se usa `domingoPC` tal cual, como fija el contexto, y el
  sustituto es un **parámetro** (`parametros.sustitutoFestivoCP`). La fase 3 lo
  corre además con `domingoCP` (451 veh/h), que es el conteo de un domingo en el
  sentido **correcto** C→P, para ver cuánto cambia la conclusión. Ese segundo
  caso no lo prevé la sección 7 y va rotulado como sensibilidad.
- **Qué haría falta:** contar C→P en un festivo, en la misma franja en que se
  contó P→C.
- **Ojo con la lectura:** el retorno de un festivo es asimétrico por naturaleza
  (la gente vuelve a la ciudad), así que es esperable que C→P tenga **menos**
  demanda que P→C en esa franja. Usar los 195 veh/h de un domingo normal podría
  estar sobreestimando o subestimando el contraflujo; no hay forma de saberlo
  con los datos que hay.

### PEN-014 — La reasignación por ρ favorece sistemáticamente al sentido con menos casetas

- **Origen:** experimentos de la fase 3 (`docs/resultados/fase3-reparto.md`).
- **Qué pasa:** ρ se define como llegadas de los últimos 5 min ÷ (c × 24,8), o
  sea que **divide por el número de casetas abiertas**. Con `c = 1` basta una
  demanda de 15 veh/5 min para pasar del 0,60. En el festivo, C→P con su único
  carril tiene ρ ≈ 0,66 aunque su demanda (195 veh/h) sea **una quinta parte**
  de la de P→C (1.064 veh/h), que con 5 casetas tiene ρ ≈ 0,72.
- **Consecuencia medida:** como la reasignación solo ofrece la caseta al **otro**
  sentido, y C→P casi nunca libera (tiene 1 o 2), el traspaso va casi siempre de
  P→C hacia C→P. Con servicio base, activar la reasignación mueve 2,8
  carriles-intervalo a C→P y **empeora** la espera de P→C de 0,35 a 0,44 min,
  ensanchando la brecha contra el operador de 0,07 a 0,16 min. Es decir: la
  reasignación perjudica al sentido congestionado.
- **Por qué no es un error del motor:** es exactamente lo que dice la DEC-008.
  ρ mide **utilización**, no demanda absoluta, y un carril con 0,66 de
  utilización está más cargado *por carril* que cinco con 0,72. La regla está
  repartiendo bien según su propio criterio; lo que pasa es que ese criterio no
  distingue "este sentido necesita otra caseta" de "este sentido tiene poca
  capacidad porque poca necesita".
- **Mientras tanto:** se deja tal cual. **No se tocó el 0,60 ni la definición de
  ρ**, que son del contexto (DEC-008). El informe reporta el efecto, y los
  escenarios se corren con y sin reasignación para que la diferencia esté a la
  vista.
- **Qué está abierto:** si la condición de reasignación debería mirar también la
  cola o la espera estimada del sentido que recibe, no solo su ρ. Con los
  umbrales del contexto, un sentido con cola 0 y 1 caseta puede quitarle una
  caseta a otro con 30 vehículos esperando. Cambiarlo exige una decisión nueva
  que diga qué supera de la DEC-008; **no se reabre aquí**.
- **Ojo con la lectura:** con servicio lento esto no se ve, porque los dos
  sentidos están saturados, nadie libera nada y la reasignación **no se activa
  ni una vez** en las 30 réplicas. El efecto solo aparece cuando hay holgura
  para que alguien cierre una caseta.

### PEN-015 — La reasignación por ρ casi no se activa en el pico

- **Origen:** experimentos de la fase 3.
- **Qué pasa:** en el festivo el pozo está agotado entre 56 y 60 de los 60
  minutos de la hora. Con servicio base hay 0,8 reasignaciones por réplica; con
  servicio lento, **0,00**: los resultados con y sin reasignación son idénticos
  hasta el último decimal.
- **Por qué:** la DEC-008 reasigna **al liberarse** una caseta, y en el pico
  nadie libera: los dos sentidos tienen cola y la ventana de cierre de 15 min no
  se cumple nunca. La regla de reparto existe pero no tiene ocasión de aplicarse
  justo en el escenario para el que se diseñó.
- **La sensibilidad `ofrecerPozoPorRho` tampoco ayuda:** ofrecer las casetas que
  ya están libres en el pozo sube las reasignaciones de 0,8 a 1,5 por réplica y
  deja la espera del peaje casi igual (0,43 → 0,37 min en P→C, 0,34 → 0,35 en
  C→P). Es poco porque el pozo tampoco tiene casetas libres que ofrecer.
- **Qué está abierto:** si el reparto entre sentidos debería poder **quitar** una
  caseta a un sentido para dársela al otro, en vez de esperar a que la suelte.
  Eso no es lo que dice la DEC-008 y tendría que respetar el no interrumpir
  servicios (DEC-007). **No se decide aquí.**
- **Mientras tanto:** se reporta que la reasignación es casi inerte en el pico, y
  el escenario sin reasignación queda como la comparación honesta.

### PEN-016 — La cola inicial le hace de aviso temprano a la regla: quitarla empeora la espera

- **Origen:** sensibilidad E4 de la fase 4 (`docs/resultados/fase4-escenarios.md`).
- **Qué pasa:** arrancar el festivo **sin** los 23 vehículos en cola, que era una
  sensibilidad pensada para ver cuánto pesaba el rezago, **empeora** la espera de
  P→C: pasa de 0,47 a 1,07 min con servicio base, y la del peaje de 0,47 a
  0,91 min. Con servicio lento el efecto es mayor (+1,56 min en el peaje).
- **Por qué, con los números al lado:** con la cola inicial, P→C abre **1,40**
  casetas de media y acumula **53,4** carriles-intervalo; empezando vacío abre
  **0,67** y se queda en **48,4**. La cola de arranque está cruzando el umbral de
  apertura en `t = 0` y disparando la orden de abrir antes de que el pico llegue.
  Sin ella, el umbral se cruza más tarde, y cuando la caseta abre cinco minutos
  después, la cola ya creció.
- **Y encima la pierde el que la necesita:** la caseta que P→C no pide se la
  queda C→P, que pasa de 15,4 a 19,8 carriles-intervalo y baja su espera de 0,48
  a 0,21 min. Es PEN-014 otra vez: con una sola caseta, C→P siempre tiene ρ por
  encima del 0,60.
- **Qué junta esto:** es PEN-011 (la regla es reactiva y el operador era
  anticipativo) y PEN-014 (ρ favorece al sentido con menos casetas) actuando a la
  vez, y medido.
- **Lo que NO significa:** que convenga empezar con cola. Significa que la regla
  **depende de que la congestión ya se haya manifestado** para reaccionar. Un
  festivo que arranque con el peaje vacío y la demanda subiendo es el caso malo
  para esta política, no el bueno.
- **Mientras tanto:** se reporta tal cual. **No se tocó nada.** La sensibilidad
  queda en la matriz con su explicación generada.
- **Resuelto en parte el 30/10/2026 (DEC-046).** Lo que estaba abierto aquí era
  lo mismo que en PEN-011: el disparador anticipativo por tasa de llegadas. Ya
  está implementado y medido, y **cerrado PEN-011**. Este pendiente fue una de
  las tres vías que lo justificaron: si lo que salva a P→C es tener cola
  **antes** de empezar, un aviso temprano es exactamente lo que falta.
- **Qué sigue abierto aquí:** el disparador **no elimina** la dependencia que
  este pendiente señala. Durante los primeros 5 min la ventana móvil está a medio
  llenar, así que tampoco puede disparar a plena potencia justo en el arranque
  (limitación declarada en DEC-046). El caso malo de esta política sigue siendo
  un festivo que arranque con el peaje vacío y la demanda subiendo; lo que cambia
  es que ahora hay un mecanismo que reacciona a la demanda y no solo a la cola.
  Medir ese caso con el disparador encendido queda pendiente.

### PEN-017 — La interfaz reproduce una traza completa, así que el horizonte está acotado por la memoria

- **Origen:** fase 5, DEC-033.
- **Qué pasa:** el modo tiempo real graba la réplica entera antes de reproducirla.
  Una hora simulada del festivo son unos **4.300 eventos**, que en memoria no es
  nada, y la réplica tarda decenas de milisegundos. Pero el tamaño de la traza
  crece con el horizonte y con la demanda: un horizonte de 12 horas con demanda
  ×1,5 serían del orden de 10⁵ eventos.
- **Mientras tanto:** con el horizonte del estudio (12 intervalos de 5 min) no
  hay problema, y la ventaja de poder pausar y **rebobinar** compensa de sobra.
- **Qué haría falta si el horizonte creciera:** grabar por tramos y reproducir a
  medida que se graba, o grabar solo los eventos de caseta y las lecturas de
  cola, reconstruyendo los vehículos por interpolación. Lo segundo rompería la
  fase 6, que necesita los vehículos uno a uno.
- **Qué está abierto:** nada que haga falta ahora. Queda anotado para que quien
  suba el horizonte sepa qué va a encontrarse.

### PEN-018 — La hora del conteo se lee de la etiqueta del dato, no de un campo propio

- **Origen:** fase 5. El modo tiempo real muestra el reloj simulado como la hora
  real del conteo más el tiempo transcurrido (el festivo arranca a las 16:25).
- **Qué pasa:** esa hora de arranque **no está como campo** en `datos.js`: se lee
  de la etiqueta del conteo (`'Festivo 12/10/2026, Pamplona→Cúcuta, 16:25–17:25'`)
  con una expresión regular.
- **Por qué se hizo así:** el tramo horario es parte del dato de campo y ya está
  en el documento de contexto; añadir un campo `horaInicio` sería duplicarlo, y
  `datos.js` es transcripción de la fuente de verdad, que no se edita por
  comodidad de la interfaz.
- **El riesgo:** si alguien reescribe una etiqueta y le cambia el formato de la
  hora, el reloj dejará de mostrarla. **No se rompe nada**: la función devuelve
  `null` y la interfaz muestra solo el tiempo simulado.
- **Qué haría falta para cerrarlo:** que el contexto declare la hora de inicio
  como dato aparte, y entonces transcribirla a `datos.js` como campo.

### PEN-019 — El rendimiento de la vista 3D solo está medido con WebGL por software

- **Origen:** fase 6; revisado con el modelo del carro (DEC-040).
- **Qué pasa:** el contenedor en el que se desarrolló **no tiene GPU**. Las
  medidas de dibujado se tomaron con SwiftShader (WebGL por software), y dan
  entre **74 y 118 ms por fotograma** en calidad alta con las cajas de la fase 6,
  o sea 8 a 13 fotogramas por segundo, a 1280×720 y 60×.
- **Con el modelo del carro** las medidas en ese mismo contenedor se van a
  **30–1 200 ms por fotograma** según el encuadre, y son tan ruidosas que no
  sirven para comparar calidades: en una tanda la calidad media (3 043
  triángulos por coche) salió **más lenta** que la alta (10 727), que es
  imposible y delata que lo que se está midiendo es el rasterizador por
  software, no la escena. Lo que sí se puede afirmar es lo que se cuenta: seis
  objetos de dibujo y 10 727 triángulos por vehículo en calidad alta, 3 043 en
  media.
- **Lo que sí está medido y sí vale:** la lógica de la escena cuesta **0,01 ms
  por fotograma** de mediana (p95 0,03 ms) en el festivo, y 0,009 ms (p95 0,04)
  en el estrés con pozo 10 y demanda ×1,6. O sea que el coste está **todo en el
  dibujado**, no en traducir la traza.
- **Lo que no se pudo comprobar:** que en un equipo con GPU vaya fluido. Es
  probable —seis objetos de dibujo y hasta unas cien instancias, poco más de un
  millón de triángulos por fotograma en el peor caso— pero **no se midió**, y no
  se afirma.
- **Mientras tanto:** hay selector de calidad (alta, media, baja) que reduce
  sombras, segmentos de las figuras, cuántos vehículos de la cola se dibujan y
  **cuánto detalle del modelo del carro** se carga (en baja, cajas); y la vista
  3D se puede ocultar, con todo lo demás funcionando igual.
- **Qué haría falta:** abrir la interfaz en un equipo con GPU y leer el contador
  de ms/fotograma que el propio panel muestra.

### PEN-020 — El embudo de la cola puede leerse como una fila por caseta

- **Origen:** fase 6, revisión de las capturas.
- **Qué pasa:** el modelo es de **cola única** por sentido (DEC-001), pero una
  cola de 45 vehículos dibujada en una sola fila no cabe en pantalla. Se dibuja
  en un bloque de **7 hileras**, y a primera vista eso puede confundirse con una
  fila por caseta, que es justo lo que el modelo **no** tiene.
- **Qué se hizo para evitarlo (DEC-038, punto 1):** el bloque se mantiene **más
  estrecho que la línea de casetas** y su número de hileras **no coincide** con
  el número de casetas (7 hileras contra 6 o 10 casetas), así que la
  correspondencia 1:1 no se sostiene ni contando. Además, la escena lleva una
  nota fija que lo dice y la leyenda lo repite.
- **Qué está abierto:** si conviene dibujarla en una sola fila larga y mover la
  cámara, que sería inequívoco pero obligaría a alejarse tanto que los letreros
  dejarían de leerse. Se probó y se descartó por eso.
- **Mientras tanto:** se deja el bloque con su rótulo. Si en la fase 7 alguien
  usa una captura en el documento del estudio, conviene que lleve el pie de
  "cola única; las hileras son solo para que quepa".
- **Nota del 30/10/2026 (DEC-042):** este pendiente **no cambia**. Su razón es
  visual —que el dibujo no sugiera una estructura que el modelo no tiene— y es
  independiente de cómo se midió la cola en campo.

### PEN-021 — El archivo del carro pesa 10,9 MB y se descarga entero

- **Origen:** DEC-040, al usar `public/models/carro.glb`.
- **Qué pasa:** de los 10,9 MB del archivo, **5,1 MB son texturas PNG** que la
  escena **no usa**: los 26 materiales se reducen a seis materiales planos
  porque a la escala de la escena un coche ocupa unos pocos píxeles. Aun así el
  navegador se descarga el archivo entero, texturas incluidas, porque se usa tal
  como la usuaria lo puso.
- **Qué se hizo para que no moleste:** la vista 3D entera va con carga diferida,
  así que el archivo **solo se pide al abrirla**; mientras llega se dibujan
  cajas, y si falla la carga se siguen dibujando cajas con un aviso en texto.
- **Qué está abierto:** generar un `.glb` derivado sin texturas y ya
  simplificado (quedaría en unos cientos de kB) sería mucho más rápido de
  descargar, pero significa **añadir un archivo derivado** al repositorio y
  decidir cómo se regenera cuando cambie el original. No se hizo por no tocar el
  activo de la usuaria ni meter un paso de construcción sin que lo decida ella.
- **Mientras tanto:** se deja el archivo tal cual, y la cuenta de triángulos que
  el panel muestra deja claro cuánto se está tirando al cargarlo.

### PEN-022 — El coche queda pequeño al lado de las casetas

- **Origen:** DEC-040, revisión de las capturas.
- **Qué pasa:** el modelo se escala al **largo de vehículo de la escena** (1,8
  unidades), que es el que tenía la caja de la fase 6 y el que casa con la
  separación de 2 unidades entre vehículos de la cola. Con las proporciones
  reales de un coche eso da 0,68 de ancho y 0,49 de alto, contra una cabina de
  caseta de 2,6 de alto: en la escena el coche se ve **más pequeño respecto a la
  caseta** de lo que se vería en el peaje real.
- **Por qué no se tocó:** la escena **no está a escala** y nunca lo estuvo
  (DEC-038): las distancias son esquemáticas y la separación de la cola está
  elegida para que quepan 45 vehículos en pantalla. Agrandar el coche lo haría
  solaparse con el de delante; achicar las casetas es cambiar el trazado que se
  fijó en la fase 6, y eso no entra en «usar el modelo del carro».
- **Mientras tanto:** `carro.factorDeLargo` en `src/config/escena3d.js` permite
  probarlo en un momento; si se sube, hay que subir también `cola.separacion`.
