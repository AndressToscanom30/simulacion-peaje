# Fase 4: la matriz de escenarios

Generado por `npm run fase4` el 2026-10-28.
**No editar a mano:** este archivo se regenera.

160 escenarios (80 casos × 2 regímenes de servicio),
**30 réplicas** cada uno, semillas 1 a 30, **las mismas en
todos** (DEC-010).

> Se reporta lo que salga. **No se ajustó ningún umbral ni parámetro**
> (DEC-021).

## Todo lo que sigue es condicional a tres supuestos no medidos

Antes de leer cualquier número conviene tener esto presente, porque los tres
empujan en la misma dirección: **el modelo es optimista**.

1. **El servicio del pico no se midió en el pico** (PEN-010). Los 50 tiempos
   de atención son de otro sentido y otro día. Por eso cada caso se corre dos
   veces: con el servicio medido y con una hipótesis de servicio más lento de
   15,5 s, que **no es una medición** (DEC-025).
2. **La demanda de C→P en el festivo no se midió** (PEN-013). Por defecto se
   usa el conteo del viernes (238 veh/h), que sí se tomó en ese sentido
   (DEC-029), por un factor configurable. El escenario E4 prueba otros tres
   factores y dos conteos alternativos, y la respuesta cambia mucho.
3. **La cola de campo es la fila más larga de una caseta, no el total del
   sentido** (DEC-024, PEN-008). El modelo de cola única subestima la
   congestión del pico en los 12 intervalos del festivo, así que las casetas
   que salgan de aquí son una **cota inferior**.

## El escenario base

Todos los escenarios se describen como **cambios respecto de este**
(DEC-030). El catálogo completo de parámetros está en `docs/parametros.md`.

| | Valor |
|---|---|
| P→C | conteo `festivoPC`, factor 1,00, cola inicial 23, 4 casetas iniciales |
| C→P | conteo `viernes`, factor 1,00, cola inicial 0, 1 caseta inicial |
| Pozo | 6 casetas, entre 1 y 5 por sentido |
| Control | regla por cola en los dos sentidos, sin reasignación |
| Umbrales | abrir 4 / 9 / 14 / 19; cerrar 2 / 4 / 7 / 9 |
| Demora de apertura | 5 min |
| Ventana de cierre | 15 min |
| Criterio | meta 1 min en cada sentido, y a lo sumo 5 % de intervalos sobre 2,5 min |
| Servicio base | gamma k = 4,68, θ = 2,58 s → genera 12,0744 s (los 50 tiempos medidos dan 12,1016 s) |
| Servicio lento | media 15,5 s, mismo CV, **hipótesis** |

**El criterio se evalúa en cada sentido**, no solo en el promedio del peaje:
un peaje donde un sentido va bien y el otro colapsa no cumple, y el promedio
ponderado lo taparía.

## E1 — Operador

### servicio base (12,10 s, el medido)

| Escenario | Qué cambia | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **Operador** | los dos sentidos en modo programado: P→C copia el conteo y C→P se queda en 1 caseta | P→C | 0,28 ± 0,04 | 0,0 % | 21,4 ± 2,9 | 29,3 ± 2,8 | 55,0 | 1,0 | sí |
|  |  | C→P | 0,71 ± 0,13 | 3,1 % | 10,3 ± 2,0 | 13,2 ± 1,9 | 12,0 | 0,0 | sí |
| | | **peaje** | **0,36** ± 0,05 | 1,5 % | 31,7 (suma) | 42,5 (suma) | 67,0 | 1,0 | sí |

### servicio lento (15,5 s, sensibilidad)

| Escenario | Qué cambia | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **Operador** | los dos sentidos en modo programado: P→C copia el conteo y C→P se queda en 1 caseta | P→C | 2,90 ± 0,45 | 50,0 % | 83,2 ± 11,3 | 93,8 ± 11,2 | 55,0 | 1,0 | **no** |
|  |  | C→P | 3,33 ± 0,69 | 50,6 % | 23,9 ± 4,4 | 26,7 ± 4,5 | 12,0 | 0,0 | **no** |
| | | **peaje** | **3,00** ± 0,36 | 50,3 % | 107,1 (suma) | 120,5 (suma) | 67,0 | 1,0 | **no** |

## E2 — La regla por cola

### servicio base (12,10 s, el medido)

| Escenario | Qué cambia | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **Regla sin reasignación** | nada respecto del base: es la comparación principal | P→C | 0,47 ± 0,09 | 0,3 % | 27,5 ± 3,5 | 37,3 ± 3,5 | 53,4 | 2,6 | sí |
|  |  | C→P | 0,48 ± 0,09 | 1,1 % | 8,7 ± 1,6 | 11,6 ± 1,6 | 15,4 | 1,1 | sí |
| | | **peaje** | **0,47** ± 0,07 | 0,7 % | 36,2 (suma) | 48,9 (suma) | 68,8 | 3,7 | sí |
| **Regla con reasignación** | se activa el traspaso por ρ > 0,60 al liberarse una caseta (DEC-008) | P→C | 0,53 ± 0,10 | 0,3 % | 28,2 ± 3,6 | 37,4 ± 3,6 | 52,5 | 2,3 | sí |
|  |  | C→P | 0,39 ± 0,10 | 1,1 % | 7,4 ± 1,7 | 10,5 ± 1,7 | 17,2 | 1,4 | sí |
| | | **peaje** | **0,51** ± 0,08 | 0,7 % | 35,6 (suma) | 47,9 (suma) | 69,6 | 3,6 | sí |

### servicio lento (15,5 s, sensibilidad)

| Escenario | Qué cambia | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **Regla sin reasignación** | nada respecto del base: es la comparación principal | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 3,20 ± 0,71 | 48,3 % | 23,4 ± 4,5 | 26,1 ± 4,5 | 12,4 | 0,1 | **no** |
| | | **peaje** | **1,70** ± 0,24 | 30,0 % | 74,5 (suma) | 85,7 (suma) | 70,9 | 1,1 | **no** |
| **Regla con reasignación** | se activa el traspaso por ρ > 0,60 al liberarse una caseta (DEC-008) | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 3,20 ± 0,71 | 48,3 % | 23,4 ± 4,5 | 26,1 ± 4,5 | 12,4 | 0,1 | **no** |
| | | **peaje** | **1,70** ± 0,24 | 30,0 % | 74,5 (suma) | 85,7 (suma) | 70,9 | 1,1 | **no** |

