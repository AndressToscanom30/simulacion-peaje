# Fase 2: la regla de apertura y cierre contra la operación real

Generado por `npm run fase2` el 2026-10-31.
**No editar a mano:** este archivo se regenera.

21 casos, **30 réplicas** cada uno, semillas 1 a 30,
**las mismas en todos los casos** (DEC-010): las comparaciones usan números
aleatorios comunes, así que las diferencias entre casos no son ruido de
semillas distintas.

> Se reporta lo que salga. **No se ajustó ningún parámetro** para que la
> regla saliera mejor ni peor (DEC-021).

## Cómo leer esto

- **operador** = modo programado: `c(t)` copia las casetas que el operador
  tuvo abiertas en cada intervalo del conteo. Es la operación real.
- **regla** = modo por regla: `c(t)` lo decide la regla por cola de la
  sección 4, arrancando con las casetas del primer intervalo observado.
- **regla+tasa** = la misma regla **más el disparador anticipativo por tasa
  de llegadas** (DEC-046): abre también cuando las llegadas de los últimos
  5 min cruzan el umbral de la sección 4 (21 / 46 / 70 / 95), sin esperar a
  que la cola cruce el suyo. Se dispara lo que ocurra primero. La columna
  **Anticipadas** cuenta las aperturas que solo explica la tasa.
- **servicio base** = 12,1016 s, el medido. **servicio lento** = 15,5 s, que
  es una **hipótesis de sensibilidad** (DEC-025, PEN-010), no una medición ni
  una calibración. Solo se aplica al festivo, que es el escenario de pico.
- **Criterio de desempeño** (DEC-009): meta `Wq ≤ 1 min` y a lo sumo
  5 % de los intervalos por encima de 2,5 min.
- El modelo de cola única **subestima** la congestión del pico (PEN-008), así
  que las casetas que recomiende la regla son una **cota inferior**.

## Operador contra regla, conteo por conteo

Todas las cifras son la media entre réplicas con su intervalo de confianza al 95 %.

### viernes

Viernes 02/10/2026, Cúcuta→Pamplona, 12:00–13:00

- Llegadas contadas: 238 veh/h
- Casetas del operador: `[2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]`
- Cola inicial: 0 vehículos
- Casetas iniciales de la regla: 2
- Demora de apertura: 5 min

| Caso | Wq (min) | % int. > 2,5 min | Cola máx. muestreada | Cola máx. continua | Carriles-int. | Aperturas | Anticipadas | Cierres | Cambios de c | Min. con c = 5 |
|---|---|---|---|---|---|---|---|---|---|---|
| operador | 0,03 ± 0,00 | 0,0 % ± 0,0 % | 0,8 ± 0,4 | 3,7 ± 0,4 | 24,0 ± 0,0 | 0,0 | 0,0 | 0,0 | 0,0 | 0,0 |
| regla | 0,07 ± 0,03 | 0,0 % ± 0,0 % | 2,1 ± 0,8 | 5,5 ± 1,0 | 22,7 ± 0,6 | 0,5 | 0,0 | 0,6 | 1,1 | 0,0 |
| regla+tasa | 0,06 ± 0,02 | 0,0 % ± 0,0 % | 1,8 ± 0,7 | 5,0 ± 1,0 | 22,8 ± 0,5 | 0,7 | 0,7 | 0,7 | 1,4 | 0,0 |

¿Cumple el criterio de desempeño?

| Caso | Wq ≤ 1 min | ≤ 5 % de intervalos > 2,5 min | Cumple |
|---|---|---|---|
| operador | sí | sí | sí |
| regla | sí | sí | sí |
| regla+tasa | sí | sí | sí |

### domingoCP

Domingo 13/09/2026, Cúcuta→Pamplona, 11:50–12:50

- Llegadas contadas: 451 veh/h
- Casetas del operador: `[3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3]`
- Cola inicial: 0 vehículos
- Casetas iniciales de la regla: 3
- Demora de apertura: 5 min

