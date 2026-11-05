import { describe, expect, it } from 'vitest';
import { construirEscenario, aConfiguracionPeaje } from '../../config/escenario.js';
import { simularPeaje } from '../peaje.js';
import { estadoEnInstante, reconstruirDesdeTraza } from '../traza.js';
import { simularTraza } from '../../corridas.js';

function escenarioDePrestamo({ atenderDuranteTraspaso = false, cambios = {} } = {}) {
  const escenarioBase = construirEscenario({
    sentidos: [
      {
        etiqueta: 'Donante',
        conteo: 'viernes',
        factorDemanda: 2.4,
        colaInicial: 2,
        casetasIniciales: 2,
      },
      {
        etiqueta: 'Receptor',
        conteo: 'festivoPC',
        factorDemanda: 1.6,
        colaInicial: 0,
        casetasIniciales: 4,
      },
    ],
    regla: {
      reasignacionActiva: false,
      atenderDuranteTraspaso,
      prestamoPorColapso: true,
      rhoColapso: 1,
      abrirSiColaMayorQue: { 1: 4, 2: 1000, 3: 14, 4: 1000, 5: null },
      cerrarSiColaMenorQue: { 1: null, 2: 100, 3: 7, 4: 4, 5: 2 },
    },
  });
  return Object.keys(cambios).length > 0
    ? construirEscenario(cambios, escenarioBase)
    : escenarioBase;
}

function escenarioDeTraspasoPorReasignacion() {
  return construirEscenario({
    sentidos: [
      { conteo: 'viernes', etiqueta: 'Donante', colaInicial: 0, casetasIniciales: 2 },
      { conteo: 'domingoCP', etiqueta: 'Receptor', colaInicial: 0, casetasIniciales: 1 },
    ],
    pozo: { total: 3, maximoPorSentido: 2 },
    regla: {
      reasignacionActiva: true,
      atenderDuranteTraspaso: true,
      prestamoPorColapso: false,
      abrirSiColaMayorQue: { 1: 1000, 2: 1000 },
      cerrarSiColaMenorQue: { 1: null, 2: 100 },
    },
  });
}

function escenarioDeTraspasoPorPeticionBloqueada() {
  return construirEscenario({
    sentidos: [
      {
        etiqueta: 'Donante',
        conteo: 'viernes',
        factorDemanda: 3,
        colaInicial: 0,
        casetasIniciales: 2,
      },
      {
        etiqueta: 'Receptor',
        conteo: 'festivoPC',
        factorDemanda: 1.6,
        colaInicial: 24,
        casetasIniciales: 4,
      },
    ],
    regla: {
      atenderDuranteTraspaso: true,
      prestamoPorColapso: false,
      abrirSiColaMayorQue: { 1: 1000, 2: 1000, 3: 14, 4: 19, 5: null },
      cerrarSiColaMenorQue: { 1: null, 2: 200, 3: 7, 4: 4, 5: 2 },
    },
  });
}

function escenarioDePrestamosEnSerie() {
  return construirEscenario({
    sentidos: [
      { conteo: 'viernes', factorDemanda: 2.4, colaInicial: 0, casetasIniciales: 3 },
      { conteo: 'festivoPC', factorDemanda: 1.6, colaInicial: 0, casetasIniciales: 3 },
    ],
    regla: {
      atenderDuranteTraspaso: false,
      prestamoPorColapso: true,
      rhoColapso: 1,
      abrirSiColaMayorQue: { 1: 1000, 2: 1000, 3: 1000, 4: 1000, 5: null },
      cerrarSiColaMenorQue: { 1: null, 2: 100, 3: 100, 4: 100, 5: 100 },
    },
  });
}

function escenarioDeSegundoCierreEnTraspaso() {
  return construirEscenario({
    sentidos: [
      { conteo: 'viernes', factorDemanda: 0.5, etiqueta: 'Donante', colaInicial: 0, casetasIniciales: 3 },
      { conteo: 'festivoPC', factorDemanda: 1.6, etiqueta: 'Receptor', colaInicial: 0, casetasIniciales: 3 },
    ],
    pozo: { total: 6, minimoPorSentido: 1, maximoPorSentido: 5 },
    regla: {
      reasignacionActiva: true,
      atenderDuranteTraspaso: true,
      prestamoPorColapso: false,
      demoraAperturaSegundos: 300,
      ventanaCierreSegundos: 0,
      rhoReasignacion: 0.1,
      abrirSiColaMayorQue: { 1: 1000, 2: 1000, 3: 1000, 4: 1000, 5: null },
      cerrarSiColaMenorQue: { 1: null, 2: 1000, 3: 1000, 4: 1000, 5: 1000 },
    },
  });
}

