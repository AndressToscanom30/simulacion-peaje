# Periodo de calentamiento contra la cola inicial inyectada

Generado por `npm run calentamiento` el 2026-10-31.
**No editar a mano:** este archivo se regenera.

18 casos de comparación más 10 de duración, **30 réplicas** cada uno,
semillas 1 a 30, **las mismas en todos** (DEC-010).

> Se reporta lo que salga. **No se ajustó ningún parámetro** (DEC-021), y en
> particular no se buscó una duración que reprodujera los 23 vehículos
> observados: eso sería calibrar.

## Qué se compara

La **DEC-018** mete la cola inicial del festivo en `t = 0` sin espera previa,
lo que subestima su espera real; es el tratamiento vigente y así se declaró
(PEN-003). El autor de las mediciones confirmó que esa cola **se formó como
pudo haberse formado las colas de los siguientes intervalos**: el sistema venía
en el mismo régimen antes de las 4:25, sin atasco excepcional previo.

Eso es exactamente lo que simula un **periodo de calentamiento**: tramos
previos a la hora observada con la tasa del primer intervalo
(92 veh/5 min) y las casetas iniciales fijas (4), de modo que la cola
inicial **emerja sola** en vez de inyectarse.

El calentamiento cambia **dos cosas a la vez**, así que se separan:

| | Cola inicial | Espera previa |
|---|---|---|
| **A** · DEC-018 | 23, inyectada | 0 |
| **B** · calentamiento | la que emerge | la que acumuló |
| **C** · descomposición | la misma que B, inyectada | 0 |

**A → C** aísla el efecto del **tamaño** de la cola; **C → B**, el de la
**contabilidad de la espera**. Sin C no se podría saber cuál de los dos manda.

El calentamiento corre en su **propio flujo de PRNG** (flujo
10, lejos de los flujos 0 y 1 de los sentidos), para que el tráfico previo no
sea una copia del primer intervalo de la hora observada.

**Solo se aplica al festivo.** Es el único conteo con cola inicial observada
distinta de 0 (DEC-010); en los demás la cola 0 es un dato, no un supuesto, y
calentar los sobreescribiría.

## Lo primero: qué cola deja el calentamiento

| Duración | Cola al arrancar (media) | Rango | Espera ya acumulada (media) |
|---|---|---|---|
| 1 intervalos (5 min) | 4,9 | 0–18 | 0,11 min |
| 2 intervalos (10 min) | 4,8 | 0–31 | 0,15 min |
| 3 intervalos (15 min) | 5,1 | 0–30 | 0,14 min |
| 6 intervalos (30 min) | 8,4 | 0–24 | 0,21 min |
| 12 intervalos (60 min) | 4,5 | 0–31 | 0,11 min |

**La cola se estabiliza enseguida y no crece con la duración:** entre 4,5 y 8,4 vehículos de media para duraciones de 5 a 60 min, sin tendencia. Es el régimen del primer intervalo: λ = 1104 veh/h contra 4 casetas, y con el servicio gamma medido (CV = 0,46, bastante menos variable que la exponencial) ese régimen no acumula más cola que esa.

**Y ahí está el hallazgo incómodo: el calentamiento deja unos 6 vehículos, no los 23 observados.**

No es un fallo del calentamiento: es **PEN-008 otra vez**. El modelo no
reproduce la cola del festivo en ninguno de los 12 intervalos medidos, y la
cola inicial es la lectura número cero de esa misma serie. Pedirle al
calentamiento que genere 23 vehículos sería pedirle que reprodujera justo lo
que el modelo no reproduce.

Esto tiene una consecuencia directa para la decisión: **el calentamiento no
es más realista que la DEC-018, es realista de otra manera.** La DEC-018 pone
la cola observada y le quita la espera previa; el calentamiento pone una
espera previa coherente y una cola demasiado corta. Cada uno acierta en una
mitad.

## servicio base (12,10 s)

Calentamiento de referencia: **3 intervalos (15 min)**.