## E3 — Demanda alta

### servicio base (12,10 s, el medido)

| Escenario | Qué cambia | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **Demanda ×1,1, regla** | factor de demanda 1,1 en los dos sentidos | P→C | 0,47 ± 0,14 | 2,2 % | 35,4 ± 6,9 | 42,5 ± 6,7 | 56,9 | 2,0 | sí |
|  |  | C→P | 0,92 ± 0,26 | 7,8 % | 11,8 ± 2,6 | 15,4 ± 2,9 | 13,0 | 0,4 | **no** |
| | | **peaje** | **0,56** ± 0,12 | 5,0 % | 47,2 (suma) | 57,9 (suma) | 69,9 | 2,4 | **no** |
| **Demanda ×1,1, casetas fijas** | factor 1,1 y casetas fijas: P→C en 5, C→P en 1 | P→C | 0,19 ± 0,03 | 0,0 % | 17,6 ± 2,2 | 27,8 ± 2,5 | 60,0 | 0,0 | sí |
|  |  | C→P | 1,04 ± 0,31 | 9,2 % | 12,6 ± 2,9 | 15,7 ± 3,1 | 12,0 | 0,0 | **no** |
| | | **peaje** | **0,35** ± 0,06 | 4,6 % | 30,3 (suma) | 43,5 (suma) | 72,0 | 0,0 | **no** |
| **Demanda ×1,13, regla** | factor de demanda 1,13 en los dos sentidos | P→C | 0,58 ± 0,18 | 4,7 % | 35,9 ± 7,4 | 45,6 ± 7,5 | 56,7 | 1,9 | sí |
|  |  | C→P | 0,87 ± 0,19 | 7,5 % | 11,1 ± 2,3 | 15,1 ± 2,3 | 13,4 | 0,5 | **no** |
| | | **peaje** | **0,63** ± 0,14 | 6,1 % | 47,0 (suma) | 60,7 (suma) | 70,0 | 2,4 | **no** |
| **Demanda ×1,13, casetas fijas** | factor 1,13 y casetas fijas: P→C en 5, C→P en 1 | P→C | 0,22 ± 0,03 | 0,0 % | 18,5 ± 2,4 | 29,2 ± 2,8 | 60,0 | 0,0 | sí |
|  |  | C→P | 1,08 ± 0,26 | 11,1 % | 12,2 ± 2,6 | 16,0 ± 2,6 | 12,0 | 0,0 | **no** |
| | | **peaje** | **0,38** ± 0,05 | 5,6 % | 30,7 (suma) | 45,2 (suma) | 72,0 | 0,0 | **no** |
| **Demanda ×1,2, regla** | factor de demanda 1,2 en los dos sentidos | P→C | 0,54 ± 0,15 | 2,2 % | 36,0 ± 7,1 | 46,9 ± 6,9 | 58,6 | 1,2 | sí |
|  |  | C→P | 1,84 ± 0,42 | 29,2 % | 17,9 ± 3,4 | 21,2 ± 3,4 | 12,2 | 0,1 | **no** |
| | | **peaje** | **0,79** ± 0,13 | 15,7 % | 53,9 (suma) | 68,2 (suma) | 70,8 | 1,3 | **no** |
| **Demanda ×1,2, casetas fijas** | factor 1,2 y casetas fijas: P→C en 5, C→P en 1 | P→C | 0,30 ± 0,04 | 0,0 % | 22,8 ± 2,9 | 31,6 ± 2,9 | 60,0 | 0,0 | sí |
|  |  | C→P | 1,86 ± 0,41 | 29,2 % | 18,0 ± 3,4 | 21,3 ± 3,4 | 12,0 | 0,0 | **no** |
| | | **peaje** | **0,59** ± 0,09 | 14,6 % | 40,8 (suma) | 52,9 (suma) | 72,0 | 0,0 | **no** |
| **Demanda ×1,13, regla con reasignación** | factor 1,13 y reasignación activada, para ver si sigue inerte (PEN-015) | P→C | 0,76 ± 0,23 | 9,4 % | 43,3 ± 10,1 | 52,6 ± 9,8 | 55,6 | 1,7 | **no** |
|  |  | C→P | 0,81 ± 0,20 | 7,5 % | 10,8 ± 2,3 | 15,0 ± 2,3 | 14,6 | 0,7 | **no** |
| | | **peaje** | **0,77** ± 0,18 | 8,5 % | 54,1 (suma) | 67,5 (suma) | 70,2 | 2,4 | **no** |

### servicio lento (15,5 s, sensibilidad)