function eventosDePrestamo(escenario, semilla = 1) {
  return simularTraza(escenario, semilla).eventos;
}

describe('casetas atendiendo durante el traspaso', () => {
  for (const [nombre, escenario] of [
    ['reasignación por ρ', escenarioDeTraspasoPorReasignacion()],
    ['petición bloqueada', escenarioDeTraspasoPorPeticionBloqueada()],
  ]) {
    it(`el donante sigue atendiendo hasta el vencimiento en la ${nombre}`, () => {
      const eventos = eventosDePrestamo(escenario);
      const traspaso = eventos.find((evento) => evento.tipo === 'traspasoIniciado');
      expect(traspaso).toBeDefined();
      const servicio = eventos.find(
        (evento) =>
          evento.tipo === 'ingresoACaseta' &&
          evento.casetaId === traspaso.casetaId &&
          evento.sentidoId === traspaso.desdeSentidoId &&
          evento.t > traspaso.t &&
          evento.t < traspaso.abreEn,
      );
      expect(servicio).toBeDefined();
      const salida = eventos.find(
        (evento) =>
          evento.tipo === 'salida' &&
          evento.vehiculoId === servicio.vehiculoId &&
          evento.sentidoId === traspaso.desdeSentidoId,
      );
      const apertura = eventos.find(
        (evento) =>
          evento.tipo === 'casetaAbre' &&
          evento.casetaId === traspaso.casetaId &&
          evento.sentidoId === traspaso.haciaSentidoId,
      );
      expect(salida.t).toBeLessThanOrEqual(apertura.t);
      expect(apertura.t).toBeGreaterThanOrEqual(traspaso.abreEn);
    });
  }

  it('con demora cero abre al destino en el mismo instante, sin cortar el servicio', () => {
    const escenario = construirEscenario(
      { regla: { demoraAperturaSegundos: 0 } },
      escenarioDeTraspasoPorReasignacion(),
    );
    const eventos = eventosDePrestamo(escenario);
    const traspaso = eventos.find((evento) => evento.tipo === 'traspasoIniciado');
    const apertura = eventos.find(
      (evento) =>
        evento.tipo === 'casetaAbre' &&
        evento.casetaId === traspaso.casetaId &&
        evento.sentidoId === traspaso.haciaSentidoId,
    );

    expect(traspaso.abreEn).toBe(traspaso.t);
    expect(apertura.t).toBe(traspaso.t);
  });

  it('no cancela el traspaso si el origen vuelve a pedir una caseta durante la demora', () => {
    const escenario = construirEscenario(
      {
        sentidos: [{ factorDemanda: 2.4 }, {}],
        regla: {
          abrirSiColaMayorQue: { 1: 4, 2: 1000, 3: 14, 4: 19, 5: null },
          cerrarSiColaMenorQue: { 1: null, 2: 1000, 3: 7, 4: 4, 5: 2 },
        },
      },
      escenarioDeTraspasoPorReasignacion(),
    );
    const eventos = eventosDePrestamo(escenario);
    const traspaso = eventos.find((evento) => evento.tipo === 'traspasoIniciado');
    const peticionOrigen = eventos.find(
      (evento) =>
        evento.tipo === 'peticionBloqueada' &&
        evento.sentidoId === traspaso.desdeSentidoId &&
        evento.t >= traspaso.t,
    );

    expect(peticionOrigen).toBeDefined();
    expect(
      eventos.some(
        (evento) =>
          evento.tipo === 'casetaAbre' &&
          evento.casetaId === traspaso.casetaId &&
          evento.sentidoId === traspaso.haciaSentidoId,
      ),
    ).toBe(true);
  });

  it('termina el traspaso aunque la demora exceda el horizonte y el destino ya esté vacío', () => {
    const escenario = construirEscenario(
      { regla: { demoraAperturaSegundos: 20000 } },
      escenarioDeTraspasoPorReasignacion(),
    );
    const traza = simularTraza(escenario, 1);
    const traspaso = traza.eventos.find((evento) => evento.tipo === 'traspasoIniciado');
    const apertura = traza.eventos.find(
      (evento) =>
        evento.tipo === 'casetaAbre' &&
        evento.casetaId === traspaso.casetaId &&
        evento.sentidoId === traspaso.haciaSentidoId,
    );
    const estado = estadoEnInstante(traza, apertura.t);

    expect(traspaso.abreEn).toBeGreaterThan(traza.metadatos.horizonteSegundos);
    expect(apertura.t).toBeGreaterThan(traza.metadatos.horizonteSegundos);
    expect(estado.porSentido[traspaso.haciaSentidoId].cola).toBe(0);
    expect(apertura.t).toBe(traspaso.abreEn);
  });

  it('permite otro cierre en el origen sin cerrar por debajo del mínimo', () => {
    const eventos = eventosDePrestamo(escenarioDeSegundoCierreEnTraspaso());
    const primerTraspaso = eventos.find((evento) => evento.tipo === 'traspasoIniciado');
    const apertura = eventos.find(
      (evento) =>
        evento.tipo === 'casetaAbre' &&
        evento.casetaId === primerTraspaso.casetaId &&
        evento.sentidoId === primerTraspaso.haciaSentidoId,
    );
    const otroCierre = eventos.find(
      (evento) =>
        evento.tipo === 'casetaCierra' &&
        evento.sentidoId === primerTraspaso.desdeSentidoId &&
        evento.casetaId !== primerTraspaso.casetaId &&
        evento.t > primerTraspaso.t &&
        evento.t < apertura.t,
    );

    expect(otroCierre).toBeDefined();
  });
});

