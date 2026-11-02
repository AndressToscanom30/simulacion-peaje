# Bitácora

Una entrada por intervención, la más reciente arriba.

## 2026-11-02 — Mejora del frontend, etapa 1: la capa pura

Primera de las cinco etapas de `docs/planes/mejora-frontend.md`. **Solo la capa
pura**: ni un componente, ni un estilo, ni una línea de `src/motor/`.

**Qué cambió:**

- **DEC-050 — el panel es un subconjunto del catálogo.** `RUTAS_DEL_PANEL` en
  `catalogoParametros.js` es una lista ordenada de rutas, y `camposDelPanel`
  **reutiliza `camposDelFormulario` y filtra**. No hay ni un campo escrito a
  mano, y hay una prueba que compara campo a campo los del panel con los del
  formulario completo: así no pueden discrepar en unidad, rango, control ni
  significado.
- **DEC-051 — el promedio de atención es un parámetro derivado.** Vive en
  `src/config/derivados.js`: se lee del nominal y, al editarlo, escribe
  `gammaEscalaSegundos = promedio / k` **y** `mediaNominalSegundos = promedio`,
  con **k fijo**. Dice explícitamente que **no supera la DEC-027 punto 7**: la
  separación entre la media que genera la gamma y el nominal de la regla sigue
  en el modelo y en la configuración avanzada; lo nuevo es que el panel los ata.
- **DEC-052 — el día y la hora son situaciones predefinidas.**
  `src/config/situaciones.js` con `festivo`, `domingo` y `diaNormal`, cada una
  con título, descripción y aviso **en lenguaje de usuario**. `aplicarSituacion`
  es pura, toca solo los sentidos y conserva servicio, pozo, regla y el modo de
  cada sentido. La hora se **deriva del conteo**: añadí `horaInicio` a los
  cuatro conteos de `datos.js`, que es la misma hora que ya decía su etiqueta,
  sin cambiar ningún valor existente.
- μ y λ como funciones puras de solo lectura. λ **no supone que el horizonte sea
  una hora**: sale de `tiempo.intervalos × tiempo.duracionIntervaloSegundos`, y
  hay una prueba con media hora que lo comprueba.
- `scripts/parametros.js` entiende los derivados: `docs/parametros.md` pasa a 34
  parámetros y la fila del promedio dice que es derivado y qué rutas escribe.

**La trampa de θ, que era el punto delicado.** Hoy `k · θ = 12,0744 s` y el
nominal es `12,1016 s`: distintos a propósito. Dos cosas podían romperlo y las
dos están atadas con prueba:

1. **Leer el campo o generar los campos del panel no escribe nada.** El base
   queda con θ = 2,58 exacto.
2. **Restablecer no pasa por la escritura**, sino que devuelve las rutas atadas
   al valor del base. Si pasara por la escritura daría θ = 12,1016 / 4,68 =
   **2,5858**, que no es la DEC-004. Hay una prueba que comprueba justo que
   *no* vale eso.

Y un detalle que salió bien solo: escribir 15,5 s da θ = 3,3120 s, que es
exactamente el del servicio lento de la DEC-025. Buena señal de que la fórmula
es la misma que ya usaba el repositorio.

**Las tablas por tasa de la DEC-046** se regeneran con el nominal nuevo **solo si
estaban en `null`**, que es la marca de «generadas». Una tabla escrita a mano no
se toca. Las dos cosas con prueba, y documentado en la DEC-051.

**Un detalle de ubicación que corregí:** primero puse las pruebas nuevas en
`src/motor/__tests__/`, siguiendo a `escenario.test.js`, que también prueba un
módulo de configuración desde ahí. Pero la etapa pedía **no tocar `src/motor/`**,
y un archivo nuevo ahí lo toca. Las moví a `src/config/__tests__/`, que además
es donde mejor encajan, y así `git status src/motor/` sale vacío y la promesa de
la etapa es verificable.

**Pruebas: 406 → 457** (51 nuevas, ninguna existente tocada ni rota).

**Regeneración de informes:** `npm run fase2`, `fase3` y `fase4` dan **una sola
línea de diferencia en cada archivo, la de la fecha**. Cero diferencias
numéricas, que es el criterio de cierre de la etapa.

**Qué quedó a medias:** nada de la etapa 1.

**Qué queda abierto:**

- **PEN-023**, nuevo: el orden de los sentidos de la situación «domingo» no
  estaba fijado en ningún sitio y lo elegí yo (P→C primero, como el festivo).
  Importa porque el primer sentido usa el flujo original del PRNG (DEC-027
  punto 1), así que el orden cambia los resultados de esa situación. No afecta a
  las fases 1 a 7, que no usan las situaciones.
- Las **etapas 2 a 5** de `mejora-frontend.md`. Nada de lo de la etapa 1 se ve
  todavía en pantalla: la etapa 2 es la que monta las vistas y el panel.

## 2026-10-31 — El autor responde tres pendientes, y se mide el calentamiento

Seguimiento de pendientes. El autor de las mediciones respondió tres preguntas
que estaban abiertas desde la fase 1, y la tercera abría la puerta a un cambio de
modelo que había que medir antes de adoptar.

### Lo que cerró sin tocar nada

**PEN-004.** La columna `cola` es una **lectura puntual**, una mirada dentro del
intervalo, no el máximo de los cinco minutos. Queda fijado que la cifra
comparable con la simulación es el **máximo de las 12 lecturas muestreadas** y no
la cola máxima continua, que por construcción es mayor o igual. El motor ya
reportaba las dos (DEC-022) y los informes ya usaban la muestreada, así que lo
que cambia es que deja de ser una suposición. Junto con la DEC-042, las dos
mitades de la definición de la columna están ahora confirmadas por el autor:
**es el total por sentido y es puntual.**

**PEN-007, con DEC-048.** El autor contaba las casetas que **estaban
atendiendo**, y el motor las trata como **abiertas**. ¿Problema? No, y los datos
lo dicen: si la columna fuera la ocupación instantánea, en el viernes (2 casetas,
ρ = 0,40) habría que haber acertado **12 veces seguidas** un suceso de
probabilidad 0,23 — p = 2 × 10⁻⁸ —, y en domingoPC 10 veces uno de 0,66 —
p = 1,5 × 10⁻². Lo que se anotó es la capacidad dispuesta. Y en el festivo, que
es donde el pendiente planteaba la duda, **la distinción no cambia nada**: la
cola nunca bajó de 14 vehículos, así que con cola no hay caseta ociosa; en los
intervalos 1 a 5 había 4 casetas con colas de 23, 30, 20, 26 y 21, de modo que
una quinta abierta no habría estado ociosa y se habría contado. **La quinta
abrió en el intervalo 6** y el supuesto del motor es correcto. Comprobé las
cuatro probabilidades con Erlang C antes de escribirlas: salen exactas.

Queda declarada una limitación menor: en los conteos de tráfico ligero pudo
haber alguna caseta abierta y ociosa sin registrar, lo que haría la capacidad
real de esos conteos algo mayor que la simulada. No afecta al festivo y el efecto
va en **dirección contraria** al sesgo de PEN-008, no se suma.

### El periodo de calentamiento: medido y no adoptado (DEC-049)

**PEN-003** preguntaba desde cuándo contaba la espera de los 23 vehículos de la
cola inicial. El autor responde que esa cola **«se formó como pudo haberse
formado las colas de los siguientes intervalos»**: mismo régimen antes de las
4:25, sin atasco excepcional. Eso es justo lo que simula un calentamiento, así
que lo implementé y lo corrí **contra** la DEC-018 con las mismas semillas, que
era la condición.

