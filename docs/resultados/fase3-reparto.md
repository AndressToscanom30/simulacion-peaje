# Fase 3: el reparto de las casetas entre los dos sentidos

Generado por `npm run fase3` el 2026-10-31.
**No editar a mano:** este archivo se regenera.

18 casos, **30 réplicas** cada uno, semillas 1 a 30,
**las mismas en todos los casos** (DEC-010).

> Se reporta lo que salga. **No se ajustó ningún umbral ni parámetro**
> (DEC-021).

## Qué cambia respecto de la fase 2

En la fase 2 cada sentido tenía su propio tope de 5 casetas y no competía con
nadie. Aquí los dos sentidos comparten el **pozo de 6 casetas** del peaje
(DEC-002): cada uno abre entre 1 y 5 y la suma no puede pasar de 6. Eso es lo
que el informe de la fase 2 decía que no podía responder.

- **operador**: P→C copia las casetas que el operador tuvo abiertas; C→P se
  fija en 1 caseta toda la hora, que es lo único que se sabe del contraflujo.
- **regla sin reasignación**: la regla por cola en los dos sentidos. Una
  caseta liberada vuelve al pozo y se queda ahí hasta que alguien la pida.
- **regla con reasignación**: igual, más el traspaso directo al otro sentido
  si tiene ρ > 0,60 y le caben casetas (DEC-008).

La demanda de C→P en el festivo **no se midió** (contexto, sección 7): va el
conteo del domingo 1:00–2:00 p. m. (domingoPC, 195 veh/h), que además se
tomó en el sentido contrario al que sustituye. **Todo el reparto cuelga de ese
supuesto** (PEN-013), y por eso hay una sensibilidad que lo cambia.

- **Criterio de desempeño** (DEC-009): meta `Wq ≤ 1 min` **en cada sentido** y
  a lo sumo 5 % de los intervalos por encima de 2,5 min.
- `Wq` del peaje está **ponderado por vehículos**: es la espera media de un
  vehículo cualquiera (DEC-027, punto 12). Las colas máximas se **suman** por
  sentido y son una cota superior, no una cola simultánea.

## Festivo con servicio base (12,10 s)

### Operador contra regla

| Caso | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Min. c = 5 | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **operador** | P→C (festivo) | 0,28 ± 0,04 | 0,0 % | 21,4 ± 2,9 | 29,3 ± 2,8 | 55,0 ± 0,0 | 1,0 | 35,0 | sí |
|  | C→P (sustituto: domingoPC) | 0,40 ± 0,09 | 1,1 % | 6,2 ± 1,6 | 9,2 ± 1,6 | 12,0 ± 0,0 | 0,0 | 0,0 | sí |
| | **peaje** | **0,30** ± 0,04 | 0,6 % | 27,6 (suma) | 38,4 (suma) | 67,0 | 1,0 | — | sí |
| **regla sin reasignación** | P→C (festivo) | 0,35 ± 0,04 | 0,0 % | 26,6 ± 3,3 | 36,3 ± 3,3 | 54,8 ± 0,8 | 3,1 | 34,0 | sí |
|  | C→P (sustituto: domingoPC) | 0,39 ± 0,09 | 1,1 % | 6,2 ± 1,6 | 9,2 ± 1,6 | 13,0 ± 0,6 | 0,5 | 0,0 | sí |
| | **peaje** | **0,35** ± 0,03 | 0,6 % | 32,7 (suma) | 45,5 (suma) | 67,8 | 3,6 | — | sí |
| **regla con reasignación** | P→C (festivo) | 0,44 ± 0,09 | 0,6 % | 28,1 ± 3,9 | 37,8 ± 3,9 | 54,1 ± 0,7 | 2,8 | 30,4 | sí |
|  | C→P (sustituto: domingoPC) | 0,34 ± 0,09 | 0,8 % | 5,6 ± 1,5 | 8,6 ± 1,5 | 14,8 ± 0,8 | 1,2 | 0,0 | sí |
| | **peaje** | **0,43** ± 0,07 | 0,7 % | 33,7 (suma) | 46,4 (suma) | 68,8 | 4,0 | — | sí |
| **regla + tasa, sin reasignación** | P→C (festivo) | 0,23 ± 0,03 | 0,0 % | 20,5 ± 2,8 | 29,4 ± 2,7 | 57,0 ± 0,4 | 3,5 | 45,0 | sí |
|  | C→P (sustituto: domingoPC) | 0,40 ± 0,09 | 1,1 % | 6,2 ± 1,6 | 9,2 ± 1,6 | 12,3 ± 0,3 | 0,1 | 0,0 | sí |
| | **peaje** | **0,26** ± 0,03 | 0,6 % | 26,7 (suma) | 38,6 (suma) | 69,3 | 3,6 | — | sí |