| Control | Tratamiento | Cola inicial | Wq (min) | Wq sin cola inicial | % int. > 2,5 min | Cola máx. continua | Carriles-int. | Cumple |
|---|---|---|---|---|---|---|---|---|
| operador (programado) | A · DEC-018 (cola 23 inyectada) | 23,0 | 0,28 ± 0,04 | 0,27 | 0,0 % | 29,3 | 55,0 | sí |
| operador (programado) | B · calentamiento | 5,1 | 0,22 ± 0,04 | 0,22 | 0,0 % | 24,5 | 55,0 | sí |
| operador (programado) | C · misma cola que B, inyectada | 5,1 | 0,22 ± 0,04 | 0,22 | 0,0 % | 24,5 | 55,0 | sí |
| regla por cola | A · DEC-018 (cola 23 inyectada) | 23,0 | 0,32 ± 0,03 | 0,31 | 0,0 % | 36,1 | 55,6 | sí |
| regla por cola | B · calentamiento | 5,1 | 0,35 ± 0,05 | 0,35 | 0,0 % | 39,6 | 53,0 | sí |
| regla por cola | C · misma cola que B, inyectada | 5,1 | 0,35 ± 0,05 | 0,35 | 0,0 % | 39,6 | 53,0 | sí |
| regla + tasa | A · DEC-018 (cola 23 inyectada) | 23,0 | 0,23 ± 0,03 | 0,23 | 0,0 % | 29,4 | 57,2 | sí |
| regla + tasa | B · calentamiento | 5,1 | 0,25 ± 0,06 | 0,24 | 0,0 % | 30,8 | 55,2 | sí |
| regla + tasa | C · misma cola que B, inyectada | 5,1 | 0,24 ± 0,06 | 0,24 | 0,0 % | 30,8 | 55,2 | sí |

## servicio lento (15,5 s, sensibilidad)

Calentamiento de referencia: **3 intervalos (15 min)**.

| Control | Tratamiento | Cola inicial | Wq (min) | Wq sin cola inicial | % int. > 2,5 min | Cola máx. continua | Carriles-int. | Cumple |
|---|---|---|---|---|---|---|---|---|
| operador (programado) | A · DEC-018 (cola 23 inyectada) | 23,0 | 2,90 ± 0,45 | 2,95 | 50,0 % | 93,8 | 55,0 | **no** |
| operador (programado) | B · calentamiento | 40,7 | 3,78 ± 0,49 | 3,83 | 76,4 % | 107,6 | 55,0 | **no** |
| operador (programado) | C · misma cola que B, inyectada | 40,7 | 3,73 ± 0,48 | 3,83 | 74,2 % | 107,6 | 55,0 | **no** |
| regla por cola | A · DEC-018 (cola 23 inyectada) | 23,0 | 1,23 ± 0,21 | 1,24 | 9,2 % | 55,2 | 58,9 | **no** |
| regla por cola | B · calentamiento | 40,7 | 1,46 ± 0,29 | 1,42 | 16,9 % | 63,5 | 58,8 | **no** |
| regla por cola | C · misma cola que B, inyectada | 40,7 | 1,41 ± 0,28 | 1,42 | 14,4 % | 63,5 | 58,8 | **no** |
| regla + tasa | A · DEC-018 (cola 23 inyectada) | 23,0 | 1,19 ± 0,22 | 1,20 | 8,6 % | 53,9 | 58,9 | **no** |
| regla + tasa | B · calentamiento | 40,7 | 1,49 ± 0,29 | 1,45 | 18,6 % | 64,4 | 58,8 | **no** |
| regla + tasa | C · misma cola que B, inyectada | 40,7 | 1,44 ± 0,29 | 1,45 | 16,1 % | 64,4 | 58,8 | **no** |

## La descomposición: ¿qué parte del cambio es de cada cosa?

| Servicio | Control | A → C (tamaño de la cola) | C → B (espera previa) | A → B (total) |
|---|---|---|---|---|
| base | operador (programado) | -0,06 | 0,00 | -0,06 |
| base | regla por cola | 0,04 | 0,00 | 0,04 |
| base | regla + tasa | 0,01 | 0,00 | 0,01 |
| lento | operador (programado) | 0,83 | 0,05 | 0,88 |
| lento | regla por cola | 0,19 | 0,05 | 0,24 |
| lento | regla + tasa | 0,26 | 0,05 | 0,30 |

Con servicio base y la regla por cola, de los 0,04 min que separan A de B, 0,04 vienen del **tamaño de la cola** (23 → la que emerge) y 0,00 de la **contabilidad de la espera**. Manda el tamaño de la cola.

