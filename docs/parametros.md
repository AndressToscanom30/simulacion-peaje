# Catálogo de parámetros

Generado por `npm run parametros` el 2026-11-05.
**No editar a mano:** este archivo se regenera.

Todo valor del modelo es configurable (DEC-030). Esta es la lista completa,
con el **valor por defecto leído del escenario base**, así que no puede
quedar desfasada. Es también la especificación del formulario de la fase 5.

Un **escenario** es un objeto declarativo serializable a JSON
(`src/config/escenario.js`). Se trabaja con escenario base más
sobreescrituras: un escenario guarda solo lo que cambia. `validarEscenario`
comprueba el resultado y devuelve los problemas en castellano.

```js
import { construirEscenario, validarEscenario } from './src/config/escenario.js';

// Solo lo que cambia respecto del base:
const miEscenario = construirEscenario({
  nombre: 'pozo de 8 casetas',
  pozo: { total: 8, maximoPorSentido: 7 },
  regla: { abrirSiColaMayorQue: null, cerrarSiColaMenorQue: null }, // se regeneran
});
validarEscenario(miEscenario);
```

## Demanda

| Parámetro | Ruta | Significado | Unidad | Por defecto | Origen | Rango |
|---|---|---|---|---|---|---|
| **Conteo base** | `sentidos[i].conteo` | Qué conteo de campo da las llegadas del sentido, intervalo por intervalo. | — | `festivoPC` / `viernes` | Contexto, sección 10 | viernes, domingoCP, domingoPC, festivoPC |
| **Factor de demanda** | `sentidos[i].factorDemanda` | Multiplica la tasa de llegadas de todos los intervalos del sentido. 1 = la demanda contada. | adimensional | `1` / `1` | Contexto, secciones 3 y 7; DEC-029 para C→P | > 0 |
| **Cola inicial** | `sentidos[i].colaInicial` | Vehículos ya esperando en t = 0. Su espera cuenta desde 0 y no entran en la ventana de ρ. | vehículos | `23` / `0` | Contexto, sección 6; DEC-018 y DEC-027 punto 8 | entero ≥ 0 |
| **Casetas iniciales** | `sentidos[i].casetasIniciales` | Casetas abiertas en t = 0 en ese sentido. | casetas | `4` / `1` | Contexto, sección 6 | entre el mínimo y el tope por sentido |
| **Modo de control de c(t)** | `sentidos[i].modo` | "programado" copia las casetas del conteo (o las fijas); "regla" las decide con la regla por cola. | — | `regla` / `regla` | Contexto, sección 4 | programado | regla |
| **Llegadas por intervalo** | `sentidos[i].llegadas` | Demanda escrita a mano, un valor por intervalo. null = las del conteo. El factor se aplica igual sobre estas. | vehículos por intervalo | `null` / `null` | DEC-035 | null o un arreglo de valores ≥ 0 con tantas posiciones como intervalos |
| **Casetas fijas por intervalo** | `sentidos[i].casetasFijas` | En modo programado, sustituye las casetas observadas por un arreglo propio. null = las observadas. | casetas por intervalo | `null` / `null` | Contexto, sección 7 (escenario de 5 casetas fijas) | null o un arreglo con tantas posiciones como intervalos |

## Servicio

| Parámetro | Ruta | Significado | Unidad | Por defecto | Origen | Rango |
|---|---|---|---|---|---|---|
| **Promedio de atención** | `servicio.promedioAtencionSegundos` | Tiempo medio que tarda una caseta en atender un vehículo. Al cambiarlo se mueven a la vez la escala de la gamma (k no cambia, así que el coeficiente de variación se conserva) y el tiempo nominal con el que decide la regla. **Derivado:** no se guarda; al editarlo escribe `servicio.gammaEscalaSegundos` y `servicio.mediaNominalSegundos`. | segundos | `12,1016` | Contexto, sección 3; DEC-051. Ata DEC-004 y DEC-027 punto 7 | > 0 |
| **Forma de la gamma (k)** | `servicio.gammaForma` | Parámetro de forma del tiempo de atención. Fija el coeficiente de variación: CV = 1/√k. | adimensional | `4,68` | Contexto, sección 3; DEC-004 | > 0 |
| **Escala de la gamma (θ)** | `servicio.gammaEscalaSegundos` | Parámetro de escala del tiempo de atención. La media que se genera es k × θ. | segundos | `2,58` | Contexto, sección 3; DEC-004. Para el servicio lento, DEC-025 | > 0 |
| **Tiempo de atención nominal** | `servicio.mediaNominalSegundos` | El que la regla usa para ρ y para la espera estimada. Es el que el operador conoce, así que NO cambia en el escenario de servicio lento. | segundos | `12,1016` | Contexto, sección 3; DEC-027 punto 7 | > 0 |
| **Nombre del régimen** | `servicio.regimen` | Etiqueta del régimen de servicio, solo para los informes. | — | `base` | DEC-025 | texto libre |

