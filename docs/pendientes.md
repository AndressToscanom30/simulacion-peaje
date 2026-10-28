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

### PEN-002 — La espera observada del festivo (1,28 min) no se reproduce, y ya no se puede recalcular

- **Origen:** fase 1. El contexto declara en la sección 6 una espera observada de
  1,28 min en el festivo contra 0,06 min del M/M/c (unas 20 veces).
- **Estado: parcialmente cerrado por DEC-024.** Cuando se abrió este pendiente se
  intentó reconstruir el 1,28 aplicando la fórmula de la sección 3
  (`Wq_est = Lq × 12,1 / c`) a las lecturas de cola, y salía 1,01 min. **Ese
  recálculo queda anulado:** las lecturas son la fila más larga de una sola
  caseta, no la cola total del sentido, y la fórmula espera un total. Aplicada a
  una fila da una cifra sin interpretación. El recálculo se quitó del informe de
  validación.
- **Qué sigue abierto:** no se sabe cómo se obtuvo el 1,28 min ni, por tanto,
  contra qué se está comparando la simulación. Puede ser una espera medida en
  campo (que sí sería comparable) o una estimada a partir de la cola total (que
  nunca se registró).
- **Mientras tanto:** en el informe se imprime el valor declarado (1,28 min) como
  referencia del contexto, sin recálculo al lado, y la comparación se presenta
  como lo que es: una razón contra un valor cuyo origen no está documentado.
- **Qué haría falta:** que quede escrito cómo se calculó el 1,28.

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
- **Añadido el 27/10/2026:** DEC-024 fija además que la lectura observada es la
  fila más larga de **una** caseta, no el total del sentido, así que ni siquiera
  el máximo muestreado es comparable de frente. Ver PEN-008.

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

- **Origen:** validación de la fase 1. **Reescrito el 27/10/2026** tras DEC-024,
  que fija que las lecturas de cola son la fila más larga de una caseta.
- **Qué pasa, ahora con el criterio correcto:** como la cola total de un sentido
  es mayor o igual que cualquiera de sus filas, donde la cola **total** simulada
  queda por debajo de la **fila más larga** observada el modelo subestima con
  certeza. Y eso pasa en el festivo en los **12 de 12 intervalos** en media, y en
  **8 de 12** ni la más congestionada de las 30 réplicas alcanza la lectura de
  campo. En los cuatro conteos juntos son 21 de 48 intervalos en media y 10 de 48
  en las 30 réplicas. El desglose está en `docs/resultados/diagnostico-festivo.md`
  (`npm run diagnostico`).
- **En espera:** `Wq` sale 0,28 min en el festivo contra los 1,28 min declarados,
  4,6 veces corto. El M/M/c estaba 22 veces corto, así que la simulación cierra
  parte de la brecha pero no toda. Ojo con esta comparación: el origen del 1,28
  no está documentado (PEN-002).
- **Tres explicaciones posibles, ninguna descartable con los datos que hay:**
  1. El servicio en el pico fue más lento que los 12,10 s medidos. Los 50 tiempos
     son de otro sentido y otro día (limitación declarada en la sección 8). Esta
     hipótesis entra como escenario de sensibilidad en DEC-025 y PEN-010.
  2. **La más probable:** las filas estaban desbalanceadas entre casetas, y la
     cola única no lo reproduce (también declarado en la sección 8). Con filas
     por caseta puede haber una caseta libre y otra con 30 vehículos a la vez,
     que es exactamente lo que el modelo de cola única no puede representar.
  3. Las lecturas cuentan vehículos que el modelo no cuenta (motocicletas, o
     vehículos de TAG en la misma fila).
- **Lo que este pendiente ya NO afirma:** la fase 1 había derivado de aquí un
  "tiempo de servicio implícito" de ≈ 15,5 s, razonando que haber cola implica
  casetas ocupadas. Eso **solo vale en cola única** y queda anulado por DEC-024
  (consecuencia 5): con filas por caseta la holgura de capacidad se explica por
  el desbalance sin necesidad de suponer un servicio más lento. El cálculo se
  quitó del informe.
- **Mientras tanto:** **no se tocó ningún parámetro** (DEC-021). Se reporta la
  diferencia y se sigue.
- **Qué haría falta:** registrar la **cola total por sentido** (y, mejor, por
  caseta) en un conteo de pico. Sin eso la validación de la cola no puede pasar
  de la desigualdad.
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
  implícito" que la fase 1 derivó suponiendo cola única. **Esa derivación ya no
  se sostiene** (DEC-024, consecuencia 5): con filas por caseta la holgura se
  explica por el desbalance. Así que el 15,5 s **no es una estimación del
  servicio real**, solo un valor de referencia que marca cuánto más lento tendría
  que ser el servicio para explicar el pico por esa vía en lugar de por el
  desbalance.
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

### PEN-011 — Con el servicio medido, la regla no mejora al operador, y en el festivo queda algo peor

- **Origen:** experimentos de la fase 2 (`docs/resultados/fase2-regla.md`).
- **Qué pasa:** con servicio base (12,10 s) el operador y la regla cumplen el
  criterio en los cuatro conteos, y en el festivo la regla queda ligeramente
  **peor**: `Wq` 0,32 contra 0,28 min, y cola máxima continua 36,1 contra 29,3.
- **Por qué, con lo que se ve en las tablas:** la regla es **reactiva**. Espera a
  que la cola pase el umbral y después tarda la demora de 5 min en tener la
  caseta abierta. El operador fue **anticipativo**: abrió la quinta caseta al
  empezar el intervalo 6 sin esperar a que la cola lo exigiera. Con demora 0 la
  regla sí mejora al operador (`Wq` 0,19 contra 0,28), lo que confirma que la
  diferencia es el retardo de reacción y no los umbrales.
- **Mientras tanto:** se reporta tal cual. **No se tocaron los umbrales** para
  que la regla ganara.
- **Qué está abierto:** si conviene añadirle a la regla un disparador
  anticipativo. El contexto trae en la sección 4 una derivación por tasa de
  llegadas (abrir la 2.ª en 21 llegadas/5 min, la 3.ª en 46, la 4.ª en 70, la
  5.ª en 95) que serviría justo para eso, pero DEC-006 decidió disparar por cola
  y descartó disparar por tasa. **No se reabre aquí**: queda anotado para la
  interpretación de la fase 7, y si se decidiera añadirlo haría falta una
  decisión nueva que diga qué supera.
- **Ojo con la lectura:** este resultado vale en el régimen donde, según el
  modelo, no hay problema que resolver (PEN-009). Con servicio lento la regla
  mejora mucho al operador.

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
