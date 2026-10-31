# Política recomendada de apertura y cierre

Fase 7. Esta es la **recomendación operativa** que sale del estudio: qué debería
hacer el peaje con sus 6 casetas de efectivo en un pico, y con qué confianza se
puede afirmar.

Las cifras se transcriben de los informes de `docs/resultados/` de la corrida
del **30/10/2026**. Cada una dice de dónde sale. Si se regeneran los informes y
alguna cifra cambia, **manda el informe**, no este archivo (DEC-023).

---

## Lo primero, porque condiciona todo lo demás

**Este estudio no puede recomendar una política como predicción.** Puede
ordenar alternativas entre sí. Hay tres razones, y las tres están medidas:

1. **Según el modelo, la operación real ya cumple el criterio** (PEN-009). En el
   festivo el operador sale con `Wq` 0,28 min y 0,0 % de intervalos por encima
   de 2,5 min, contra una meta de 1 min y un 5 % tolerado. Si el modelo tuviera
   razón, no habría nada que optimizar y este documento no haría falta.
2. **Pero el modelo subestima la congestión del pico, y el sesgo tiene un solo
   signo** (PEN-008). En el festivo la cola simulada queda por debajo de la
   observada en los 12 de 12 intervalos, y en 8 de 12 ni la más congestionada de
   las 30 réplicas la alcanza. En los 48 intervalos de los cuatro conteos hay
   **0** en los que la lectura de campo quede por debajo de las 30 réplicas: el
   modelo no se equivoca en los dos sentidos, se queda corto siempre
   (`diagnostico-festivo.md`).
3. **La demanda del sentido Cúcuta→Pamplona en el festivo nunca se midió**
   (PEN-013), y es la entrada que más mueve el resultado: cambiar el conteo
   sustituto mueve el `Wq` del peaje hasta **6,94 min**, más que cualquier
   parámetro de la regla (`fase4-escenarios.md`).

Juntando 1 y 2: el «ya cumple» del modelo es **el mismo hallazgo** que el «se
queda corto», visto desde el criterio. No son dos resultados, es uno. Así que lo
que sigue se lee **en términos relativos** —esta política contra aquella— y
nunca como «el peaje tendrá una espera de X minutos».

---

## La política

Es la regla por cola del contexto (sección 4), que **no se cambia**, más tres
añadidos que el estudio sí respalda. El orden importa: 1 y 2 son los que pagan.

### 1. Arrancar el pico con la capacidad ya puesta

**En un festivo, abrir 4 casetas en el sentido de retorno antes de que empiece
la hora pico, sin esperar a que la cola lo pida.**

Es lo que hizo el operador real, y es la mitad de por qué le fue bien. Hay dos
pruebas, y la segunda es la más contundente de todo el estudio.

**Primera: la cola heredada hacía de aviso temprano.** Si P→C **arranca sin
cola**, su espera **empeora**, de 0,47 a 1,07 min, y deja de cumplir
(`fase4-escenarios.md`, sensibilidad «cola inicial 0»; PEN-016). Los 23 vehículos
heredados estaban cruzando el umbral en `t = 0` y disparando la orden de abrir
antes de que llegara el pico. Sin ellos, la regla por cola tarda **20,46 min** en
pedir la primera caseta, y en 3 de 30 réplicas no la pide nunca
(`fase7-arranque-frio.md`). **La regla por cola necesita que la cola ya esté ahí
para reaccionar, y en el arranque de un pico eso llega tarde.**

**Segunda: la capacidad que no se pone al empezar no se recupera.** Con el perfil
medido y servicio base, abrir la hora con **1 caseta en vez de 4** multiplica la
espera por **8,3** —de 0,28 a 2,35 min— y **ningún control cumple el criterio**,
ni con el disparador por tasa, que ahí es literalmente inerte (2,35 contra
2,35). El motivo está en los carriles-intervalo, 48,6 contra 51,8: la regla solo
puede añadir **una caseta a la vez** y cada una cuesta la demora de apertura, así
que para cuando llega al tope la hora se acabó (`fase7-arranque-frio.md`).

Es el resultado con más consecuencias prácticas del estudio: **ninguna regla de
control compensa haber abierto el pico sin capacidad.** El disparador por tasa
sirve cuando hay holgura que gestionar, no cuando falta capacidad.

### 2. Disparar también por tasa de llegadas, no solo por cola

**Abrir la siguiente caseta cuando las llegadas del último intervalo de 5 min
cruzan el umbral, sin esperar a que la cola cruce el suyo.** El contexto ya trae
la derivación (sección 4, M/M/c con `Wq ≤ 1 min`):

