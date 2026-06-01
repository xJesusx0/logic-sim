import { CircuitElement } from './base.model';

// Tipos de compuertas lógicas soportadas
export type GateType = 
  // Base
  | 'AND' | 'OR'  | 'NOT' 
  // Derivadas
  | 'NAND'| 'NOR' | 'XOR' | 'XNOR'
  // Utilidades
  | 'BUFFER' | 'TRI_STATE_BUFFER';

export interface LogicGate extends CircuitElement {
  type: 'GATE';
  gateType: GateType;
  
  // Opcional para un simulador más avanzado: retardos de propagación
  propagationDelay?: number; 
}

// Para que escalar sea fácil, podemos definir interfaces especiales
// para los elementos de entrada (Interruptores, Botones, Relojes)
export type InputSourceType = 'SWITCH' | 'BUTTON' | 'CLOCK' | 'CONSTANT';

export interface InputElement extends CircuitElement {
  type: 'INPUT';
  sourceType: InputSourceType;
  
  // Solo los INPUTs pueden ser accionados por el usuario
  toggle?(): void; 
}

// Elementos de salida (LEDs, displays de 7 segmentos, probadores)
export type OutputDisplayType = 'LED' | 'SEVEN_SEGMENT' | 'LOGIC_PROBE';

export interface OutputElement extends CircuitElement {
  type: 'OUTPUT';
  displayType: OutputDisplayType;
}