## Pozo y casetas

| Parámetro | Ruta | Significado | Unidad | Por defecto | Origen | Rango |
|---|---|---|---|---|---|---|
| **Casetas del pozo** | `pozo.total` | Casetas de efectivo que los dos sentidos se reparten. De aquí sale que c1 + c2 nunca pase de este número. | casetas | `6` | Contexto, sección 2; DEC-002. Configurable por DEC-030 | entero ≥ 2 × mínimo por sentido |
| **Mínimo por sentido** | `pozo.minimoPorSentido` | Casetas que un sentido nunca baja de tener abiertas. | casetas | `1` | Contexto, sección 2; DEC-002 | entero ≥ 1 y ≤ tope por sentido |
| **Tope por sentido** | `pozo.maximoPorSentido` | Casetas que un sentido nunca pasa de tener abiertas. Por encima de 5, los umbrales de apertura y cierre dejan de ser los medidos y se calculan por extrapolación. | casetas | `5` | Contexto, sección 2; DEC-002. Configurable por DEC-030 | entero entre el mínimo y el tamaño del pozo |

## Regla de apertura y cierre

| Parámetro | Ruta | Significado | Unidad | Por defecto | Origen | Rango |
|---|---|---|---|---|---|---|
| **Umbrales de apertura** | `regla.abrirSiColaMayorQue` | Con c casetas abiertas, se abre otra si la cola supera este valor. null en el tope. Si se deja en null entero, se generan con la fórmula 5c − 1. | vehículos, por número de casetas | `{1: 4, 2: 9, 3: 14, 4: 19, 5: null}` | Contexto, sección 4; DEC-006. Extensión por DEC-031 | enteros ≥ 0, uno por cada c del mínimo al tope − 1 |
| **Umbrales de cierre** | `regla.cerrarSiColaMenorQue` | Con c casetas abiertas, se cierra una si la cola baja de este valor. null en el mínimo. Si se deja en null, se generan con ⌊abrir(c − 1)/2⌋. | vehículos, por número de casetas | `{1: null, 2: 2, 3: 4, 4: 7, 5: 9}` | Contexto, sección 4; DEC-006. Extensión por DEC-031 | enteros ≥ 0, uno por cada c del mínimo + 1 al tope |
| **Disparador anticipativo por tasa** | `regla.disparadorPorTasa` | Si la regla abre también cuando las llegadas de los últimos 5 min cruzan su umbral, sin esperar a que la cola cruce el suyo. Se dispara lo que ocurra primero. Apagado por defecto: el escenario base es la regla por cola del contexto. | sí/no | `false` | Contexto, sección 4 (derivación por tasa); DEC-046 | true o false |
| **Umbrales de apertura por tasa** | `regla.abrirSiTasaMayorQue` | Con c casetas abiertas, se abre otra si las llegadas de los últimos 5 min superan este valor. Solo se usa con el disparador por tasa encendido. Si se deja en null, se generan con la fórmula redondear(c × capacidad nominal − 4), que reproduce los 21 / 46 / 70 / 95 del contexto. | vehículos por 5 min, por número de casetas | `{1: 21, 2: 46, 3: 70, 4: 95, 5: null}` | Contexto, sección 4; DEC-046 | enteros ≥ 0, uno por cada c del mínimo al tope − 1 |
| **Factor de los umbrales** | `regla.factorUmbrales` | Multiplica los dos umbrales generados, para sensibilidad. Se redondea al entero, porque la cola son vehículos. | adimensional | `1` | DEC-030 (no está en el contexto; es solo sensibilidad) | > 0 |
| **Demora de apertura** | `regla.demoraAperturaSegundos` | Tiempo entre ordenar la apertura y tener la caseta operando. La caseta queda reservada desde que se ordena. | segundos | `300` (5 min) | Contexto, sección 4; DEC-007. Sensibilidad 0, 5 y 10 min | ≥ 0 |
| **Ventana de cierre** | `regla.ventanaCierreSegundos` | La cola tiene que estar bajo el umbral este tiempo seguido para cerrar una caseta. Se reinicia si sube o si cambia c. | segundos | `900` (15 min) | Contexto, sección 4; DEC-007 y DEC-026 punto 3 | ≥ 0 |

