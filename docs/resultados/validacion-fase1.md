# Validación de la fase 1

Generado por `npm run simular` el 2026-10-27.
**No editar a mano:** este archivo se regenera.

Motor de **un sentido** con `c(t)` programado, copiando las casetas que el
operador tuvo abiertas en cada intervalo del conteo. Cada caso son
**30 réplicas** con semillas 1 a 30 (DEC-010).

> Los parámetros son los del contexto y **no se tocaron** para que la
> simulación cuadre con lo observado. Donde hay diferencia, está reportada
> aquí y anotada en `docs/pendientes.md`.

## Configuración de la corrida

| Parámetro | Valor |
|---|---|
| Servicio | gamma k = 4,68, θ = 2,58 s |
| Media de servicio | 12,1016 s (μ = 297,48 veh/h por caseta) |
| Llegadas | Poisson por tramos de 300 s, factor de demanda 1 |
| Horizonte | 3600 s (12 intervalos de 5 min) |
| Réplicas | 30 (semillas 1…30) |
| Máximo tolerable | 2,5 min |
| Meta | 1 min |
| PRNG | mulberry32 con semilla (sin `Math.random`) |

## Resumen por conteo

`±` es la semiamplitud del intervalo de confianza al 95 % de la media entre réplicas.

| Conteo | Llegadas obs. | Llegadas sim. | Caudal sim. (sal./h) | Cola máx. obs. | Cola máx. muestreada | Cola máx. continua | Wq obs. decl. | Wq M/M/c | Wq sim. |
|---|---|---|---|---|---|---|---|---|---|
| viernes | 238 | 239,7 ± 5,1 | 239,0 ± 5,1 | 1 | 0,8 (0–6) | 3,7 (2–7) | 0,06 | 0,04 | **0,03** ± 0,004 |
| domingoCP | 451 | 456,5 ± 8,3 | 454,8 ± 8,3 | 7 | 5,8 (0–20) | 9,6 (6–21) | 0,24 | 0,27 | **0,13** ± 0,022 |
| domingoPC | 195 | 192,0 ± 4,1 | 190,8 ± 4,2 | 8 | 4,6 (1–12) | 7,6 (3–16) | 0,41 | 0,38 | **0,28** ± 0,059 |
| festivoPC | 1064 | 1064,4 ± 11,2 | 1085,6 ± 11,2 | 32 | 21,4 (10–45) | 29,3 (23–57) | 1,28 | 0,06 | **0,28** ± 0,043 |
| festivoPC (cola inicial 0) | 1064 | 1063,1 ± 10,5 | 1061,3 ± 10,4 | — | 16,3 (3–33) | 24,4 (9–40) | — | 0,06 | **0,21** ± 0,037 |

Esperas en minutos. `Wq obs. decl.` es el valor declarado en la sección 6 del
contexto; `Wq M/M/c` es el Erlang C de referencia reconstruido según DEC-020.

## Detalle por conteo

### viernes

Viernes 02/10/2026, Cúcuta→Pamplona, 12:00–13:00

- Casetas observadas por intervalo: `[2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]` (moda 2)
- Cola inicial: 0 vehículos
- Carriles-intervalo observados: 24

| Medida | Observado | M/M/c | Simulación (media ± IC 95 %) | Rango entre réplicas |
|---|---|---|---|---|
| Llegadas en la hora (veh) | 238 | — | 239,7 ± 5,1 | 212–275 |
| Caudal: salidas en la hora (veh) | — | — | 239,0 ± 5,1 | 212–275 |
| Wq de la hora (min) | 0,06 | 0,04 | 0,025 ± 0,004 | 0,010–0,057 |
| Wq sin la cola inicial (min) | — | — | 0,025 ± 0,004 | 0,010–0,057 |
| Cola máxima muestreada (veh) | 1 | — | 0,8 ± 0,4 | 0–6 |
| Cola máxima continua (veh) | — | — | 3,7 ± 0,4 | 2–7 |
| Cola al final de la hora (veh) | 0 | — | 0,0 ± 0,0 | 0–0 |
| Intervalos sobre 2,5 min | — | — | 0,0 % | 0,0 %–0,0 % |
| Carriles-intervalo | 24 | — | 24,00 | 24,00–24,00 |
| ρ del M/M/c | — | 0,400 | — | — |

Intervalo por intervalo:

| Intervalo | Llegadas obs. | Casetas obs. | Cola obs. | Cola sim. (media) | Wq sim. (min) |
|---|---|---|---|---|---|
| 1 | 18 | 2 | 0 | 0,0 | 0,018 |
| 2 | 21 | 2 | 0 | 0,0 | 0,022 |
| 3 | 24 | 2 | 1 | 0,3 | 0,032 |
| 4 | 19 | 2 | 0 | 0,1 | 0,024 |
| 5 | 17 | 2 | 0 | 0,0 | 0,013 |
| 6 | 23 | 2 | 1 | 0,1 | 0,026 |
| 7 | 22 | 2 | 0 | 0,1 | 0,028 |
| 8 | 20 | 2 | 0 | 0,0 | 0,022 |
| 9 | 18 | 2 | 0 | 0,1 | 0,015 |
| 10 | 21 | 2 | 1 | 0,0 | 0,031 |
| 11 | 16 | 2 | 0 | 0,0 | 0,014 |
| 12 | 19 | 2 | 0 | 0,0 | 0,019 |

### domingoCP

Domingo 13/09/2026, Cúcuta→Pamplona, 11:50–12:50

- Casetas observadas por intervalo: `[3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3]` (moda 2)
- Cola inicial: 0 vehículos
- Carriles-intervalo observados: 28

| Medida | Observado | M/M/c | Simulación (media ± IC 95 %) | Rango entre réplicas |
|---|---|---|---|---|
| Llegadas en la hora (veh) | 451 | — | 456,5 ± 8,3 | 410–495 |
| Caudal: salidas en la hora (veh) | — | — | 454,8 ± 8,3 | 408–494 |
| Wq de la hora (min) | 0,24 | 0,27 | 0,130 ± 0,022 | 0,067–0,355 |
| Wq sin la cola inicial (min) | — | — | 0,130 ± 0,022 | 0,067–0,355 |
| Cola máxima muestreada (veh) | 7 | — | 5,8 ± 1,3 | 0–20 |
| Cola máxima continua (veh) | — | — | 9,6 ± 1,2 | 6–21 |
| Cola al final de la hora (veh) | 6 | — | 0,0 ± 0,0 | 0–0 |
| Intervalos sobre 2,5 min | — | — | 0,0 % | 0,0 %–0,0 % |
| Carriles-intervalo | 28 | — | 28,01 | 28,00–28,05 |
| ρ del M/M/c | — | 0,758 | — | — |

Intervalo por intervalo:

| Intervalo | Llegadas obs. | Casetas obs. | Cola obs. | Cola sim. (media) | Wq sim. (min) |
|---|---|---|---|---|---|
| 1 | 30 | 3 | 0 | 0,0 | 0,012 |
| 2 | 49 | 3 | 0 | 1,0 | 0,050 |
| 3 | 38 | 2 | 7 | 1,5 | 0,158 |
| 4 | 37 | 2 | 0 | 1,1 | 0,162 |
| 5 | 35 | 2 | 0 | 0,8 | 0,106 |
| 6 | 38 | 2 | 4 | 0,9 | 0,147 |
| 7 | 46 | 2 | 0 | 3,5 | 0,334 |
| 8 | 32 | 2 | 5 | 1,9 | 0,184 |
| 9 | 33 | 2 | 0 | 0,7 | 0,085 |
| 10 | 37 | 2 | 0 | 1,2 | 0,141 |
| 11 | 38 | 3 | 0 | 0,1 | 0,024 |
| 12 | 38 | 3 | 6 | 0,4 | 0,025 |

### domingoPC

Domingo 13/09/2026, Pamplona→Cúcuta, 13:00–14:00

- Casetas observadas por intervalo: `[2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]` (moda 1)
- Cola inicial: 0 vehículos
- Carriles-intervalo observados: 14

| Medida | Observado | M/M/c | Simulación (media ± IC 95 %) | Rango entre réplicas |
|---|---|---|---|---|
| Llegadas en la hora (veh) | 195 | — | 192,0 ± 4,1 | 175–216 |
| Caudal: salidas en la hora (veh) | — | — | 190,8 ± 4,2 | 172–216 |
| Wq de la hora (min) | 0,41 | 0,38 | 0,282 ± 0,059 | 0,112–0,761 |
| Wq sin la cola inicial (min) | — | — | 0,282 ± 0,059 | 0,112–0,761 |
| Cola máxima muestreada (veh) | 8 | — | 4,6 ± 1,1 | 1–12 |
| Cola máxima continua (veh) | — | — | 7,6 ± 1,2 | 3–16 |
| Cola al final de la hora (veh) | 0 | — | 0,0 ± 0,0 | 0–0 |
| Intervalos sobre 2,5 min | — | — | 0,3 % | 0,0 %–8,3 % |
| Carriles-intervalo | 14 | — | 14,01 | 14,00–14,09 |
| ρ del M/M/c | — | 0,656 | — | — |

