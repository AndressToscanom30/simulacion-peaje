# Validación de la fase 1

Generado por `npm run simular` el 2026-11-05.
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

### De dónde sale el 1,28 min observado (PEN-002, cerrado)

La cola de campo es el **total de vehículos esperando por sentido** (DEC-042,
que supera a la DEC-024), que es exactamente la variable que simula el motor.
Con eso el `Wq` observado se reconstruye por la **ley de Little**, y sale el
valor que declara el contexto:

| Conteo | `Lq` medio de la columna `cola` | λ (veh/h) | `Wq = Lq / λ` | Declarado |
|---|---|---|---|---|
| viernes | 0,2500 | 238 | 0,0630 min | 0,06 |
| domingoCP | 1,8333 | 451 | 0,2439 min | 0,24 |
| domingoPC | 1,3333 | 195 | 0,4103 min | 0,41 |
| festivoPC | 22,6667 | 1064 | 1,2782 min | 1,28 |

Los cuatro coinciden al redondeo, así que no es casualidad: **el `Wq`
observado del contexto es el que implica la cola medida, por Little.** El
1,28 min del festivo no es una espera cronometrada, es la espera que implica
una cola sostenida de 22,7 vehículos con 1.064 veh/h de demanda.

Esto cierra el PEN-002. El recálculo anterior, que usaba la fórmula
`Wq_est = Lq × 12,1 / c` de la sección 3 y daba 1,01 min, no era la vía: esa
fórmula reparte la cola entre las `c` casetas y Little no necesita `c`.

### Por qué el modelo se queda corto

Como las dos series son la misma variable, la comparación es directa y la
brecha en `Wq` y la brecha en cola son **la misma brecha**: el modelo vacía la
cola que en campo se mantuvo alta toda la hora. `npm run diagnostico` lo
desglosa intervalo por intervalo en `diagnostico-festivo.md`. La cola simulada
al final de la hora sale 0,0 en las 30 réplicas, mientras en campo
todavía había 14 vehículos esperando.

**El "servicio implícito" del festivo.** Con la cola total medida vuelve a
valer una derivación que la DEC-024 había anulado (ver DEC-042 y PEN-010). Si
la cola nunca se vació, las casetas abiertas estuvieron ocupadas toda la hora,
así que el tiempo medio de atención que eso implica es:

```
55 caseta-intervalos × 300 s ÷ 1064 veh = 15,51 s/veh
```

Contra los 12,1016 s medidos, son 1,28× más lento. **No es una medición:**
supone que toda la holgura del pico se explica por el servicio y nada por el
desbalance entre casetas o por el conteo. Entra como escenario de sensibilidad
rotulado, nunca como valor por defecto (DEC-025, PEN-010).

Las tres causas posibles están en PEN-008, ninguna descartable y ninguna
privilegiada: servicio más lento en el pico, desbalance entre filas que la
cola única no reproduce (sección 8 del contexto), o lecturas que cuentan
vehículos ajenos al modelo. **No se tocó ningún parámetro** (DEC-021).

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
  justo lo contrario de lo que sugiere la cola observada de 14 a 32 vehículos
  esperando por sentido.
  Es la misma brecha de arriba, vista desde el criterio.
- **Cola máxima:** se reportan dos. La continua (29,3 en el festivo) es el
  máximo real de la hora; la muestreada (21,4) es el máximo de 12 lecturas
  puntuales y es la comparable con las observadas, que se tomaron así (PEN-004).

## Diferencias contra lo observado

Lo que sigue describe las diferencias tal como salieron. **No se ajustó
ningún parámetro** para reducirlas.

| Conteo | Cola máx. obs. | Cola máx. muestreada sim. | Wq obs. decl. (min) | Wq sim. (min) | Wq sim. ÷ Wq obs. decl. |
|---|---|---|---|---|---|
| viernes | 1 | 0,8 | 0,06 | 0,025 | 0,42× |
| domingoCP | 7 | 5,8 | 0,24 | 0,130 | 0,54× |
| domingoPC | 8 | 4,6 | 0,41 | 0,282 | 0,69× |
| festivoPC | 32 | 21,4 | 1,28 | 0,276 | 0,22× |

Las dos columnas de cola **son la misma variable** —el total en espera por
sentido (DEC-042)— y se comparan de frente. Las dos son además máximos de 12
lecturas puntuales, así que la comparación es homogénea en los dos ejes
(PEN-004). Donde la simulada queda por debajo, el modelo subestima;
`npm run diagnostico` lo desglosa intervalo por intervalo.

El `Wq` observado de la tabla es el declarado por el contexto, que es el que
implica la cola medida por la ley de Little: el cálculo está más arriba
(PEN-002, cerrado).