**Qué cambió en el código:**

- `src/motor/calentamiento.js`: simula tramos previos con la tasa del primer
  intervalo y las casetas iniciales fijas, y devuelve la cola que queda **con la
  espera que cada vehículo ya llevaba acumulada**. Corre en su **propio flujo de
  PRNG** (flujo 10) para que el tráfico previo no sea una copia del primer
  intervalo observado.
- El motor acepta `colaInicialEsperas`: la cola hereda vehículos con instante de
  llegada **negativo**, así que su espera cuenta desde que llegaron. Con el
  parámetro apagado el motor da exactamente los mismos números, y hay prueba.
- Medida nueva en el vehículo, `instanteInicioServicio`, que es lo que permite
  reconstruir desde fuera quién estaba en cola al cerrar el calentamiento. Hacía
  falta porque el motor sigue corriendo tras el horizonte para drenar la cola
  (DEC-019), así que el estado final no sirve.
- **Tres tratamientos, no dos.** El calentamiento cambia dos cosas a la vez —el
  tamaño de la cola y la contabilidad de la espera—, así que añadí un tercer
  tratamiento de descomposición: la misma cola que deja el calentamiento, pero
  inyectada a la manera de la DEC-018. Sin él no se podría saber cuál de los dos
  efectos manda.

**Qué salió, y por qué no se adopta:**

1. **Lo que PEN-003 temía es, medido, insignificante.** La espera previa no
   contabilizada vale **≤ 0,05 min** sobre el `Wq` de la hora. Con 1.064
   vehículos, la espera previa de una veintena diluye a casi nada. La
   aproximación de la DEC-018 **costaba muy poco**.
2. **El calentamiento deja 5,1 vehículos contra los 23 observados** con servicio
   base, y la duración no lo arregla: la cola se estabiliza desde el primer
   intervalo y no crece. No es un fallo del calentamiento, es **PEN-008 otra
   vez** — el modelo no reproduce la cola del festivo en ninguno de los 12
   intervalos, y la cola inicial es la lectura número cero de esa serie. Cambiar
   un dato observado por una salida del modelo que se queda corta metería ese
   sesgo también en el arranque. De hecho **ensancha** la brecha contra el 1,28
   min declarado: el `Wq` del operador baja de 0,28 a 0,22.
3. **Con servicio lento el calentamiento no está bien planteado**, y esto es lo
   decisivo. Con la tasa del primer intervalo y 4 casetas a 15,5 s, **ρ = 1,188 >
   1**: el periodo previo no tiene estado estacionario y la cola crece mientras
   se la deje, de **15,5 a 171,1 vehículos** según se calienten 5 o 60 min, con
   el `Wq` pasando de 1,38 a 7,89 min. La duración deja de ser una elección
   inocua y pasa a ser **el parámetro que fija la cola inicial**, sin ningún dato
   que diga cuál es la buena. **Elegir la duración sería elegir el resultado.**

Así que la **DEC-018 se queda**, ahora con una comparación que la respalda en vez
de solo con la cautela de PEN-003, y el calentamiento queda **implementado y
apagado** como sensibilidad. Deliberadamente **no está en el formulario**:
enchufarlo al escenario declarativo exigiría una presimulación por réplica dentro
de `corridas.js`, y poner un mando que no se adopta sería un mando muerto.

**El aviso de PEN-016 se confirmó, y con consecuencia.** Con calentamiento, el
disparador por tasa **deja de ganarle al operador**: 0,25 contra 0,22 min, cuando
con la DEC-018 era 0,23 contra 0,28. No es que el disparador empeore — al
operador le beneficia arrancar con menos cola, porque sus casetas van programadas
y no dependen de ningún aviso. Dicho claro: **parte de la ventaja que la regla
saca en el festivo viene de arrancar con una cola grande**, y esa cola es un dato
observado, no una propiedad de la regla. Coincide con lo que el arranque en frío
(DEC-047) midió por otra vía, y no obliga a rehacer nada de él.

**Qué quedó a medias:** nada. **406 pruebas en verde** (11 nuevas). Los **siete
informes regenerados con cero diferencias numéricas**: la única diferencia es la
fecha, que es la comprobación de que ninguna de las tres respuestas movió un solo
número.

**Qué sigue abierto:**

- **Si el calentamiento se adoptara algún día**, habría que enchufarlo al
  escenario y al formulario, y antes resolver de dónde sale la duración en el
  régimen lento, donde hoy no hay dato que la fije.
- **PEN-013, PEN-010 y PEN-008**, que son mediciones de campo: contar C→P en un
  festivo, cronometrar atenciones en un festivo y en P→C, y registrar la cola por
  caseta en un pico. Las tres siguen siendo lo que más movería el estudio.
- **El arranque en frío con los dos sentidos** (de DEC-047) y **si el disparador
  por tasa pasa a ser el valor por defecto** (de DEC-046).
- **Rediseñar la reasignación por ρ** (PEN-014).

## 2026-10-30 — Arranque en frío: el caso malo de la política (DEC-047)

Lo que la DEC-046 y PEN-016 dejaron abierto esta misma tarde: medir un festivo
que empiece con el peaje vacío, con el disparador por tasa encendido.

**Qué cambió:**

- **DEC-047** con el diseño: cuatro factores —arranque (cola 23 / cola 0),
  capacidad inicial (4 casetas / 1), perfil de demanda (medido / rampa) y control
  (regla / regla+tasa)— en los dos regímenes de servicio. 32 casos × 30 réplicas.
- **La rampa se construye reordenando los 12 intervalos medidos del festivo de
  menor a mayor.** Mismos valores, mismo total, otro orden: así el contraste
  aísla *cuándo* llega la demanda sin que entre ni un número sin medir. Va
  rotulado como **escenario construido**, igual que el de día normal.
- **Medida nueva `instantePrimeraOrdenSegundos`**, el instante de la primera
  orden de apertura propia. Es la que mide la reacción, que es de lo que va este
  experimento. **No se agrega con las demás escalares** porque vale `null` cuando
  no hubo apertura y el `null` no tiene media: el informe promedia solo las
  réplicas que abrieron y dice cuántas fueron.
- `perfilRampa()` vive en `src/config/escenarios.js`, no en el script, para
  poder probarlo.
- Informe propio y generado: `docs/resultados/fase7-arranque-frio.md`
  (`npm run arranque`). No se tocaron los informes de las fases cerradas.

**Qué salió:**

- **El disparador recupera lo que daba la cola heredada, y con holgura.** En frío
  la regla por cola da 0,42 min y con disparador 0,28, así que **en frío con
  disparador sale mejor que en caliente sin él** (0,32). Lo más contundente está
  en la reacción: la regla por cola tarda **20,46 min** en pedir la primera
  caseta y en **3 de 30 réplicas no la pide nunca**; con el disparador la pide a
  los **11,38 min** en las 30. **9,09 min de ventaja.** Y eso pese a la
  limitación declarada en DEC-046: la ventana está a medio llenar los primeros
  5 min y aun así gana.