| Escenario | Qué cambia | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **Demanda ×1,1, regla** | factor de demanda 1,1 en los dos sentidos | P→C | 2,92 ± 0,30 | 55,3 % | 103,3 ± 10,2 | 111,4 ± 10,0 | 59,0 | 1,0 | **no** |
|  |  | C→P | 5,34 ± 0,74 | 73,3 % | 35,6 ± 4,3 | 39,1 ± 4,6 | 12,0 | 0,0 | **no** |
| | | **peaje** | **3,37** ± 0,27 | 64,3 % | 138,8 (suma) | 150,5 (suma) | 71,0 | 1,0 | **no** |
| **Demanda ×1,1, casetas fijas** | factor 1,1 y casetas fijas: P→C en 5, C→P en 1 | P→C | 2,38 ± 0,22 | 44,7 % | 87,7 ± 8,8 | 95,9 ± 9,0 | 60,0 | 0,0 | **no** |
|  |  | C→P | 5,34 ± 0,74 | 73,3 % | 35,6 ± 4,3 | 39,1 ± 4,6 | 12,0 | 0,0 | **no** |
| | | **peaje** | **2,93** ± 0,23 | 59,0 % | 123,3 (suma) | 135,0 (suma) | 72,0 | 0,0 | **no** |
| **Demanda ×1,13, regla** | factor de demanda 1,13 en los dos sentidos | P→C | 3,51 ± 0,37 | 58,9 % | 125,5 ± 13,5 | 133,8 ± 12,8 | 59,0 | 1,0 | **no** |
|  |  | C→P | 6,71 ± 0,91 | 77,2 % | 45,6 ± 5,9 | 48,3 ± 6,0 | 12,0 | 0,0 | **no** |
| | | **peaje** | **4,12** ± 0,33 | 68,1 % | 171,1 (suma) | 182,1 (suma) | 71,0 | 1,0 | **no** |
| **Demanda ×1,13, casetas fijas** | factor 1,13 y casetas fijas: P→C en 5, C→P en 1 | P→C | 2,80 ± 0,27 | 53,3 % | 105,4 ± 10,2 | 116,3 ± 9,6 | 60,0 | 0,0 | **no** |
|  |  | C→P | 6,71 ± 0,91 | 77,2 % | 45,6 ± 5,9 | 48,3 ± 6,0 | 12,0 | 0,0 | **no** |
| | | **peaje** | **3,54** ± 0,31 | 65,3 % | 151,0 (suma) | 164,6 (suma) | 72,0 | 0,0 | **no** |
| **Demanda ×1,2, regla** | factor de demanda 1,2 en los dos sentidos | P→C | 5,12 ± 0,38 | 73,6 % | 182,5 ± 13,1 | 192,8 ± 12,7 | 59,0 | 1,0 | **no** |
|  |  | C→P | 7,68 ± 0,70 | 85,0 % | 53,2 ± 4,7 | 56,5 ± 4,8 | 12,0 | 0,0 | **no** |
| | | **peaje** | **5,59** ± 0,34 | 79,3 % | 235,7 (suma) | 249,3 (suma) | 71,0 | 1,0 | **no** |
| **Demanda ×1,2, casetas fijas** | factor 1,2 y casetas fijas: P→C en 5, C→P en 1 | P→C | 4,27 ± 0,36 | 61,7 % | 167,9 ± 13,0 | 178,2 ± 12,8 | 60,0 | 0,0 | **no** |
|  |  | C→P | 7,68 ± 0,70 | 85,0 % | 53,2 ± 4,7 | 56,5 ± 4,8 | 12,0 | 0,0 | **no** |
| | | **peaje** | **4,90** ± 0,32 | 73,3 % | 221,1 (suma) | 234,7 (suma) | 72,0 | 0,0 | **no** |
| **Demanda ×1,13, regla con reasignación** | factor 1,13 y reasignación activada, para ver si sigue inerte (PEN-015) | P→C | 3,51 ± 0,37 | 58,9 % | 125,5 ± 13,5 | 133,8 ± 12,8 | 59,0 | 1,0 | **no** |
|  |  | C→P | 6,71 ± 0,91 | 77,2 % | 45,6 ± 5,9 | 48,3 ± 6,0 | 12,0 | 0,0 | **no** |
| | | **peaje** | **4,12** ± 0,33 | 68,1 % | 171,1 (suma) | 182,1 (suma) | 71,0 | 1,0 | **no** |

## E4 — Sensibilidades

Todas sobre E2a (regla sin reasignación, factor 1,0), cambiando una cosa
cada vez. Las cuatro variantes de **meta** comparten las mismas réplicas:
la meta no entra en el motor, solo en el veredicto, así que lo único que
cambia entre ellas es la columna "Cumple".

### servicio base (12,10 s, el medido)

