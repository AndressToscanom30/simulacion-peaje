# Diagnóstico de la cola: campo contra simulación

Generado por `npm run diagnostico` el 2026-10-27.
**No editar a mano:** este archivo se regenera.

## Qué se compara y qué se puede concluir

Las lecturas de campo son la **fila más larga de una sola caseta** en el
intervalo (DEC-024). El motor simula una **cola única** por sentido, así que
la variable que reporta es la **cola total** del sentido. Las dos no son la
misma cosa, pero sí guardan una desigualdad que se puede usar:

> cola total real ≥ fila más larga de una caseta = lectura observada

De ahí sale el único criterio limpio que hay:

- Si la **cola total simulada queda por debajo de la lectura observada**, el
  modelo **subestima con certeza**: está poniendo menos vehículos en todo el
  sentido que los que en campo había en una sola fila.
- Si queda por encima, **no se puede concluir nada**: la cola total real
  también estaba por encima de la lectura y no se sabe cuánto.

Por eso la columna que importa es la marca `SUBESTIMA`. Lo demás es contexto.

## viernes

Viernes 02/10/2026, Cúcuta→Pamplona, 12:00–13:00

- Casetas observadas: `[2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]`
- Cola inicial: 0 vehículos
- 30 réplicas, semillas 1…30

| Intervalo | Llegadas | Casetas | Fila más larga obs. | Cola total sim. (media) | Rango sim. | ¿Subestima? |
|---|---|---|---|---|---|---|
| 1 | 18 | 2 | 0 | 0,0 | 0–0 | no concluyente |
| 2 | 21 | 2 | 0 | 0,0 | 0–1 | no concluyente |
| 3 | 24 | 2 | 1 | 0,3 | 0–6 | ⚠️ SUBESTIMA (en media) |
| 4 | 19 | 2 | 0 | 0,1 | 0–1 | no concluyente |
| 5 | 17 | 2 | 0 | 0,0 | 0–1 | no concluyente |
| 6 | 23 | 2 | 1 | 0,1 | 0–1 | ⚠️ SUBESTIMA (en media) |
| 7 | 22 | 2 | 0 | 0,1 | 0–2 | no concluyente |
| 8 | 20 | 2 | 0 | 0,0 | 0–1 | no concluyente |
| 9 | 18 | 2 | 0 | 0,1 | 0–1 | no concluyente |
| 10 | 21 | 2 | 1 | 0,0 | 0–1 | ⚠️ SUBESTIMA (en media) |
| 11 | 16 | 2 | 0 | 0,0 | 0–0 | no concluyente |
| 12 | 19 | 2 | 0 | 0,0 | 0–1 | no concluyente |

**viernes:** la cola total simulada queda por debajo de la fila más larga observada en **3 de 12 intervalos** en media, y en **0 de 12** ni la peor de las 30 réplicas llega a la lectura.

## domingoCP

Domingo 13/09/2026, Cúcuta→Pamplona, 11:50–12:50

- Casetas observadas: `[3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3]`
- Cola inicial: 0 vehículos
- 30 réplicas, semillas 1…30

| Intervalo | Llegadas | Casetas | Fila más larga obs. | Cola total sim. (media) | Rango sim. | ¿Subestima? |
|---|---|---|---|---|---|---|
| 1 | 30 | 3 | 0 | 0,0 | 0–0 | no concluyente |
| 2 | 49 | 3 | 0 | 1,0 | 0–9 | no concluyente |
| 3 | 38 | 2 | 7 | 1,5 | 0–6 | ⚠️ SUBESTIMA (en las 30) |
| 4 | 37 | 2 | 0 | 1,1 | 0–5 | no concluyente |
| 5 | 35 | 2 | 0 | 0,8 | 0–6 | no concluyente |
| 6 | 38 | 2 | 4 | 0,9 | 0–5 | ⚠️ SUBESTIMA (en media) |
| 7 | 46 | 2 | 0 | 3,5 | 0–20 | no concluyente |
| 8 | 32 | 2 | 5 | 1,9 | 0–9 | ⚠️ SUBESTIMA (en media) |
| 9 | 33 | 2 | 0 | 0,7 | 0–5 | no concluyente |
| 10 | 37 | 2 | 0 | 1,2 | 0–8 | no concluyente |
| 11 | 38 | 3 | 0 | 0,1 | 0–1 | no concluyente |
| 12 | 38 | 3 | 6 | 0,4 | 0–4 | ⚠️ SUBESTIMA (en las 30) |

**domingoCP:** la cola total simulada queda por debajo de la fila más larga observada en **4 de 12 intervalos** en media, y en **2 de 12** ni la peor de las 30 réplicas llega a la lectura.

## domingoPC

Domingo 13/09/2026, Pamplona→Cúcuta, 13:00–14:00

- Casetas observadas: `[2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]`
- Cola inicial: 0 vehículos
- 30 réplicas, semillas 1…30