- **Ninguna regla compensa abrir el pico sin capacidad**, y esto es lo que más
  consecuencias prácticas tiene. Con el perfil medido y servicio base, pasar de 4
  casetas iniciales a 1 multiplica la espera por **8,3** (0,28 → 2,35 min) y
  ningún control cumple; el disparador es ahí **literalmente inerte** (2,35
  contra 2,35), porque con una caseta y el pico encima la cola cruza su umbral a
  los 0,40 min y no queda nada que anticipar. La regla no recupera la capacidad
  que no se le dio: 48,6 carriles-intervalo contra 51,8, porque solo añade una
  caseta a la vez y cada una cuesta la demora.
- **La demanda que sube es el caso fácil, no el difícil.** Esto sale **al revés
  de la premisa con la que planteé el experimento**. El perfil medido es peor que
  la rampa en los **4 de 4** casos en frío (con 1 caseta, 2,35 contra 0,78 min),
  porque una rampa empieza en 44 veh/5 min y le **regala tiempo** a una regla
  reactiva. El caso malo es **la demanda que ya empieza arriba**, que es
  exactamente lo que hizo el festivo medido: arrancó en 92 veh/5 min, casi en el
  máximo. El retorno de un festivo no sube despacio, empieza en hora punta.

**Dos cosas que corregí sobre la marcha, y conviene decirlo:**

1. **La redacción de PEN-016 estaba mal** en un punto: decía que el caso malo era
   «un festivo que arranque con el peaje vacío **y la demanda subiendo**». Lo
   primero sí, lo segundo al revés. Corregido ahí y en el informe, que había
   salido con una sección titulada «el caso peor: … y la demanda subiendo» sobre
   unos datos que decían lo contrario. El título ahora elige el caso peor por los
   datos, no de antemano.
2. **Reconciliación con la cifra de PEN-016.** El informe da 0,32 → 0,42 min por
   quitar la cola inicial, y PEN-016 daba 0,47 → 1,07. No es contradicción: la
   fase 4 mide **los dos sentidos** sobre el pozo común y allí la caseta que P→C
   no pide se la queda C→P (PEN-014), así que el castigo va doble; este informe es
   de un solo sentido. Queda dicho en los dos sitios para que nadie lo lea como
   una incoherencia.

**Qué quedó a medias:** nada. **395 pruebas en verde** (6 nuevas), informe
generado, `npm run build` bien.

**Qué sigue abierto:**

- **El arranque en frío con los dos sentidos.** Este informe es de un solo
  sentido, donde la caseta que la regla pide está siempre disponible. Con el pozo
  compartido el castigo es mayor, como muestra la propia cifra de PEN-016.
- **Si el disparador pasa a ser el valor por defecto del modelo.** Sigue siendo
  otra decisión y sigue sin tomarse.
- **PEN-013, PEN-010 y PEN-008**, que son mediciones de campo: contar C→P en un
  festivo, cronometrar atenciones en un festivo y en P→C, y registrar la cola por
  caseta en un pico.
- **Rediseñar la reasignación por ρ** (PEN-014).

## 2026-10-30 — Disparador anticipativo por tasa: implementado y medido (DEC-046)

La fase 7 recomendaba el disparador anticipativo por tasa **sin haberlo medido**
(DEC-044), y dejaba PEN-011 abierto a propósito. El usuario pidió
implementarlo, así que ya está medido y la recomendación deja de ser a ciegas.

**Qué cambió en el modelo:**

- **DEC-046.** Supera **de la DEC-006 solo la parte que descartaba disparar por
  tasa**: el disparador por cola sigue siendo el principal y sus umbrales no se
  tocan. Los dos actúan en paralelo y se dispara lo que ocurra primero. Supera
  también de la DEC-044 la parte que decía "no se adopta".
- **La tabla de umbrales es derivada, no transcrita.** Buscando de dónde salían
  los 21 / 46 / 70 / 95 de la sección 4 del contexto apareció que
  `redondear(c × capacidad nominal − 4)` los reproduce **exactamente los cuatro**,
  y que **ningún otro desplazamiento entero lo hace**. Así que el único número
  nuevo del modelo es ese 4, vive en `formulaUmbrales` y la tabla sigue al tope
  por sentido igual que las de cola (DEC-031). Hay prueba de las dos cosas.
- **Apagado por defecto.** El escenario base sigue siendo la regla tal como la
  especifica el contexto, y con el disparador apagado el motor da **exactamente**
  los mismos números: hay una prueba de que el resultado es idéntico a no tener
  la tabla siquiera.
- **Lee la misma ventana móvil de 5 min que ρ**, que es la que usa el contexto en
  las dos derivaciones, así que no hizo falta un parámetro nuevo. La lectura
  **no poda el arreglo a propósito**: si lo podara cambiaría el ρ que ve el
  árbitro y con él los resultados ya publicados de la fase 3. Y la cola inicial
  no entra en esa ventana (DEC-027), así que una cola heredada no dispara
  aperturas: con prueba.
- Medida nueva, `aperturasAnticipadas`: las aperturas que **solo** explica la
  tasa. Es la medida de anticipación y sale en los tres informes.
- 33 parámetros en el catálogo (eran 31), así que el formulario de la interfaz
  expone el disparador y su tabla sin tocar la interfaz: se genera del catálogo.

**Qué salió, que es lo que justifica la decisión:**

- **El diagnóstico de PEN-011 era correcto.** Festivo, servicio base: `Wq` baja
  de 0,32 a **0,23 min** y la regla **pasa por delante del operador** (0,28),
  que es justo lo que no conseguía con la demora de 5 min. 1,7
  carriles-intervalo de coste y 1,63 aperturas anticipadas por réplica. Los
  cuatro conteos mejoran.
- **Confirmado por contraste:** con servicio lento es casi inerte (1,23 → 1,19
  min, 0,03 aperturas anticipadas), porque con la cola ya desbordada el umbral de
  cola se cruza solo y **no queda nada que anticipar**. Sirve donde el operador
  le ganaba a la regla y no donde la regla ya ganaba. Si la causa hubiera sido
  otra —los umbrales— no habría por qué esperar ese patrón.
- **Pero NO mueve el punto de quiebre.** ×1,10 sigue siendo ×1,10 con el pozo de
  6, y con el pozo de 8 desplaza lo mismo que la regla por cola. **El disparador
  mejora el punto de operación y no compra ni un punto de holgura de capacidad:**
  no añade casetas, reparte en el tiempo las que ya hay. Esto se reporta tal cual
  y cambia cómo hay que leer la recomendación.
- **Y parte de la mejora sale del otro sentido.** Con el pozo compartido P→C baja
  de 0,35 a 0,23 min, pero C→P pierde 0,7 carriles-intervalo y el pozo queda
  agotado 8,4 min más. Anticipar es pedir antes un recurso disputado.

**La conclusión central del estudio no se mueve** (DEC-043): el disparador mueve
el `Wq` del peaje 0,09 min; el sustituto no medido de C→P lo mueve 6,94. La
palanca sigue estando en los datos que faltan.

**Qué se decidió no hacer, y por qué:**

- **No se tocó el cierre.** El contexto no deriva nada equivalente por tasa, así
  que la ventana de 15 min se queda igual. Se vigiló la interacción —abrir
  anticipando deja la cola baja, que es lo que arranca el conteo de cierre— y en
  el festivo no se dispara sola: los cierres **bajan** de 1,57 a 1,33 por
  réplica. Inventar un bloqueo de cierre por tasa habría sido meter un mecanismo
  sin respaldo en el contexto.
- **No se extrapola la ventana parcial.** Durante los primeros 5 min está a medio
  llenar y el disparador no alcanza su umbral. Es lo que vería un operador
  contando llegadas en 5 min; extrapolar exigiría un parámetro que el contexto no
  da. Queda declarado como limitación.