| Abrir la caseta n.º | Si las llegadas de 5 min pasan de |
|---|---|
| 2.ª | 21 |
| 3.ª | 46 |
| 4.ª | 70 |
| 5.ª | 95 |

Se dispara **lo que ocurra primero**, la cola o la tasa. La cola sigue siendo el
disparador principal (DEC-006); la tasa es el aviso temprano.

**Está implementado y medido** (DEC-046), así que esto ya no es una
recomendación a ciegas. Lo que sale, con el festivo y 30 réplicas:

| | Servicio base | Servicio lento |
|---|---|---|
| operador | 0,28 min | 2,90 min |
| regla por cola | 0,32 min | 1,23 min |
| **regla + tasa** | **0,23 min** | **1,19 min** |

Con el servicio medido la regla **pasa por delante del operador**, que es justo
lo que no conseguía con la demora de 5 min. Cuesta 1,7 carriles-intervalo y hace
1,63 aperturas anticipadas por réplica (`fase2-regla.md`).

**El mecanismo queda confirmado por tres vías que coinciden:**

- Con **demora 0 min** la regla ya ganaba al operador (0,19 contra 0,28), y con
  demora 5 quedaba en 0,32: toda su desventaja era el retardo. Entre demora 0 y
  10 hay **0,45 min** de espera en el régimen que importa.
- La **cola inicial** le hacía de aviso temprano: quitársela empeora P→C de 0,47
  a 1,07 min (PEN-016). Lo que falta es anticipación, no umbrales.
- Con el **servicio lento el disparador es casi inerte** (1,23 → 1,19 min, 0,03
  aperturas anticipadas). Es la confirmación por contraste: con la cola ya
  desbordada el umbral de cola se cruza solo y **no queda nada que anticipar**.
  El disparador sirve donde el operador le ganaba a la regla y es inerte donde
  la regla ya ganaba, que es el patrón que predice el diagnóstico de la latencia.

La demora física de 5 min no se puede bajar a 0 —hay que mover personal—, pero
**disparar antes consigue el mismo efecto que reaccionar más rápido**. Es el
único de los tres añadidos que ataca la causa en vez del síntoma.

> **Dos límites que hay que llevarse, y no son menores.**
>
> 1. **No compra holgura de capacidad.** El punto de quiebre sigue en **×1,10**
>    con el pozo de 6, exactamente igual que sin el disparador
>    (`fase4-escenarios.md`). No añade casetas: reparte en el tiempo las seis que
>    ya hay, y cuando el pozo está agotado toda la hora no hay nada que
>    adelantar. Mejora el punto de operación, no el techo.
> 2. **Parte de la mejora sale del otro sentido.** Con el pozo compartido, P→C
>    baja de 0,35 a 0,23 min, pero C→P pierde 0,7 carriles-intervalo y el pozo
>    queda agotado 8,4 min más (`fase3-reparto.md`). Anticipar es pedir antes un
>    recurso disputado. Con la demanda de C→P sin medir (PEN-013), cuánto importa
>    eso no se sabe.
>
> Y una limitación del propio mecanismo: durante los **primeros 5 min** la
> ventana móvil está a medio llenar, así que no puede disparar a plena potencia
> en el arranque del pico. **Se midió, y aun así gana:** en arranque en frío pide
> la primera caseta a los 11,38 min contra los 20,46 de la regla por cola, y en
> las 30 réplicas en vez de 27 (`fase7-arranque-frio.md`, DEC-047).

### 3. No usar la reasignación por ρ tal como está especificada

**Cuando una caseta se libera, devolverla al pozo. No traspasarla
automáticamente al otro sentido por el criterio ρ > 0,60.**

Es lo único de la especificación original que el estudio recomienda **no**
aplicar, y por dos motivos medidos:

- **Casi nunca se activa cuando hace falta.** En el pico nadie libera casetas,
  así que la regla no tiene ocasión: 0,90 reasignaciones por réplica al factor
  1,0 y 0,00 al factor 1,13 con servicio lento (`fase4-escenarios.md`, PEN-015).
- **Cuando se activa, empuja hacia el lado equivocado.** ρ divide por `c`, así
  que el sentido con **1 caseta** tiene ρ = 0,66 —por encima del 0,60— aunque su
  demanda sea una fracción de la del otro. Resultado: cada caseta que libera P→C
  se la lleva C→P, y como C→P casi nunca libera, el traspaso va siempre en el
  mismo sentido. La brecha de P→C contra el operador pasa de 0,07 a 0,16 min
  (`fase3-reparto.md`, PEN-014).

No es que reasignar sea mala idea: es que **ρ normalizado por `c` no mide
necesidad**, mide lo contrario. Rediseñarlo quedó como hallazgo y no se tocó
(DEC-028); hacerlo bien es trabajo futuro.