| Intervalo | Llegadas | Casetas | Fila más larga obs. | Cola total sim. (media) | Rango sim. | ¿Subestima? |
|---|---|---|---|---|---|---|
| 1 | 10 | 2 | 0 | 0,1 | 0–1 | no concluyente |
| 2 | 22 | 2 | 0 | 0,1 | 0–1 | no concluyente |
| 3 | 22 | 1 | 6 | 1,9 | 0–8 | ⚠️ SUBESTIMA (en media) |
| 4 | 13 | 1 | 0 | 1,5 | 0–11 | no concluyente |
| 5 | 11 | 1 | 0 | 0,3 | 0–5 | no concluyente |
| 6 | 25 | 1 | 8 | 2,6 | 0–11 | ⚠️ SUBESTIMA (en media) |
| 7 | 18 | 1 | 2 | 2,1 | 0–12 | no concluyente |
| 8 | 16 | 1 | 0 | 1,1 | 0–6 | no concluyente |
| 9 | 14 | 1 | 0 | 0,3 | 0–2 | no concluyente |
| 10 | 17 | 1 | 0 | 0,5 | 0–3 | no concluyente |
| 11 | 12 | 1 | 0 | 0,7 | 0–5 | no concluyente |
| 12 | 15 | 1 | 0 | 0,7 | 0–4 | no concluyente |

**domingoPC:** la cola total simulada queda por debajo de la fila más larga observada en **2 de 12 intervalos** en media, y en **0 de 12** ni la peor de las 30 réplicas llega a la lectura.

## festivoPC

Festivo 12/10/2026, Pamplona→Cúcuta, 16:25–17:25

- Casetas observadas: `[4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5]`
- Cola inicial: 23 vehículos
- 30 réplicas, semillas 1…30

| Intervalo | Llegadas | Casetas | Fila más larga obs. | Cola total sim. (media) | Rango sim. | ¿Subestima? |
|---|---|---|---|---|---|---|
| 1 | 92 | 4 | 23 | 17,3 | 0–35 | ⚠️ SUBESTIMA (en media) |
| 2 | 78 | 4 | 30 | 9,7 | 0–28 | ⚠️ SUBESTIMA (en las 30) |
| 3 | 60 | 4 | 20 | 1,6 | 0–17 | ⚠️ SUBESTIMA (en las 30) |
| 4 | 108 | 4 | 26 | 5,3 | 0–15 | ⚠️ SUBESTIMA (en las 30) |
| 5 | 92 | 4 | 21 | 9,4 | 0–24 | ⚠️ SUBESTIMA (en media) |
| 6 | 124 | 5 | 32 | 10,8 | 0–41 | ⚠️ SUBESTIMA (en media) |
| 7 | 78 | 5 | 20 | 4,0 | 0–45 | ⚠️ SUBESTIMA (en media) |
| 8 | 102 | 5 | 15 | 1,2 | 0–7 | ⚠️ SUBESTIMA (en las 30) |
| 9 | 86 | 5 | 17 | 1,0 | 0–8 | ⚠️ SUBESTIMA (en las 30) |
| 10 | 101 | 5 | 28 | 1,2 | 0–6 | ⚠️ SUBESTIMA (en las 30) |
| 11 | 99 | 5 | 26 | 1,8 | 0–11 | ⚠️ SUBESTIMA (en las 30) |
| 12 | 44 | 5 | 14 | 0,2 | 0–3 | ⚠️ SUBESTIMA (en las 30) |

**festivoPC:** la cola total simulada queda por debajo de la fila más larga observada en **12 de 12 intervalos** en media, y en **8 de 12** ni la peor de las 30 réplicas llega a la lectura.

## Resumen

| Conteo | Intervalos | Subestima en media | Subestima en las 30 réplicas |
|---|---|---|---|
| viernes | 12 | 3 | 0 |
| domingoCP | 12 | 4 | 2 |
| domingoPC | 12 | 2 | 0 |
| festivoPC | 12 | 12 | 8 |
| **total** | **48** | **21** | **10** |

## Lectura

De los 48 intervalos de los cuatro conteos, en **21** la cola total simulada queda por debajo de la fila más larga que se observó en una sola
caseta, y en **10** eso pasa en las 30 réplicas sin excepción. En esos intervalos el modelo subestima la cola con certeza, porque la cola total
real era por construcción mayor o igual que la lectura.

El festivo es el caso extremo: en **8 de 12 intervalos** ni la réplica más congestionada de las 30 alcanza la lectura de campo. La cola total
simulada se vacía hacia el final de la hora mientras en campo la fila más
larga todavía marcaba 14 vehículos en el último intervalo.

**Qué no dice este diagnóstico.** No dice cuánto vale la cola total real, que
nunca se midió, ni permite estimar `Wq` observado: para eso haría falta el
total por sentido. Tampoco permite derivar un tiempo de servicio implícito
(ver DEC-024, consecuencia 5): con filas por caseta puede haber una caseta
libre y otra con cola al mismo tiempo, así que la holgura de capacidad se
explica por el desbalance sin necesidad de suponer un servicio más lento.

**Qué sí deja fijado.** Que el modelo de cola única subestima la congestión
del pico, y por cuánto como mínimo. Las casetas que recomiende la regla de la
fase 2 hay que leerlas como **cota inferior** (PEN-008).