- **No se encendió por defecto.** Sería otra decisión, y habría roto la
  comparabilidad de todos los informes.

**Tres errores propios que conviene dejar anotados**, porque los tres daban
resultados plausibles:

1. El contador `aperturasAnticipadas` salía 0 mientras el disparador sí actuaba:
   faltaba añadirlo a `MEDIDAS_ESCALARES`, así que no se agregaba entre réplicas.
2. La columna "Cumple" de la fase 4 salía **no** para un escenario que sí cumple:
   usaba `cumplimiento.cumpleTodo`, que no existe en ese objeto; es `mediaCumple`.
3. La tabla del pozo de 8 rotulaba "casetas fijas" tres veces, porque la etiqueta
   del control era un ternario de dos ramas y ahora hay tres controles.

**Qué quedó a medias:** nada. **389 pruebas en verde** (16 nuevas), los tres
informes y el catálogo regenerados, `npm run build` bien.

**Qué sigue abierto:**

- **El arranque en frío.** Medir un festivo que empiece con el peaje vacío y la
  demanda subiendo, con el disparador encendido. Es el caso malo de esta política
  (PEN-016) y justo donde la ventana parcial de los primeros 5 min le resta
  fuerza. PEN-016 queda resuelto en parte por eso.
- **Si el disparador pasa a ser el valor por defecto del modelo.** Es otra
  decisión y no se tomó aquí.
- **PEN-013, PEN-010 y PEN-008**, que son mediciones de campo y no software:
  contar C→P en un festivo, cronometrar atenciones en un festivo y en P→C, y
  registrar la cola **por caseta** en un pico.
- **Rediseñar la reasignación por ρ** (PEN-014), que sigue favoreciendo al
  sentido con menos casetas. El disparador no la toca.

## 2026-10-30 — DEC-042 corrige la definición de la cola de campo, y fase 7

Dos cosas, en este orden y por ese motivo: primero corregir un error de base que
se había propagado por todo el repositorio, y después la fase 7, porque el
documento del estudio se habría llevado el error dentro.

### Parte 1 — La corrección (DEC-042)

**El error.** La DEC-024 (27/10) había decidido que la columna `cola` de los
cuatro conteos era «la fila más larga de una sola caseta, no el total del
sentido». Es **incorrecto**: es el total de vehículos esperando en el sentido,
sumando todas las casetas abiertas, en los cuatro conteos. Lo confirma el autor
de las mediciones; el conteo del festivo estaba incompleto al principio y se
corrigió después, y de ahí venía la confusión.

**Qué lo destapó.** Tres cosas a la vez. La confirmación del autor; las dos
líneas del contexto que la DEC-024 contradecía (secciones 8 y 10); y la prueba
que cierra el asunto, que es **PEN-002**, abierto desde la fase 1 preguntando de
dónde salía el 1,28 min declarado del festivo. Sale de la **ley de Little**
aplicada a la columna `cola`, y sale en los cuatro conteos a la vez:
0,0630 / 0,2439 / 0,4103 / **1,2782** min contra 0,06 / 0,24 / 0,41 / **1,28**
declarados. Cuatro de cuatro al redondeo, y **solo cuadra si la columna es el
total**. El repositorio había intentado reconstruirlo con la fórmula de la
sección 3 (`Lq × 12,1 / c`), había obtenido 1,01 y había concluido que no
cuadraba: no era esa la fórmula, porque esa reparte la cola entre las `c`
casetas y Little no necesita `c` ninguna.

**Qué cambió:**

- **DEC-042**, que **supera a la DEC-024** y deja dicho qué consecuencias de
  aquella quedan anuladas, una por una.
- **PEN-002 cerrado**, con el cálculo de Little escrito.
- **PEN-008 reescrito.** La conclusión (el modelo subestima el pico) **sigue en
  pie**; el razonamiento pasa de una desigualdad a una comparación directa, y la
  hipótesis del desbalance entre casetas **pierde el lugar privilegiado** que la
  DEC-024 le daba: ya no explica el dato por construcción, es una de tres.
- **PEN-010 y DEC-025.** La derivación del servicio implícito de 15,5 s vuelve a
  ser válida, porque suponía cola única y la cola medida es la de la cola única.
  Nota fechada en la DEC-025, sin reabrirla: sigue sin ser una medición, así que
  el escenario sigue siendo sensibilidad y nunca valor por defecto. Lo que cambia
  es que deja de estar anulado y pasa a tener sustento.
- **PEN-004.** Quitada la nota del 27/10 que decía que «ni siquiera el máximo
  muestreado es comparable». La distinción entre lectura puntual y máximo
  continuo sigue siendo válida; lo que se cae es la parte de la DEC-024.
- **DEC-038, punto 1.** La decisión (un embudo por sentido en el 3D) sigue en pie
  con **un argumento menos**: el apoyo en la DEC-024 se retira y basta la DEC-001.
  Nota fechada, sin tocar la decisión. Queda más limpio que antes: la escena
  coincide ahora con el modelo **y** con el dato.
- **Prosa, rótulos y comentarios**, que es donde estaba el daño visible: interfaz
  (`modeloFormulario.js`, `TiempoReal.jsx`, `Graficos.jsx`, `PanelSupuestos.jsx`,
  `PanelVista3D.jsx`), generadores de informes (`simular.js`,
  `diagnostico-festivo.js`, `fase4.js`, `parametros.js`), documentos (`ui.md`,
  `vista3d.md`, `traza.md`, `parametros.md`) y un comentario en
  `src/motor/sentido.js`.
- **La lógica del motor no se tocó.** Siempre simuló la cola total: el error era
  de interpretación del dato, no de código.
- Los seis informes **regenerados con sus scripts**, no a mano.

**Lo que hay que subrayar: ninguna conclusión de las fases 1 a 4 cambió, y está
comprobado.** Los informes de las fases 2, 3 y 4 se regeneraron con **cero
diferencias numéricas** —la única diferencia es la fecha y la prosa— y las 373
pruebas pasan, incluida la que lee el informe de la fase 4 publicado y lo compara
con la corrida de la interfaz. Lo que cambió es **lo que se puede concluir** de
esos números.

**Y un hallazgo nuevo, que la lectura anterior no permitía ver.** Con la columna
leída como total, el diagnóstico compara la misma variable en los dos sentidos de
la desigualdad, y aparece esto: en **0 de los 48 intervalos** la lectura de campo
queda por debajo del rango de las 30 réplicas. **El sesgo del modelo tiene un
solo signo:** donde se separa del campo, se separa quedándose corto, nunca
sobrando. Con la DEC-024 era incomprobable, porque todo intervalo en que la
simulación quedaba por encima salía rotulado «no concluyente». Refuerza PEN-008:
no es dispersión, es sesgo. Anotado ahí.

**Una prueba se corrigió, y conviene decir por qué.** `interfaz.test.jsx`
afirmaba que el panel de supuestos dice «la fila más larga de una caseta». La
prueba estaba fijando el texto incorrecto, así que pasa a afirmar el correcto y,
además, que el texto viejo **no** aparece.

### Parte 2 — Fase 7

**Qué cambió:**

- **`docs/estudio.md`**: el documento del estudio con las **ocho etapas** que
  fija la sección 1 del contexto (definición, formulación, datos,
  implementación, validación, experimentación, interpretación, documentación),
  más limitaciones y trabajo futuro. Incluye la historia de la DEC-024 con su
  fecha, porque un lector futuro necesita saber por qué cuatro informes decían lo
  que decían.