Reparto del pozo:

| Caso | Min. con el pozo agotado | Peticiones bloqueadas | Min. bloqueados | Reasignaciones | Entregas por bloqueo | Bloqueos descartados |
|---|---|---|---|---|---|---|
| operador | 35,0 ± 0,0 | 0,0 ± 0,0 | 0,0 ± 0,0 | 0,0 | 0,0 | 0,0 |
| regla sin reasignación | 49,5 ± 1,8 | 1,5 ± 0,2 | 28,9 ± 4,7 | 0,0 | 0,1 | 1,2 |
| regla con reasignación | 56,5 ± 1,3 | 1,7 ± 0,2 | 31,7 ± 4,5 | 0,8 | 0,1 | 1,2 |
| regla + tasa, sin reasignación | 57,9 ± 0,7 | 1,8 ± 0,2 | 38,5 ± 2,4 | 0,0 | 0,1 | 1,2 |

### Sensibilidades sobre la regla con reasignación

| Caso | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Min. c = 5 | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **(c) de referencia** | P→C (festivo) | 0,44 ± 0,09 | 0,6 % | 28,1 ± 3,9 | 37,8 ± 3,9 | 54,1 ± 0,7 | 2,8 | 30,4 | sí |
|  | C→P (sustituto: domingoPC) | 0,34 ± 0,09 | 0,8 % | 5,6 ± 1,5 | 8,6 ± 1,5 | 14,8 ± 0,8 | 1,2 | 0,0 | sí |
| | **peaje** | **0,43** ± 0,07 | 0,7 % | 33,7 (suma) | 46,4 (suma) | 68,8 | 4,0 | — | sí |
| demora 0 min | P→C (festivo) | 0,34 ± 0,07 | 0,0 % | 22,9 ± 4,3 | 33,1 ± 3,7 | 55,0 ± 0,8 | 2,7 | 35,2 | sí |
|  | C→P (sustituto: domingoPC) | 0,26 ± 0,08 | 0,3 % | 4,6 ± 1,2 | 7,7 ± 1,4 | 16,7 ± 0,9 | 1,5 | 0,0 | sí |
| | **peaje** | **0,33** ± 0,06 | 0,1 % | 27,5 (suma) | 40,8 (suma) | 71,8 | 4,2 | — | sí |
| demora 10 min | P→C (festivo) | 0,35 ± 0,05 | 0,0 % | 23,3 ± 2,8 | 33,3 ± 2,6 | 53,5 ± 0,8 | 2,5 | 27,5 | sí |
|  | C→P (sustituto: domingoPC) | 0,37 ± 0,08 | 0,8 % | 6,2 ± 1,6 | 9,2 ± 1,6 | 13,9 ± 0,6 | 1,0 | 0,0 | sí |
| | **peaje** | **0,35** ± 0,04 | 0,4 % | 29,5 (suma) | 42,5 (suma) | 67,4 | 3,5 | — | sí |
| ofrecerPozoPorRho | P→C (festivo) | 0,37 ± 0,10 | 0,6 % | 24,7 ± 3,8 | 34,2 ± 4,0 | 55,1 ± 0,8 | 3,4 | 35,8 | sí |
|  | C→P (sustituto: domingoPC) | 0,35 ± 0,09 | 0,8 % | 5,6 ± 1,5 | 8,6 ± 1,5 | 14,2 ± 0,8 | 0,9 | 0,0 | sí |
| | **peaje** | **0,37** ± 0,08 | 0,7 % | 30,3 (suma) | 42,8 (suma) | 69,3 | 4,3 | — | sí |
| sustituto domingoCP | P→C (festivo) | 0,54 ± 0,10 | 0,3 % | 28,2 ± 3,6 | 37,4 ± 3,6 | 52,2 ± 0,8 | 1,9 | 20,9 | sí |
|  | C→P (sustituto: domingoCP) | 5,76 ± 1,32 | 66,4 % | 76,4 ± 12,9 | 82,5 ± 13,3 | 17,8 ± 0,8 | 1,0 | 0,0 | **no** |
| | **peaje** | **2,07** ± 0,37 | 33,3 % | 104,6 (suma) | 120,0 (suma) | 70,0 | 2,9 | — | **no** |