| Escenario | Qué cambia | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **Demora 0 min** | la demora de apertura pasa a 0 min | P→C | 0,41 ± 0,09 | 0,8 % | 25,4 ± 4,4 | 34,2 ± 3,9 | 53,6 | 2,1 | sí |
|  |  | C→P | 0,35 ± 0,08 | 0,3 % | 7,4 ± 1,8 | 10,5 ± 1,7 | 17,3 | 1,5 | sí |
| | | **peaje** | **0,40** ± 0,07 | 0,6 % | 32,8 (suma) | 44,6 (suma) | 70,9 | 3,6 | sí |
| **Demora 5 min** | la demora de apertura pasa a 5 min | P→C | 0,47 ± 0,09 | 0,3 % | 27,5 ± 3,5 | 37,3 ± 3,5 | 53,4 | 2,6 | sí |
|  |  | C→P | 0,48 ± 0,09 | 1,1 % | 8,7 ± 1,6 | 11,6 ± 1,6 | 15,4 | 1,1 | sí |
| | | **peaje** | **0,47** ± 0,07 | 0,7 % | 36,2 (suma) | 48,9 (suma) | 68,8 | 3,7 | sí |
| **Demora 10 min** | la demora de apertura pasa a 10 min | P→C | 0,34 ± 0,05 | 0,0 % | 23,0 ± 2,8 | 33,4 ± 2,7 | 53,8 | 2,5 | sí |
|  |  | C→P | 0,63 ± 0,12 | 2,5 % | 9,6 ± 2,0 | 12,7 ± 1,9 | 13,7 | 0,7 | sí |
| | | **peaje** | **0,40** ± 0,04 | 1,3 % | 32,6 (suma) | 46,2 (suma) | 67,4 | 3,2 | sí |
| **Meta 0,5 min** | la meta con la que se evalúa pasa a 0,5 min; la regla no cambia | P→C | 0,47 ± 0,09 | 0,3 % | 27,5 ± 3,5 | 37,3 ± 3,5 | 53,4 | 2,6 | sí |
|  |  | C→P | 0,48 ± 0,09 | 1,1 % | 8,7 ± 1,6 | 11,6 ± 1,6 | 15,4 | 1,1 | sí |
| | | **peaje** | **0,47** ± 0,07 | 0,7 % | 36,2 (suma) | 48,9 (suma) | 68,8 | 3,7 | sí |
| **Meta 1 min** | la meta con la que se evalúa pasa a 1 min; la regla no cambia | P→C | 0,47 ± 0,09 | 0,3 % | 27,5 ± 3,5 | 37,3 ± 3,5 | 53,4 | 2,6 | sí |
|  |  | C→P | 0,48 ± 0,09 | 1,1 % | 8,7 ± 1,6 | 11,6 ± 1,6 | 15,4 | 1,1 | sí |
| | | **peaje** | **0,47** ± 0,07 | 0,7 % | 36,2 (suma) | 48,9 (suma) | 68,8 | 3,7 | sí |
| **Meta 1,5 min** | la meta con la que se evalúa pasa a 1,5 min; la regla no cambia | P→C | 0,47 ± 0,09 | 0,3 % | 27,5 ± 3,5 | 37,3 ± 3,5 | 53,4 | 2,6 | sí |
|  |  | C→P | 0,48 ± 0,09 | 1,1 % | 8,7 ± 1,6 | 11,6 ± 1,6 | 15,4 | 1,1 | sí |
| | | **peaje** | **0,47** ± 0,07 | 0,7 % | 36,2 (suma) | 48,9 (suma) | 68,8 | 3,7 | sí |
| **Meta 2 min** | la meta con la que se evalúa pasa a 2 min; la regla no cambia | P→C | 0,47 ± 0,09 | 0,3 % | 27,5 ± 3,5 | 37,3 ± 3,5 | 53,4 | 2,6 | sí |
|  |  | C→P | 0,48 ± 0,09 | 1,1 % | 8,7 ± 1,6 | 11,6 ± 1,6 | 15,4 | 1,1 | sí |
| | | **peaje** | **0,47** ± 0,07 | 0,7 % | 36,2 (suma) | 48,9 (suma) | 68,8 | 3,7 | sí |
| **Umbrales ×0,6** | los umbrales de abrir y cerrar se multiplican por 0,6 | P→C | 0,18 ± 0,03 | 0,0 % | 18,5 ± 2,7 | 27,5 ± 1,8 | 58,5 | 1,1 | sí |
|  |  | C→P | 0,69 ± 0,13 | 2,8 % | 10,3 ± 2,0 | 13,0 ± 1,9 | 12,4 | 0,1 | sí |
| | | **peaje** | **0,27** ± 0,03 | 1,4 % | 28,8 (suma) | 40,5 (suma) | 70,9 | 1,2 | sí |
| **Umbrales ×1,4** | los umbrales de abrir y cerrar se multiplican por 1,4 | P→C | 0,74 ± 0,12 | 2,5 % | 37,7 ± 5,1 | 46,9 ± 5,0 | 50,0 | 2,1 | sí |
|  |  | C→P | 0,42 ± 0,09 | 0,6 % | 8,2 ± 1,6 | 11,4 ± 1,5 | 16,1 | 1,6 | sí |
| | | **peaje** | **0,68** ± 0,09 | 1,5 % | 46,0 (suma) | 58,3 (suma) | 66,1 | 3,7 | sí |
| **Ventana de cierre 5 min** | la cola tiene que estar bajo el umbral 5 min seguidos para cerrar | P→C | 0,96 ± 0,17 | 7,5 % | 49,6 ± 7,5 | 59,2 ± 7,9 | 50,0 | 6,6 | **no** |
|  |  | C→P | 0,43 ± 0,08 | 0,3 % | 8,3 ± 1,8 | 11,5 ± 1,6 | 14,5 | 2,8 | sí |
| | | **peaje** | **0,86** ± 0,13 | 3,9 % | 57,9 (suma) | 70,7 (suma) | 64,5 | 9,4 | **no** |
| **Ventana de cierre 15 min** | la cola tiene que estar bajo el umbral 15 min seguidos para cerrar | P→C | 0,47 ± 0,09 | 0,3 % | 27,5 ± 3,5 | 37,3 ± 3,5 | 53,4 | 2,6 | sí |
|  |  | C→P | 0,48 ± 0,09 | 1,1 % | 8,7 ± 1,6 | 11,6 ± 1,6 | 15,4 | 1,1 | sí |
| | | **peaje** | **0,47** ± 0,07 | 0,7 % | 36,2 (suma) | 48,9 (suma) | 68,8 | 3,7 | sí |
| **Ventana de cierre 30 min** | la cola tiene que estar bajo el umbral 30 min seguidos para cerrar | P→C | 0,19 ± 0,04 | 0,0 % | 18,2 ± 2,7 | 27,7 ± 2,0 | 58,5 | 1,1 | sí |
|  |  | C→P | 0,68 ± 0,13 | 2,8 % | 9,9 ± 2,0 | 12,8 ± 2,0 | 12,4 | 0,0 | sí |
| | | **peaje** | **0,28** ± 0,04 | 1,4 % | 28,2 (suma) | 40,6 (suma) | 70,9 | 1,1 | sí |
| **Cola inicial 0** | P→C arranca sin cola en vez de con 23 vehículos | P→C | 1,07 ± 0,41 | 10,6 % | 46,0 ± 12,6 | 54,7 ± 12,7 | 48,4 | 1,1 | **no** |
|  |  | C→P | 0,21 ± 0,05 | 0,0 % | 6,0 ± 1,6 | 9,0 ± 1,4 | 19,8 | 1,8 | sí |
| | | **peaje** | **0,91** ± 0,34 | 5,3 % | 52,0 (suma) | 63,6 (suma) | 68,2 | 2,9 | **no** |
| **Factor C→P ×0,8** | solo C→P cambia de demanda, ×0,8 | P→C | 0,34 ± 0,04 | 0,0 % | 26,5 ± 3,3 | 36,2 ± 3,4 | 55,0 | 3,2 | sí |
|  |  | C→P | 0,22 ± 0,03 | 0,0 % | 3,3 ± 0,5 | 6,3 ± 0,6 | 12,8 | 0,4 | sí |
| | | **peaje** | **0,33** ± 0,04 | 0,0 % | 29,9 (suma) | 42,6 (suma) | 67,8 | 3,5 | sí |
| **Factor C→P ×1,2** | solo C→P cambia de demanda, ×1,2 | P→C | 0,51 ± 0,10 | 0,3 % | 28,1 ± 3,6 | 37,4 ± 3,6 | 52,6 | 2,1 | sí |
|  |  | C→P | 0,93 ± 0,31 | 10,8 % | 13,5 ± 3,0 | 16,5 ± 3,0 | 16,8 | 1,3 | **no** |
| | | **peaje** | **0,60** ± 0,09 | 5,6 % | 41,6 (suma) | 53,9 (suma) | 69,4 | 3,4 | **no** |
| **Factor C→P ×1,5** | solo C→P cambia de demanda, ×1,5 | P→C | 0,54 ± 0,10 | 0,3 % | 28,2 ± 3,6 | 37,4 ± 3,6 | 52,2 | 1,9 | sí |
|  |  | C→P | 2,50 ± 0,70 | 39,2 % | 34,5 ± 6,2 | 39,5 ± 6,5 | 17,8 | 1,0 | **no** |
| | | **peaje** | **1,02** ± 0,16 | 19,7 % | 62,7 (suma) | 76,9 (suma) | 70,0 | 2,9 | **no** |
| **Sustituto domingoPC** | C→P pasa a ser domingoPC (195 veh/h) en vez de viernes | P→C | 0,35 ± 0,04 | 0,0 % | 26,6 ± 3,3 | 36,3 ± 3,3 | 54,8 | 3,1 | sí |
|  |  | C→P (domingoPC) | 0,39 ± 0,09 | 1,1 % | 6,2 ± 1,6 | 9,2 ± 1,6 | 13,0 | 0,5 | sí |
| | | **peaje** | **0,35** ± 0,03 | 0,6 % | 32,7 (suma) | 45,5 (suma) | 67,8 | 3,6 | sí |
| **Sustituto domingoCP** | C→P pasa a ser domingoCP (451 veh/h) en vez de viernes | P→C | 0,54 ± 0,10 | 0,3 % | 28,2 ± 3,6 | 37,4 ± 3,6 | 52,2 | 1,9 | sí |
|  |  | C→P (domingoCP) | 5,76 ± 1,32 | 66,4 % | 76,4 ± 12,9 | 82,5 ± 13,3 | 17,8 | 1,0 | **no** |
| | | **peaje** | **2,07** ± 0,37 | 33,3 % | 104,6 (suma) | 120,0 (suma) | 70,0 | 2,9 | **no** |

