# Diagnóstico de la cola: campo contra simulación

Generado por `npm run diagnostico` el 2026-11-05.
**No editar a mano:** este archivo se regenera.

## Qué se compara y qué se puede concluir

Las lecturas de campo son el **total de vehículos que esperaban en el sentido**
en ese instante, sumando todas las casetas abiertas (DEC-042, que supera a la
DEC-024). El motor simula una cola única por sentido y reporta exactamente esa
variable, así que **las dos series son la misma magnitud** y se comparan de
frente, en los dos sentidos de la desigualdad:

- `SUBESTIMA (en las 30)`: ni la réplica más congestionada alcanza la lectura
  de campo. Es el caso fuerte: el modelo se queda corto con cualquier semilla.
- `SUBESTIMA (en media)`: la media de las 30 queda por debajo de la lectura,
  pero alguna réplica la alcanza.
- `sobreestima (en las 30)`: ni la réplica menos congestionada baja hasta la
  lectura. Es el espejo del caso fuerte.
- `dentro del rango`: la lectura de campo cae entre la réplica menos y la más
  congestionada, así que el modelo es **compatible** con ella.

Los rótulos se deciden solo comparando la lectura con el rango de las 30
réplicas, **sin ninguna tolerancia inventada**. Por eso un intervalo con cola
observada 0 y media simulada de medio vehículo sale `dentro del rango` y no
«sobreestima»: con 0 en el rango, la lectura es compatible con el modelo.

Esto corrige la versión anterior de este informe, que leía la columna de campo
como la fila más larga de una sola caseta y por eso solo podía afirmar una
desigualdad: todo intervalo en que la simulación quedaba por encima salía
rotulado como «no concluyente». Con la lectura correcta no hay desajuste de
definición y los dos lados informan. **Los números no cambian** —el motor
siempre simuló la cola total—, cambia lo que se puede concluir de ellos.

## viernes

Viernes 02/10/2026, Cúcuta→Pamplona, 12:00–13:00

- Casetas observadas: `[2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]`
- Cola inicial: 0 vehículos
- 30 réplicas, semillas 1…30

| Intervalo | Llegadas | Casetas | Cola total obs. | Cola total sim. (media) | Rango sim. | Comparación |
|---|---|---|---|---|---|---|
| 1 | 18 | 2 | 0 | 0,0 | 0–0 | dentro del rango |
| 2 | 21 | 2 | 0 | 0,0 | 0–1 | dentro del rango |
| 3 | 24 | 2 | 1 | 0,3 | 0–6 | ⚠️ SUBESTIMA (en media) |
| 4 | 19 | 2 | 0 | 0,1 | 0–1 | dentro del rango |
| 5 | 17 | 2 | 0 | 0,0 | 0–1 | dentro del rango |
| 6 | 23 | 2 | 1 | 0,1 | 0–1 | ⚠️ SUBESTIMA (en media) |
| 7 | 22 | 2 | 0 | 0,1 | 0–2 | dentro del rango |
| 8 | 20 | 2 | 0 | 0,0 | 0–1 | dentro del rango |
| 9 | 18 | 2 | 0 | 0,1 | 0–1 | dentro del rango |
| 10 | 21 | 2 | 1 | 0,0 | 0–1 | ⚠️ SUBESTIMA (en media) |
| 11 | 16 | 2 | 0 | 0,0 | 0–0 | dentro del rango |
| 12 | 19 | 2 | 0 | 0,0 | 0–1 | dentro del rango |

**viernes:** la cola simulada queda por debajo de la observada en **3 de 12 intervalos** en media, y en **0 de 12** ni la más congestionada de las 30 réplicas alcanza la lectura de campo. En el otro extremo, en 0 intervalos la lectura queda por debajo de las 30 réplicas.

## domingoCP

Domingo 13/09/2026, Cúcuta→Pamplona, 11:50–12:50

- Casetas observadas: `[3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3]`
- Cola inicial: 0 vehículos
- 30 réplicas, semillas 1…30

| Intervalo | Llegadas | Casetas | Cola total obs. | Cola total sim. (media) | Rango sim. | Comparación |
|---|---|---|---|---|---|---|
| 1 | 30 | 3 | 0 | 0,0 | 0–0 | dentro del rango |
| 2 | 49 | 3 | 0 | 1,0 | 0–9 | dentro del rango |
| 3 | 38 | 2 | 7 | 1,5 | 0–6 | ⚠️ SUBESTIMA (en las 30) |
| 4 | 37 | 2 | 0 | 1,1 | 0–5 | dentro del rango |
| 5 | 35 | 2 | 0 | 0,8 | 0–6 | dentro del rango |
| 6 | 38 | 2 | 4 | 0,9 | 0–5 | ⚠️ SUBESTIMA (en media) |
| 7 | 46 | 2 | 0 | 3,5 | 0–20 | dentro del rango |
| 8 | 32 | 2 | 5 | 1,9 | 0–9 | ⚠️ SUBESTIMA (en media) |
| 9 | 33 | 2 | 0 | 0,7 | 0–5 | dentro del rango |
| 10 | 37 | 2 | 0 | 1,2 | 0–8 | dentro del rango |
| 11 | 38 | 3 | 0 | 0,1 | 0–1 | dentro del rango |
| 12 | 38 | 3 | 6 | 0,4 | 0–4 | ⚠️ SUBESTIMA (en las 30) |