describe('préstamos por colapso', () => {
  it('con el traspaso atendido apagado, termina el servicio antes de empezar la demora', () => {
    const eventos = eventosDePrestamo(escenarioDePrestamo());
    const prestamo = eventos.find((evento) => evento.tipo === 'prestamoIniciado');
    expect(prestamo).toBeDefined();

    const marcada = eventos.find(
      (evento) => evento.tipo === 'casetaMarcada' && evento.casetaId === prestamo.casetaId,
    );
    expect(marcada).toBeDefined();
    const salida = eventos.find(
      (evento) =>
        evento.tipo === 'salida' &&
        evento.casetaId === prestamo.casetaId &&
        evento.t >= marcada.t,
    );
    const cierre = eventos.find(
      (evento) =>
        evento.tipo === 'casetaCierra' &&
        evento.casetaId === prestamo.casetaId &&
        evento.t >= salida.t,
    );
    const reserva = eventos.find(
      (evento) =>
        evento.tipo === 'casetaReservada' &&
        evento.casetaId === prestamo.casetaId &&
        evento.t >= cierre.t,
    );
    const apertura = eventos.find(
      (evento) =>
        evento.tipo === 'casetaAbre' &&
        evento.casetaId === prestamo.casetaId &&
        evento.t >= reserva.t,
    );

    expect(cierre.t).toBeGreaterThanOrEqual(salida.t);
    expect(reserva.t).toBe(cierre.t);
    expect(apertura.t).toBeCloseTo(reserva.abreEn, 9);
    expect(reserva.abreEn).toBeGreaterThanOrEqual(salida.t);
  });

  it('con el traspaso atendido encendido, la caseta sigue sirviendo al origen durante la demora', () => {
    const eventos = eventosDePrestamo(escenarioDePrestamo({ atenderDuranteTraspaso: true }));
    const traspaso = eventos.find(
      (evento) => evento.tipo === 'traspasoIniciado' && evento.porPrestamo,
    );
    expect(traspaso).toBeDefined();

    const reserva = eventos.find(
      (evento) =>
        evento.tipo === 'casetaReservada' &&
        evento.casetaId === traspaso.casetaId &&
        evento.t === traspaso.t,
    );
    const servicioOrigen = eventos.find(
      (evento) =>
        evento.tipo === 'ingresoACaseta' &&
        evento.casetaId === traspaso.casetaId &&
        evento.sentidoId === traspaso.desdeSentidoId &&
        evento.t > traspaso.t &&
        evento.t < reserva.abreEn,
    );
    expect(servicioOrigen).toBeDefined();

    const salida = eventos.find(
      (evento) =>
        evento.tipo === 'salida' &&
        evento.vehiculoId === servicioOrigen.vehiculoId &&
        evento.sentidoId === traspaso.desdeSentidoId,
    );
    const apertura = eventos.find(
      (evento) =>
        evento.tipo === 'casetaAbre' &&
        evento.casetaId === traspaso.casetaId &&
        evento.sentidoId === traspaso.haciaSentidoId,
    );
    expect(salida.t).toBeLessThanOrEqual(apertura.t);
    expect(apertura.t).toBeGreaterThanOrEqual(reserva.abreEn);
  });

  it('mantiene la reconstrucción de cola, servicio, casetas y carriles-intervalo', () => {
    for (const atenderDuranteTraspaso of [false, true]) {
      for (let semilla = 1; semilla <= 30; semilla += 1) {
        const traza = simularTraza(escenarioDePrestamo({ atenderDuranteTraspaso }), semilla);
        const estado = reconstruirDesdeTraza(traza);
        estado.porSentido.forEach((reconstruido, indice) => {
          const motor = traza.medidas.sentidos[indice];
          expect(reconstruido.atendidos).toBe(motor.atendidosTotal);
          expect(reconstruido.colaMaxima).toBe(motor.colaMaximaContinua);
          expect(reconstruido.carrilesIntervalo).toBeCloseTo(motor.carrilesIntervalo, 9);
        });
      }
    }
  });

  it('no presta si el pozo no está agotado', () => {
    const escenario = escenarioDePrestamo({
      cambios: {
        pozo: { total: 7 },
        regla: { abrirSiColaMayorQue: { 1: 4, 2: 1000, 3: 14, 4: 19, 5: null } },
      },
    });
    const eventos = eventosDePrestamo(escenario);
    const primeraReservaReceptora = eventos.find(
      (evento) => evento.tipo === 'casetaReservada' && evento.sentidoId === 1,
    );
    expect(primeraReservaReceptora).toBeDefined();
    expect(primeraReservaReceptora.porPrestamo).toBe(false);
    const primerPrestamo = eventos.find((evento) => evento.tipo === 'prestamoIniciado');
    if (primerPrestamo) expect(primerPrestamo.t).toBeGreaterThan(primeraReservaReceptora.t);
  });

  it('no presta a un sentido con una apertura bloqueada', () => {
    const escenario = escenarioDePrestamo({
      cambios: {
        sentidos: [{ colaInicial: 2 }, { colaInicial: 24 }],
        regla: { abrirSiColaMayorQue: { 1: 4, 2: 1000, 3: 14, 4: 19, 5: null } },
      },
    });
    const eventos = eventosDePrestamo(escenario);
    expect(eventos.some((evento) => evento.tipo === 'peticionBloqueada' && evento.sentidoId === 1)).toBe(true);
    expect(eventos.some((evento) => evento.tipo === 'prestamoIniciado')).toBe(false);
  });

  it('no presta si el donante está en su mínimo o su cola no está bajo el umbral de cierre', () => {
    const enMinimo = escenarioDePrestamo({
      cambios: {
        pozo: { minimoPorSentido: 2 },
        sentidos: [{ factorDemanda: 1 }, {}],
      },
    });
    const sobreUmbral = escenarioDePrestamo({
      cambios: {
        regla: { cerrarSiColaMenorQue: { 1: null, 2: 0, 3: 7, 4: 4, 5: 2 } },
        sentidos: [{ factorDemanda: 1 }, {}],
      },
    });

    for (const escenario of [enMinimo, sobreUmbral]) {
      const resultado = simularPeaje({ ...aConfiguracionPeaje(escenario), semilla: 1 });
      expect(resultado.pozo.prestamos).toBe(0);
    }
  });

  it('nunca inicia dos préstamos mientras el anterior sigue en curso', () => {
    const eventos = eventosDePrestamo(escenarioDePrestamosEnSerie());
    const prestamos = eventos.filter((evento) => evento.tipo === 'prestamoIniciado');
    expect(prestamos.length).toBeGreaterThan(1);
    const intervalos = prestamos.map((prestamo) => {
      const apertura = eventos.find(
        (evento) =>
          evento.tipo === 'casetaAbre' &&
          evento.casetaId === prestamo.casetaId &&
          evento.sentidoId === prestamo.haciaSentidoId &&
          evento.t >= prestamo.t,
      );
      expect(apertura).toBeDefined();
      return { inicio: prestamo.t, fin: apertura.t };
    });
    intervalos.sort((a, b) => a.inicio - b.inicio);
    for (let indice = 1; indice < intervalos.length; indice += 1) {
      expect(intervalos[indice].inicio).toBeGreaterThanOrEqual(intervalos[indice - 1].fin);
    }
  });
});