### servicio lento (15,5 s, sensibilidad)

| Escenario | Qué cambia | Sentido | Wq (min) | % int. > 2,5 min | Cola máx. muestr. | Cola máx. cont. | Carriles-int. | Cambios de c | Cumple |
|---|---|---|---|---|---|---|---|---|---|
| **Demora 0 min** | la demora de apertura pasa a 0 min | P→C | 1,19 ± 0,37 | 10,8 % | 48,5 ± 13,4 | 56,3 ± 13,2 | 59,2 | 1,1 | **no** |
|  |  | C→P | 3,04 ± 0,74 | 45,3 % | 22,8 ± 4,5 | 25,4 ± 4,6 | 12,8 | 0,1 | **no** |
| | | **peaje** | **1,55** ± 0,27 | 28,1 % | 71,3 (suma) | 81,7 (suma) | 72,0 | 1,3 | **no** |
| **Demora 5 min** | la demora de apertura pasa a 5 min | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 3,20 ± 0,71 | 48,3 % | 23,4 ± 4,5 | 26,1 ± 4,5 | 12,4 | 0,1 | **no** |
| | | **peaje** | **1,70** ± 0,24 | 30,0 % | 74,5 (suma) | 85,7 (suma) | 70,9 | 1,1 | **no** |
| **Demora 10 min** | la demora de apertura pasa a 10 min | P→C | 1,40 ± 0,23 | 12,8 % | 50,2 ± 7,0 | 57,9 ± 6,9 | 58,0 | 1,0 | **no** |
|  |  | C→P | 3,33 ± 0,69 | 50,6 % | 23,9 ± 4,4 | 26,7 ± 4,5 | 12,0 | 0,0 | **no** |
| | | **peaje** | **1,77** ± 0,22 | 31,7 % | 74,1 (suma) | 84,5 (suma) | 70,0 | 1,0 | **no** |
| **Meta 0,5 min** | la meta con la que se evalúa pasa a 0,5 min; la regla no cambia | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 3,20 ± 0,71 | 48,3 % | 23,4 ± 4,5 | 26,1 ± 4,5 | 12,4 | 0,1 | **no** |
| | | **peaje** | **1,70** ± 0,24 | 30,0 % | 74,5 (suma) | 85,7 (suma) | 70,9 | 1,1 | **no** |
| **Meta 1 min** | la meta con la que se evalúa pasa a 1 min; la regla no cambia | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 3,20 ± 0,71 | 48,3 % | 23,4 ± 4,5 | 26,1 ± 4,5 | 12,4 | 0,1 | **no** |
| | | **peaje** | **1,70** ± 0,24 | 30,0 % | 74,5 (suma) | 85,7 (suma) | 70,9 | 1,1 | **no** |
| **Meta 1,5 min** | la meta con la que se evalúa pasa a 1,5 min; la regla no cambia | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 3,20 ± 0,71 | 48,3 % | 23,4 ± 4,5 | 26,1 ± 4,5 | 12,4 | 0,1 | **no** |
| | | **peaje** | **1,70** ± 0,24 | 30,0 % | 74,5 (suma) | 85,7 (suma) | 70,9 | 1,1 | **no** |
| **Meta 2 min** | la meta con la que se evalúa pasa a 2 min; la regla no cambia | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 3,20 ± 0,71 | 48,3 % | 23,4 ± 4,5 | 26,1 ± 4,5 | 12,4 | 0,1 | **no** |
| | | **peaje** | **1,70** ± 0,24 | 30,0 % | 74,5 (suma) | 85,7 (suma) | 70,9 | 1,1 | **no** |
| **Umbrales ×0,6** | los umbrales de abrir y cerrar se multiplican por 0,6 | P→C | 1,13 ± 0,23 | 11,4 % | 45,5 ± 6,1 | 53,9 ± 5,9 | 59,0 | 1,0 | **no** |
|  |  | C→P | 3,33 ± 0,69 | 50,6 % | 23,9 ± 4,4 | 26,7 ± 4,5 | 12,0 | 0,0 | **no** |
| | | **peaje** | **1,55** ± 0,24 | 31,0 % | 69,4 (suma) | 80,6 (suma) | 71,0 | 1,0 | **no** |
| **Umbrales ×1,4** | los umbrales de abrir y cerrar se multiplican por 1,4 | P→C | 1,87 ± 0,51 | 19,2 % | 69,9 ± 16,5 | 79,7 ± 16,6 | 56,1 | 1,4 | **no** |
|  |  | C→P | 2,58 ± 0,70 | 38,6 % | 20,7 ± 4,3 | 23,3 ± 4,2 | 13,8 | 0,6 | **no** |
| | | **peaje** | **2,01** ± 0,38 | 28,9 % | 90,5 (suma) | 103,0 (suma) | 69,9 | 2,0 | **no** |
| **Ventana de cierre 5 min** | la cola tiene que estar bajo el umbral 5 min seguidos para cerrar | P→C | 2,94 ± 0,47 | 44,7 % | 101,2 ± 15,3 | 108,8 ± 15,0 | 55,6 | 2,5 | **no** |
|  |  | C→P | 1,89 ± 0,63 | 23,3 % | 16,4 ± 3,6 | 19,0 ± 3,5 | 13,9 | 1,4 | **no** |
| | | **peaje** | **2,76** ± 0,36 | 34,0 % | 117,6 (suma) | 127,8 (suma) | 69,5 | 3,9 | **no** |
| **Ventana de cierre 15 min** | la cola tiene que estar bajo el umbral 15 min seguidos para cerrar | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 3,20 ± 0,71 | 48,3 % | 23,4 ± 4,5 | 26,1 ± 4,5 | 12,4 | 0,1 | **no** |
| | | **peaje** | **1,70** ± 0,24 | 30,0 % | 74,5 (suma) | 85,7 (suma) | 70,9 | 1,1 | **no** |
| **Ventana de cierre 30 min** | la cola tiene que estar bajo el umbral 30 min seguidos para cerrar | P→C | 1,19 ± 0,22 | 8,6 % | 45,4 ± 6,7 | 53,7 ± 6,8 | 59,0 | 1,0 | **no** |
|  |  | C→P | 3,33 ± 0,69 | 50,6 % | 23,9 ± 4,4 | 26,7 ± 4,5 | 12,0 | 0,0 | **no** |
| | | **peaje** | **1,60** ± 0,22 | 29,6 % | 69,3 (suma) | 80,4 (suma) | 71,0 | 1,0 | **no** |
| **Cola inicial 0** | P→C arranca sin cola en vez de con 23 vehículos | P→C | 3,63 ± 0,81 | 40,3 % | 121,1 ± 26,0 | 129,4 ± 26,1 | 51,9 | 0,5 | **no** |
|  |  | C→P | 1,57 ± 0,84 | 18,6 % | 14,5 ± 4,7 | 17,1 ± 4,7 | 17,9 | 0,7 | **no** |
| | | **peaje** | **3,27** ± 0,58 | 29,4 % | 135,6 (suma) | 146,5 (suma) | 69,8 | 1,2 | **no** |
| **Factor C→P ×0,8** | solo C→P cambia de demanda, ×0,8 | P→C | 1,26 ± 0,22 | 10,6 % | 47,9 ± 7,3 | 56,3 ± 7,2 | 58,7 | 1,1 | **no** |
|  |  | C→P | 0,85 ± 0,23 | 7,2 % | 7,8 ± 1,5 | 10,9 ± 1,7 | 12,2 | 0,0 | **no** |
| | | **peaje** | **1,20** ± 0,20 | 8,9 % | 55,7 (suma) | 67,2 (suma) | 70,9 | 1,1 | **no** |
| **Factor C→P ×1,2** | solo C→P cambia de demanda, ×1,2 | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 7,30 ± 0,81 | 81,9 % | 51,4 ± 5,0 | 54,7 ± 5,1 | 12,4 | 0,1 | **no** |
| | | **peaje** | **2,60** ± 0,25 | 46,8 % | 102,5 (suma) | 114,3 (suma) | 70,9 | 1,1 | **no** |
| **Factor C→P ×1,5** | solo C→P cambia de demanda, ×1,5 | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P | 15,47 ± 1,45 | 88,3 % | 111,5 ± 8,8 | 117,0 ± 8,8 | 12,4 | 0,1 | **no** |
| | | **peaje** | **4,82** ± 0,36 | 50,0 % | 162,6 (suma) | 176,5 (suma) | 70,9 | 1,1 | **no** |
| **Sustituto domingoPC** | C→P pasa a ser domingoPC (195 veh/h) en vez de viernes | P→C | 1,26 ± 0,22 | 10,6 % | 47,9 ± 7,3 | 56,3 ± 7,2 | 58,7 | 1,1 | **no** |
|  |  | C→P (domingoPC) | 1,03 ± 0,20 | 8,1 % | 10,5 ± 1,6 | 13,3 ± 1,7 | 12,2 | 0,0 | **no** |
| | | **peaje** | **1,23** ± 0,20 | 9,3 % | 58,4 (suma) | 69,6 (suma) | 70,9 | 1,1 | **no** |
| **Sustituto domingoCP** | C→P pasa a ser domingoCP (451 veh/h) en vez de viernes | P→C | 1,35 ± 0,30 | 11,7 % | 51,1 ± 10,3 | 59,6 ± 10,4 | 58,5 | 1,1 | **no** |
|  |  | C→P (domingoCP) | 26,35 ± 1,71 | 91,7 % | 194,6 ± 11,1 | 204,2 ± 11,6 | 12,4 | 0,1 | **no** |
| | | **peaje** | **8,64** ± 0,45 | 51,7 % | 245,7 (suma) | 263,8 (suma) | 70,9 | 1,1 | **no** |