| Caso | Min. con el pozo agotado | Peticiones bloqueadas | Min. bloqueados | Reasignaciones | Entregas por bloqueo | Bloqueos descartados |
|---|---|---|---|---|---|---|
| (c) de referencia | 56,5 ± 1,3 | 1,7 ± 0,2 | 31,7 ± 4,5 | 0,8 | 0,1 | 1,2 |
| demora 0 min | 58,8 ± 1,0 | 1,6 ± 0,2 | 29,7 ± 4,3 | 1,3 | 0,1 | 1,2 |
| demora 10 min | 57,7 ± 1,1 | 1,4 ± 0,2 | 33,3 ± 4,8 | 0,6 | 0,1 | 1,0 |
| ofrecerPozoPorRho | 59,8 ± 0,2 | 1,7 ± 0,2 | 30,7 ± 4,5 | 1,5 | 0,1 | 1,3 |
| sustituto domingoCP | 59,9 ± 0,1 | 2,9 ± 0,1 | 78,7 ± 4,7 | 0,0 | 1,0 | 0,0 |

## Festivo con servicio lento (15,5 s, sensibilidad)

Recordatorio: los 15,5 s son una **hipótesis de sensibilidad** (DEC-025,
PEN-010), no una medición. Se aplica a los dos sentidos. La regla sigue
decidiendo con los valores nominales de 12,10 s y 24,8 veh por caseta,
porque el operador no conoce el servicio real (DEC-027, punto 7).

### Operador contra regla

| Caso | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Min. c = 5 | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **operador** | P→C (festivo) | 2,90 ± 0,45 | 50,0 % | 83,2 ± 11,3 | 93,8 ± 11,2 | 55,0 ± 0,0 | 1,0 | 35,0 | **no** |
|  | C→P (sustituto: domingoPC) | 1,05 ± 0,21 | 8,3 % | 10,5 ± 1,6 | 13,4 ± 1,7 | 12,0 ± 0,0 | 0,0 | 0,0 | **no** |
| | **peaje** | **2,63** ± 0,38 | 29,2 % | 93,7 (suma) | 107,2 (suma) | 67,0 | 1,0 | — | **no** |
| **regla sin reasignación** | P→C (festivo) | 1,26 ± 0,22 | 10,6 % | 47,9 ± 7,3 | 56,3 ± 7,2 | 58,7 ± 0,5 | 1,1 | 53,4 | **no** |
|  | C→P (sustituto: domingoPC) | 1,03 ± 0,20 | 8,1 % | 10,5 ± 1,6 | 13,3 ± 1,7 | 12,2 ± 0,4 | 0,0 | 0,0 | **no** |
| | **peaje** | **1,23** ± 0,20 | 9,3 % | 58,4 (suma) | 69,6 (suma) | 70,9 | 1,1 | — | **no** |
| **regla con reasignación** | P→C (festivo) | 1,26 ± 0,22 | 10,6 % | 47,9 ± 7,3 | 56,3 ± 7,2 | 58,7 ± 0,5 | 1,1 | 53,4 | **no** |
|  | C→P (sustituto: domingoPC) | 1,03 ± 0,20 | 8,1 % | 10,5 ± 1,6 | 13,3 ± 1,7 | 12,2 ± 0,4 | 0,0 | 0,0 | **no** |
| | **peaje** | **1,23** ± 0,20 | 9,3 % | 58,4 (suma) | 69,6 (suma) | 70,9 | 1,1 | — | **no** |
| **regla + tasa, sin reasignación** | P→C (festivo) | 1,22 ± 0,23 | 10,0 % | 46,7 ± 7,3 | 55,0 ± 7,2 | 58,7 ± 0,5 | 1,0 | 53,6 | **no** |
|  | C→P (sustituto: domingoPC) | 1,03 ± 0,20 | 8,1 % | 10,5 ± 1,6 | 13,3 ± 1,7 | 12,2 ± 0,4 | 0,0 | 0,0 | **no** |
| | **peaje** | **1,20** ± 0,20 | 9,0 % | 57,2 (suma) | 68,4 (suma) | 70,9 | 1,1 | — | **no** |