| Caso | Wq (min) | % int. > 2,5 min | Cola máx. muestreada | Cola máx. continua | Carriles-int. | Aperturas | Anticipadas | Cierres | Cambios de c | Min. con c = 5 |
|---|---|---|---|---|---|---|---|---|---|---|
| operador | 0,13 ± 0,02 | 0,0 % ± 0,0 % | 5,8 ± 1,3 | 9,6 ± 1,2 | 28,0 ± 0,0 | 1,0 | 0,0 | 1,0 | 2,0 | 0,0 |
| regla | 0,10 ± 0,02 | 0,0 % ± 0,0 % | 5,2 ± 1,5 | 9,5 ± 1,5 | 30,7 ± 0,8 | 0,5 | 0,0 | 1,3 | 1,8 | 0,0 |
| regla+tasa | 0,09 ± 0,02 | 0,0 % ± 0,0 % | 4,7 ± 1,4 | 8,9 ± 1,5 | 31,8 ± 0,7 | 1,0 | 0,9 | 1,5 | 2,5 | 0,0 |

¿Cumple el criterio de desempeño?

| Caso | Wq ≤ 1 min | ≤ 5 % de intervalos > 2,5 min | Cumple |
|---|---|---|---|
| operador | sí | sí | sí |
| regla | sí | sí | sí |
| regla+tasa | sí | sí | sí |

### domingoPC

Domingo 13/09/2026, Pamplona→Cúcuta, 13:00–14:00

- Llegadas contadas: 195 veh/h
- Casetas del operador: `[2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]`
- Cola inicial: 0 vehículos
- Casetas iniciales de la regla: 2
- Demora de apertura: 5 min

| Caso | Wq (min) | % int. > 2,5 min | Cola máx. muestreada | Cola máx. continua | Carriles-int. | Aperturas | Anticipadas | Cierres | Cambios de c | Min. con c = 5 |
|---|---|---|---|---|---|---|---|---|---|---|
| operador | 0,28 ± 0,06 | 0,3 % ± 0,5 % | 4,6 ± 1,1 | 7,6 ± 1,2 | 14,0 ± 0,0 | 0,0 | 0,0 | 1,0 | 1,0 | 0,0 |
| regla | 0,09 ± 0,02 | 0,0 % ± 0,0 % | 2,4 ± 0,8 | 5,4 ± 0,7 | 21,0 ± 0,6 | 0,8 | 0,0 | 1,2 | 2,0 | 0,0 |
| regla+tasa | 0,08 ± 0,02 | 0,0 % ± 0,0 % | 2,1 ± 0,8 | 5,0 ± 0,8 | 21,5 ± 0,5 | 0,9 | 0,5 | 1,2 | 2,1 | 0,0 |

¿Cumple el criterio de desempeño?

| Caso | Wq ≤ 1 min | ≤ 5 % de intervalos > 2,5 min | Cumple |
|---|---|---|---|
| operador | sí | sí | sí |
| regla | sí | sí | sí |
| regla+tasa | sí | sí | sí |

### festivoPC

Festivo 12/10/2026, Pamplona→Cúcuta, 16:25–17:25

- Llegadas contadas: 1064 veh/h
- Casetas del operador: `[4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5]`
- Cola inicial: 23 vehículos
- Casetas iniciales de la regla: 4
- Demora de apertura: 5 min

| Caso | Wq (min) | % int. > 2,5 min | Cola máx. muestreada | Cola máx. continua | Carriles-int. | Aperturas | Anticipadas | Cierres | Cambios de c | Min. con c = 5 |
|---|---|---|---|---|---|---|---|---|---|---|
| operador | 0,28 ± 0,04 | 0,0 % ± 0,0 % | 21,4 ± 2,9 | 29,3 ± 2,8 | 55,0 ± 0,0 | 1,0 | 0,0 | 0,0 | 1,0 | 35,0 |
| regla | 0,32 ± 0,03 | 0,0 % ± 0,0 % | 26,5 ± 3,3 | 36,1 ± 3,3 | 55,6 ± 0,4 | 1,9 | 0,0 | 1,6 | 3,5 | 37,8 |
| regla+tasa | 0,23 ± 0,03 | 0,0 % ± 0,0 % | 20,5 ± 2,8 | 29,4 ± 2,7 | 57,2 ± 0,2 | 2,3 | 1,6 | 1,3 | 3,6 | 46,1 |
| operador · lento | 2,90 ± 0,45 | 50,0 % ± 10,7 % | 83,2 ± 11,3 | 93,8 ± 11,2 | 55,0 ± 0,0 | 1,0 | 0,0 | 0,0 | 1,0 | 35,0 |
| regla · lento | 1,23 ± 0,21 | 9,2 % ± 5,8 % | 46,8 ± 6,8 | 55,2 ± 6,8 | 58,9 ± 0,2 | 1,1 | 0,0 | 0,1 | 1,1 | 54,3 |
| regla+tasa · lento | 1,19 ± 0,22 | 8,6 % ± 5,8 % | 45,6 ± 6,7 | 53,9 ± 6,8 | 58,9 ± 0,1 | 1,0 | 0,1 | 0,0 | 1,1 | 54,6 |