## E5 — Estrés y punto de quiebre

Barrido del factor de demanda de 1,00 a 1,60 en pasos de
0,05 (13 factores), aplicado a los dos sentidos, con dos controles
(la regla, y casetas fijas en el tope para P→C y 1 para C→P), dos tamaños de
pozo y los dos regímenes de servicio.

Con **pozo de 8** el tope por sentido sube a 7, así que los umbrales de
`c` = 5 y 6 son **extrapolados** por las fórmulas de DEC-031, no del contexto.

### Punto de quiebre por configuración

El **factor de quiebre** es el primer factor de demanda en el que la media de
las 30 réplicas deja de cumplir el criterio en los dos sentidos.

| Pozo | Control | Servicio | Último factor que cumple | Factor de quiebre | Réplicas que incumplen en ese factor |
|---|---|---|---|---|---|
| 6 | casetas fijas | base | ×1,05 | **×1,10** | 36,7 % |
| 6 | casetas fijas | lento | **ninguno** | **×1,00** | 93,3 % |
| 6 | regla | base | ×1,05 | **×1,10** | 40,0 % |
| 6 | regla | lento | **ninguno** | **×1,00** | 96,7 % |
| 8 | casetas fijas | base | ×1,05 | **×1,10** | 36,7 % |
| 8 | casetas fijas | lento | **ninguno** | **×1,00** | 93,3 % |
| 8 | regla | base | ×1,50 | **×1,55** | 73,3 % |
| 8 | regla | lento | ×1,15 | **×1,20** | 60,0 % |