### 4. Mantener el mínimo de 1 caseta en el contraflujo, y vigilarlo

El contraflujo (C→P en un festivo de retorno) se queda en 1 caseta buena parte
de la hora, y **ahí está el cuello de botella de todo el peaje**: con casetas
fijas, ampliar el pozo de 6 a 8 casetas **no desplaza el quiebre ni un punto**,
porque C→P sigue clavado en 1 (`fase4-escenarios.md`). Las casetas de más solo
valen si la regla las puede mover.

---

## Lo que cuesta

La regla no sale gratis y conviene decirlo con el número:

| | Carriles-intervalo | Contra el operador |
|---|---|---|
| Operador, los cuatro conteos | 121,0 | — |
| Regla, los cuatro conteos | 130,0 | **+7,4 %** |

Son 9 carriles-intervalo más (`fase2-regla.md`). Parte de eso es la ventana de
cierre de 15 min, que mantiene casetas abiertas después de que la cola bajó
(PEN-012). Es el precio de no cerrar en falso, y es una decisión de gestión, no
un defecto del modelo.

En el festivo con servicio lento el sobrecoste es de **3,9** carriles-intervalo
(58,9 contra 55,0) y a cambio el `Wq` baja de 2,90 a 1,23 min y los intervalos
por encima del máximo tolerable de 50,0 % a 9,2 %. **Ese es el mejor argumento
del estudio a favor de la regla**: no que mejore el día bueno, sino que sostiene
el día malo.

---

## Dónde esta política deja de alcanzar

| Condición | Qué pasa | Fuente |
|---|---|---|
| Demanda ×1,10 con el pozo de 6 | **Se quiebra el criterio.** No hay holgura: un 10 % más de tráfico basta | `fase4-escenarios.md` |
| Pozo de 8 **con** la regla | El quiebre se corre a ×1,55 | ídem |
| Pozo de 8 **con casetas fijas** | El quiebre **no se mueve** (×1,10): el cuello es C→P en 1 caseta | ídem |
| Servicio de 15,5 s en el pico | Nadie cumple: 8 de 107 escenarios contra 47 de 107 | ídem |
| C→P con la demanda de domingoCP | C→P pasa a 5,76 min y 66,4 % de intervalos sobre el máximo: **no cumple por mucho** | `fase3-reparto.md` |

Y sobre todo, el aviso que atraviesa el estudio entero: como el modelo subestima
la congestión del pico, **todo factor de quiebre de esa tabla es una cota
superior**. El peaje real quiebra con **menos** demanda que la que ahí aparece, y
las casetas que esta política pide son una **cota inferior**.

---

## Qué medir antes de comprometerse

En orden de cuánto cambiaría la recomendación:

1. **La demanda de C→P en un festivo.** Es la incertidumbre dominante (PEN-013):
   hoy se sustituye por el conteo del viernes, que se midió en ese sentido pero
   no en un festivo. Mueve el resultado hasta 6,94 min, más que cualquier
   parámetro de la regla.
2. **Los tiempos de atención en un festivo y en el sentido P→C.** Los 50 que hay
   son de otro sentido y otro día (contexto, sección 8). De esto depende en qué
   régimen está el peaje, y los dos regímenes dan recomendaciones distintas:
   47 de 107 escenarios cumplen con el servicio medido y 8 de 107 con el lento.
3. **La cola por caseta en un pico.** La cola **total** por sentido ya está
   medida —es la columna `cola` de los conteos (DEC-042)— y es justo la que
   deja ver que el modelo se queda corto. Lo que falta es el reparto entre
   casetas, que es lo único que separaría la hipótesis del desbalance de la del
   servicio lento (PEN-008).
4. **La demora real de apertura.** Entra como sensibilidad porque no está medida,
   y es exactamente la magnitud que el añadido 2 intenta compensar: vale 0,45 min
   de espera entre 0 y 10 min de demora.

---

## Resumen en una línea

La regla por cola sola **no gana nada** sobre un operador que ya anticipaba
(0,32 contra 0,28 min en el festivo) y gasta un 7,4 % más de carriles; con el
**disparador por tasa** sí le gana (**0,23 min**), y con el servicio lento evita
que el pico se desmande (`Wq` ÷2,4 y los intervalos malos ÷5,4). Se recomienda
adoptarla **con el disparador, arrancando el pico con la capacidad puesta y sin
la reasignación por ρ**. Sigue siendo un **seguro y no una ampliación**: el punto
de quiebre no se mueve de ×1,10. Y antes de dimensionar nada sobre ella, contar
C→P en un festivo.
