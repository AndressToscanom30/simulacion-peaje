/**
 * Recordar la última configuración en `localStorage`.
 *
 * Es **solo comodidad**: todo lo que se guarde aquí puede desaparecer (ventana
 * privada, datos borrados, almacenamiento bloqueado) y la interfaz tiene que
 * funcionar igual, arrancando del escenario base. Por eso cada acceso va en
 * try/catch y nada depende de que haya algo guardado.
 */

const CLAVE = 'peaje-los-acacios:escenario';

/** Guarda el escenario. Si no se puede, no pasa nada. */
export function guardarEscenario(escenario) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(escenario));
    return true;
  } catch {
    return false;
  }
}

/**
 * Lee el escenario guardado. Devuelve `null` si no hay, si no se puede leer o
 * si lo guardado no es JSON válido.
 */
export function leerEscenario() {
  try {
    const texto = localStorage.getItem(CLAVE);
    return texto === null ? null : JSON.parse(texto);
  } catch {
    return null;
  }
}

export function olvidarEscenario() {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Da igual: era comodidad.
  }
}