- **`docs/politica-recomendada.md`**: la política, que se consulta sola.
- **DEC-043**: la política se formula **en términos relativos y como seguro, no
  como predicción**, y queda prohibido presentar los `Wq` absolutos como
  predicción. Lo obligan tres resultados medidos: PEN-009 (según el modelo la
  operación real ya cumple), PEN-008 (subestima el pico con sesgo de un solo
  signo) y PEN-013 (la entrada que más mueve el resultado no se midió).
- **DEC-044**: el disparador anticipativo por tasa que la DEC-028 dejó para esta
  fase se **recomienda pero no se adopta**. **No supera a la DEC-006**, que sigue
  vigente.
- **DEC-045**: el documento del estudio es prosa escrita a mano, con las cifras
  transcritas y su informe nombrado; los resultados siguen generados (DEC-023
  intacta).
- `docs/README.md` indexa los dos documentos nuevos, y de paso corrige el
  catálogo de parámetros de 30 a 31, que estaba desfasado.

**La conclusión del estudio, que es incómoda:** la palanca no está en la regla,
está en los datos que faltan. El sustituto no medido de la demanda de C→P mueve
el `Wq` del peaje hasta **6,94 min**; el parámetro de la regla que más mueve, los
umbrales, llega a **0,31 min**. Más de veinte veces. Afinar la regla es
irrelevante al lado de contar C→P en un festivo.

Y el valor de la regla no es mejorar el día bueno: con el servicio medido no
mejora a un operador que ya anticipaba (0,32 contra 0,28 min) y gasta un 7,4 %
más de carriles-intervalo. Con el servicio lento baja `Wq` de 2,90 a 1,23 min y
los intervalos malos de 50,0 % a 9,2 %. **Es un seguro, y así se presenta.**

**Qué quedó a medias:** nada de lo planeado. **373 pruebas en verde** y las siete
fases cerradas.

**Qué queda abierto, a propósito:**

- **PEN-011 sigue abierto.** El disparador anticipativo está recomendado y
  cuantificado en su motivo (la latencia vale 0,45 min de espera entre demora 0 y
  10 en el régimen lento), pero **no implementado ni medido**. Adoptarlo exige una
  decisión nueva que diga qué supera de la DEC-006, implementarlo y volver a
  correr la matriz de 160 escenarios. Es el primer trabajo futuro del modelo.
- **PEN-013, PEN-010 y PEN-008 siguen abiertos**, y son mediciones de campo, no
  trabajo de software: contar C→P en un festivo, cronometrar atenciones en un
  festivo y en P→C, y registrar la cola **por caseta** en un pico. La cola total
  por sentido ya está medida: es la columna `cola` (DEC-042).
- Los pendientes de herramienta: PEN-021 (el carro pesa 10,9 MB), PEN-022 (su
  escala), PEN-019 (rendimiento solo con WebGL por software) y PEN-017 (el
  horizonte acotado por la memoria de la traza).

## 2026-10-30 — Vista libre y modelo del carro

Dos encargos sobre la vista 3D ya cerrada: **que la vista sea libre** y **que se
use el modelo de `public/models/carro.glb`**. No se tocó el motor ni ningún
resultado.

**Qué cambió:**

- **DEC-041 — cámara libre.** El defecto era de fondo: `Camara` interpolaba
  hacia el preajuste en **todos los fotogramas**, así que `OrbitControls` estaba
  puesto pero cualquier órbita se deshacía sola en medio segundo. Ahora los
  preajustes son **viajes**: un clic lleva la cámara al encuadre y el primer
  arrastre corta el viaje. Un clic en el mismo botón vuelve a pedirlo, así que
  los botones sirven además para **recentrar**; el panel rotula «Vista libre»
  mientras la cámara no está en un preajuste. Órbita completa (de casi cenital a
  casi nadiral), zoom y desplazamiento, con los topes sacados del contenido en
  `limitesDeNavegacion` y el punto al que mira acotado a un cubo: se mira desde
  donde sea, pero el peaje no se pierde de vista.
- **DEC-040 — el modelo del carro.** Supera un punto de la DEC-037 («sin modelos
  ni texturas externas») y solo ese. El archivo no se usa tal cual: trae 47
  primitivas, 26 materiales y **82 602 triángulos**, y en la escena puede haber
  más de cien vehículos. `modeloCarro.js` hornea las matrices de mundo —se puede
  porque la piel del archivo es un resto del exportador: ningún nodo la
  referencia y ninguna primitiva trae `JOINTS_0`—, agrupa los materiales en seis
  **papeles** por el nombre, tira interior, motor y chasis (el 22 % de la malla),
  normaliza tamaño y orientación, fusiona por papel y **simplifica por rejilla**.
  Resultado medido en el navegador: **10 727 triángulos y 6 objetos de dibujo**
  para toda la escena. Solo la carrocería se tiñe con el color del vehículo.
- Las **cajas** de la fase 6 siguen ahí como red de seguridad: mientras el
  archivo se descarga, si falla, y en calidad baja. El panel dice en texto qué
  se está dibujando. La escena nunca se queda vacía por un archivo.

**Qué vi en las capturas y corregí.** Al orbitar por debajo de la calzada la
escena desaparecía: un plano opaco —o a dos caras, que fue el primer intento—
deja la vista en una losa negra justo cuando más libre es, que es lo contrario
de «verlo todo desde cualquier ángulo». La calzada se dibuja ahora dos veces: la
cara de arriba opaca y un **reverso translúcido** que no escribe profundidad, con
las marcas de carril a dos caras y una **luz de hemisferio** que ilumina las caras
que miran hacia abajo. Desde abajo se ven las casetas y los coches a través del
asfalto. También se dejó de dibujar las instancias sobrantes (antes se escondían
a `y = -1000`): con 10 727 triángulos por coche, cada instancia de más cuenta.

**Lo que no cuadró y queda anotado.** Las medidas de ms/fotograma de este
contenedor, que dibuja por software, se volvieron inservibles para comparar: en
una tanda la calidad media (3 043 triángulos) salió más lenta que la alta
(10 727). Lo que se puede afirmar es lo que se cuenta, no lo que se cronometra
aquí: está en PEN-019. Y dos cosas nuevas: el archivo pesa 10,9 MB con 5,1 MB de
texturas que la escena no usa (PEN-021), y el coche queda pequeño al lado de las
casetas porque se escala al largo de vehículo de la escena, que es el que casa
con la separación de la cola (PEN-022).

**Pruebas:** 373 (16 nuevas). Los papeles de los 26 materiales del archivo, el
simplificador por rejilla (reducción, caja, triángulos degenerados o repetidos,
normales unitarias) y los topes de navegación, incluida la comprobación de que
**los cinco preajustes caben dentro de los topes** en tres tamaños de pozo y las
tres calidades: si no, tocar el ratón después de un preajuste daría un salto.

## 2026-10-30 — Fase 6: visualización 3D

**Qué cambió:**