## Reparto entre sentidos

| Parámetro | Ruta | Significado | Unidad | Por defecto | Origen | Rango |
|---|---|---|---|---|---|---|
| **ρ de reasignación** | `regla.rhoReasignacion` | Una caseta liberada pasa al otro sentido si su ρ supera este valor y le caben casetas. | adimensional | `0,6` | Contexto, sección 4; DEC-008 | ≥ 0 |
| **Atender mientras cambia de sentido** | `regla.atenderDuranteTraspaso` | Durante la demora de apertura, la caseta sigue atendiendo al sentido que la cede. Apagado por defecto. | sí/no | `false` | DEC-059 | true o false |
| **Prestar caseta ante colapso** | `regla.prestamoPorColapso` | Permite que un sentido con holgura ceda una caseta de inmediato a otro en colapso. Apagado por defecto. | sí/no | `false` | DEC-060 | true o false |
| **Umbral de colapso (ρ)** | `regla.rhoColapso` | El sentido se considera en colapso al alcanzar o superar este ρ. | adimensional | `1` | DEC-060 | > 0 |
| **Ventana móvil de ρ** | `regla.ventanaRhoSegundos` | Cuánto hacia atrás se cuentan las llegadas para calcular ρ. | segundos | `300` (5 min) | Contexto, sección 4 ("últimos 5 min") | > 0 |
| **Reasignación activada** | `regla.reasignacionActiva` | Si una caseta liberada puede pasar al otro sentido por ρ. Apagada, el pozo es solo almacén. | sí/no | `false` | DEC-008. El valor por defecto apagado, por PEN-015 | true | false |
| **Ofrecer el pozo libre por ρ** | `regla.ofrecerPozoPorRho` | Si una caseta que ya estaba libre se ofrece al otro sentido sin esperar a que se libere otra. Apagado es lo que dice la regla del estudio; encenderlo es una alternativa para probar. | sí/no | `false` | DEC-027 punto 11 (solo sensibilidad) | true | false |
| **Espera del desempate** | `regla.esperaDesempateSegundos` | Cuando los dos sentidos piden caseta, gana el que supere esta espera estimada, empezando por el peor. | segundos | `150` (2,5 min) | Contexto, sección 4; DEC-008 y DEC-027 punto 9 | > 0 |

## Criterio de desempeño

| Parámetro | Ruta | Significado | Unidad | Por defecto | Origen | Rango |
|---|---|---|---|---|---|---|
| **Meta de espera** | `desempeno.metaWqSegundos` | Espera media en cola que se busca. Se evalúa en cada sentido. Solo afecta al veredicto, no a la regla. | segundos | `60` (1 min) | Contexto, sección 5; DEC-009 | > 0 y ≤ máximo tolerable |
| **Máximo tolerable** | `desempeno.maximoTolerableWqSegundos` | Espera por encima de la cual un intervalo cuenta como incumplido. Sí entra en el motor, que cuenta esos intervalos. | segundos | `150` (2,5 min) | Contexto, sección 5; DEC-009 | > 0 |
| **Fracción de intervalos aceptada** | `desempeno.fraccionIntervalosSobreMaximoAceptada` | Proporción de intervalos que se acepta por encima del máximo tolerable. | fracción | `0,05` | Contexto, sección 5; DEC-009 | entre 0 y 1 |

## Corrida

| Parámetro | Ruta | Significado | Unidad | Por defecto | Origen | Rango |
|---|---|---|---|---|---|---|
| **Duración del intervalo** | `tiempo.duracionIntervaloSegundos` | Cada tramo de conteo. Fija la tasa de llegadas por tramo y la unidad de los carriles-intervalo. | segundos | `300` (5 min) | Contexto, sección 10 | > 0 |
| **Intervalos del horizonte** | `tiempo.intervalos` | Tramos que dura una réplica. El horizonte es intervalos × duración; con 12 × 300 s es la hora observada. | intervalos | `12` | Contexto, secciones 6 y 10 | entero ≥ 1, igual al largo de los conteos |
| **Réplicas** | `corridas.replicas` | Corridas independientes del escenario, para promediar. | réplicas | `30` | Contexto, sección 6; DEC-010 | entero ≥ 1 |
| **Primera semilla** | `corridas.primeraSemilla` | Semilla de la primera réplica; las demás son consecutivas. Las mismas semillas en todos los escenarios dan números aleatorios comunes. | — | `1` | Contexto, sección 6; DEC-010 y DEC-011 | entero |

