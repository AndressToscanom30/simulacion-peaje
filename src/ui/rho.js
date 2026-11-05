/**
 * Reconstruye ρ desde una traza, con la misma ventana perezosa del motor.
 *
 * La ventana solo se poda en una llegada: en t se conserva la lista que quedó
 * tras la última llegada anterior a t. No consulta el motor ni modifica la traza.
 */

function crearEstadoRho(traza) {
  const { metadatos } = traza;
  const escenario = metadatos.escenario;
  const cantidad = metadatos.sentidos.length;
  const ventana = escenario.regla.ventanaRhoSegundos;
  const capacidad = metadatos.duracionIntervaloSegundos / escenario.servicio.mediaNominalSegundos;
  const casetas = Array.from({ length: metadatos.pozoTotal }, () => ({
    sentidoId: null,
    marcada: false,
    enTraspaso: false,
  }));
  const recientes = Array.from({ length: cantidad }, () => []);

  function aplicar(evento) {
    switch (evento.tipo) {
      case 'llegada':
        if (!evento.inicial) {
          const lista = recientes[evento.sentidoId];
          lista.push(evento.t);
          const limite = evento.t - ventana;
          while (lista.length > 0 && lista[0] <= limite) lista.shift();
        }
        break;
      case 'casetaAbre': {
        const caseta = casetas[evento.casetaId];
        caseta.sentidoId = evento.sentidoId;
        caseta.marcada = false;
        caseta.enTraspaso = false;
        break;
      }
      case 'casetaMarcada':
        casetas[evento.casetaId].marcada = true;
        break;
      case 'cierreCancelado':
        casetas[evento.casetaId].marcada = false;
        break;
      case 'casetaCierra':
        casetas[evento.casetaId].sentidoId = null;
        casetas[evento.casetaId].marcada = false;
        casetas[evento.casetaId].enTraspaso = false;
        break;
      case 'traspasoIniciado': {
        const caseta = casetas[evento.casetaId];
        caseta.sentidoId ??= evento.desdeSentidoId;
        caseta.enTraspaso = true;
        break;
      }
      case 'traspasoVencido':
        break;
      case 'casetaReservada':
      case 'casetaReasignada':
      case 'prestamoIniciado':
      case 'ingresoACaseta':
      case 'salida':
      case 'peticionBloqueada':
      case 'lecturaCola':
        break;
      default:
        throw new Error(`Evento de traza no manejado al reconstruir ρ: ${evento.tipo}`);
    }
  }

  function valores() {
    return recientes.map((llegadas, sentidoId) => {
      const efectivas = casetas.filter(
        (caseta) =>
          caseta.sentidoId === sentidoId && !caseta.marcada && !caseta.enTraspaso,
      ).length;
      return efectivas === 0 ? Infinity : llegadas.length / (efectivas * capacidad);
    });
  }

  return { aplicar, valores };
}

/** ρ de cada sentido en un instante, sin avanzar la ventana entre llegadas. */
export function rhoEnInstante(traza, instante) {
  const estado = crearEstadoRho(traza);
  for (const evento of traza.eventos) {
    if (evento.t > instante) break;
    estado.aplicar(evento);
  }
  return estado.valores();
}

/** Muestras de ρ después de cada evento, alineadas por índice de evento. */
export function muestrasRhoPorEvento(traza) {
  const estado = crearEstadoRho(traza);
  const muestras = [estado.valores()];
  for (const evento of traza.eventos) {
    estado.aplicar(evento);
    muestras.push(estado.valores());
  }
  return muestras;
}

/** Series hasta el instante reproducido, listas para dibujar en SVG. */
export function seriesRhoHasta(traza, instante) {
  const estado = crearEstadoRho(traza);
  const series = traza.metadatos.sentidos.map((sentido) => ({
    sentidoId: sentido.id,
    etiqueta: sentido.etiqueta,
    puntos: [],
  }));

  for (const evento of traza.eventos) {
    if (evento.t > instante) break;
    estado.aplicar(evento);
    const valores = estado.valores();
    valores.forEach((valor, sentidoId) => {
      series[sentidoId].puntos.push({ t: evento.t, valor });
    });
  }

  const actuales = estado.valores();
  actuales.forEach((valor, sentidoId) => {
    const puntos = series[sentidoId].puntos;
    if (puntos.length === 0 || puntos[puntos.length - 1].t < instante) {
      puntos.push({ t: instante, valor });
    }
  });
  return series;
}