- **DEC-036:** la escena es una **función pura de la traza y del instante**. No
  habla con el motor y usa el reloj de reproducción de la fase 5, no uno nuevo,
  así que la vista 3D y los tableros 2D no pueden desincronizarse.
  **DEC-037:** `three@0.170.0` y `@react-three/fiber@8.18.0`, versiones exactas,
  con la serie 8 verificada (la 9 exige React ≥19). **Sin drei:** `OrbitControls`
  viene en three y el texto de los letreros se dibuja en un `<canvas>` 2D como
  `CanvasTexture`, así que no hay ningún activo externo. Carga diferida.
  **DEC-038:** la escena representa el **modelo**, no una foto del peaje: cola
  única por sentido, casetas reversibles, desplazamientos cosméticos y rotulados,
  y todos los vehículos de la misma clase. **DEC-039:** constantes visuales en
  `src/config/escena3d.js`, y el **color nunca es la única señal**.
- **`src/ui/vista3d/modeloEscena.js`** (puro, sin three): traduce traza + `t` en
  vehículos con su fase y posición FIFO, casetas con su estado y cuenta atrás,
  contadores y avisos. Avanza con el cursor del reproductor.
- **`geometria.js`** (puro): dónde va cada cosa. Las distancias de cámara se
  **calculan del contenido**, no son fijas.
- **`Escena3D.jsx`**: calzada, casetas con letrero aéreo, indicador cuya figura
  cambia con el estado, vehículos en un `InstancedMesh`, avisos y cámara con
  órbita y cinco preajustes. **`PanelVista3D.jsx`**: carga diferida, detección
  de WebGL, calidad ajustable, `prefers-reduced-motion`, HUD y leyenda.
- **38 pruebas nuevas** (357 en total).

**Qué vi en las capturas y corregí.** Las seis capturas se generaron con WebGL
por software y las revisé una a una. Aparecieron **tres defectos reales**:

1. *Encuadrar todo* no encuadraba todo: la cola se salía del cuadro. Primero
   probé a alejar la cámara y **empeoró**, porque los letreros dejaban de
   leerse; la solución fue compactar el bloque de cola y recalcular la cámara.
2. Los vehículos que entraban a caseta en el mismo instante se dibujaban **unos
   encima de otros**, porque todos interpolaban desde el mismo punto. Ahora
   salen en abanico hacia su caseta y adelantados un hueco.
3. La cuenta atrás **se salía del letrero** y el texto se emborronaba en
   escorzo. El texto se encoge hasta caber y la textura subió a 512×256 con
   anisotropía.

Una cuarta cosa la encontraron las pruebas, no las capturas: el modelo de escena
contaba como abiertas las casetas **reservadas**, que todavía no atienden.

**Rendimiento.** La lógica es despreciable: **0,01 ms por fotograma** de mediana
(p95 0,03 ms) en el festivo y 0,009 ms en el estrés con pozo 10 y demanda ×1,6.
El dibujado solo está medido con **WebGL por software** (74–118 ms, 8–13 fps):
este contenedor no tiene GPU y no puedo medir una real, así que queda en PEN-019
en vez de afirmar que va fluido.

**Qué quedó a medias:** nada de la fase 6.

**Pendientes nuevos:** PEN-019 (el rendimiento del dibujado solo está medido por
software) y PEN-020 (el embudo de la cola puede leerse como una fila por caseta;
se mitiga con el ancho, el número de hileras y el rótulo).

**Qué sigue:** fase 7, resultados y documentación del estudio. Ahí toca también
el disparador anticipativo por tasa de llegadas, que DEC-028 dejó expresamente
para esta fase (PEN-011).

## 2026-10-29 — Fase 5: interfaz de configuración y modo tiempo real

**Qué cambió:**

- **DEC-033:** el modo tiempo real **reproduce una traza grabada**, no simula
  paso a paso. El motor corre la réplica completa en un Web Worker con un
  grabador, y la interfaz la reproduce con un reloj de reproducción. Así es
  determinista, pausable y **rebobinable**, y la fase 6 pintará el 3D desde la
  misma traza. **DEC-034:** dependencias mínimas (gráficos en SVG propio,
  `jsdom` solo en los archivos de interfaz, interfaz en castellano).
  **DEC-035:** `sentidos[i].llegadas` opcional en el escenario, para editar la
  demanda por intervalo sin tocar los conteos de campo.
- **Traza.** El observador del peaje ahora recibe el evento con su tipo, y un
  gancho `anotar` anota cada punto interesante: llegada, ingreso a caseta,
  salida, caseta reservada, abre, marcada, cierra, reasignada, cierre cancelado,
  petición bloqueada y lectura de cola. `src/motor/traza.js` tiene el grabador,
  el formato versionado y la reconstrucción del estado. `docs/traza.md` lo
  documenta campo por campo.
- **Worker y reloj.** `src/ui/worker/` con los trabajos separados del cable de
  mensajes (y un cliente que corre en el mismo hilo si no hay Workers), y
  `src/ui/reloj.js` con un reloj de reproducción **puro**, al que el tiempo se le
  inyecta, más un reproductor con cursor sobre los eventos.
- **Formulario generado.** `src/config/catalogoParametros.js` pasó a traer el
  tipo de control de cada parámetro y se reagrupó en las siete secciones de la
  fase 5. `src/ui/modeloFormulario.js` genera los 38 campos, dice qué difiere
  del base y restablece por campo. Al subir el tope por sentido, las tablas de
  umbrales se regeneran solas (DEC-031).
- **Interfaz.** Tres pestañas (tiempo real, por lotes, configuración), panel fijo
  de supuestos, rótulos de sensibilidad en el servicio lento y en los sustitutos
  de C→P, esquema 2D de las casetas, tres gráficos en SVG propio y la cola
  observada superpuesta rotulada como no comparable (DEC-024). El modo por lotes
  trae progreso, cancelación, comparación contra una referencia y exportación
  CSV y JSON.
- **319 pruebas** (121 nuevas). Una corrigió un fallo de mi propia prueba de
  invariantes; las demás pasaron a la primera salvo selectores ambiguos.

**Qué se verificó:**

- **Grabar no cambia ningún resultado:** cinco escenarios × 30 semillas, con y
  sin grabador, dan las mismas medidas y los mismos números aleatorios usados.
- **Reconstruir desde la traza coincide con el motor** en atendidos, cola máxima
  y carriles-intervalo, en cuatro escenarios × 30 semillas.
- **La corrida por lotes de la interfaz da los mismos números que
  `fase4-escenarios.md`**: hay una prueba que lee el informe publicado y compara
  el `Wq` del peaje de E2 en los dos regímenes.
- Los informes de las fases 1 a 4 se regeneran idénticos, `npm run build` pasa y
  `npm run dev` sirve la interfaz.
- Pozo de 8 y de 10 con topes de 7 y 9, configurados desde el formulario, quedan
  válidos y con los umbrales extendidos y rotulados como extrapolados.

**Qué quedó a medias:** nada de la fase 5. El 3D **no está** y no debía estarlo:
es la fase 6. Lo que hay es un esquema 2D mínimo de casetas.

**Pendientes nuevos:** PEN-017 (la traza completa acota el horizonte por memoria;
con el del estudio no hay problema) y PEN-018 (la hora del conteo se lee de la
etiqueta del dato, no de un campo propio; si cambia el formato, el reloj muestra
solo el tiempo simulado y no se rompe nada).

**Qué sigue:** fase 6, la visualización 3D, que se pinta desde la traza.

## 2026-10-28 (2.ª intervención) — Fase 4: escenarios, corridas por lotes y configurabilidad total

**Qué cambió:**

