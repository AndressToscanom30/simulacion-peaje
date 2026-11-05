/**
 * Catálogo de los parámetros del modelo: qué significa cada uno, en qué unidad,
 * de dónde sale y qué rango admite (DEC-030).
 *
 * Los **valores por defecto no están aquí**: se leen del escenario base, para
 * que este catálogo no pueda quedar desfasado. Lo usa `npm run parametros` para
 * generar `docs/parametros.md`, y será la base del formulario de la fase 5.
 *
 * `ruta` es la ruta dentro del objeto escenario, tal como la pediría un
 * formulario. `origen` dice si el valor viene del contexto o de una decisión.
 *
 * JS puro: no importa React, ni DOM, ni Three.js.
 */

import { RUTA_PROMEDIO_ATENCION } from './derivados.js';

/** Secciones del formulario de configuración, en el orden en que se muestran. */
export const GRUPOS = {
  demanda: 'Demanda',
  servicio: 'Servicio',
  pozo: 'Pozo y casetas',
  regla: 'Regla de apertura y cierre',
  reparto: 'Reparto entre sentidos',
  desempeno: 'Criterio de desempeño',
  corrida: 'Corrida',
};

/**
 * Tipos de control del formulario. El formulario se genera a partir de esto,
 * no escribiendo los campos a mano.
 */
export const CONTROLES = {
  ENTERO: 'entero',
  NUMERO: 'numero',
  BOOLEANO: 'booleano',
  CONTEO: 'conteo',
  MODO: 'modo',
  SERIE_INTERVALOS: 'serieIntervalos',
  TABLA_UMBRALES: 'tablaUmbrales',
  TEXTO: 'texto',
};

/**
 * De dónde sale el valor de un parámetro, en lenguaje de usuario (DEC-056).
 *
 * Es lo que la interfaz muestra en lugar de `origen`, que sigue en el catálogo
 * porque genera `docs/parametros.md` pero cita decisiones y secciones del
 * contexto, que no le dicen nada a quien usa el programa.
 *
 * Cada parámetro lleva el suyo **escrito**, no deducido del texto de `origen`:
 * así no depende de cómo esté redactado y se puede comprobar con una prueba.
 */
export const TIPOS_ORIGEN = {
  /** Sale de los conteos o de los 50 tiempos, incluido lo estimado de ellos. */
  MEDIDO: 'Medido en campo',
  /** Sustituye algo que no se midió, y se usa por defecto. */
  SUPUESTO: 'Supuesto',
  /** Existe solo para probar alternativas; no es el caso base. */
  SENSIBILIDAD: 'Sensibilidad',
  /** Política y corrida: lo que se decide, no lo que se midió. */
  CONFIGURACION: 'Configuración',
};

/**
 * Un parámetro por entrada. `rango` es texto: describe qué se acepta, no una
 * validación (la validación está en `validarEscenario`).
 */