### El barrido completo

`Wq` del peaje en minutos; **negrita** cuando la media deja de cumplir.

#### pozo 6, tope 5 (el real)

| Factor | fijas · base | fijas · lento | regla · base | regla · lento |
|---|---|---|---|---|
| ×1,00 | 0,22 | **1,44** | 0,47 | **1,70** |
| ×1,05 | 0,23 | **2,09** | 0,39 | **2,27** |
| ×1,10 | **0,35** | **2,93** | **0,56** | **3,37** |
| ×1,15 | **0,46** | **3,98** | **0,83** | **4,64** |
| ×1,20 | **0,59** | **4,90** | **0,79** | **5,59** |
| ×1,25 | **0,89** | **5,90** | **0,90** | **7,12** |
| ×1,30 | **1,51** | **7,46** | **1,62** | **8,29** |
| ×1,35 | **2,00** | **8,97** | **2,18** | **9,79** |
| ×1,40 | **2,78** | **10,15** | **2,98** | **11,21** |
| ×1,45 | **3,43** | **11,84** | **3,72** | **12,58** |
| ×1,50 | **4,33** | **12,68** | **4,83** | **13,85** |
| ×1,55 | **4,84** | **14,58** | **5,75** | **15,06** |
| ×1,60 | **6,21** | **15,88** | **6,69** | **16,65** |

#### pozo 8, tope 7 (umbrales extrapolados)

| Factor | fijas · base | fijas · lento | regla · base | regla · lento |
|---|---|---|---|---|
| ×1,00 | 0,15 | **0,67** | 0,26 | 0,48 |
| ×1,05 | 0,14 | **0,81** | 0,25 | 0,51 |
| ×1,10 | **0,21** | **1,05** | 0,30 | 0,65 |
| ×1,15 | **0,27** | **1,41** | 0,31 | 0,83 |
| ×1,20 | **0,37** | **1,53** | 0,30 | **1,13** |
| ×1,25 | **0,42** | **1,79** | 0,34 | **1,91** |
| ×1,30 | **0,61** | **2,28** | 0,40 | **2,80** |
| ×1,35 | **0,82** | **2,63** | 0,44 | **3,77** |
| ×1,40 | **1,06** | **3,09** | 0,48 | **4,77** |
| ×1,45 | **1,15** | **3,78** | 0,59 | **5,54** |
| ×1,50 | **1,45** | **4,28** | 0,88 | **6,38** |
| ×1,55 | **1,51** | **5,23** | **1,25** | **7,68** |
| ×1,60 | **1,76** | **6,04** | **1,52** | **8,22** |

## Lectura

Todo lo que sigue sale de las tablas de arriba.

### Dónde se cumple y dónde no

| Grupo | Con servicio base | Con servicio lento |
|---|---|---|
| E1 | 1 de 1 escenarios cumplen | 0 de 1 cumplen |
| E2 | 2 de 2 escenarios cumplen | 0 de 2 cumplen |
| E3 | 0 de 7 escenarios cumplen | 0 de 7 cumplen |
| E4 | 13 de 18 escenarios cumplen | 0 de 18 cumplen |
| E5 | 17 de 52 escenarios cumplen | 4 de 52 cumplen |

En total, con el servicio medido cumplen **33 de 80** escenarios (41,3 %); con el servicio lento, **4 de 80** (5,0 %).

El operador y la regla, al factor 1,0: con servicio base el operador sí cumple y la regla sí, con `Wq` del peaje de 0,36 contra 0,47 min. Con servicio lento el operador **no** y la regla **no**, con 3,00 contra 1,70 min.

### Cuánto desplaza el quiebre un pozo de 8 casetas

| Control | Servicio | Quiebre con pozo 6 | Quiebre con pozo 8 | Desplazamiento |
|---|---|---|---|---|
| regla | base | ×1,10 | ×1,55 | +0,45 |
| regla | lento | ×1,00 | ×1,20 | +0,20 |
| casetas fijas | base | ×1,10 | ×1,10 | 0,00 |
| casetas fijas | lento | ×1,00 | ×1,00 | 0,00 |

