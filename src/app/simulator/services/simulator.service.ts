import { Injectable, signal } from '@angular/core';
import { CircuitEngine, CircuitElement, Wire } from '../../core';

@Injectable({
  providedIn: 'root'
})
export class SimulatorService {
  private engine = new CircuitEngine();

  // Signals that update ONLY when structural changes occur (add/remove)
  public readonly elements = signal<CircuitElement[]>([]);
  public readonly wires = signal<Wire[]>([]);
  
  // High-frequency signal that updates every simulation tick
  public readonly tickCount = signal<number>(0);
  
  // Status signal
  public readonly isRunning = signal<boolean>(false);

  private tickInterval: any;

  constructor() {
    // Para simplificar, iniciamos la simulación al instanciar el servicio
    this.startSimulation();
  }

  /**
   * Sincroniza la estructura del motor con las Signals estructurables.
   * Se llama sólo al agregar/remover componentes para evitar generar 
   * arrays nuevos (y por ende recolección de basura) innecesariamente en cada tick.
   */
  private syncStructure(): void {
    this.elements.set(Array.from(this.engine.elements.values()));
    this.wires.set(Array.from(this.engine.wires.values()));
  }

  public addElement(element: CircuitElement): void {
    this.engine.addElement(element);
    this.syncStructure();
  }

  public removeElement(id: string): void {
    this.engine.removeElement(id);
    this.syncStructure();
  }

  public addWire(wire: Wire): void {
    this.engine.addWire(wire);
    this.syncStructure();
  }

  public removeWire(id: string): void {
    this.engine.removeWire(id);
    this.syncStructure();
  }

  public toggleInput(id: string): void {
    const el = this.engine.elements.get(id);
    if (el && el.type === 'INPUT') {
      (el as any).toggle?.();
    }
  }

  public startSimulation(): void {
    if (this.tickInterval) return;
    this.isRunning.set(true);
    
    // Usamos setInterval para un bucle de tick asíncrono
    // 50ms = 20 actualizaciones por segundo
    this.tickInterval = setInterval(() => {
      this.engine.tick();
      // Solo actualizamos este signal. Los componentes hijos 
      // (Gate, Wire) escucharán el tick para sus actualizaciones OnPush.
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