Dicho de otro modo: **el calentamiento no cambia tanto las cosas por contar
bien la espera previa como por quedarse corto en la cola de arranque.** Lo
primero es una mejora del modelo; lo segundo, el sesgo de PEN-008 entrando
por una puerta nueva.

## El aviso de PEN-016: la cola inicial le hace de disparador a la regla

Con la DEC-018 los 23 vehículos cruzan el umbral de apertura en `t = 0` y le
dan a la regla un **aviso temprano** (PEN-016). Con calentamiento la cola de
arranque es más corta, así que ese aviso se debilita. Es esperable que la
regla se mueva, y se mueve:

| Servicio | Tratamiento | Wq operador | Wq regla | Wq regla + tasa | ¿La regla gana al operador? |
|---|---|---|---|---|---|
| base | A · DEC-018 (cola 23 inyectada) | 0,28 | 0,32 | 0,23 | **no** / con tasa sí |
| base | B · calentamiento | 0,22 | 0,35 | 0,25 | **no** / con tasa **no** |
| base | C · misma cola que B, inyectada | 0,22 | 0,35 | 0,24 | **no** / con tasa **no** |
| lento | A · DEC-018 (cola 23 inyectada) | 2,90 | 1,23 | 1,19 | sí / con tasa sí |
| lento | B · calentamiento | 3,78 | 1,46 | 1,49 | sí / con tasa sí |
| lento | C · misma cola que B, inyectada | 3,73 | 1,41 | 1,44 | sí / con tasa sí |

**Y pasa algo que conviene mirar de frente.** Con servicio base, el
disparador por tasa le ganaba al operador (0,23 contra 0,28 min) y con calentamiento **deja de ganarle** (0,25 contra 0,22). No es que el disparador empeore: es que al operador le **beneficia** arrancar con menos cola, porque sus casetas están programadas y no dependen de ningún aviso, mientras la regla pierde justo el aviso que la cola de 23 le daba.

Es el aviso de PEN-016 en su forma más clara: **parte de la ventaja que la
regla saca en el festivo viene de arrancar con una cola grande**, y esa cola
es un dato observado, no una propiedad de la regla. Si el pico empezara sin
cola, la comparación entre regla y operador sería menos favorable a la regla
de lo que dicen los informes de las fases 2 a 4. El informe de arranque en
frío (DEC-047) ya lo medía por la otra vía y coincide.

## Sensibilidad de la duración del calentamiento

Con la regla por cola, tratamiento B.

| Servicio | Duración | Cola al arrancar | Wq (min) | % int. > 2,5 min | Carriles-int. | Cumple |
|---|---|---|---|---|---|---|
| base | 5 min | 4,9 | 0,35 ± 0,08 | 1,1 % | 52,4 | sí |
| base | 10 min | 4,8 | 0,42 ± 0,10 | 1,7 % | 52,4 | sí |
| base | 15 min | 5,1 | 0,35 ± 0,05 | 0,0 % | 53,0 | sí |
| base | 30 min | 8,4 | 0,36 ± 0,06 | 0,6 % | 52,5 | sí |
| base | 60 min | 4,5 | 0,38 ± 0,09 | 0,8 % | 52,3 | sí |
| lento | 5 min | 15,5 | 1,38 ± 0,22 | 13,6 % | 58,0 | **no** |
| lento | 10 min | 26,5 | 1,44 ± 0,28 | 16,7 % | 58,6 | **no** |
| lento | 15 min | 40,7 | 1,46 ± 0,29 | 16,9 % | 58,8 | **no** |
| lento | 30 min | 89,5 | 3,65 ± 0,51 | 68,1 % | 59,0 | **no** |
| lento | 60 min | 171,1 | 7,89 ± 0,71 | 99,2 % | 59,0 | **no** |

**Con servicio base la duración no cambia nada:** el `Wq` se mueve 0,07 min entre la duración más corta y la más larga, contra una semiamplitud de IC de hasta 0,10 min, y la cola de arranque se queda entre 4,5 y 8,4 vehículos. La diferencia cabe dentro del intervalo de confianza.

