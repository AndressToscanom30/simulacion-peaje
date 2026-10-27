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
