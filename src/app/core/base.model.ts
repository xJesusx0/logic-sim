/**
 * Tipos base para el simulador de circuitos lógicos.
 */

// 1. Estados lógicos (4-value logic, IEEE 1164 simplificado)
// '0': Falso / Nivel bajo
// '1': Verdadero / Nivel alto
// 'X': Desconocido / Cortocircuito / Error
// 'Z': Alta impedancia / Desconectado
export type LogicValue = '0' | '1' | 'X' | 'Z';

export type PinDirection = 'IN' | 'OUT' | 'INOUT';

export type ElementCategory = 'GATE' | 'INPUT' | 'OUTPUT' | 'IC' | 'CUSTOM';

// 2. Definición de Pines (Puntos de conexión en los componentes)
export interface Pin {
  readonly id: string;
  name: string; // ej: "A", "B", "Q", "CLK"
  direction: PinDirection;
  value: LogicValue;
  // Referencia al elemento al que pertenece (útil al recorrer el grafo)
  readonly elementId: string;
}

export interface Position {
  x: number;
  y: number;
}

// 3. Componente genérico del circuito
// Esto permite crear desde compuertas básicas hasta visualizaciones y CIs complejos.
export interface CircuitElement {
  readonly id: string;
  type: ElementCategory;
  name?: string;
  
  // Información para la interfaz gráfica (UI)
  position?: Position;

  // Pines asignados a este componente
  inputs: Pin[];
  outputs: Pin[];

  /**
   * Ejecuta la lógica del componente.
   * Lee internamente los valores de `inputs` y actualiza los de `outputs`.
   */
  evaluate(): void;
}

// 4. Conexiones (Cables)
// En arquitecturas más avanzadas un "Net" puede unir varios pines.
// Para empezar, una relación 1 origen (OUT) a 1 destino (IN) es la mejor.
export interface Wire {
  readonly id: string;
  readonly sourcePinId: string; // Debería apuntar a un pin 'OUT' o 'INOUT'
  readonly targetPinId: string; // Debería apuntar a un pin 'IN' o 'INOUT'
  
  // El valor actual que transporta el cable
  value: LogicValue;
  
  // Opcional: puntos intermedios para dibujar el ruteo del cable en el UI
  path?: Position[];
}

// 5. El estado global y la simulación
export interface SimulationState {
  tickCount: number;
  isRunning: boolean;
  hasErrors: boolean;
}

export interface Circuit {
  // Mapas para optimizar la búsqueda de componentes O(1)
  elements: Map<string, CircuitElement>;
  wires: Map<string, Wire>;
  state: SimulationState;
  
  // Propaga los valores: lee las salidas y las mueve a lo largo de los Wires a las entradas
  propagate(): void;
  
  // Ejecuta un ciclo completo de la simulación: evaluate() -> propagate()
  tick(): void;
  
  reset(): void;
}