**Con servicio lento, en cambio, la duración lo decide todo:** la cola de arranque pasa de 15,5 a 171,1 vehículos y el `Wq` se mueve 6,52 min, muy por encima del IC (0,71 min).

La razón es estructural y conviene verla: en el régimen lento el periodo de
calentamiento **no es estable**. Con la tasa del primer intervalo
(92 veh/5 min) y 4 casetas a 15,5 s, la capacidad es 77,4 veh/5 min, así que **ρ = 1,188 > 1**: la cola no tiende a ningún valor, crece mientras se la deje crecer. Y eso es justo lo que se ve en la tabla, un crecimiento casi lineal con la duración.

> **Esto descalifica al calentamiento como tratamiento por defecto.** La
> duración deja de ser una elección inocua y pasa a ser **el parámetro que
> fija la cola inicial**, sin que ningún dato diga cuál es la buena. Elegir
> una duración sería elegir el resultado.

**Sobre los 3 intervalos (15 min) de referencia.** Se eligieron porque con servicio
base la cola ya está estabilizada desde el primer intervalo y porque
15 min es una escala que el modelo ya usa: la ventana de cierre de la regla
(DEC-007). Así la duración no es un número nuevo. Pero con servicio lento esa
justificación **no sirve**, porque no hay nada que estabilizarse.

## Conclusión: no se adopta, y el motivo es el propio experimento

El calentamiento se midió contra la DEC-018 con las mismas semillas, y lo que
sale es que **no conviene sustituirla**. Tres razones, en este orden:

1. **Lo que PEN-003 temía es, medido, insignificante.** El pendiente avisaba de que contar la espera de la cola inicial desde `t = 0` **subestima** su espera real. Es cierto, y ahora se sabe cuánto: la columna C → B de la descomposición nunca pasa de **0,05 min** sobre el `Wq` de la hora. Con 1.064 vehículos en la hora, la espera previa de una veintena diluye a casi nada. La aproximación de la DEC-018 **costaba muy poco**, y eso es lo que había que comprobar.

2. **El calentamiento no es más realista, es realista de otra manera.** Con
   servicio base deja unos 5,1 vehículos contra los 23 observados, porque el
   modelo no reproduce la cola del festivo en ningún intervalo (PEN-008) y la
   cola inicial es la lectura número cero de esa misma serie. Sustituir un
   dato observado por una salida del modelo que se queda corta **mete el sesgo
   de PEN-008 también en el arranque**, donde ahora no está.

3. **Y en el régimen lento el calentamiento no está bien planteado.** ρ > 1,
   así que la cola de arranque la fija la duración elegida y nada más: de 15,5
   a 171,1 vehículos según se calienten 5 o 60 min. Un tratamiento cuyo
   resultado depende de un parámetro sin dato que lo fije es peor que la
   aproximación que venía a sustituir.

**Qué se queda, entonces:**

- **La DEC-018 sigue siendo el tratamiento por defecto**, ahora con una
   comparación que la respalda en vez de solo con la cautela de PEN-003.
- **El calentamiento se queda implementado y apagado**, como escenario de
   sensibilidad, igual que el servicio lento (DEC-025) o el disparador por
   tasa (DEC-046). Encenderlo es un parámetro.
- **PEN-003 queda cerrado**: la pregunta tenía respuesta del autor y la
   alternativa está medida.

Y una nota para quien compare con la validación: con calentamiento el `Wq` del operador baja de 0,28 a 0,22 min, así que la brecha contra los 1,28 min que declara el contexto **se ensancha**. El calentamiento no acerca el modelo a lo observado: lo aleja, por la misma razón del punto 2.

## Lo que este experimento no puede responder

- **Es de un solo sentido.** No hay competencia por el pozo. En la fase 3 la
  caseta que la regla no pide se la queda el otro sentido (PEN-014), así que
  allí el efecto de debilitar el aviso temprano sería mayor.
- **El calentamiento hereda el sesgo de PEN-008.** La cola que genera es la que
  el modelo sabe generar, y el modelo se queda corto en el pico. No hay forma
  de saber desde dentro del modelo cuál era la cola «de verdad» a las 4:25.
- **El régimen previo es un supuesto**, aunque sea el que el autor describe:
  que el sistema venía con la tasa del primer intervalo. Si el tráfico previo
  hubiera sido mayor, la cola de arranque sería más larga.