## Dos aclaraciones que se prestan a confusión

**La media que genera la gamma no es la media medida.** El contexto ajustó
`k = 4,68` y `θ = 2,58 s` (DEC-004), que dan una media de
**12,0744 s**, mientras que las 50 mediciones dan **12,1016 s**.
La diferencia es de 0,0272 s y viene del ajuste, no de un error.
Los dos valores están en el escenario por separado: `gammaEscalaSegundos`
genera el servicio y `mediaNominalSegundos` es el que usa la regla.

**El servicio nominal no cambia en el escenario de servicio lento.** La regla
calcula ρ y la espera estimada con el tiempo que el **operador conoce**, que
son los 12,10 s medidos, no con el servicio real del escenario (DEC-027,
punto 7). Si usara los 15,5 s estaría decidiendo con información que en la
realidad no tendría.

## Conteos disponibles

| Clave | Descripción | Llegadas (veh/h) | Casetas observadas | Cola máxima observada |
|---|---|---|---|---|
| `viernes` | Viernes 02/10/2026, Cúcuta→Pamplona, 12:00–13:00 | 238 | 2 | 1 |
| `domingoCP` | Domingo 13/09/2026, Cúcuta→Pamplona, 11:50–12:50 | 451 | 2–3 | 7 |
| `domingoPC` | Domingo 13/09/2026, Pamplona→Cúcuta, 13:00–14:00 | 195 | 1–2 | 8 |
| `festivoPC` | Festivo 12/10/2026, Pamplona→Cúcuta, 16:25–17:25 | 1064 | 4–5 | 32 |

La cola observada es el **total de vehículos esperando por sentido**, sumando
todas las casetas abiertas (DEC-042), que es la misma variable que simula el
modelo. La cifra de la tabla es el máximo de las 12 lecturas puntuales del
conteo. Ver `diagnostico-festivo.md`.

## Escenario base completo

Esto es lo que `construirEscenario()` devuelve sin sobreescrituras:

```json
{
  "nombre": "base",
  "descripcion": "Festivo de dos sentidos con los valores del contexto",
  "sentidos": [
    {
      "etiqueta": "P→C",
      "conteo": "festivoPC",
      "factorDemanda": 1,
      "colaInicial": 23,
      "casetasIniciales": 4,
      "modo": "regla",
      "llegadas": null,
      "casetasFijas": null
    },
    {
      "etiqueta": "C→P",
      "conteo": "viernes",
      "factorDemanda": 1,
      "colaInicial": 0,
      "casetasIniciales": 1,
      "modo": "regla",
      "llegadas": null,
      "casetasFijas": null
    }
  ],
  "servicio": {
    "regimen": "base",
    "gammaForma": 4.68,
    "gammaEscalaSegundos": 2.58,
    "mediaNominalSegundos": 12.1016
  },
  "pozo": {
    "total": 6,
    "minimoPorSentido": 1,
    "maximoPorSentido": 5
  },
  "regla": {
    "abrirSiColaMayorQue": null,
    "cerrarSiColaMenorQue": null,
    "factorUmbrales": 1,
    "disparadorPorTasa": false,
    "abrirSiTasaMayorQue": null,
    "atenderDuranteTraspaso": false,
    "prestamoPorColapso": false,
    "rhoColapso": 1,
    "demoraAperturaSegundos": 300,
    "ventanaCierreSegundos": 900,
    "rhoReasignacion": 0.6,
    "ventanaRhoSegundos": 300,
    "reasignacionActiva": false,
    "ofrecerPozoPorRho": false,
    "esperaDesempateSegundos": 150
  },
  "tiempo": {
    "duracionIntervaloSegundos": 300,
    "intervalos": 12
  },
  "desempeno": {
    "metaWqSegundos": 60,
    "maximoTolerableWqSegundos": 150,
    "fraccionIntervalosSobreMaximoAceptada": 0.05
  },
  "corridas": {
    "replicas": 30,
    "primeraSemilla": 1
  }
}
```