Reparto del pozo:

| Caso | Min. con el pozo agotado | Peticiones bloqueadas | Min. bloqueados | Reasignaciones | Entregas por bloqueo | Bloqueos descartados |
|---|---|---|---|---|---|---|
| operador | 35,0 ± 0,0 | 0,0 ± 0,0 | 0,0 ± 0,0 | 0,0 | 0,0 | 0,0 |
| regla sin reasignación | 59,8 ± 0,2 | 1,1 ± 0,1 | 51,6 ± 0,9 | 0,0 | 0,0 | 0,1 |
| regla con reasignación | 59,8 ± 0,2 | 1,1 ± 0,1 | 51,6 ± 0,9 | 0,0 | 0,0 | 0,1 |
| regla + tasa, sin reasignación | 59,9 ± 0,0 | 1,0 ± 0,1 | 51,7 ± 0,9 | 0,0 | 0,0 | 0,0 |

### Sensibilidades sobre la regla con reasignación

| Caso | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Min. c = 5 | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **(c) de referencia** | P→C (festivo) | 1,26 ± 0,22 | 10,6 % | 47,9 ± 7,3 | 56,3 ± 7,2 | 58,7 ± 0,5 | 1,1 | 53,4 | **no** |
|  | C→P (sustituto: domingoPC) | 1,03 ± 0,20 | 8,1 % | 10,5 ± 1,6 | 13,3 ± 1,7 | 12,2 ± 0,4 | 0,0 | 0,0 | **no** |
| | **peaje** | **1,23** ± 0,20 | 9,3 % | 58,4 (suma) | 69,6 (suma) | 70,9 | 1,1 | — | **no** |
| demora 0 min | P→C (festivo) | 1,13 ± 0,30 | 10,8 % | 46,6 ± 10,8 | 54,9 ± 11,0 | 59,3 ± 0,8 | 1,1 | 56,6 | **no** |
|  | C→P (sustituto: domingoPC) | 0,97 ± 0,21 | 7,8 % | 10,2 ± 1,7 | 13,1 ± 1,8 | 12,7 ± 0,8 | 0,1 | 0,0 | **no** |
| | **peaje** | **1,11** ± 0,25 | 9,3 % | 56,8 (suma) | 68,0 (suma) | 72,0 | 1,3 | — | **no** |
| demora 10 min | P→C (festivo) | 1,40 ± 0,23 | 12,8 % | 50,2 ± 7,0 | 57,9 ± 6,9 | 58,0 ± 0,0 | 1,0 | 49,9 | **no** |
|  | C→P (sustituto: domingoPC) | 1,05 ± 0,21 | 8,3 % | 10,5 ± 1,6 | 13,4 ± 1,7 | 12,0 ± 0,0 | 0,0 | 0,0 | **no** |
| | **peaje** | **1,35** ± 0,19 | 10,6 % | 60,7 (suma) | 71,3 (suma) | 70,0 | 1,0 | — | **no** |
| ofrecerPozoPorRho | P→C (festivo) | 1,19 ± 0,22 | 8,3 % | 45,3 ± 6,7 | 53,9 ± 6,7 | 58,9 ± 0,1 | 1,1 | 54,6 | **no** |
|  | C→P (sustituto: domingoPC) | 1,05 ± 0,21 | 8,3 % | 10,5 ± 1,6 | 13,4 ± 1,7 | 12,0 ± 0,0 | 0,0 | 0,0 | **no** |
| | **peaje** | **1,17** ± 0,19 | 8,3 % | 55,8 (suma) | 67,3 (suma) | 70,9 | 1,1 | — | **no** |
| sustituto domingoCP | P→C (festivo) | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 ± 0,7 | 1,1 | 52,4 | **no** |
|  | C→P (sustituto: domingoCP) | 26,35 ± 1,71 | 91,7 % | 194,6 ± 11,1 | 204,2 ± 11,6 | 12,4 ± 0,6 | 0,1 | 0,0 | **no** |
| | **peaje** | **8,64** ± 0,45 | 51,7 % | 245,7 (suma) | 263,8 (suma) | 70,9 | 1,1 | — | **no** |

