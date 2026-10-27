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