¿Cumple el criterio de desempeño?

| Caso | Wq ≤ 1 min | ≤ 5 % de intervalos > 2,5 min | Cumple |
|---|---|---|---|
| operador | sí | sí | sí |
| regla | sí | sí | sí |
| regla+tasa | sí | sí | sí |
| operador · lento | **no** | **no** | **no** |
| regla · lento | **no** | **no** | **no** |
| regla+tasa · lento | **no** | **no** | **no** |

## El disparador anticipativo por tasa (DEC-046)

La regla por cola es **reactiva**: espera a que la cola cruce el umbral y
después tarda la demora en tener la caseta abierta. El operador real fue
**anticipativo** (PEN-011). El disparador por tasa es lo que cierra esa
diferencia: abre cuando la **demanda** cruza el umbral, sin esperar a que la
cola se forme.

Los umbrales no son nuevos: son los cuatro que deriva la sección 4 del
contexto por M/M/c con `Wq ≤ 1 min` (21 / 46 / 70 / 95 llegadas por 5 min
para abrir la 2.ª, 3.ª, 4.ª y 5.ª caseta).

### servicio base (12,10 s)

| Conteo | Wq operador | Wq regla | Wq regla+tasa | Δ tasa vs. regla | ¿Gana al operador? | Carriles regla | Carriles regla+tasa | Anticipadas |
|---|---|---|---|---|---|---|---|---|
| viernes | 0,03 | 0,07 | **0,06** | -0,01 | **no** | 22,7 | 22,8 | 0,67 |
| domingoCP | 0,13 | 0,10 | **0,09** | -0,01 | sí | 30,7 | 31,8 | 0,90 |
| domingoPC | 0,28 | 0,09 | **0,08** | -0,02 | sí | 21,0 | 21,5 | 0,47 |
| festivoPC | 0,28 | 0,32 | **0,23** | -0,09 | sí | 55,6 | 57,2 | 1,63 |

**En el festivo**, el disparador baja `Wq` de 0,32 a 0,23 min (÷1,37), con 1,63 aperturas anticipadas por réplica y 1,7 carriles-intervalo de diferencia.
Contra el operador (0,28 min), la regla con el disparador **queda por delante**, que es justo lo que la regla por cola sola no conseguía con la demora de 5 min.

### servicio lento (15,5 s, sensibilidad)

| Conteo | Wq operador | Wq regla | Wq regla+tasa | Δ tasa vs. regla | ¿Gana al operador? | Carriles regla | Carriles regla+tasa | Anticipadas |
|---|---|---|---|---|---|---|---|---|
| festivoPC | 2,90 | 1,23 | **1,19** | -0,04 | sí | 58,9 | 58,9 | 0,07 |

**En el festivo**, el disparador baja `Wq` de 1,23 a 1,19 min (÷1,03), con 0,07 aperturas anticipadas por réplica y 0,1 carriles-intervalo de diferencia.
Contra el operador (2,90 min), la regla con el disparador **queda por delante**, como ya lo estaba sin el disparador.

## Sensibilidad de la demora de apertura (festivo)

La demora es el tiempo entre que se decide abrir una caseta y que la caseta
está operando. No está medida en campo (contexto, sección 8), así que entra
como sensibilidad: 0, 5 y 10 min.

### servicio base (12,10 s)