Donde las dos configuraciones quiebran dentro del barrido, las dos casetas extra desplazan el quiebre **+0,16** de factor de demanda de media (+0,45, +0,20, +0,00, +0,00).

**Ojo:** con pozo de 8 los umbrales de `c` = 5 y 6 son extrapolados
(DEC-031). El resultado del pozo ampliado depende de esa extrapolación, no
solo de las casetas de más.

### Qué sensibilidades mueven más el resultado

Para cada sensibilidad de E4, cuánto mueve el `Wq` del peaje respecto de E2a
en el mismo régimen. Ordenadas por el mayor efecto de los dos regímenes.

| Sensibilidad | Qué cambia | Δ Wq base | Δ Wq lento | Mayor efecto |
|---|---|---|---|---|
| Sustituto domingoCP | C→P pasa a ser domingoCP (451 veh/h) en vez de viernes | +1,60 | +6,94 | 6,94 min |
| Factor C→P ×1,5 | solo C→P cambia de demanda, ×1,5 | +0,55 | +3,12 | 3,12 min |
| Cola inicial 0 | P→C arranca sin cola en vez de con 23 vehículos | +0,44 | +1,56 | 1,56 min |
| Ventana de cierre 5 min | la cola tiene que estar bajo el umbral 5 min seguidos para cerrar | +0,39 | +1,06 | 1,06 min |
| Factor C→P ×1,2 | solo C→P cambia de demanda, ×1,2 | +0,13 | +0,89 | 0,89 min |
| Factor C→P ×0,8 | solo C→P cambia de demanda, ×0,8 | -0,14 | -0,50 | 0,50 min |
| Sustituto domingoPC | C→P pasa a ser domingoPC (195 veh/h) en vez de viernes | -0,12 | -0,47 | 0,47 min |
| Umbrales ×1,4 | los umbrales de abrir y cerrar se multiplican por 1,4 | +0,21 | +0,31 | 0,31 min |
| Umbrales ×0,6 | los umbrales de abrir y cerrar se multiplican por 0,6 | -0,20 | -0,15 | 0,20 min |
| Ventana de cierre 30 min | la cola tiene que estar bajo el umbral 30 min seguidos para cerrar | -0,19 | -0,11 | 0,19 min |
| Demora 0 min | la demora de apertura pasa a 0 min | -0,07 | -0,15 | 0,15 min |
| Demora 10 min | la demora de apertura pasa a 10 min | -0,07 | +0,07 | 0,07 min |
| Demora 5 min | la demora de apertura pasa a 5 min | +0,00 | +0,00 | 0,00 min |
| Meta 0,5 min | la meta con la que se evalúa pasa a 0,5 min; la regla no cambia | +0,00 | +0,00 | 0,00 min |
| Meta 1 min | la meta con la que se evalúa pasa a 1 min; la regla no cambia | +0,00 | +0,00 | 0,00 min |
| Meta 1,5 min | la meta con la que se evalúa pasa a 1,5 min; la regla no cambia | +0,00 | +0,00 | 0,00 min |
| Meta 2 min | la meta con la que se evalúa pasa a 2 min; la regla no cambia | +0,00 | +0,00 | 0,00 min |
| Ventana de cierre 15 min | la cola tiene que estar bajo el umbral 15 min seguidos para cerrar | +0,00 | +0,00 | 0,00 min |

Las tres que más mueven el resultado son **Sustituto domingoCP**, **Factor C→P ×1,5**, **Cola inicial 0**, con hasta 6,94 min de diferencia en el `Wq` del peaje.

**Por qué quitar la cola inicial empeora la espera.** Parece al revés, pero
es lo que sale, y el mecanismo está en las otras columnas: con los 23
vehículos heredados, P→C abre 1,40 casetas de media y acumula
53,4 carriles-intervalo; empezando vacío abre solo 0,67 y
se queda en 48,4. La cola inicial le está haciendo de **aviso
temprano** a una regla que es reactiva (PEN-011): sin ella, el umbral se
cruza más tarde, y para cuando la caseta abre, cinco minutos después, la
cola ya creció. La espera de P→C pasa de 0,47 a 1,07 min,
mientras la de C→P baja de 0,48 a 0,21 min, porque la caseta
que P→C no pide se la queda el contraflujo (19,8 carriles-intervalo contra
15,4). Está anotado en PEN-016.

Las variantes de **meta** mueven el `Wq` exactamente 0, como tiene que ser:
la meta no entra en el motor, solo en el veredicto. Lo que cambian es
cuántos escenarios se consideran cumplidos.

### La reasignación por ρ sigue siendo casi inerte

| Comparación | Régimen | Reasignaciones por réplica | Δ Wq del peaje |
|---|---|---|---|
| Con reasignación al factor 1,0 | base | 0,90 | 0,04 min |
| Con reasignación al factor 1,0 | lento | 0,03 | -0,00 min |
| Con reasignación al factor 1,13 | base | 0,37 | 0,14 min |
| Con reasignación al factor 1,13 | lento | 0,00 | 0,00 min |

Confirma PEN-015 con la demanda alta: en el pico nadie libera casetas, así
que la regla de la DEC-008 no tiene ocasión de aplicarse. Queda como
hallazgo y no se rediseña (DEC-028).

### Lo que esta matriz no puede responder

Los tres supuestos del principio siguen en pie, y los tres empujan en la
misma dirección:

- Si el servicio del pico fuera más lento que el medido, el quiebre llega
  antes de lo que dice la columna "base".
- Si la demanda de C→P fuera mayor que la del viernes, el reparto empeora: la
  sensibilidad del factor de C→P y la de los sustitutos lo cuantifican.
- Como el modelo de cola única subestima la congestión del pico (PEN-008),
  **todo factor de quiebre de esta matriz es una cota superior**: el peaje
  real quiebra con menos demanda que la que aquí aparece.

Por eso la fase 4 no entrega una política, sino el mapa de lo que haría falta
medir para poder recomendarla: tiempos de atención en un festivo, la demanda
de C→P en un festivo y la cola total por sentido.

