# Arranque en frío: el caso malo de la política

Generado por `npm run arranque` el 2026-10-31.
**No editar a mano:** este archivo se regenera.

32 casos, **30 réplicas** cada uno, semillas 1 a 30,
**las mismas en todos** (DEC-010).

> Se reporta lo que salga. **No se ajustó ningún parámetro** (DEC-021).

## Qué se pregunta y por qué

Dos avisos del propio estudio apuntan al mismo caso malo:

- **DEC-046** dejó declarado que durante los **primeros 5 min** la ventana
  móvil del disparador por tasa está a medio llenar, así que no puede alcanzar
  su umbral justo en el arranque de un pico, que es donde más falta haría.
- **PEN-016** tenía medido que quitarle a P→C la cola inicial **empeora** su
  espera, porque esa cola le hacía de **aviso temprano** a una regla reactiva.

La pregunta es si el disparador por tasa recupera lo que la cola heredada le
daba, o si el arranque en frío sigue siendo el agujero de la política.

## Los cuatro factores

| Factor | Valores |
|---|---|
| Arranque | cola heredada de 23 vehículos (lo observado) / **cola 0** |
| Capacidad inicial | 4 casetas (lo observado) / **1 caseta** |
| Perfil de demanda | el medido / **rampa** (construido) |
| Control | regla por cola (DEC-006) / **regla + tasa** (DEC-046) |

**La rampa son los 12 intervalos medidos reordenados de menor a mayor**
(DEC-047), no demanda inventada:

```
medido: [92, 78, 60, 108, 92, 124, 78, 102, 86, 101, 99, 44]   total 1064
rampa:  [44, 60, 78, 78, 86, 92, 92, 99, 101, 102, 108, 124]   total 1064
```

Mismos doce valores, mismo total: cambia **cuándo** llega la demanda y nada
más. **Es un escenario construido, no una medición:** el festivo real arrancó
ya alto (92 veh/5 min en el primer intervalo). La rampa no dice qué pasó,
dice qué pasaría si el mismo tráfico llegara ordenado de menos a más.

**Criterio de desempeño** (DEC-009): meta `Wq ≤ 1 min` y a lo sumo
5 % de los intervalos por encima de 2,5 min.

## servicio base (12,10 s)

| Perfil | Arranque | Capacidad inicial | Control | Wq (min) | % int. > 2,5 min | Cola máx. continua | Carriles-int. | 1.ª orden (min) | Anticipadas | Cumple |
|---|---|---|---|---|---|---|---|---|---|---|
| medido | cola 23 | 4 casetas | regla por cola | 0,32 ± 0,03 | 0,0 % | 36,1 | 55,6 | 0,17 | 0,00 | sí |
| medido | cola 23 | 4 casetas | regla + tasa | 0,23 ± 0,03 | 0,0 % | 29,4 | 57,2 | 0,17 | 1,63 | sí |
| medido | cola 23 | 1 caseta | regla por cola | 2,82 ± 0,19 | 48,3 % | 120,9 | 49,0 | 0,00 | 0,00 | **no** |
| medido | cola 23 | 1 caseta | regla + tasa | 2,82 ± 0,19 | 48,3 % | 120,9 | 49,4 | 0,00 | 0,40 | **no** |
| medido | cola 0 | 4 casetas | regla por cola | 0,42 ± 0,09 | 1,4 % | 39,9 | 51,8 | 20,46 (27/30) | 0,00 | sí |
| medido | cola 0 | 4 casetas | regla + tasa | 0,28 ± 0,08 | 0,3 % | 30,8 | 55,0 | 11,38 | 2,00 | sí |
| medido | cola 0 | 1 caseta | regla por cola | 2,35 ± 0,16 | 45,6 % | 104,0 | 48,6 | 0,40 | 0,00 | **no** |
| medido | cola 0 | 1 caseta | regla + tasa | 2,35 ± 0,16 | 45,6 % | 104,0 | 49,0 | 0,40 | 0,50 | **no** |
| rampa (construido) | cola 23 | 4 casetas | regla por cola | 0,34 ± 0,04 | 0,0 % | 32,5 | 51,5 | 16,29 | 0,00 | sí |
| rampa (construido) | cola 23 | 4 casetas | regla + tasa | 0,18 ± 0,03 | 0,0 % | 25,8 | 54,0 | 14,08 | 1,80 | sí |
| rampa (construido) | cola 23 | 1 caseta | regla por cola | 1,11 ± 0,09 | 24,2 % | 58,9 | 47,4 | 0,00 | 0,00 | **no** |
| rampa (construido) | cola 23 | 1 caseta | regla + tasa | 0,97 ± 0,08 | 24,2 % | 58,4 | 49,1 | 0,00 | 0,93 | **no** |
| rampa (construido) | cola 0 | 4 casetas | regla por cola | 0,37 ± 0,06 | 0,8 % | 36,4 | 50,3 | 28,22 (29/30) | 0,00 | sí |
| rampa (construido) | cola 0 | 4 casetas | regla + tasa | 0,18 ± 0,03 | 0,0 % | 22,6 | 52,7 | 21,93 | 2,27 | sí |
| rampa (construido) | cola 0 | 1 caseta | regla por cola | 0,91 ± 0,09 | 15,6 % | 52,6 | 46,1 | 1,22 | 0,00 | **no** |
| rampa (construido) | cola 0 | 1 caseta | regla + tasa | 0,78 ± 0,09 | 15,6 % | 52,5 | 48,1 | 1,22 | 0,97 | **no** |