export const CATALOGO_PARAMETROS = [
  // --------------------------------------------------- demanda por sentido ---
  {
    grupo: 'demanda',
    control: CONTROLES.CONTEO,
    ruta: 'sentidos[i].conteo',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Conteo base',
    significado:
      'Qué conteo de campo da las llegadas del sentido, intervalo por intervalo.',
    unidad: '—',
    origen: 'Contexto, sección 10',
    rango: 'viernes, domingoCP, domingoPC, festivoPC',
  },
  {
    grupo: 'demanda',
    control: CONTROLES.NUMERO,
    paso: 0.05,
    minimo: 0.05,
    ruta: 'sentidos[i].factorDemanda',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Factor de demanda',
    significado:
      'Multiplica la tasa de llegadas de todos los intervalos del sentido. 1 = la demanda contada.',
    unidad: 'adimensional',
    origen: 'Contexto, secciones 3 y 7; DEC-029 para C→P',
    rango: '> 0',
  },
  {
    grupo: 'demanda',
    control: CONTROLES.ENTERO,
    minimo: 0,
    ruta: 'sentidos[i].colaInicial',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Cola inicial',
    significado:
      'Vehículos ya esperando en t = 0. Su espera cuenta desde 0 y no entran en la ventana de ρ.',
    unidad: 'vehículos',
    origen: 'Contexto, sección 6; DEC-018 y DEC-027 punto 8',
    rango: 'entero ≥ 0',
  },
  {
    grupo: 'demanda',
    control: CONTROLES.ENTERO,
    minimo: 1,
    ruta: 'sentidos[i].casetasIniciales',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Casetas iniciales',
    significado: 'Casetas abiertas en t = 0 en ese sentido.',
    unidad: 'casetas',
    origen: 'Contexto, sección 6',
    rango: 'entre el mínimo y el tope por sentido',
  },
  {
    grupo: 'demanda',
    control: CONTROLES.MODO,
    ruta: 'sentidos[i].modo',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Modo de control de c(t)',
    significado:
      '"programado" copia las casetas del conteo (o las fijas); "regla" las decide con la regla por cola.',
    unidad: '—',
    origen: 'Contexto, sección 4',
    rango: 'programado | regla',
  },
  {
    grupo: 'demanda',
    control: CONTROLES.SERIE_INTERVALOS,
    ruta: 'sentidos[i].llegadas',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Llegadas por intervalo',
    significado:
      'Demanda escrita a mano, un valor por intervalo. null = las del conteo. El factor se aplica igual sobre estas.',
    unidad: 'vehículos por intervalo',
    origen: 'DEC-035',
    rango: 'null o un arreglo de valores ≥ 0 con tantas posiciones como intervalos',
  },
  {
    grupo: 'demanda',
    control: CONTROLES.SERIE_INTERVALOS,
    ruta: 'sentidos[i].casetasFijas',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Casetas fijas por intervalo',
    significado:
      'En modo programado, sustituye las casetas observadas por un arreglo propio. null = las observadas.',
    unidad: 'casetas por intervalo',
    origen: 'Contexto, sección 7 (escenario de 5 casetas fijas)',
    rango: 'null o un arreglo con tantas posiciones como intervalos',
  },

  // ------------------------------------------------------------- servicio ---
  // ------------------------------------------------------------- servicio ---
  {
    grupo: 'servicio',
    control: CONTROLES.NUMERO,
    paso: 0.01,
    minimo: 0.01,
    ruta: RUTA_PROMEDIO_ATENCION,
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Promedio de atención',
    /**
     * **Derivado** (DEC-051): no se guarda en el escenario. Se lee del nominal
     * y, al editarlo, escribe la escala de la gamma y el nominal a la vez.
     */
    derivado: true,
    rutasAtadas: ['servicio.gammaEscalaSegundos', 'servicio.mediaNominalSegundos'],
    significado:
      'Tiempo medio que tarda una caseta en atender un vehículo. Al cambiarlo se mueven a la vez la escala de la gamma (k no cambia, así que el coeficiente de variación se conserva) y el tiempo nominal con el que decide la regla.',
    unidad: 'segundos',
    origen: 'Contexto, sección 3; DEC-051. Ata DEC-004 y DEC-027 punto 7',
    rango: '> 0',
  },
  {
    grupo: 'servicio',
    control: CONTROLES.NUMERO,
    paso: 0.01,
    minimo: 0.01,
    ruta: 'servicio.gammaForma',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Forma de la gamma (k)',
    significado:
      'Parámetro de forma del tiempo de atención. Fija el coeficiente de variación: CV = 1/√k.',
    unidad: 'adimensional',
    origen: 'Contexto, sección 3; DEC-004',
    rango: '> 0',
  },
  {
    grupo: 'servicio',
    control: CONTROLES.NUMERO,
    paso: 0.01,
    minimo: 0.01,
    ruta: 'servicio.gammaEscalaSegundos',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Escala de la gamma (θ)',
    significado:
      'Parámetro de escala del tiempo de atención. La media que se genera es k × θ.',
    unidad: 'segundos',
    origen: 'Contexto, sección 3; DEC-004. Para el servicio lento, DEC-025',
    rango: '> 0',
  },
  {
    grupo: 'servicio',
    control: CONTROLES.NUMERO,
    paso: 0.01,
    minimo: 0.01,
    ruta: 'servicio.mediaNominalSegundos',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Tiempo de atención nominal',
    significado:
      'El que la regla usa para ρ y para la espera estimada. Es el que el operador conoce, así que NO cambia en el escenario de servicio lento.',
    unidad: 'segundos',
    origen: 'Contexto, sección 3; DEC-027 punto 7',
    rango: '> 0',
  },
  {
    grupo: 'servicio',
    control: CONTROLES.TEXTO,
    ruta: 'servicio.regimen',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Nombre del régimen',
    significado: 'Etiqueta del régimen de servicio, solo para los informes.',
    unidad: '—',
    origen: 'DEC-025',
    rango: 'texto libre',
  },

  // ----------------------------------------------------------------- pozo ---
  {
    grupo: 'pozo',
    control: CONTROLES.ENTERO,
    minimo: 2,
    maximo: 10,
    ruta: 'pozo.total',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Casetas del pozo',
    significado:
      'Casetas de efectivo que los dos sentidos se reparten. De aquí sale que c1 + c2 nunca pase de este número.',
    unidad: 'casetas',
    origen: 'Contexto, sección 2; DEC-002. Configurable por DEC-030',
    rango: 'entero ≥ 2 × mínimo por sentido',
  },
  {
    grupo: 'pozo',
    control: CONTROLES.ENTERO,
    minimo: 1,
    maximo: 10,
    ruta: 'pozo.minimoPorSentido',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Mínimo por sentido',
    significado: 'Casetas que un sentido nunca baja de tener abiertas.',
    unidad: 'casetas',
    origen: 'Contexto, sección 2; DEC-002',
    rango: 'entero ≥ 1 y ≤ tope por sentido',
  },
  {
    grupo: 'pozo',
    control: CONTROLES.ENTERO,
    minimo: 1,
    maximo: 10,
    ruta: 'pozo.maximoPorSentido',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Tope por sentido',
    significado:
      'Casetas que un sentido nunca pasa de tener abiertas. Por encima de 5, los umbrales de apertura y cierre dejan de ser los medidos y se calculan por extrapolación.',
    unidad: 'casetas',
    origen: 'Contexto, sección 2; DEC-002. Configurable por DEC-030',
    rango: 'entero entre el mínimo y el tamaño del pozo',
  },

  // ---------------------------------------------------------------- regla ---
  {
    grupo: 'regla',
    control: CONTROLES.TABLA_UMBRALES,
    ruta: 'regla.abrirSiColaMayorQue',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Umbrales de apertura',
    significado:
      'Con c casetas abiertas, se abre otra si la cola supera este valor. null en el tope. Si se deja en null entero, se generan con la fórmula 5c − 1.',
    unidad: 'vehículos, por número de casetas',
    origen: 'Contexto, sección 4; DEC-006. Extensión por DEC-031',
    rango: 'enteros ≥ 0, uno por cada c del mínimo al tope − 1',
  },
  {
    grupo: 'regla',
    control: CONTROLES.TABLA_UMBRALES,
    ruta: 'regla.cerrarSiColaMenorQue',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Umbrales de cierre',
    significado:
      'Con c casetas abiertas, se cierra una si la cola baja de este valor. null en el mínimo. Si se deja en null, se generan con ⌊abrir(c − 1)/2⌋.',
    unidad: 'vehículos, por número de casetas',
    origen: 'Contexto, sección 4; DEC-006. Extensión por DEC-031',
    rango: 'enteros ≥ 0, uno por cada c del mínimo + 1 al tope',
  },
  {
    grupo: 'regla',
    control: CONTROLES.BOOLEANO,
    ruta: 'regla.disparadorPorTasa',
    tipoOrigen: TIPOS_ORIGEN.SENSIBILIDAD,
    nombre: 'Disparador anticipativo por tasa',
    significado:
      'Si la regla abre también cuando las llegadas de los últimos 5 min cruzan su umbral, sin esperar a que la cola cruce el suyo. Se dispara lo que ocurra primero. Apagado por defecto: el escenario base es la regla por cola del contexto.',
    unidad: 'sí/no',
    origen: 'Contexto, sección 4 (derivación por tasa); DEC-046',
    rango: 'true o false',
  },
  {
    grupo: 'regla',
    control: CONTROLES.TABLA_UMBRALES,
    ruta: 'regla.abrirSiTasaMayorQue',
    tipoOrigen: TIPOS_ORIGEN.SENSIBILIDAD,
    nombre: 'Umbrales de apertura por tasa',
    significado:
      'Con c casetas abiertas, se abre otra si las llegadas de los últimos 5 min superan este valor. Solo se usa con el disparador por tasa encendido. Si se deja en null, se generan con la fórmula redondear(c × capacidad nominal − 4), que reproduce los 21 / 46 / 70 / 95 del contexto.',
    unidad: 'vehículos por 5 min, por número de casetas',
    origen: 'Contexto, sección 4; DEC-046',
    rango: 'enteros ≥ 0, uno por cada c del mínimo al tope − 1',
  },
  {
    grupo: 'regla',
    control: CONTROLES.NUMERO,
    paso: 0.1,
    minimo: 0.1,
    ruta: 'regla.factorUmbrales',
    tipoOrigen: TIPOS_ORIGEN.SENSIBILIDAD,
    nombre: 'Factor de los umbrales',
    significado:
      'Multiplica los dos umbrales generados, para sensibilidad. Se redondea al entero, porque la cola son vehículos.',
    unidad: 'adimensional',
    origen: 'DEC-030 (no está en el contexto; es solo sensibilidad)',
    rango: '> 0',
  },
  {
    grupo: 'regla',
    control: CONTROLES.ENTERO,
    minimo: 0,
    paso: 60,
    ruta: 'regla.demoraAperturaSegundos',
    tipoOrigen: TIPOS_ORIGEN.SUPUESTO,
    nombre: 'Demora de apertura',
    significado:
      'Tiempo entre ordenar la apertura y tener la caseta operando. La caseta queda reservada desde que se ordena.',
    unidad: 'segundos',
    origen: 'Contexto, sección 4; DEC-007. Sensibilidad 0, 5 y 10 min',
    rango: '≥ 0',
  },
  {
    grupo: 'regla',
    control: CONTROLES.ENTERO,
    minimo: 0,
    paso: 60,
    ruta: 'regla.ventanaCierreSegundos',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Ventana de cierre',
    significado:
      'La cola tiene que estar bajo el umbral este tiempo seguido para cerrar una caseta. Se reinicia si sube o si cambia c.',
    unidad: 'segundos',
    origen: 'Contexto, sección 4; DEC-007 y DEC-026 punto 3',
    rango: '≥ 0',
  },
  {
    grupo: 'reparto',
    control: CONTROLES.NUMERO,
    paso: 0.05,
    minimo: 0,
    ruta: 'regla.rhoReasignacion',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'ρ de reasignación',
    significado:
      'Una caseta liberada pasa al otro sentido si su ρ supera este valor y le caben casetas.',
    unidad: 'adimensional',
    origen: 'Contexto, sección 4; DEC-008',
    rango: '≥ 0',
  },
  {
    grupo: 'reparto',
    control: CONTROLES.BOOLEANO,
    ruta: 'regla.atenderDuranteTraspaso',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Atender mientras cambia de sentido',
    significado:
      'Durante la demora de apertura, la caseta sigue atendiendo al sentido que la cede. Apagado por defecto.',
    unidad: 'sí/no',
    origen: 'DEC-059',
    rango: 'true o false',
  },
  {
    grupo: 'reparto',
    control: CONTROLES.BOOLEANO,
    ruta: 'regla.prestamoPorColapso',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Prestar caseta ante colapso',
    significado:
      'Permite que un sentido con holgura ceda una caseta de inmediato a otro en colapso. Apagado por defecto.',
    unidad: 'sí/no',
    origen: 'DEC-060',
    rango: 'true o false',
  },
  {
    grupo: 'reparto',
    control: CONTROLES.NUMERO,
    paso: 0.05,
    minimo: 0.01,
    ruta: 'regla.rhoColapso',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Umbral de colapso (ρ)',
    significado: 'El sentido se considera en colapso al alcanzar o superar este ρ.',
    unidad: 'adimensional',
    origen: 'DEC-060',
    rango: '> 0',
  },
  {
    grupo: 'reparto',
    control: CONTROLES.ENTERO,
    minimo: 1,
    paso: 60,
    ruta: 'regla.ventanaRhoSegundos',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Ventana móvil de ρ',
    significado: 'Cuánto hacia atrás se cuentan las llegadas para calcular ρ.',
    unidad: 'segundos',
    origen: 'Contexto, sección 4 ("últimos 5 min")',
    rango: '> 0',
  },
  {
    grupo: 'reparto',
    control: CONTROLES.BOOLEANO,
    ruta: 'regla.reasignacionActiva',
    tipoOrigen: TIPOS_ORIGEN.SENSIBILIDAD,
    nombre: 'Reasignación activada',
    significado:
      'Si una caseta liberada puede pasar al otro sentido por ρ. Apagada, el pozo es solo almacén.',
    unidad: 'sí/no',
    origen: 'DEC-008. El valor por defecto apagado, por PEN-015',
    rango: 'true | false',
  },
  {
    grupo: 'reparto',
    control: CONTROLES.BOOLEANO,
    sensibilidad: true,
    ruta: 'regla.ofrecerPozoPorRho',
    tipoOrigen: TIPOS_ORIGEN.SENSIBILIDAD,
    nombre: 'Ofrecer el pozo libre por ρ',
    significado:
      'Si una caseta que ya estaba libre se ofrece al otro sentido sin esperar a que se libere otra. Apagado es lo que dice la regla del estudio; encenderlo es una alternativa para probar.',
    unidad: 'sí/no',
    origen: 'DEC-027 punto 11 (solo sensibilidad)',
    rango: 'true | false',
  },
  {
    grupo: 'reparto',
    control: CONTROLES.ENTERO,
    minimo: 1,
    paso: 30,
    ruta: 'regla.esperaDesempateSegundos',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Espera del desempate',
    significado:
      'Cuando los dos sentidos piden caseta, gana el que supere esta espera estimada, empezando por el peor.',
    unidad: 'segundos',
    origen: 'Contexto, sección 4; DEC-008 y DEC-027 punto 9',
    rango: '> 0',
  },

  // --------------------------------------------------------------- tiempo ---
  {
    grupo: 'corrida',
    control: CONTROLES.ENTERO,
    minimo: 1,
    paso: 60,
    ruta: 'tiempo.duracionIntervaloSegundos',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Duración del intervalo',
    significado:
      'Cada tramo de conteo. Fija la tasa de llegadas por tramo y la unidad de los carriles-intervalo.',
    unidad: 'segundos',
    origen: 'Contexto, sección 10',
    rango: '> 0',
  },
  {
    grupo: 'corrida',
    control: CONTROLES.ENTERO,
    minimo: 1,
    ruta: 'tiempo.intervalos',
    tipoOrigen: TIPOS_ORIGEN.MEDIDO,
    nombre: 'Intervalos del horizonte',
    significado:
      'Tramos que dura una réplica. El horizonte es intervalos × duración; con 12 × 300 s es la hora observada.',
    unidad: 'intervalos',
    origen: 'Contexto, secciones 6 y 10',
    rango: 'entero ≥ 1, igual al largo de los conteos',
  },

  // ------------------------------------------------------------ desempeño ---
  {
    grupo: 'desempeno',
    control: CONTROLES.ENTERO,
    minimo: 1,
    paso: 15,
    ruta: 'desempeno.metaWqSegundos',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Meta de espera',
    significado:
      'Espera media en cola que se busca. Se evalúa en cada sentido. Solo afecta al veredicto, no a la regla.',
    unidad: 'segundos',
    origen: 'Contexto, sección 5; DEC-009',
    rango: '> 0 y ≤ máximo tolerable',
  },
  {
    grupo: 'desempeno',
    control: CONTROLES.ENTERO,
    minimo: 1,
    paso: 15,
    ruta: 'desempeno.maximoTolerableWqSegundos',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Máximo tolerable',
    significado:
      'Espera por encima de la cual un intervalo cuenta como incumplido. Sí entra en el motor, que cuenta esos intervalos.',
    unidad: 'segundos',
    origen: 'Contexto, sección 5; DEC-009',
    rango: '> 0',
  },
  {
    grupo: 'desempeno',
    control: CONTROLES.NUMERO,
    paso: 0.01,
    minimo: 0,
    maximo: 1,
    ruta: 'desempeno.fraccionIntervalosSobreMaximoAceptada',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Fracción de intervalos aceptada',
    significado: 'Proporción de intervalos que se acepta por encima del máximo tolerable.',
    unidad: 'fracción',
    origen: 'Contexto, sección 5; DEC-009',
    rango: 'entre 0 y 1',
  },

  // ------------------------------------------------------------- corridas ---
  {
    grupo: 'corrida',
    control: CONTROLES.ENTERO,
    minimo: 1,
    maximo: 200,
    ruta: 'corridas.replicas',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Réplicas',
    significado: 'Corridas independientes del escenario, para promediar.',
    unidad: 'réplicas',
    origen: 'Contexto, sección 6; DEC-010',
    rango: 'entero ≥ 1',
  },
  {
    grupo: 'corrida',
    control: CONTROLES.ENTERO,
    ruta: 'corridas.primeraSemilla',
    tipoOrigen: TIPOS_ORIGEN.CONFIGURACION,
    nombre: 'Primera semilla',
    significado:
      'Semilla de la primera réplica; las demás son consecutivas. Las mismas semillas en todos los escenarios dan números aleatorios comunes.',
    unidad: '—',
    origen: 'Contexto, sección 6; DEC-010 y DEC-011',
    rango: 'entero',
  },
];

/**
 * Rutas que muestra el **panel de la vista 3D**, en el orden en que se ven
 * (DEC-050).
 *
 * El panel es un **subconjunto del catálogo**, no una lista de campos aparte:
 * `camposDelPanel` filtra con esta lista lo que genera `camposDelFormulario`,
 * así que un parámetro no puede existir en el panel y no en el catálogo, ni
 * cambiar de significado entre las dos vistas.
 *
 * Las rutas por sentido (`sentidos[i]`) generan un campo por sentido, igual que
 * en el formulario completo.
 */
export const RUTAS_DEL_PANEL = [
  'sentidos[i].factorDemanda',
  RUTA_PROMEDIO_ATENCION,
  'regla.abrirSiColaMayorQue',
  'regla.cerrarSiColaMenorQue',
  'regla.demoraAperturaSegundos',
  'regla.ventanaCierreSegundos',
  'regla.atenderDuranteTraspaso',
  'regla.prestamoPorColapso',
  'regla.rhoColapso',
];