Intervalo por intervalo:

| Intervalo | Llegadas obs. | Casetas obs. | Cola obs. | Cola sim. (media) | Wq sim. (min) |
|---|---|---|---|---|---|
| 1 | 10 | 2 | 0 | 0,1 | 0,004 |
| 2 | 22 | 2 | 0 | 0,1 | 0,028 |
| 3 | 22 | 1 | 6 | 1,9 | 0,417 |
| 4 | 13 | 1 | 0 | 1,5 | 0,273 |
| 5 | 11 | 1 | 0 | 0,3 | 0,092 |
| 6 | 25 | 1 | 8 | 2,6 | 0,574 |
| 7 | 18 | 1 | 2 | 2,1 | 0,502 |
| 8 | 16 | 1 | 0 | 1,1 | 0,229 |
| 9 | 14 | 1 | 0 | 0,3 | 0,125 |
| 10 | 17 | 1 | 0 | 0,5 | 0,179 |
| 11 | 12 | 1 | 0 | 0,7 | 0,137 |
| 12 | 15 | 1 | 0 | 0,7 | 0,162 |

### festivoPC

Festivo 12/10/2026, Pamplona→Cúcuta, 16:25–17:25

- Casetas observadas por intervalo: `[4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5]` (moda 5)
- Cola inicial: 23 vehículos
- Carriles-intervalo observados: 55

| Medida | Observado | M/M/c | Simulación (media ± IC 95 %) | Rango entre réplicas |
|---|---|---|---|---|
| Llegadas en la hora (veh) | 1064 | — | 1064,4 ± 11,2 | 998–1124 |
| Caudal: salidas en la hora (veh) | — | — | 1085,6 ± 11,2 | 1017–1146 |
| Wq de la hora (min) | 1,28 | 0,06 | 0,276 ± 0,043 | 0,131–0,692 |
| Wq sin la cola inicial (min) | — | — | 0,272 ± 0,044 | 0,125–0,696 |
| Cola máxima muestreada (veh) | 32 | — | 21,4 ± 2,9 | 10–45 |
| Cola máxima continua (veh) | — | — | 29,3 ± 2,8 | 23–57 |
| Cola al final de la hora (veh) | 14 | — | 0,0 ± 0,0 | 0–0 |
| Intervalos sobre 2,5 min | — | — | 0,0 % | 0,0 %–0,0 % |
| Carriles-intervalo | 55 | — | 55,00 | 55,00–55,00 |
| ρ del M/M/c | — | 0,715 | — | — |

Intervalo por intervalo:

| Intervalo | Llegadas obs. | Casetas obs. | Cola obs. | Cola sim. (media) | Wq sim. (min) |
|---|---|---|---|---|---|
| 1 | 92 | 4 | 23 | 17,3 | 0,799 |
| 2 | 78 | 4 | 30 | 9,7 | 0,437 |
| 3 | 60 | 4 | 20 | 1,6 | 0,078 |
| 4 | 108 | 4 | 26 | 5,3 | 0,326 |
| 5 | 92 | 4 | 21 | 9,4 | 0,429 |
| 6 | 124 | 5 | 32 | 10,8 | 0,400 |
| 7 | 78 | 5 | 20 | 4,0 | 0,159 |
| 8 | 102 | 5 | 15 | 1,2 | 0,075 |
| 9 | 86 | 5 | 17 | 1,0 | 0,043 |
| 10 | 101 | 5 | 28 | 1,2 | 0,049 |
| 11 | 99 | 5 | 26 | 1,8 | 0,083 |
| 12 | 44 | 5 | 14 | 0,2 | 0,005 |

### festivoPC_cola0

Festivo 12/10/2026, Pamplona→Cúcuta, 16:25–17:25 — variante con cola inicial 0

- Casetas observadas por intervalo: `[4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5]` (moda 5)
- Cola inicial: 0 vehículos
- Carriles-intervalo observados: 55

