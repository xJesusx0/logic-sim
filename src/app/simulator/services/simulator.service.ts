import { Injectable, signal } from '@angular/core';
import { CircuitEngine, CircuitElement, Wire, AndGate, OrGate, NotGate, NandGate, NorGate, XorGate, XnorGate, SwitchInput, LedOutput } from '../../core';

@Injectable({
  providedIn: 'root'
})
export class SimulatorService {
  private engine = new CircuitEngine();

  // Signals that update ONLY when structural changes occur (add/remove)
  public readonly elements = signal<CircuitElement[]>([]);
  public readonly wires = signal<Wire[]>([]);
  
  // Selection
  public readonly selectedIds = signal<Set<string>>(new Set());

  // History Stacks
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  
  // High-frequency signal that updates every simulation tick
  public readonly tickCount = signal<number>(0);
  
  // Status signal
  public readonly isRunning = signal<boolean>(false);

  private tickInterval: any;

  constructor() {
    this.startSimulation();
  }

  /**
   * Sincroniza la estructura del motor con las Signals estructurables.
   */
  private syncStructure(): void {
    this.elements.set(Array.from(this.engine.elements.values()));
    this.wires.set(Array.from(this.engine.wires.values()));
  }

  // --- History & Persistence ---

  public saveState(clearRedo: boolean = true) {
    const state = JSON.stringify({
      elements: Array.from(this.engine.elements.values()),
      wires: Array.from(this.engine.wires.values())
    });
    this.undoStack.push(state);
    if (clearRedo) this.redoStack = [];
  }

  private restoreStateStr(stateStr: string) {
    const data = JSON.parse(stateStr);
    
    this.engine.elements.clear();
    this.engine.wires.clear();

    for(const elData of data.elements) {
      let el: CircuitElement;
      if (elData.type === 'GATE') {
        const type = elData.gateType;
        if (type === 'AND') el = new AndGate(elData.id, elData.position);
        else if (type === 'OR') el = new OrGate(elData.id, elData.position);
        else if (type === 'NOT') el = new NotGate(elData.id, elData.position);
        else if (type === 'NAND') el = new NandGate(elData.id, elData.position);
        else if (type === 'NOR') el = new NorGate(elData.id, elData.position);
        else if (type === 'XOR') el = new XorGate(elData.id, elData.position);
        else if (type === 'XNOR') el = new XnorGate(elData.id, elData.position);
        else el = new AndGate(elData.id, elData.position);
      } else if (elData.type === 'INPUT') {
        el = new SwitchInput(elData.id, elData.position);
        if (elData.state) (el as any).state = elData.state;
      } else if (elData.type === 'OUTPUT') {
        el = new LedOutput(elData.id, elData.position);
      } else {
        el = new AndGate(elData.id, elData.position);
      }
      
      el.inputs = elData.inputs;
      el.outputs = elData.outputs;
      if(elData.name) el.name = elData.name;
      this.engine.addElement(el);
    }

    for(const wData of data.wires) {
      this.engine.addWire(wData);
    }
    
    this.clearSelection();
    this.syncStructure();
  }

  public undo() {
    if (this.undoStack.length === 0) return;
    const currentState = JSON.stringify({
      elements: Array.from(this.engine.elements.values()),
      wires: Array.from(this.engine.wires.values())
    });
    this.redoStack.push(currentState);
    const prevState = this.undoStack.pop()!;
    this.restoreStateStr(prevState);
  }

  public redo() {
    if (this.redoStack.length === 0) return;
    const currentState = JSON.stringify({
      elements: Array.from(this.engine.elements.values()),
      wires: Array.from(this.engine.wires.values())
    });
    this.undoStack.push(currentState);
    const nextState = this.redoStack.pop()!;
    this.restoreStateStr(nextState);
  }

  public saveToLocalStorage() {
    const currentState = JSON.stringify({
      elements: Array.from(this.engine.elements.values()),
      wires: Array.from(this.engine.wires.values())
    });
    try {
      localStorage.setItem('logicsim_save', currentState);
      return true;
    } catch (e) {
      console.error('Storage limit exceeded or error saving.', e);
      return false;
    }
  }

  public loadFromLocalStorage() {
    const state = localStorage.getItem('logicsim_save');
    if (state) {
      this.saveState();
      this.restoreStateStr(state);
      return true;
    }
    return false;
  }

  // --- Element & Wire Management ---

  public addElement(element: CircuitElement): void {
    this.saveState();
    this.engine.addElement(element);
    this.syncStructure();
  }

  public removeElement(id: string): void {
    this.saveState();
    this.engine.removeElement(id);
    this.syncStructure();
  }

  public addWire(wire: Wire): void {
    this.saveState();
    this.engine.addWire(wire);
    this.syncStructure();
  }

  public removeWire(id: string): void {
    this.saveState();
    this.engine.removeWire(id);
    this.syncStructure();
  }

  public toggleInput(id: string): void {
    const el = this.engine.elements.get(id);
    if (el && el.type === 'INPUT') {
      (el as any).toggle?.();
    }
  }

  // --- Selection & Deletion ---

  public toggleSelection(id: string, multi: boolean = false) {
    const current = new Set(this.selectedIds());
    if (multi) {
      if (current.has(id)) current.delete(id);
      else current.add(id);
      this.selectedIds.set(current);
    } else {
      const isOnly = current.has(id) && current.size === 1;
      this.selectedIds.set(isOnly ? new Set() : new Set([id]));
    }
  }

  public clearSelection() {
    if (this.selectedIds().size > 0) {
      this.selectedIds.set(new Set());
    }
  }

  public deleteSelected() {
    const selected = this.selectedIds();
    if (selected.size === 0) return;
    
    this.saveState();
    let changed = false;
    
    for (const id of selected) {
      if (this.engine.elements.has(id)) {
        this.engine.removeElement(id);
        changed = true;
      }
      if (this.engine.wires.has(id)) {
        this.engine.removeWire(id);
        changed = true;
      }
    }
    
    if (changed) {
      this.clearSelection();
      this.syncStructure(); // this also handles engine internal map rebuilds via core
    }
  }

  public get selectedCount() {
    return this.selectedIds().size;
  }
  
  public recordDragPositionChange(): void {
    this.saveState();
  }
  
  public get canUndo() {
    return this.undoStack.length > 0;
  }

  public get canRedo() {
    return this.redoStack.length > 0;
  }

  // --- Simulation ---

  public startSimulation(): void {
    if (this.tickInterval) return;
    this.isRunning.set(true);
    
    this.tickInterval = setInterval(() => {
      this.engine.tick();
      this.tickCount.set(this.engine.state.tickCount);
    }, 50);
  }

  public pauseSimulation(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
      this.isRunning.set(false);
      this.engine.state.isRunning = false;
    }
  }

  public resetSimulation(): void {
    this.engine.reset();
    this.tickCount.set(this.engine.state.tickCount); // Debería ser 0
    this.syncStructure();
  }
}