| Caso | Min. con el pozo agotado | Peticiones bloqueadas | Min. bloqueados | Reasignaciones | Entregas por bloqueo | Bloqueos descartados |
|---|---|---|---|---|---|---|
| (c) de referencia | 59,8 ± 0,2 | 1,1 ± 0,1 | 51,6 ± 0,9 | 0,0 | 0,0 | 0,1 |
| demora 0 min | 59,9 ± 0,0 | 1,1 ± 0,1 | 50,7 ± 1,9 | 0,0 | 0,1 | 0,0 |
| demora 10 min | 59,9 ± 0,0 | 1,0 ± 0,0 | 51,9 ± 0,9 | 0,0 | 0,0 | 0,0 |
| ofrecerPozoPorRho | 59,9 ± 0,0 | 1,1 ± 0,1 | 51,7 ± 0,9 | 0,1 | 0,0 | 0,1 |
| sustituto domingoCP | 59,9 ± 0,0 | 1,1 ± 0,2 | 60,0 ± 2,6 | 0,0 | 0,1 | 0,0 |

## Sanidad: día normal

`viernes` (C→P, 02/10/2026) y `domingoPC` (P→C, 13/09/2026) a la vez.
**Son de días distintos:** no es una medición simultánea del peaje, es un
escenario construido para ver qué hace el pozo cuando sobran casetas.

| Caso | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Min. c = 5 | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **operador** | C→P (viernes) | 0,03 ± 0,00 | 0,0 % | 0,8 ± 0,4 | 3,7 ± 0,4 | 24,0 ± 0,0 | 0,0 | 0,0 | sí |
|  | P→C (domingoPC) | 0,31 ± 0,06 | 0,3 % | 5,7 ± 1,2 | 8,5 ± 1,2 | 14,0 ± 0,0 | 1,0 | 0,0 | sí |
| | **peaje** | **0,15** ± 0,03 | 0,1 % | 6,4 (suma) | 12,2 (suma) | 38,0 | 1,0 | — | sí |
| **regla** | C→P (viernes) | 0,07 ± 0,03 | 0,0 % | 2,1 ± 0,8 | 5,4 ± 1,0 | 22,6 ± 0,6 | 1,2 | 0,0 | sí |
|  | P→C (domingoPC) | 0,10 ± 0,02 | 0,0 % | 2,4 ± 0,8 | 5,6 ± 0,8 | 21,0 ± 0,8 | 1,9 | 0,0 | sí |
| | **peaje** | **0,09** ± 0,02 | 0,0 % | 4,5 (suma) | 11,0 (suma) | 43,6 | 3,1 | — | sí |