| Medida | Observado | M/M/c | Simulación (media ± IC 95 %) | Rango entre réplicas |
|---|---|---|---|---|
| Llegadas en la hora (veh) | 1064 | — | 1063,1 ± 10,5 | 1003–1115 |
| Caudal: salidas en la hora (veh) | — | — | 1061,3 ± 10,4 | 1000–1114 |
| Wq de la hora (min) | — | 0,06 | 0,207 ± 0,037 | 0,053–0,461 |
| Wq sin la cola inicial (min) | — | — | 0,207 ± 0,037 | 0,053–0,461 |
| Cola máxima muestreada (veh) | — | — | 16,3 ± 2,8 | 3–33 |
| Cola máxima continua (veh) | — | — | 24,4 ± 2,9 | 9–40 |
| Cola al final de la hora (veh) | 14 | — | 0,0 ± 0,0 | 0–0 |
| Intervalos sobre 2,5 min | — | — | 0,0 % | 0,0 %–0,0 % |
| Carriles-intervalo | 55 | — | 55,00 | 55,00–55,00 |
| ρ del M/M/c | — | 0,715 | — | — |

Intervalo por intervalo:

| Intervalo | Llegadas obs. | Casetas obs. | Cola obs. | Cola sim. (media) | Wq sim. (min) |
|---|---|---|---|---|---|
| 1 | 92 | 4 | 23 | 2,2 | 0,139 |
| 2 | 78 | 4 | 30 | 1,8 | 0,106 |
| 3 | 60 | 4 | 20 | 0,2 | 0,029 |
| 4 | 108 | 4 | 26 | 6,2 | 0,393 |
| 5 | 92 | 4 | 21 | 11,2 | 0,600 |
| 6 | 124 | 5 | 32 | 11,1 | 0,477 |
| 7 | 78 | 5 | 20 | 2,7 | 0,163 |
| 8 | 102 | 5 | 15 | 1,2 | 0,061 |
| 9 | 86 | 5 | 17 | 0,7 | 0,038 |
| 10 | 101 | 5 | 28 | 1,4 | 0,076 |
| 11 | 99 | 5 | 26 | 1,4 | 0,055 |
| 12 | 44 | 5 | 14 | 0,1 | 0,006 |

## Lectura de los resultados

Todo lo de esta sección sale de los números de arriba; no hay ningún
parámetro ajustado.

### Las llegadas quedan validadas

La media de llegadas simuladas cae sobre el conteo en los cuatro casos, así
que el proceso de Poisson por tramos está reproduciendo la demanda:

| Conteo | Contado | Simulado (media ± IC 95 %) | Diferencia |
|---|---|---|---|
| viernes | 238 | 239,7 ± 5,1 | 1,7 (0,7 %) |
| domingoCP | 451 | 456,5 ± 8,3 | 5,5 (1,2 %) |
| domingoPC | 195 | 192,0 ± 4,1 | -3,0 (-1,6 %) |
| festivoPC | 1064 | 1064,4 ± 11,2 | 0,4 (0,0 %) |

### La simulación queda corta en espera y en cola, y en el festivo mucho

En los tres conteos normales la simulación da entre 0,42 y 0,69 veces la
espera declarada. Eso **tiene sentido**: el servicio real es gamma con
CV = 0,46, bastante menos variable que la exponencial que supone el M/M/c, y
menos variabilidad en el servicio significa menos cola. Que la simulación
quede por debajo del M/M/c en esos tres casos es lo esperado.

En el festivo pasa lo contrario de lo que pedía el contexto. El contexto
esperaba que la simulación cerrara la brecha entre el M/M/c (0,06 min) y lo
observado (1,28 min). La cierra en parte pero no del todo:

- M/M/c: 0,057 min, es decir 22 veces por debajo de lo observado.
- Simulación: 0,276 min, 4,6 veces por debajo de lo observado.
- La simulación multiplica por 4,8 la espera del M/M/c, pero sigue a 4,6× de lo observado.

### Por qué: en el festivo sobra capacidad para la cola que se observó

Esta es la raíz del desajuste, y es aritmética, no un problema del motor:

- El operador tuvo 55 carriles-intervalo abiertos, o sea 16500 segundos-caseta.
- A 12,1016 s por vehículo, eso da capacidad para **1363 vehículos** en la hora.
- Llegaron 1064 más 23 de cola inicial = **1087 vehículos**.
- Sobra un 25 % de capacidad: la utilización implícita es **78 %**.