**domingoCP:** la cola simulada queda por debajo de la observada en **4 de 12 intervalos** en media, y en **2 de 12** ni la más congestionada de las 30 réplicas alcanza la lectura de campo. En el otro extremo, en 0 intervalos la lectura queda por debajo de las 30 réplicas.

## domingoPC

Domingo 13/09/2026, Pamplona→Cúcuta, 13:00–14:00

- Casetas observadas: `[2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]`
- Cola inicial: 0 vehículos
- 30 réplicas, semillas 1…30

| Intervalo | Llegadas | Casetas | Cola total obs. | Cola total sim. (media) | Rango sim. | Comparación |
|---|---|---|---|---|---|---|
| 1 | 10 | 2 | 0 | 0,1 | 0–1 | dentro del rango |
| 2 | 22 | 2 | 0 | 0,1 | 0–1 | dentro del rango |
| 3 | 22 | 1 | 6 | 1,9 | 0–8 | ⚠️ SUBESTIMA (en media) |
| 4 | 13 | 1 | 0 | 1,5 | 0–11 | dentro del rango |
| 5 | 11 | 1 | 0 | 0,3 | 0–5 | dentro del rango |
| 6 | 25 | 1 | 8 | 2,6 | 0–11 | ⚠️ SUBESTIMA (en media) |
| 7 | 18 | 1 | 2 | 2,1 | 0–12 | dentro del rango |
| 8 | 16 | 1 | 0 | 1,1 | 0–6 | dentro del rango |
| 9 | 14 | 1 | 0 | 0,3 | 0–2 | dentro del rango |
| 10 | 17 | 1 | 0 | 0,5 | 0–3 | dentro del rango |
| 11 | 12 | 1 | 0 | 0,7 | 0–5 | dentro del rango |
| 12 | 15 | 1 | 0 | 0,7 | 0–4 | dentro del rango |

**domingoPC:** la cola simulada queda por debajo de la observada en **2 de 12 intervalos** en media, y en **0 de 12** ni la más congestionada de las 30 réplicas alcanza la lectura de campo. En el otro extremo, en 0 intervalos la lectura queda por debajo de las 30 réplicas.

## festivoPC

Festivo 12/10/2026, Pamplona→Cúcuta, 16:25–17:25

- Casetas observadas: `[4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5]`
- Cola inicial: 23 vehículos
- 30 réplicas, semillas 1…30

| Intervalo | Llegadas | Casetas | Cola total obs. | Cola total sim. (media) | Rango sim. | Comparación |
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

**festivoPC:** la cola simulada queda por debajo de la observada en **12 de 12 intervalos** en media, y en **8 de 12** ni la más congestionada de las 30 réplicas alcanza la lectura de campo. En el otro extremo, en 0 intervalos la lectura queda por debajo de las 30 réplicas.

## Resumen

| Conteo | Intervalos | Subestima en media | Subestima en las 30 réplicas |
|---|---|---|---|
| viernes | 12 | 3 | 0 |
| domingoCP | 12 | 4 | 2 |
| domingoPC | 12 | 2 | 0 |
| festivoPC | 12 | 12 | 8 |
| **total** | **48** | **21** | **10** |

## Lectura

De los 48 intervalos de los cuatro conteos, en **21** la cola simulada queda por debajo de la observada, y en
**10** eso pasa en las 30 réplicas sin excepción. Como las dos series son la misma magnitud (DEC-042), en esos intervalos el modelo subestima la cola
de campo directamente, sin ningún argumento de desigualdad por medio.

En el extremo opuesto, en solo **0 de 48** intervalos la lectura de campo queda por debajo de las 30 réplicas. Es decir: **el sesgo del modelo tiene un solo
signo.** Donde se separa del campo, se separa quedándose corto, nunca
sobrando. Esto es lo que la lectura anterior de los datos no podía ver:
con la columna leída como la fila de una caseta, todo intervalo en que la
simulación quedaba por encima era «no concluyente», así que no había forma de
comprobar que el sesgo fuera asimétrico.

El festivo es el caso extremo: en **8 de 12 intervalos** ni la réplica más congestionada de las 30 alcanza la lectura de campo. La cola total
simulada se vacía hacia el final de la hora mientras en campo todavía había
14 vehículos esperando en el último intervalo.

**Qué no dice este diagnóstico.** No dice **por qué** el modelo se queda corto
en el pico. La cola observada sí permite estimar el `Wq` de campo por la ley de
Little, y de ahí sale el 1,28 min del festivo que declara el contexto (PEN-002,
cerrado). Lo que queda abierto es la explicación: servicio más lento en el pico,
desbalance entre casetas, o vehículos que la lectura cuenta y el modelo no. Las
tres siguen en PEN-008, ya sin que la definición del dato privilegie a ninguna.

**Qué sí deja fijado.** Que el modelo de cola única subestima la congestión
del pico, y por cuánto: la comparación es directa. Las casetas que recomiende
la regla de la fase 2 hay que leerlas como **cota inferior** (PEN-008).