| Caso | Min. con el pozo agotado | Peticiones bloqueadas | Min. bloqueados | Reasignaciones | Entregas por bloqueo | Bloqueos descartados |
|---|---|---|---|---|---|---|
| operador | 0,0 ± 0,0 | 0,0 ± 0,0 | 0,0 ± 0,0 | 0,0 | 0,0 | 0,0 |
| regla | 0,0 ± 0,0 | 0,0 ± 0,0 | 0,0 ± 0,0 | 0,1 | 0,0 | 0,0 |

**Comprobado: en día normal no hay disputa de casetas.** El pozo no se agota
en ninguna de las 30 réplicas de ninguno de los dos controles, y ningún
sentido llega a pedir una caseta sin encontrarla. La competencia del festivo
no es un artefacto del modelo de pozo: aparece solo cuando la demanda la
provoca.

## Lectura

Todo lo que sigue sale de las tablas de arriba.

### Con servicio base (12,10 s)

**¿Se cumple la meta en cada sentido?**

| Caso | P→C | C→P | Peaje |
|---|---|---|---|
| operador | sí | sí | sí |
| regla sin reasignación | sí | sí | sí |
| regla con reasignación | sí | sí | sí |

Los tres controles cumplen la meta **en los dos sentidos**. Con el pozo
compartido sigue habiendo margen: la competencia por casetas encarece la
espera pero no llega a romper el criterio.

**¿Cuánto le cuesta a C→P que P→C gane casetas?**

| | P→C: Wq / carriles | C→P: Wq / carriles |
|---|---|---|
| operador (C→P fijo en 1 caseta) | 0,28 min / 55,0 | 0,40 min / 12,0 |
| regla sin reasignación | 0,35 min / 54,8 | 0,39 min / 13,0 |
| regla con reasignación | 0,44 min / 54,1 | 0,34 min / 14,8 |

Pasando del operador a la regla con reasignación, C→P gana **2,8** carriles-intervalo y P→C pierde **0,9**. Con eso la espera de C→P baja de 0,40 a 0,34 min y la de P→C sube de 0,28 a 0,44 min.

El pozo está agotado **56,5 de los 60 minutos** de la hora, y hay 1,7 peticiones bloqueadas por réplica que suman 31,7 minutos de espera por carril. Esa es la competencia que las fases 1 y 2 no podían ver.

**¿La reasignación por ρ reduce la brecha reactiva de PEN-011?**

PEN-011 dice que la regla es reactiva y el operador fue anticipativo, y que
por eso la regla queda peor en el festivo. La pregunta es si repartir mejor
las casetas lo compensa.

| | Wq de P→C (min) | Brecha contra el operador |
|---|---|---|
| operador | 0,28 | — |
| regla sin reasignación | 0,35 | 0,07 |
| regla con reasignación | 0,44 | 0,16 |

**No: la empeora.** La brecha pasa de 0,07 a 0,16 min con 0,8 reasignaciones por réplica, porque las casetas se mueven **hacia C→P**, no hacia P→C.

La razón está en la definición de ρ, que divide por `c`: con **1 caseta**,
C→P tiene ρ = 0,66, por encima del 0,60, aunque su demanda sea una fracción
de la de P→C. Así que cada vez que P→C libera una caseta, C→P cumple la
condición y se la lleva; y como C→P casi nunca libera (tiene 1 o 2), el
traspaso va casi siempre en el mismo sentido. **La regla de ρ favorece
sistemáticamente al sentido con menos casetas**, que no es necesariamente el
que más lo necesita. Queda anotado en PEN-014.

**Sensibilidades:**