Con una cola única FIFO eso es contradictorio con lo observado. La cola media
de las 12 lecturas del festivo es 22,7 vehículos y la última lectura es
14: la cola nunca se vació. Pero una cola única no puede tener
vehículos esperando y casetas desocupadas a la vez: en cuanto una caseta se
libera, el primero de la cola entra. Si de verdad hubo cola toda la hora, las
casetas estuvieron ocupadas casi el 100 % del tiempo, y entonces atender 1064
vehículos con 16500 segundos-caseta exige un tiempo medio de atención de
**15,5 s**, no de 12,1016 s.

Y es justo lo que se ve en la simulación: la cola se vacía. La cola al final
de la hora sale 0,0 en las 30 réplicas, contra 14 observados.

Tres explicaciones posibles, ninguna descartable con los datos que hay:

1. **El servicio del festivo fue más lento que los 12,10 s medidos.** Los 50
   tiempos se tomaron en otro sentido (Cúcuta→Pamplona) y en otro día, y el
   contexto ya lo declara como limitación (sección 8). Harían falta ≈ 15,5 s
   para sostener la cola observada con esas casetas abiertas.
2. **La cola estaba desbalanceada entre casetas.** El contexto también lo
   declara (sección 8): en campo se vio desbalance, y el modelo de cola única
   no lo reproduce. Con colas por caseta sí puede haber casetas libres y
   vehículos esperando en otra fila al mismo tiempo.
3. **Las lecturas de cola cuentan vehículos que el modelo no cuenta** (por
   ejemplo motocicletas o vehículos de TAG en la misma fila).

Las tres se anotaron en `docs/pendientes.md`. **No se tocó ningún parámetro:**
cambiar los 12,10 s a 15,5 s haría cuadrar la cola del festivo, y es
exactamente lo que el contexto prohíbe en la sección 6.

### Lo demás que conviene saber

- **Carriles-intervalo:** coinciden exactamente con lo que hizo el operador en
  los cuatro conteos, sin dispersión entre réplicas. El modo programado está
  copiando bien `c(t)`.
- **La cola inicial casi no pesa.** En el festivo, Wq pasa de
  0,207 min con cola 0 a 0,276 min con cola 23: los 23 vehículos
  heredados se drenan pronto y no explican la congestión observada.
- **Intervalos por encima del máximo tolerable de 2,5 min:**
  viernes: 0,0 % de media (peor réplica 0,0 %).
  domingoCP: 0,0 % de media (peor réplica 0,0 %).
  domingoPC: 0,3 % de media (peor réplica 8,3 %).
  festivoPC: 0,0 % de media (peor réplica 0,0 %).
  festivoPC_cola0: 0,0 % de media (peor réplica 0,0 %).
  El criterio de desempeño acepta hasta 5,0 %, así que según la
  simulación la operación observada lo cumple **incluso en el festivo**, que es
  justo lo contrario de lo que sugiere la cola observada de 14 a 32 vehículos.
  Es la misma brecha de arriba, vista desde el criterio.
- **Cola máxima:** se reportan dos. La continua (29,3 en el festivo) es el
  máximo real de la hora; la muestreada (21,4) es el máximo de 12 lecturas
  puntuales y es la comparable con las observadas, que se tomaron así (PEN-004).

## Diferencias contra lo observado

Lo que sigue describe las diferencias tal como salieron. **No se ajustó
ningún parámetro** para reducirlas.

| Conteo | Cola máx. obs. | Cola máx. muestreada sim. | Wq obs. decl. (min) | Wq obs. recalculado (min) | Wq sim. (min) | Wq sim. ÷ Wq obs. decl. |
|---|---|---|---|---|---|---|
| viernes | 1 | 0,8 | 0,06 | 0,03 | 0,025 | 0,42× |
| domingoCP | 7 | 5,8 | 0,24 | 0,17 | 0,130 | 0,54× |
| domingoPC | 8 | 4,6 | 0,41 | 0,27 | 0,282 | 0,69× |
| festivoPC | 32 | 21,4 | 1,28 | 1,02 | 0,276 | 0,22× |

`Wq obs. recalculado` aplica la fórmula del contexto (sección 3)
`Wq_est = Lq × 12,1 / c` a las lecturas de cola, intervalo por intervalo.
Que no coincida con el valor declarado es PEN-002.