## servicio lento (15,5 s, sensibilidad)

| Perfil | Arranque | Capacidad inicial | Control | Wq (min) | % int. > 2,5 min | Cola máx. continua | Carriles-int. | 1.ª orden (min) | Anticipadas | Cumple |
|---|---|---|---|---|---|---|---|---|---|---|
| medido | cola 23 | 4 casetas | regla por cola | 1,23 ± 0,21 | 9,2 % | 55,2 | 58,9 | 0,07 | 0,00 | **no** |
| medido | cola 23 | 4 casetas | regla + tasa | 1,19 ± 0,22 | 8,6 % | 53,9 | 58,9 | 0,07 | 0,07 | **no** |
| medido | cola 23 | 1 caseta | regla por cola | 8,61 ± 0,37 | 100,0 % | 195,6 | 50,0 | 0,00 | 0,00 | **no** |
| medido | cola 23 | 1 caseta | regla + tasa | 8,61 ± 0,37 | 100,0 % | 195,6 | 50,0 | 0,00 | 0,00 | **no** |
| medido | cola 0 | 4 casetas | regla por cola | 1,35 ± 0,22 | 11,1 % | 56,2 | 57,2 | 8,96 | 0,00 | **no** |
| medido | cola 0 | 4 casetas | regla + tasa | 1,31 ± 0,20 | 9,4 % | 53,9 | 57,5 | 7,58 | 0,17 | **no** |
| medido | cola 0 | 1 caseta | regla por cola | 7,48 ± 0,47 | 99,4 % | 174,1 | 49,7 | 0,37 | 0,00 | **no** |
| medido | cola 0 | 1 caseta | regla + tasa | 7,48 ± 0,47 | 99,4 % | 174,1 | 49,7 | 0,37 | 0,00 | **no** |
| rampa (construido) | cola 23 | 4 casetas | regla por cola | 1,19 ± 0,16 | 9,4 % | 72,6 | 56,5 | 6,88 | 0,00 | **no** |
| rampa (construido) | cola 23 | 4 casetas | regla + tasa | 1,25 ± 0,17 | 10,8 % | 75,0 | 56,6 | 6,81 | 0,27 | **no** |
| rampa (construido) | cola 23 | 1 caseta | regla por cola | 4,37 ± 0,43 | 92,2 % | 121,1 | 49,9 | 0,00 | 0,00 | **no** |
| rampa (construido) | cola 23 | 1 caseta | regla + tasa | 4,37 ± 0,43 | 92,2 % | 121,1 | 49,9 | 0,00 | 0,00 | **no** |
| rampa (construido) | cola 0 | 4 casetas | regla por cola | 1,32 ± 0,21 | 12,8 % | 72,2 | 54,1 | 22,01 | 0,00 | **no** |
| rampa (construido) | cola 0 | 4 casetas | regla + tasa | 1,25 ± 0,19 | 10,8 % | 70,6 | 54,2 | 22,92 | 0,30 | **no** |
| rampa (construido) | cola 0 | 1 caseta | regla por cola | 3,95 ± 0,40 | 83,3 % | 114,7 | 49,1 | 1,06 | 0,00 | **no** |
| rampa (construido) | cola 0 | 1 caseta | regla + tasa | 3,95 ± 0,40 | 83,3 % | 114,7 | 49,1 | 1,06 | 0,00 | **no** |