- **Decisiones de la usuaria.** **DEC-028**: PEN-014 y PEN-015 quedan como
  hallazgo, no se rediseña la reasignación, y el disparador anticipativo por
  tasa de PEN-011 queda para la fase 7. **DEC-029**: la demanda de C→P en el
  festivo pasa a ser el conteo del viernes (238 veh/h, medido en **ese**
  sentido) × un factor configurable; supera solo el valor por defecto de la
  sección 7, con nota en el contexto que remite a la decisión. **DEC-030**:
  configurabilidad total.
- **`src/config/escenario.js`:** un escenario es un objeto declarativo
  serializable a JSON, sin funciones. Escenario base más sobreescrituras,
  `validarEscenario` que devuelve todos los problemas juntos y en castellano, y
  JSON de ida y vuelta sin pérdida.
- **DEC-031:** las tablas de umbrales siguen al tope por sentido con dos
  fórmulas rotuladas, `abrir(c) = 5c − 1` y `cerrar(c) = ⌊abrir(c−1)/2⌋`, que
  **reproducen exactamente los ocho valores del contexto** para `c` de 1 a 5 y
  los extienden hacia arriba.
- **Auditoría de números en la lógica:** `src/motor/` no tenía ninguno del
  modelo, solo constantes de los métodos. Se añadieron las conversiones de
  unidades como constantes exportadas, las etiquetas de los regímenes se derivan
  de sus propios números, y el árbitro del peaje acepta por configuración el
  servicio y la capacidad nominales.
- **`docs/parametros.md`** (`npm run parametros`): los 30 parámetros con
  significado, unidad, **valor por defecto leído del escenario base**, origen y
  rango. Es la especificación del formulario de la fase 5.
- **Catálogo de 160 escenarios** (80 casos × 2 regímenes) en
  `src/config/escenarios.js`, y **`src/corridas.js`** como runner que traduce
  escenarios a configuración del motor.
- **198 pruebas** (75 nuevas). Encontraron dos fallos reales, corregidos en
  **DEC-032**: en modo programado un sentido podía abrir más casetas que su tope
  (con tope 2 y las casetas iniciales del base tomaba 4 del pozo), y la
  validación de umbrales usaba `valor >= 0`, que en JavaScript acepta `null`.
- **`scripts/fase4.js`** (`npm run fase4`) →
  `docs/resultados/fase4-escenarios.md`.

**Qué muestra la matriz:** con el servicio medido cumplen **33 de 80**
escenarios; con el servicio lento, **4 de 80**. El quiebre está en **×1,10** de
demanda con el pozo de 6 (las dos configuraciones de control), y con servicio
lento ya no se cumple ni al factor 1,0. Un **pozo de 8 desplaza el quiebre a
×1,55 solo si la regla puede mover las casetas**: con casetas fijas no lo
desplaza nada, porque el cuello de botella es C→P clavado en 1 caseta y dar más
casetas a P→C no lo arregla. La sensibilidad que más mueve el resultado es el
**sustituto de C→P** (+6,94 min con domingoCP), por encima de cualquier
parámetro de la regla; la demora apenas mueve 0,15 min. La reasignación por ρ
sigue casi inerte también con demanda alta, lo que confirma PEN-015.

**Hallazgo nuevo (PEN-016):** quitar la cola inicial del festivo **empeora** la
espera de P→C, de 0,47 a 1,07 min. La cola de arranque le hacía de aviso
temprano a una regla que es reactiva: sin ella P→C abre 0,67 casetas en vez de
1,40, y la que no pide se la queda el contraflujo. Es PEN-011 y PEN-014
actuando a la vez, y medido.

**Qué quedó a medias:** nada de la fase 4.

**Qué sigue:** fase 5, la interfaz de configuración y el modo tiempo real. La
base está puesta: el escenario es serializable y validable, `parametros.md` es
la especificación del formulario, y `simularPeaje` ya acepta un `observador`
que se llama tras cada evento, que es lo que necesita el modo tiempo real.

## 2026-10-28 — Fase 3: reparto de casetas entre sentidos

**Qué cambió:**

- **Refactor para no duplicar la regla.** `src/motor/sentido.js` se queda con
  toda la lógica de un sentido, sin reloj ni bucle propios; `src/motor/pozo.js`
  es dueño de las casetas físicas y de quién tiene cada una; `simularSentido`
  pasa a ser un envoltorio delgado con un pozo de su tamaño, y su API no cambia.
  Verificado que el refactor es transparente: las 86 pruebas de antes siguen en
  verde y los tres informes anteriores se regeneran con todas las cifras
  idénticas (solo cambia la línea de la fecha).
- **`src/motor/peaje.js`:** `simularPeaje` corre los dos sentidos en un solo
  reloj sobre el pozo de 6. Que `c1 + c2 ≤ 6` se cumpla sale de que no hay más
  casetas, no de una comprobación aparte. El árbitro implementa la DEC-008:
  reserva al ordenar la apertura, peticiones bloqueadas con reintento,
  desempate, y reasignación por ρ > 0,60 con la misma demora. Acepta un
  `observador` que se llama tras cada evento, que es lo que usan las pruebas de
  invariantes y lo que la fase 5 reutilizará para el modo tiempo real.
- **`src/config/escenarios.js`:** el escenario del festivo (P→C el conteo real,
  C→P el sustituto) y el de sanidad de día normal, compartidos por scripts y
  pruebas.
- **DEC-027** con los 12 casos límite que el contexto no cubre, y **DEC-024 a
  DEC-026** sin tocar. **PEN-013** (el sustituto de C→P se midió en el sentido
  contrario), **PEN-014** y **PEN-015** (la reasignación favorece al sentido con
  menos casetas y casi no se activa en el pico).
- **123 pruebas** (37 nuevas), incluida la equivalencia exacta con las fases 1 y
  2 en los 4 conteos, los dos modos y las 30 semillas.
- **`scripts/fase3.js`** (`npm run fase3`) → `docs/resultados/fase3-reparto.md`,
  con 20 casos × 30 réplicas.

**Qué muestra la comparación:** el pozo está agotado **56 de los 60 minutos**
del festivo, con 1,7 peticiones bloqueadas por réplica y 32 min de espera por
carril: la competencia que la fase 2 no podía ver es real. Con servicio base los
tres controles cumplen la meta en los dos sentidos; la regla cuesta espera a P→C
(0,28 → 0,44 min) y se la ahorra a C→P (0,40 → 0,34). Con servicio lento ninguno
cumple, pero la regla baja `Wq` de P→C de 2,90 a 1,26 min. La reasignación por ρ
no cierra la brecha reactiva de PEN-011: la **ensancha** con servicio base
(0,07 → 0,16 min) y con servicio lento no se activa ni una vez. Y el sustituto
de C→P decide el resultado: con domingoCP (451 veh/h) C→P pasa a 5,76 min de
espera y 66 % de intervalos sobre el máximo tolerable, y deja de cumplir.

**Qué quedó a medias:** nada de la fase 3. El escenario de sanidad confirmó que
en día normal el pozo no se agota en ninguna de las 30 réplicas, así que la
competencia del festivo no es un artefacto del modelo.

**Qué sigue:** fase 4, escenarios y corridas por lotes: la demanda alta con los
factores 1,10, 1,13 y 1,20, la sensibilidad de la meta y de la cola inicial, y
la tabla comparativa de escenarios. Antes conviene leer PEN-013: sin medir C→P
en un festivo, cualquier política que salga de la fase 4 cuelga de un supuesto.

## 2026-10-27 (2.ª intervención) — Fase 2: regla de apertura y cierre