| Caso | Wq (min) | % int. > 2,5 min | Cola máx. muestreada | Cola máx. continua | Carriles-int. | Aperturas | Anticipadas | Cierres | Cambios de c | Min. con c = 5 |
|---|---|---|---|---|---|---|---|---|---|---|
| operador (referencia) | 0,28 ± 0,04 | 0,0 % ± 0,0 % | 21,4 ± 2,9 | 29,3 ± 2,8 | 55,0 ± 0,0 | 1,0 | 0,0 | 0,0 | 1,0 | 35,0 |
| regla · demora 0 min | 0,19 ± 0,02 | 0,0 % ± 0,0 % | 17,0 ± 3,1 | 26,6 ± 2,1 | 56,7 ± 0,5 | 1,9 | 0,0 | 1,5 | 3,4 | 43,6 |
| regla · demora 5 min | 0,32 ± 0,03 | 0,0 % ± 0,0 % | 26,5 ± 3,3 | 36,1 ± 3,3 | 55,6 ± 0,4 | 1,9 | 0,0 | 1,6 | 3,5 | 37,8 |
| regla · demora 10 min | 0,31 ± 0,03 | 0,0 % ± 0,0 % | 22,9 ± 2,8 | 33,0 ± 2,7 | 54,6 ± 0,6 | 1,6 | 0,0 | 1,2 | 2,8 | 33,0 |

### servicio lento (15,5 s, sensibilidad)

| Caso | Wq (min) | % int. > 2,5 min | Cola máx. muestreada | Cola máx. continua | Carriles-int. | Aperturas | Anticipadas | Cierres | Cambios de c | Min. con c = 5 |
|---|---|---|---|---|---|---|---|---|---|---|
| operador (referencia) | 2,90 ± 0,45 | 50,0 % ± 10,7 % | 83,2 ± 11,3 | 93,8 ± 11,2 | 55,0 ± 0,0 | 1,0 | 0,0 | 0,0 | 1,0 | 35,0 |
| regla · demora 0 min | 0,95 ± 0,20 | 6,7 % ± 5,0 % | 39,9 ± 6,7 | 47,7 ± 6,8 | 59,9 ± 0,1 | 1,1 | 0,0 | 0,1 | 1,2 | 59,6 |
| regla · demora 5 min | 1,23 ± 0,21 | 9,2 % ± 5,8 % | 46,8 ± 6,8 | 55,2 ± 6,8 | 58,9 ± 0,2 | 1,1 | 0,0 | 0,1 | 1,1 | 54,3 |
| regla · demora 10 min | 1,40 ± 0,23 | 12,8 % ± 5,7 % | 50,2 ± 7,0 | 57,9 ± 6,9 | 58,0 ± 0,0 | 1,0 | 0,0 | 0,0 | 1,0 | 49,9 |

## Lectura

Todo lo que sigue sale de las tablas de arriba.

### Con servicio base (12,10 s)

| Conteo | Wq operador | Wq regla | % int. > 2,5 min op. | % int. regla | Cumple op. | Cumple regla | Carriles-int. op. | Carriles-int. regla | Dif. carriles |
|---|---|---|---|---|---|---|---|---|---|
| viernes | 0,03 | 0,07 | 0,0 % | 0,0 % | sí | sí | 24,0 | 22,7 | -1,3 |
| domingoCP | 0,13 | 0,10 | 0,0 % | 0,0 % | sí | sí | 28,0 | 30,7 | 2,7 |
| domingoPC | 0,28 | 0,09 | 0,3 % | 0,0 % | sí | sí | 14,0 | 21,0 | 7,0 |
| festivoPC | 0,28 | 0,32 | 0,0 % | 0,0 % | sí | sí | 55,0 | 55,6 | 0,6 |

**Las dos cumplen el criterio en todos los conteos de este régimen.** Con el
operador ya cumpliendo, la regla no tiene incumplimiento que corregir: lo
que queda por comparar es la espera y los carriles-intervalo que gasta cada
uno. Dicho de otro modo, en este régimen **la regla no resuelve un problema,
porque según el modelo no hay problema que resolver** (PEN-009).

Espera, conteo por conteo:

- **viernes:** la regla sube `Wq` de 0,03 a 0,07 min (×2,92), con -1,3 carriles-intervalo de diferencia.
- **domingoCP:** la regla baja `Wq` de 0,13 a 0,10 min (÷1,27), con 2,7 carriles-intervalo de diferencia.
- **domingoPC:** la regla baja `Wq` de 0,28 a 0,09 min (÷3,08), con 7,0 carriles-intervalo de diferencia y el % de intervalos sobre el máximo tolerable pasando de 0,3 % a 0,0 %.
- **festivoPC:** la regla sube `Wq` de 0,28 a 0,32 min (×1,15), con 0,6 carriles-intervalo de diferencia.

