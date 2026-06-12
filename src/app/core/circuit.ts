import { Circuit, CircuitElement, SimulationState, Wire, Pin } from './base.model';

export class CircuitEngine implements Circuit {
  public elements: Map<string, CircuitElement> = new Map();
  public wires: Map<string, Wire> = new Map();
  
  // Quick lookup maps
  private pinMap: Map<string, Pin> = new Map();

  public state: SimulationState = {
    tickCount: 0,
    isRunning: false,
    hasErrors: false,
  };

  /**
   * Rebuilds the internal map of pins for O(1) lookup during propagation.
   * Call this whenever elements are added or removed.
   */
  public rebuildPinMap(): void {
    this.pinMap.clear();
    for (const element of this.elements.values()) {
      for (const pin of element.inputs) {
        this.pinMap.set(pin.id, pin);
      }
      for (const pin of element.outputs) {
        this.pinMap.set(pin.id, pin);
      }
    }
  }

  public addElement(element: CircuitElement): void {
    this.elements.set(element.id, element);
    this.rebuildPinMap();
  }

  public removeElement(id: string): void {
    this.elements.delete(id);
    this.rebuildPinMap();
    // Also remove any wire connected to this element
    const wiresToRemove: string[] = [];
    for (const wire of this.wires.values()) {
      if (!this.pinMap.has(wire.sourcePinId) || !this.pinMap.has(wire.targetPinId)) {
        wiresToRemove.push(wire.id);
      }
    }
    wiresToRemove.forEach(wireId => this.wires.delete(wireId));
  }

  public addWire(wire: Wire): void {
    this.wires.set(wire.id, wire);
  }

  public removeWire(id: string): void {
    this.wires.delete(id);
  }

  public propagate(): void {
    for (const wire of this.wires.values()) {
      const sourcePin = this.pinMap.get(wire.sourcePinId);
      const targetPin = this.pinMap.get(wire.targetPinId);

      if (sourcePin && targetPin) {
        // Wire carries the value
        wire.value = sourcePin.value;
        // The value arrives at the target pin
        targetPin.value = wire.value;
      }
    }
  }

  public tick(): void {
    this.state.isRunning = true;
    
    // Evaluate all elements
    for (const element of this.elements.values()) {
      element.evaluate();
    }

    // Propagate signals along wires
    this.propagate();

    this.state.tickCount++;
  }

  public reset(): void {
    this.state.tickCount = 0;
    this.state.hasErrors = false;
    
    for (const pin of this.pinMap.values()) {
      pin.value = 'X';
    }
    for (const wire of this.wires.values()) {
      wire.value = 'X';
    }

    for (const el of this.elements.values()) {
      // Reset Switch inputs to '0'
      if (el.type === 'INPUT' && (el as any).sourceType === 'SWITCH') {
        (el as any).state = '0';
      }
      // Reset LED outputs to 'X'
      if (el.type === 'OUTPUT' && (el as any).displayType === 'LED') {
        (el as any).colorState = 'X';
      }
    }
  }
}
