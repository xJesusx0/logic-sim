import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { SimulatorService } from '../../services/simulator.service';
import { GateComponent } from '../gate/gate.component';
import { WireComponent } from '../wire/wire.component';
import { CircuitElement, Wire, Pin } from '../../../core';

@Component({
  selector: 'app-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GateComponent, WireComponent],
  template: `
    <svg 
      class="board" 
      (mousemove)="onMouseMove($event)" 
      (mouseup)="onMouseUp($event)"
      (mouseleave)="onMouseUp($event)">
      
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#e5e7eb"></circle>
        </pattern>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#grid)" />

      @for (w of wires(); track w.id) {
        <svg:g app-wire [wire]="w" [tick]="tick()" [pathData]="getWirePath(w)" />
      }
      
      @if (drawingWire()) {
        <svg:g app-wire [wire]="drawingWire()!" [tick]="0" [pathData]="drawingPath()" />
      }

      @for (el of elements(); track el.id) {
        <svg:g app-gate 
          [element]="el" 
          [tick]="tick()"
          (dragStart)="startDrag($event.event, el)"
          (pinDown)="startWire($event.pin)"
          (pinUp)="finishWire($event.pin)">
        </svg:g>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .board {
      width: 100%;
      height: 100%;
      background-color: #f9fafb;
      touch-action: none; /* Previene scroll en touch devices */
    }
  `
})
export class BoardComponent {
  private simulator = inject(SimulatorService);

  elements = this.simulator.elements;
  wires = this.simulator.wires;
  tick = this.simulator.tickCount;

  private draggingElement = signal<CircuitElement | null>(null);
  private dragOffset = { x: 0, y: 0 };

  drawingWire = signal<Wire | null>(null);
  private startDrawingPin: Pin | null = null;
  private currentMousePos = signal<{x: number, y: number}>({x:0, y:0});

  private getPinAbsolutePosition(pinId: string): { x: number, y: number } {
    const elements = this.elements();
    for (const el of elements) {
      const inIndex = el.inputs.findIndex(p => p.id === pinId);
      if (inIndex >= 0) return this.calcPinPos(el, 'IN', inIndex, el.inputs.length);
      
      const outIndex = el.outputs.findIndex(p => p.id === pinId);
      if (outIndex >= 0) return this.calcPinPos(el, 'OUT', outIndex, el.outputs.length);
    }
    return { x: 0, y: 0 };
  }

  private calcPinPos(element: CircuitElement, dir: 'IN'|'OUT', index: number, total: number) {
    const isIO = element.type === 'INPUT' || element.type === 'OUTPUT';
    const height = 40;
    const width = isIO ? 40 : 60;
    
    const spacing = height / (total + 1);
    const offsetY = spacing * (index + 1);
    const offsetX = dir === 'IN' ? 0 : width;
    
    const base = element.position || {x: 0, y: 0};
    return {
      x: base.x + offsetX,
      y: base.y + offsetY
    };
  }

  getWirePath(wire: Wire): string {
    const start = this.getPinAbsolutePosition(wire.sourcePinId);
    const end = this.getPinAbsolutePosition(wire.targetPinId);
    return this.calculateBezier(start, end);
  }

  drawingPath = computed(() => {
    const wire = this.drawingWire();
    if (!wire || !this.startDrawingPin) return '';
    const start = this.getPinAbsolutePosition(this.startDrawingPin.id);
    const end = this.currentMousePos();
    return this.startDrawingPin.direction === 'OUT' ? 
      this.calculateBezier(start, end) : 
      this.calculateBezier(end, start);
  });

  private calculateBezier(start: {x:number, y:number}, end: {x:number, y:number}) {
    const dx = Math.abs(end.x - start.x);
    const offset = Math.max(dx * 0.5, 20);
    return `M ${start.x} ${start.y} C ${start.x + offset} ${start.y}, ${end.x - offset} ${end.y}, ${end.x} ${end.y}`;
  }

  private getMouseSVGPoint(e: MouseEvent): {x: number, y: number} {
    const svgEl = e.currentTarget as SVGSVGElement | null;
    if (!svgEl) return {x: e.clientX, y: e.clientY};
    
    const pt = svgEl.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    const ctm = svgEl.getScreenCTM();
    if (ctm) {
      const svgP = pt.matrixTransform(ctm.inverse());
      return {x: svgP.x, y: svgP.y};
    }
    return {x: e.clientX, y: e.clientY};
  }

  startDrag(e: MouseEvent, el: CircuitElement) {
    if (el.type === 'INPUT' && e.detail === 2) {
      this.simulator.toggleInput(el.id);
      return;
    }
    
    const svgP = this.getMouseSVGPoint(e as unknown as MouseEvent & { currentTarget: SVGSVGElement });
    this.draggingElement.set(el);
    const pos = el.position || {x:0, y:0};
    this.dragOffset = {
      x: svgP.x - pos.x,
      y: svgP.y - pos.y
    };
  }

  startWire(pin: Pin) {
    this.startDrawingPin = pin;
    const dummyWire: Wire = {
      id: 'drawing',
      sourcePinId: pin.direction === 'OUT' ? pin.id : 'mouse',
      targetPinId: pin.direction === 'IN' ? pin.id : 'mouse',
      value: pin.value
    };
    this.drawingWire.set(dummyWire);
    this.currentMousePos.set(this.getPinAbsolutePosition(pin.id));
  }

  finishWire(pin: Pin) {
    if (!this.startDrawingPin || this.startDrawingPin.id === pin.id) return;
    
    const source = this.startDrawingPin.direction === 'OUT' ? this.startDrawingPin : pin;
    const target = this.startDrawingPin.direction === 'IN' ? this.startDrawingPin : pin;
    
    if (source.direction === 'OUT' && target.direction === 'IN') {
      this.simulator.addWire({
        id: crypto.randomUUID(),
        sourcePinId: source.id,
        targetPinId: target.id,
        value: source.value
      });
    }
    
    this.startDrawingPin = null;
    this.drawingWire.set(null);
  }

  onMouseMove(e: MouseEvent) {
    const dragging = this.draggingElement();
    if (dragging) {
      const svgP = this.getMouseSVGPoint(e);
      dragging.position = {
        x: svgP.x - this.dragOffset.x,
        y: svgP.y - this.dragOffset.y
      };
    }
    
    if (this.startDrawingPin) {
      const svgP = this.getMouseSVGPoint(e);
      this.currentMousePos.set(svgP);
    }
  }

  onMouseUp(e: MouseEvent) {
    this.draggingElement.set(null);
    if (this.startDrawingPin) {
      this.startDrawingPin = null;
      this.drawingWire.set(null);
    }
  }
}