En carriles-intervalo sumados sobre los conteos de este régimen, la regla usa **9,0 más** que el operador (130,0 contra 121,0, un 7,4 %).

### Con servicio lento (15,5 s, sensibilidad)

| Conteo | Wq operador | Wq regla | % int. > 2,5 min op. | % int. regla | Cumple op. | Cumple regla | Carriles-int. op. | Carriles-int. regla | Dif. carriles |
|---|---|---|---|---|---|---|---|---|---|
| festivoPC | 2,90 | 1,23 | 50,0 % | 9,2 % | **no** | **no** | 55,0 | 58,9 | 3,9 |

**Ni el operador ni la regla cumplen el criterio en todos los conteos de
este régimen**, así que la comparación es de grado: cuánto incumple cada uno.

Espera, conteo por conteo:

- **festivoPC:** la regla baja `Wq` de 2,90 a 1,23 min (÷2,36), con 3,9 carriles-intervalo de diferencia y el % de intervalos sobre el máximo tolerable pasando de 50,0 % a 9,2 %.

En carriles-intervalo sumados sobre los conteos de este régimen, la regla usa **3,9 más** que el operador (58,9 contra 55,0, un 7,0 %).

### Dónde aporta la regla

El festivo con los dos regímenes de servicio, que es la comparación que
decide si la regla vale la pena:

| | Wq (min) | % int. > 2,5 min | Carriles-int. | Min. con c = 5 |
|---|---|---|---|---|
| operador, servicio base | 0,28 | 0,0 % | 55,0 | 35,0 |
| regla, servicio base | 0,32 | 0,0 % | 55,6 | 37,8 |
| operador, servicio lento | 2,90 | 50,0 % | 55,0 | 35,0 |
| regla, servicio lento | 1,23 | 9,2 % | 58,9 | 54,3 |

Con **servicio base** la regla queda algo peor que el operador (0,32 contra 0,28 min) y las dos cumplen: la regla no aporta nada que el operador no esté haciendo ya.

Con **servicio lento** cambia por completo: la regla baja `Wq` de 2,90 a 1,23 min (÷2,36) y el porcentaje de intervalos por encima del máximo tolerable de 50,0 % a 9,2 %, gastando 3,9 carriles-intervalo más (un 7,0 %).
Ninguna de las dos llega a cumplir el criterio, pero la regla recorta la
mayor parte del incumplimiento.

**La conclusión de la fase 2, entonces, depende del régimen de servicio.**
Si el servicio del pico es el medido (12,10 s), el modelo dice que la
operación real ya cumple y la regla sobra. Si el pico es más lento, la regla
es lo que separa un incumplimiento grave de uno moderado, por un 7 % más de
carriles-intervalo. Y como el modelo de cola única **subestima** la
congestión del pico (PEN-008), el caso base es el optimista de los dos.

### Efecto de la demora de apertura

- **servicio base (12,10 s):** pasar de 0 a 10 min de demora lleva `Wq` de 0,19 a 0,31 min (×1,62) y los carriles-intervalo de 56,7 a 54,6.
- **servicio lento (15,5 s, sensibilidad):** pasar de 0 a 10 min de demora lleva `Wq` de 0,95 a 1,40 min (×1,47) y los carriles-intervalo de 59,9 a 58,0.

### Lo que esta comparación no puede responder

- El modelo de cola única **subestima** la congestión del pico: en el festivo
  la cola total simulada queda por debajo de la fila más larga observada en
  los 12 intervalos (PEN-008, `diagnostico-festivo.md`). Las casetas que la
  regla recomienda son una **cota inferior**.
- El **servicio lento de 15,5 s es una hipótesis**, no una medición
  (DEC-025, PEN-010). Está aquí para acotar cuánto cambiaría la conclusión si
  la causa del pico fuera un servicio más lento, no para afirmar que lo es.
- Falta el **pozo compartido entre sentidos**: aquí cada sentido tiene su
  propio tope de 5 casetas, sin competir con el otro. Eso es la fase 3, y
  solo puede empeorar el desempeño de la regla, nunca mejorarlo.
- La demanda de Cúcuta→Pamplona en el festivo **no se midió** (contexto,
  sección 7), así que la competencia por casetas de la fase 3 se alimentará de
  un sustituto.