- **demora 0 min:** P→C 0,34 min (-0,10), C→P 0,26 min (-0,08), peaje 0,33 min. Pozo agotado 58,8 min.
- **demora 10 min:** P→C 0,35 min (-0,09), C→P 0,37 min (+0,03), peaje 0,35 min. Pozo agotado 57,7 min.
- **ofrecerPozoPorRho:** P→C 0,37 min (-0,07), C→P 0,35 min (+0,01), peaje 0,37 min. Pozo agotado 59,8 min.
- **sustituto domingoCP:** P→C 0,54 min (+0,10), C→P 5,76 min (+5,42), peaje 2,07 min. **C→P deja de cumplir.** Pozo agotado 59,9 min.

### Con servicio lento (15,5 s, sensibilidad)

**¿Se cumple la meta en cada sentido?**

| Caso | P→C | C→P | Peaje |
|---|---|---|---|
| operador | **no** | **no** | **no** |
| regla sin reasignación | **no** | **no** | **no** |
| regla con reasignación | **no** | **no** | **no** |

Hay casos que **no** cumplen la meta en algún sentido, así que con el pozo
compartido la competencia por casetas sí llega a romper el criterio.

**¿Cuánto le cuesta a C→P que P→C gane casetas?**

| | P→C: Wq / carriles | C→P: Wq / carriles |
|---|---|---|
| operador (C→P fijo en 1 caseta) | 2,90 min / 55,0 | 1,05 min / 12,0 |
| regla sin reasignación | 1,26 min / 58,7 | 1,03 min / 12,2 |
| regla con reasignación | 1,26 min / 58,7 | 1,03 min / 12,2 |

Pasando del operador a la regla con reasignación, C→P gana **0,2** carriles-intervalo y P→C gana **3,7**. Con eso la espera de C→P baja de 1,05 a 1,03 min y la de P→C baja de 2,90 a 1,26 min.

El pozo está agotado **59,8 de los 60 minutos** de la hora, y hay 1,1 peticiones bloqueadas por réplica que suman 51,6 minutos de espera por carril. Esa es la competencia que las fases 1 y 2 no podían ver.

**¿La reasignación por ρ reduce la brecha reactiva de PEN-011?**

PEN-011 dice que la regla es reactiva y el operador fue anticipativo, y que
por eso la regla queda peor en el festivo. La pregunta es si repartir mejor
las casetas lo compensa.

| | Wq de P→C (min) | Brecha contra el operador |
|---|---|---|
| operador | 2,90 | — |
| regla sin reasignación | 1,26 | -1,64 |
| regla con reasignación | 1,26 | -1,64 |

**No, porque la reasignación casi no se activa:** 0,00 reasignaciones por réplica. Con los dos sentidos saturados nadie libera una caseta, así que la
regla de la DEC-008 no tiene ocasión de aplicarse. Los resultados con y sin
reasignación son los mismos.

**Sensibilidades:**

- **demora 0 min:** P→C 1,13 min (-0,13), C→P 0,97 min (-0,06), peaje 1,11 min. **C→P deja de cumplir.** Pozo agotado 59,9 min.
- **demora 10 min:** P→C 1,40 min (+0,14), C→P 1,05 min (+0,02), peaje 1,35 min. **C→P deja de cumplir.** Pozo agotado 59,9 min.
- **ofrecerPozoPorRho:** P→C 1,19 min (-0,07), C→P 1,05 min (+0,02), peaje 1,17 min. **C→P deja de cumplir.** Pozo agotado 59,9 min.
- **sustituto domingoCP:** P→C 1,35 min (+0,09), C→P 26,35 min (+25,32), peaje 8,64 min. **C→P deja de cumplir.** Pozo agotado 59,9 min.

### El disparador anticipativo por tasa, con el pozo compartido (DEC-046)

En la fase 2, con un solo sentido, el disparador por tasa mejoraba la regla.
Con el pozo compartido la pregunta es otra: **anticipar significa pedir
casetas antes, y las casetas son un recurso disputado.** Lo que en un sentido
solo era ganancia aquí puede ser que un sentido se adelante al otro.

**servicio base (12,10 s).** Las dos sin reasignación, que es la comparación limpia:

| | P→C: Wq | C→P: Wq | Peaje: Wq | P→C: carriles | C→P: carriles | Anticipadas P→C | Pozo agotado |
|---|---|---|---|---|---|---|---|
| regla por cola | 0,35 | 0,39 | 0,35 | 54,8 | 13,0 | 0,00 | 49,5 min |
| regla + tasa | 0,23 | 0,40 | 0,26 | 57,0 | 12,3 | 1,50 | 57,9 min |

P→C baja su `Wq` de 0,35 a 0,23 min y C→P pasa de 0,39 a 0,40 min. Pero el contraflujo pierde 0,7 carriles-intervalo y el pozo queda agotado 8,4 min más: **parte de la mejora de P→C sale de pedir antes las casetas que el otro sentido podría usar.**

**servicio lento (15,5 s, sensibilidad).** Las dos sin reasignación, que es la comparación limpia:

| | P→C: Wq | C→P: Wq | Peaje: Wq | P→C: carriles | C→P: carriles | Anticipadas P→C | Pozo agotado |
|---|---|---|---|---|---|---|---|
| regla por cola | 1,26 | 1,03 | 1,23 | 58,7 | 12,2 | 0,00 | 59,8 min |
| regla + tasa | 1,22 | 1,03 | 1,20 | 58,7 | 12,2 | 0,03 | 59,9 min |

P→C baja su `Wq` de 1,26 a 1,22 min y C→P pasa de 1,03 a 1,03 min. El contraflujo no pierde carriles-intervalo (0,0), así que aquí la mejora **no sale del otro sentido**. El disparador apenas actúa en este régimen (0,03 aperturas anticipadas): con la cola ya desbordada, el umbral de cola se cruza solo y no queda nada que anticipar.

### El sustituto de C→P decide el resultado

La demanda de C→P en el festivo no se midió (PEN-013). Cambiar el conteo
sustituto de domingoPC (195 veh/h) a domingoCP (451 veh/h) da esto, con
servicio base y todo lo demás igual:

| Sustituto de C→P | P→C: Wq | C→P: Wq | C→P: % int. > 2,5 min | C→P cumple | Pozo agotado |
|---|---|---|---|---|---|
| domingoPC (195 veh/h, el del contexto) | 0,44 min | 0,34 min | 0,8 % | sí | 56,5 min |
| domingoCP (451 veh/h, sensibilidad) | 0,54 min | 5,76 min | 66,4 % | **no** | 59,9 min |

Con domingoCP, C→P pasa de 0,34 a **5,76 min** de espera y de 0,8 % a **66,4 %** de intervalos por encima del máximo tolerable: deja de cumplir por mucho. Y P→C también se resiente, de
0,44 a 0,54 min, porque pierde casetas.

**Ese es el resultado más importante de la fase 3:** la conclusión del
reparto depende más de un dato que **no se midió** que de la regla que se
elija. Con el sustituto del contexto todo cumple; con un contraflujo de
domingo en el sentido correcto, el peaje no da. Antes de recomendar una
política hay que contar C→P en un festivo (PEN-013).

### Lo que esta comparación no puede responder

- El modelo de cola única **subestima** la congestión del pico (PEN-008,
  `diagnostico-festivo.md`). Todas las casetas que salgan de aquí son **cota
  inferior**, y eso ahora pesa más: con el pozo agotado casi toda la hora, lo
  que falte de congestión es capacidad que el modelo no está pidiendo.
- El **servicio lento de 15,5 s es una hipótesis**, no una medición (DEC-025,
  PEN-010).
- La **demanda de C→P no se midió** y el sustituto decide el resultado
  (PEN-013). Es la incertidumbre dominante de la fase.
- El modo **operador** de C→P es una reconstrucción: solo se sabe que arrancó
  con 1 caseta, así que se mantiene en 1 toda la hora. Si el operador real
  hubiera abierto una segunda, la comparación cambiaría a su favor.

