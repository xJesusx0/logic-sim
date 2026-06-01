import { Component, inject } from '@angular/core';
import { BoardComponent } from './simulator/components/board/board.component';
import { SimulatorService } from './simulator/services/simulator.service';
import { AndGate, OrGate, NotGate, NandGate, NorGate, XorGate, XnorGate, SwitchInput, LedOutput } from './core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [BoardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private simulator = inject(SimulatorService);
  
  protected readonly isRunning = this.simulator.isRunning;
  
  protected readonly paletteItems = [
    { type: 'SWITCH', label: 'Switch (IN)' },
    { type: 'LED', label: 'LED (OUT)' },
    { type: 'AND', label: 'AND Gate' },
    { type: 'OR', label: 'OR Gate' },
    { type: 'NOT', label: 'NOT Gate' },
    { type: 'NAND', label: 'NAND Gate' },
    { type: 'NOR', label: 'NOR Gate' },
    { type: 'XOR', label: 'XOR Gate' },
    { type: 'XNOR', label: 'XNOR Gate' },
  ];

  onDragStart(event: DragEvent, type: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('application/gate-type', type);
      event.dataTransfer.effectAllowed = 'copy';
      
      const target = event.target as HTMLElement;
      const rect = target.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      event.dataTransfer.setData('application/offset-x', offsetX.toString());
      event.dataTransfer.setData('application/offset-y', offsetY.toString());
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (!event.dataTransfer) return;
    
    const type = event.dataTransfer.getData('application/gate-type');
    if (!type) return;

    const mainArea = document.querySelector('.main-area') as HTMLElement;
    const boardRect = mainArea.getBoundingClientRect();

    const offsetX = parseFloat(event.dataTransfer.getData('application/offset-x') || '0');
    const offsetY = parseFloat(event.dataTransfer.getData('application/offset-y') || '0');
    
    const position = { 
      x: event.clientX - boardRect.left - offsetX, 
      y: event.clientY - boardRect.top - offsetY
    };
    
    position.x = Math.max(0, position.x);
    position.y = Math.max(0, position.y);

    this.createElement(type, position);
  }
  
  private createElement(type: string, position: {x: number, y: number}) {
    switch (type) {
      case 'SWITCH': this.simulator.addElement(new SwitchInput(undefined, position)); break;
      case 'LED': this.simulator.addElement(new LedOutput(undefined, position)); break;
      case 'AND': this.simulator.addElement(new AndGate(undefined, position)); break;
      case 'OR': this.simulator.addElement(new OrGate(undefined, position)); break;
      case 'NOT': this.simulator.addElement(new NotGate(undefined, position)); break;
      case 'NAND': this.simulator.addElement(new NandGate(undefined, position)); break;
      case 'NOR': this.simulator.addElement(new NorGate(undefined, position)); break;
      case 'XOR': this.simulator.addElement(new XorGate(undefined, position)); break;
      case 'XNOR': this.simulator.addElement(new XnorGate(undefined, position)); break;
    }
  }
  
  play() {
    this.simulator.startSimulation();
  }
  
  pause() {
    this.simulator.pauseSimulation();
  }
  
  reset() {
    this.simulator.resetSimulation();
  }
}