## Lectura

Todo lo que sigue sale de las tablas de arriba.

### ¿Recupera el disparador lo que daba la cola heredada?

Con el perfil medido y las casetas observadas, que es el escenario de PEN-016:

| Servicio | Arranque | Wq regla | Wq regla + tasa | 1.ª orden regla | 1.ª orden tasa |
|---|---|---|---|---|---|
| base | cola 23 | 0,32 | 0,23 | 0,17 | 0,17 |
| base | cola 0 | 0,42 | 0,28 | 20,46 | 11,38 |
| lento | cola 23 | 1,23 | 1,19 | 0,07 | 0,07 |
| lento | cola 0 | 1,35 | 1,31 | 8,96 | 7,58 |

Con servicio base, el arranque en frío le cuesta a la regla por cola **0,10 min** de espera (de 0,32 a 0,42), que es el hallazgo de PEN-016. El disparador por tasa recupera **0,14 min** (131 % de lo perdido), y deja el arranque en frío en 0,28 min.

Las dos cumplen el criterio en este escenario, así que la diferencia es de
grado y no de veredicto.

Y lo más claro está en la columna de la primera orden, que es la que mide la
reacción:

en frío, la regla por cola tarda **20,46 min** en pedir la primera caseta —y en 3 de las 30 réplicas no la pide nunca—, mientras con el disparador la pide a los **11,38 min**, en las 30 réplicas: **9,09 min de ventaja**. Con la cola heredada las dos reaccionan al instante, porque los 23 vehículos ya cruzan el umbral en `t = 0`.

> **Ojo al comparar con PEN-016.** Allí quitar la cola inicial empeoraba
> P→C de 0,47 a 1,07 min, mucho más que el salto de este informe. No es una
> contradicción: PEN-016 mide **los dos sentidos** sobre el pozo común, y
> allí la caseta que P→C no pide **se la queda C→P** (PEN-014), así que la
> penalización va doble. Este informe es de **un solo sentido**, donde la
> caseta sigue disponible cuando la regla por fin la pide. El mecanismo es
> el mismo; el tamaño del castigo, no.

### Abrir el pico con una sola caseta es el factor que de verdad manda

Esto es lo que más pesa de todo el experimento, y no es el disparador:

| Servicio | Perfil | Capacidad inicial | Wq regla | Wq regla + tasa | Carriles-int. | Cumple |
|---|---|---|---|---|---|---|
| base | medido | 4 casetas | 0,42 | 0,28 | 51,8 | sí / sí |
| base | medido | 1 caseta | 2,35 | 2,35 | 48,6 | **no** / **no** |
| base | rampa (construido) | 4 casetas | 0,37 | 0,18 | 50,3 | sí / sí |
| base | rampa (construido) | 1 caseta | 0,91 | 0,78 | 46,1 | **no** / **no** |
| lento | medido | 4 casetas | 1,35 | 1,31 | 57,2 | **no** / **no** |
| lento | medido | 1 caseta | 7,48 | 7,48 | 49,7 | **no** / **no** |
| lento | rampa (construido) | 4 casetas | 1,32 | 1,25 | 54,1 | **no** / **no** |
| lento | rampa (construido) | 1 caseta | 3,95 | 3,95 | 49,1 | **no** / **no** |

Con el perfil medido y servicio base, arrancar con 1 caseta en vez de 4 casetas multiplica la espera por **8,3** (2,35 contra 0,28 min) y **ningún control cumple el criterio**. El disparador por tasa no cambia nada ahí: 2,35 contra 2,35 min.

La razón está en los carriles-intervalo: 48,6 contra 51,8. La regla **no recupera la capacidad que no se le dio al empezar**, porque solo puede añadir una caseta a la vez y cada una cuesta la demora de apertura. Para cuando llega al tope, la hora se acabó.