**Qué cambió:**

- **DEC-024** fija que las lecturas de cola de los conteos son la **fila más
  larga de una caseta**, no el total del sentido, y saca las consecuencias: la
  lectura es cota inferior de la cola total, la cola única del motor debería
  quedar por encima, la fórmula `Wq_est = Lq × 12,1 / c` no aplica a esas
  lecturas, los umbrales de la regla siguen siendo sobre cola total, y queda
  **anulado** el cálculo de "servicio implícito" de 15,5 s de la fase 1, que
  suponía cola única. Se quitó del informe de validación.
- Nuevo `scripts/diagnostico-festivo.js` (`npm run diagnostico`) →
  `docs/resultados/diagnostico-festivo.md`, con la comparación intervalo por
  intervalo y la marca de dónde la cola simulada queda por debajo de la
  observada.
- **DEC-025** supera **solo** la parte de la DEC-021 que descartaba correcciones
  al festivo, y añade el escenario de sensibilidad "servicio lento": media
  15,5 s con el mismo CV (`k = 4,68`, `θ = 3,3120 s`). Nunca es el valor por
  defecto, solo se aplica al pico y se reporta siempre junto al caso base.
- **Modo `c(t)` por regla** en el motor, sin romper el programado, que sigue
  siendo el valor por defecto: evaluación tras cada llegada y cada fin de
  servicio, apertura a `t + demora` con una sola pendiente y sin revocar la
  orden, cierre solo tras 15 min seguidos bajo el umbral y sin interrumpir
  servicios. Nuevo evento `APERTURA_CASETA`. Medidas nuevas: aperturas, cierres,
  cierres cancelados, cambios de `c` y tiempo por número de casetas abiertas.
- **DEC-026** registra los 10 casos límite que el contexto no cubre y que hubo
  que decidir (la `c` de los umbrales es la efectiva, se cancela un cierre
  marcado antes de ordenar una apertura, la ventana de 15 min se reinicia a cada
  cambio de `c`, se prefiere cerrar una caseta libre, y los contadores excluyen
  el arranque, entre otros).
- 28 pruebas nuevas (86 en total), incluida una de **regresión** que lee
  `validacion-fase1.md` y comprueba que el modo programado sigue dando esos
  mismos números. Verificada por contraste: mover `θ` la hace fallar.
- Nuevo `scripts/fase2.js` (`npm run fase2`) → `docs/resultados/fase2-regla.md`,
  con 16 casos × 30 réplicas y las mismas semillas en todos.

**Qué mostró el diagnóstico:** el festivo subestima en **12 de 12 intervalos** en
media, y en **8 de 12** ni la peor de las 30 réplicas alcanza la lectura de
campo. En los cuatro conteos, 21 de 48 intervalos en media y 10 de 48 en las 30.

**Qué concluye la comparación:** depende del régimen de servicio. Con el medido
(12,10 s) operador y regla cumplen el criterio en los cuatro conteos, y en el
festivo la regla queda algo peor (`Wq` 0,32 contra 0,28 min) gastando un 7,4 %
más de carriles-intervalo. Con el lento de sensibilidad (15,5 s) ninguno cumple,
pero la regla baja `Wq` de 2,90 a 1,23 min y el % de intervalos sobre 2,5 min de
50,0 % a 9,2 %, por un 7 % más de carriles. Con demora 0 la regla sí mejora al
operador también en el caso base, lo que señala el retardo de reacción como la
causa.

**Qué quedó a medias:** nada de la fase 2. Pendientes nuevos: PEN-010 (el
servicio lento es hipótesis, no medición), PEN-011 (la regla es reactiva y el
operador fue anticipativo) y PEN-012 (la ventana de 15 min cuesta un 7,4 % de
carriles-intervalo). PEN-002 queda parcialmente cerrado y PEN-008 reescrito.

**Qué sigue:** fase 3, el reparto de casetas entre sentidos sobre el pozo común
de 6, con la reasignación por ρ > 0,60 y el desempate cuando los dos sentidos
piden caseta. Ahí hará falta el sustituto de demanda de Cúcuta→Pamplona en el
festivo (195 veh/h del domingo, arrancando con 1 caseta).

## 2026-10-27 — Documentación, esqueleto y fase 1 del motor

**Qué cambió:**

- Documentación desde cero: `CLAUDE.md` (25 líneas), `docs/README.md`,
  `docs/decisiones/registro.md` (DEC-001 a DEC-012 sembradas del contexto, más
  DEC-013 a DEC-020 del desarrollo), `docs/planes/plan-actual.md` con las 7
  fases, `docs/pendientes.md` y esta bitácora.
- Esqueleto Vite + React en JavaScript con Vitest en entorno `node`. Scripts
  `dev`, `test` y `simular`.
- `src/config/datos.js` con la sección 10 del contexto transcrita y verificada
  (sumas 238/451/195/1.064, colas máximas 1/7/8/32, los 50 tiempos de atención
  con suma 605,08 s, media 12,1016 s y desviación 5,593 s). `src/config/parametros.js`
  con todos los parámetros editables; ningún número queda dentro de la lógica.
- Fase 1 del motor en `src/motor/`, JS puro y corriendo en Node: PRNG mulberry32
  con semilla, gamma por Marsaglia–Tsang, llegadas Poisson por tramos que se
  regeneran con la tasa nueva al cambiar de intervalo, cola única FIFO, `c(t)`
  programado, cola y casetas iniciales como parámetros, y casetas marcadas que
  no interrumpen el servicio en curso. Medidas: caudal, `Wq` por intervalo y por
  hora, cola máxima (continua y muestreada), % de intervalos sobre 2,5 min y
  carriles-intervalo. Erlang B/C para el M/M/c de referencia.
- 58 pruebas unitarias en verde.
- `scripts/simular.js` corre 30 réplicas (semillas 1…30) de los 4 conteos más el
  festivo con cola 0 y genera `docs/resultados/validacion-fase1.md`.

**Resultados de la validación (sin ajustar ningún parámetro):** las llegadas
quedan validadas (error < 1,6 %) y los carriles-intervalo coinciden exactamente
con la operación real. La espera queda corta en los cuatro conteos: 0,42×, 0,54×
y 0,69× en los normales (coherente, porque el servicio gamma con CV = 0,46 es
menos variable que la exponencial del M/M/c) y **0,22× en el festivo**. El
M/M/c estaba 22 veces corto ahí y la simulación lo mejora a 4,6 veces, pero no
cierra la brecha.

**Qué quedó a medias:** nada de la fase 1. Quedan abiertos dos hallazgos:
PEN-008 (la cola sostenida del festivo no se reproduce; las casetas observadas
dejan un 25 % de capacidad libre, incompatible con una cola única de 14 a 32
vehículos, y sostenerla exigiría un servicio de ≈ 15,5 s en vez de 12,10 s) y
PEN-009 (según el modelo la operación real ya cumple el criterio de desempeño,
lo que contradice el propósito del estudio). Ninguno se "arregló" tocando
parámetros, que es lo que prohíbe la sección 6 del contexto.

**Qué sigue:** fase 2, la regla de apertura y cierre por cola, con la demora de
5 min y la ventana de 15 min. Leer antes PEN-008: las casetas que recomiende la
regla son una cota inferior.

<!-- Plantilla:
## AAAA-MM-DD — título
**Qué cambió:** ...
**Qué quedó a medias:** ...
**Qué sigue:** ...
-->
