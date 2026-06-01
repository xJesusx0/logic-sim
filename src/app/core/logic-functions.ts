import { LogicValue } from './base.model';

/**
 * Funciones puras para evaluar la lógica básica de las compuertas,
 * soportando manejo de estados X (desconocido) y Z (alta impedancia).
 */

export function gateAND(a: LogicValue, b: LogicValue): LogicValue {
  if (a === '0' || b === '0') return '0';
  if (a === '1' && b === '1') return '1';
  return 'X'; // Cualquier otra combinación con X o Z
}

export function gateOR(a: LogicValue, b: LogicValue): LogicValue {
  if (a === '1' || b === '1') return '1';
  if (a === '0' && b === '0') return '0';
  return 'X';
}

export function gateNOT(a: LogicValue): LogicValue {
  if (a === '0') return '1';
  if (a === '1') return '0';
  return 'X';
}

export function gateXOR(a: LogicValue, b: LogicValue): LogicValue {
  // Solo es válido si ambas entradas son conocidas (0 o 1)
  if ((a === '0' || a === '1') && (b === '0' || b === '1')) {
    return a !== b ? '1' : '0';
  }
  return 'X';
}

export function gateNAND(a: LogicValue, b: LogicValue): LogicValue {
  return gateNOT(gateAND(a, b));
}

export function gateNOR(a: LogicValue, b: LogicValue): LogicValue {
  return gateNOT(gateOR(a, b));
}

export function gateXNOR(a: LogicValue, b: LogicValue): LogicValue {
  return gateNOT(gateXOR(a, b));
}

export function gateBUFFER(a: LogicValue): LogicValue {
  // El búfer pasa el mismo valor
  return a;
}

export function gateTRISTATE(a: LogicValue, enable: LogicValue): LogicValue {
  // Buffer tri-estado: si enable es 1, pasa 'a', sino 'Z'.
  // Si enable es desconocido, devuelve 'X'.
  if (enable === '1') return a;
  if (enable === '0') return 'Z';
  return 'X';
}