**Y aquí el disparador por tasa es inerte, por la misma razón de siempre:**
con una sola caseta y el pico encima, la cola cruza su umbral de inmediato
—la primera orden sale a los 0,40 min— así que no queda nada que anticipar.
El disparador sirve cuando hay holgura que gestionar, no cuando falta
capacidad.

### La demanda que sube es el caso **fácil**, no el difícil

Esto sale al revés de lo que el experimento suponía al plantearse (DEC-047), y
es el hallazgo que conviene llevarse:

| Servicio | Capacidad inicial | Wq perfil medido | Wq rampa | ¿Cuál es peor? |
|---|---|---|---|---|
| base | 4 casetas | 0,28 | 0,18 | **el medido** |
| base | 1 caseta | 2,35 | 0,78 | **el medido** |
| lento | 4 casetas | 1,31 | 1,25 | **el medido** |
| lento | 1 caseta | 7,48 | 3,95 | **el medido** |

El perfil **medido** sale peor que la rampa en **4 de los 4** casos en frío. El motivo es sencillo cuando se mira el perfil: la rampa empieza en 44 veh/5 min y le **regala tiempo** a una regla reactiva para ir abriendo casetas antes de que llegue lo gordo, mientras el festivo real arranca ya en 92 veh/5 min, casi en el máximo.

**Así que el caso malo de esta política no es «la demanda subiendo»: es «la
demanda que ya empieza arriba».** Y eso no es un escenario hipotético, es
exactamente lo que hizo el festivo medido. El retorno de un festivo no sube
despacio: empieza en hora punta.

### El efecto de la rampa, aislado

Mismo total de demanda, mismo arranque y misma capacidad: solo cambia el orden
de los intervalos.

| Servicio | Arranque | Capacidad | Control | Wq medido | Wq rampa | Δ |
|---|---|---|---|---|---|---|
| base | cola 23 | 4 casetas | regla por cola | 0,32 | 0,34 | 0,02 |
| base | cola 23 | 4 casetas | regla + tasa | 0,23 | 0,18 | -0,05 |
| base | cola 23 | 1 caseta | regla por cola | 2,82 | 1,11 | -1,71 |
| base | cola 23 | 1 caseta | regla + tasa | 2,82 | 0,97 | -1,85 |
| base | cola 0 | 4 casetas | regla por cola | 0,42 | 0,37 | -0,05 |
| base | cola 0 | 4 casetas | regla + tasa | 0,28 | 0,18 | -0,10 |
| base | cola 0 | 1 caseta | regla por cola | 2,35 | 0,91 | -1,44 |
| base | cola 0 | 1 caseta | regla + tasa | 2,35 | 0,78 | -1,57 |
| lento | cola 23 | 4 casetas | regla por cola | 1,23 | 1,19 | -0,04 |
| lento | cola 23 | 4 casetas | regla + tasa | 1,19 | 1,25 | 0,06 |
| lento | cola 23 | 1 caseta | regla por cola | 8,61 | 4,37 | -4,24 |
| lento | cola 23 | 1 caseta | regla + tasa | 8,61 | 4,37 | -4,24 |
| lento | cola 0 | 4 casetas | regla por cola | 1,35 | 1,32 | -0,03 |
| lento | cola 0 | 4 casetas | regla + tasa | 1,31 | 1,25 | -0,05 |
| lento | cola 0 | 1 caseta | regla por cola | 7,48 | 3,95 | -3,53 |
| lento | cola 0 | 1 caseta | regla + tasa | 7,48 | 3,95 | -3,53 |

### Lo que este experimento no puede responder

- **La rampa es construida** (DEC-047). Dice qué pasa si el mismo tráfico llega
  ordenado de menos a más, no qué pasó ni qué pasará.
- **Es de un solo sentido.** No hay competencia por el pozo, así que la caseta
  que la regla pide está siempre disponible. Con el pozo compartido, anticipar
  es pedir antes un recurso disputado (DEC-046).
- **El modelo subestima la congestión del pico** (PEN-008), y aquí eso pesa
  doble: si la cola real crece más rápido que la simulada, el umbral de cola
  se cruza antes de lo que dice este informe y la ventaja del disparador por
  tasa es **menor** de lo que sale. El sesgo juega en contra del hallazgo, no
  a favor.
- **La demanda de C→P en el festivo no se midió** (PEN-013), y sigue siendo la
  incertidumbre dominante del estudio.

