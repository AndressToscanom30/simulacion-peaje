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

### PEN-002 — La espera observada del festivo (1,28 min) no se reproduce con la fórmula del contexto

- **Origen:** fase 1. El contexto declara en la sección 6 una espera observada de
  1,28 min en el festivo contra 0,06 min del M/M/c (unas 20 veces).
- **Qué pasa:** al aplicar la fórmula de la sección 3 (`Wq_est = Lq × 12,1 / c`)
  a las lecturas de cola del festivo, intervalo por intervalo y con la `c` de
  cada intervalo, sale **1,01 min**, no 1,28. Con la cola media de la hora
  (22,67) y `c = 5` sale 0,91 min. No se encontró una combinación que dé 1,28.
- **Mientras tanto:** en la validación se imprime el valor declarado (1,28 min)
  como referencia del contexto y, al lado, el recalculado (1,01 min), con la
  diferencia a la vista. **No se cambió ningún dato ni ninguna fórmula.**
- **Qué haría falta:** saber cómo se calculó el 1,28 (¿otra `c`? ¿otra media de
  cola? ¿espera medida en campo y no estimada?).

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

### PEN-008 — La simulación no reproduce la cola sostenida del festivo

- **Origen:** validación de la fase 1 (`docs/resultados/validacion-fase1.md`).
- **Qué pasa:** con los parámetros del contexto y las casetas que el operador
  tuvo abiertas, la simulación da `Wq` = **0,28 min** en el festivo contra los
  **1,28 min** declarados: se queda 4,6 veces corta. Mejora mucho sobre el
  M/M/c (0,06 min, 22 veces corto), pero no cierra la brecha. La cola al final
  de la hora sale **0 en las 30 réplicas**, contra 14 observados: en la
  simulación la cola se vacía y en campo no.
- **Por qué, en aritmética:** los 55 carriles-intervalo del festivo son 16.500
  segundos-caseta. A 12,1016 s por vehículo eso da capacidad para 1.363
  vehículos, y solo entraron 1.064 + 23 = 1.087. Sobra un 25 % de capacidad y la
  utilización implícita es del 78 %. En una cola **única** eso es incompatible
  con una cola sostenida de 14 a 32 vehículos: no puede haber vehículos
  esperando y casetas libres al mismo tiempo. Si la cola fue real, las casetas
  estuvieron ocupadas casi todo el tiempo, y atender 1.064 vehículos con 16.500
  segundos-caseta exigiría un tiempo medio de atención de **≈ 15,5 s**, no de
  12,10 s.
- **Tres explicaciones, ninguna descartable con los datos que hay:**
  1. El servicio del festivo fue más lento que los 12,10 s medidos. Los 50
     tiempos son de otro sentido y otro día (limitación ya declarada en la
     sección 8). Harían falta ≈ 15,5 s.
  2. La cola estaba desbalanceada entre casetas (también declarado en la
     sección 8). Con colas por caseta sí puede haber una caseta libre y
     vehículos esperando en otra fila.
  3. Las lecturas de cola cuentan vehículos que el modelo no cuenta
     (motocicletas, o vehículos de TAG en la misma fila).
- **Mientras tanto:** **no se tocó ningún parámetro.** Subir el tiempo de
  atención a 15,5 s haría cuadrar el festivo y es justo lo que el contexto
  prohíbe en la sección 6. Se reporta la diferencia y se sigue.
- **Qué haría falta:** medir tiempos de atención en un festivo y en el sentido
  Pamplona→Cúcuta, o registrar la cola por caseta en vez del total del sentido.
- **Consecuencia para las fases siguientes:** la regla de la fase 2 se va a
  dimensionar sobre un modelo que subestima la congestión del pico. Las casetas
  que recomiende hay que leerlas como una **cota inferior**.

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
