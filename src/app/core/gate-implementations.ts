import { LogicGate, GateType } from './logic-gates.model';
import { Pin, Position } from './base.model';
import { gateAND, gateOR, gateNOT, gateXOR, gateNAND, gateNOR, gateXNOR } from './logic-functions';

/**
 * Clase base abstracta que maneja el esqueleto de una compuerta.
 * Mantiene la validación y estructura.
 */
export abstract class BaseGate implements LogicGate {
  public readonly id: string;
  public type: 'GATE' = 'GATE';
  public abstract gateType: GateType;
  
  public inputs: Pin[] = [];
  public outputs: Pin[] = [];
  public position?: Position;

  constructor(id?: string, position?: Position) {
    this.id = id || crypto.randomUUID(); // O un generador de IDs diferente
    this.position = position;
  }

  // Las clases hijas deben definir cómo evaluar las entradas específicas
  public abstract evaluate(): void;
  
  // Helpers para crear pines
  protected createPin(name: string, direction: 'IN' | 'OUT'): Pin {
    return {
      id: crypto.randomUUID(),
      name,
      direction,
      value: 'X', // Estado inicial desconocido
      elementId: this.id
    };
  }
}

/**
 * Implementación específica de la compuerta AND
 */
export class AndGate extends BaseGate {
  public gateType: GateType = 'AND';

  constructor(id?: string, position?: Position) {
    super(id, position);
    // Inicializamos con 2 entradas y 1 salida por defecto
    this.inputs = [
      this.createPin('A', 'IN'),
      this.createPin('B', 'IN')
    ];
    this.outputs = [
      this.createPin('Q', 'OUT')
    ];
  }

  public evaluate(): void {
    // Leemos el valor actual en los pines de entrada
    const valA = this.inputs[0].value;
    const valB = this.inputs[1].value;

    // Usamos nuestra función pura para calcular el resultado
    const result = gateAND(valA, valB);

    // Asignamos el resultado al pin de salida
    this.outputs[0].value = result;
  }
}

/**
 * Implementación específica de la compuerta OR
 */
export class OrGate extends BaseGate {
  public gateType: GateType = 'OR';

  constructor(id?: string, position?: Position) {
    super(id, position);
    this.inputs = [
      this.createPin('A', 'IN'),
      this.createPin('B', 'IN')
    ];
    this.outputs = [
      this.createPin('Q', 'OUT')
    ];
  }

  public evaluate(): void {
    const valA = this.inputs[0].value;
    const valB = this.inputs[1].value;
    this.outputs[0].value = gateOR(valA, valB);
  }
}

/**
 * Implementación específica de la compuerta NOT
 */
export class NotGate extends BaseGate {
  public gateType: GateType = 'NOT';

  constructor(id?: string, position?: Position) {
    super(id, position);
    // NOT solo tiene 1 entrada
    this.inputs = [
      this.createPin('A', 'IN')
    ];
    this.outputs = [
      this.createPin('Q', 'OUT')
    ];
  }

  public evaluate(): void {
    const valA = this.inputs[0].value;
    this.outputs[0].value = gateNOT(valA);
  }
}

/**
 * Implementación específica de la compuerta NAND
 */
export class NandGate extends BaseGate {
  public gateType: GateType = 'NAND';

  constructor(id?: string, position?: Position) {
    super(id, position);
    this.inputs = [
      this.createPin('A', 'IN'),
      this.createPin('B', 'IN')
    ];
    this.outputs = [
      this.createPin('Q', 'OUT')
    ];
  }

  public evaluate(): void {
    const valA = this.inputs[0].value;
    const valB = this.inputs[1].value;
    this.outputs[0].value = gateNAND(valA, valB);
  }
}

/**
 * Implementación específica de la compuerta NOR
 */
export class NorGate extends BaseGate {
  public gateType: GateType = 'NOR';

  constructor(id?: string, position?: Position) {
    super(id, position);
    this.inputs = [
      this.createPin('A', 'IN'),
      this.createPin('B', 'IN')
    ];
    this.outputs = [
      this.createPin('Q', 'OUT')
    ];
  }

  public evaluate(): void {
    const valA = this.inputs[0].value;
    const valB = this.inputs[1].value;
    this.outputs[0].value = gateNOR(valA, valB);
  }
}

/**
 * Implementación específica de la compuerta XOR
 */
export class XorGate extends BaseGate {
  public gateType: GateType = 'XOR';

  constructor(id?: string, position?: Position) {
    super(id, position);
    this.inputs = [
      this.createPin('A', 'IN'),
      this.createPin('B', 'IN')
    ];
    this.outputs = [
      this.createPin('Q', 'OUT')
    ];
  }

  public evaluate(): void {
    const valA = this.inputs[0].value;
    const valB = this.inputs[1].value;
    this.outputs[0].value = gateXOR(valA, valB);
  }
}

/**
 * Implementación específica de la compuerta XNOR
 */
export class XnorGate extends BaseGate {
  public gateType: GateType = 'XNOR';

  constructor(id?: string, position?: Position) {
    super(id, position);
    this.inputs = [
      this.createPin('A', 'IN'),
      this.createPin('B', 'IN')
    ];
    this.outputs = [
      this.createPin('Q', 'OUT')
    ];
  }

  public evaluate(): void {
    const valA = this.inputs[0].value;
    const valB = this.inputs[1].value;
    this.outputs[0].value = gateXNOR(valA, valB);
  }
}
