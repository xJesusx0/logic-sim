import { Component, ChangeDetectionStrategy, inject, signal, computed, ElementRef, OnInit, HostListener } from '@angular/core';
import { DragDropModule, CdkDragDrop, CdkDragMove } from '@angular/cdk/drag-drop';
import { SimulatorService } from '../../services/simulator.service';
import { GateComponent } from '../gate/gate.component';
import { WireComponent } from '../wire/wire.component';
import { CircuitElement, Wire, Pin } from '../../../core';

@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GateComponent, WireComponent, DragDropModule],
  template: `
    <svg 
      class="board" 
      [attr.viewBox]="viewBox()"
      (mousedown)="onBoardMouseDown($event)"
      (mousemove)="onMouseMove($event)" 
      (mouseup)="onMouseUp($event)"
      (mouseleave)="onMouseUp($event)"
      (wheel)="onWheel($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd($event)"
      (touchcancel)="onTouchCancel()"
      cdkDropListSortingDisabled="true"
      cdkDropList>
      
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#cbd5e1"></circle>
        </pattern>
      </defs>
      
      <!-- Grid Rect needs to be large enough to cover panned areas -->
      <rect x="-50000" y="-50000" width="100000" height="100000" fill="url(#grid)" />

      @for (w of wires(); track w.id) {
        <svg:g app-wire [wire]="w" [tick]="tick()" [pathData]="getWirePath(w)" 
               [class.selected]="selectedIds().has(w.id)"
               (click)="onWireClick($event, w.id)" />
      }
      
      @if (drawingWire()) {
        <svg:g app-wire [wire]="drawingWire()!" [tick]="0" [pathData]="drawingPath()" style="pointer-events: none;" />
      }

      @for (el of elements(); track el.id) {
        <svg:g 
          app-gate 
          [element]="el" 
          [tick]="tick()"
          [class.selected]="selectedIds().has(el.id)"
          (click)="onGateClick($event, el.id)"
          (pinDown)="startWire($event.pin)"
          (pinUp)="finishWire($event.pin)"
          (dblclick)="onGateDoubleClick($event, el)"
          cdkDrag
          [cdkDragData]="el"
          (cdkDragStarted)="onCdkDragStarted($any($event))"
          (cdkDragMoved)="onCdkDragMoved($any($event))"
          (cdkDragEnded)="onCdkDragEnded()">
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
      touch-action: none;
    }
    ::ng-deep .selected > .gate-group > *:first-child {
       filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.8));
       stroke: #3b82f6;
    }
    ::ng-deep .selected path.wire {
       filter: drop-shadow(0 0 6px rgba(59, 130, 246, 0.8));
       stroke: #3b82f6 !important;
    }
  `
})
export class BoardComponent implements OnInit {
  private simulator = inject(SimulatorService);
  private hostEl = inject(ElementRef);

  elements = this.simulator.elements;
  wires = this.simulator.wires;
  tick = this.simulator.tickCount;
  selectedIds = this.simulator.selectedIds;

  // ViewBox / Panning / Zooming
  panX = signal(0);
  panY = signal(0);
  zoom = signal(1);
  boardWidth = signal(1000);
  boardHeight = signal(800);

  viewBox = computed(() => {
    const w = this.boardWidth() / this.zoom();
    const h = this.boardHeight() / this.zoom();
    return `${this.panX()} ${this.panY()} ${w} ${h}`;
  });

  private draggingElement = signal<CircuitElement | null>(null);
  private dragOffset = { x: 0, y: 0 };

  drawingWire = signal<Wire | null>(null);
  private startDrawingPin: Pin | null = null;
  private currentMousePos = signal<{x: number, y: number}>({x:0, y:0});

  private svgElement: SVGSVGElement | null = null;
  private isPanning = false;
  private lastMousePoint = { x: 0, y: 0 };

  ngOnInit() {
    this.updateBoardDimensions();
  }

  @HostListener('window:resize')
  updateBoardDimensions() {
    const rect = this.hostEl.nativeElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.boardWidth.set(rect.width);
      this.boardHeight.set(rect.height);
    }
  }

  private pinMap = computed(() => {
    const map = new Map<string, Pin>();
    for (const el of this.elements()) {
      for (const p of el.inputs) map.set(p.id, p);
      for (const p of el.outputs) map.set(p.id, p);
    }
    return map;
  });

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
    const svgEl = this.getSvgElement();
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

  private getTouchSVGPoint(clientX: number, clientY: number): {x: number, y: number} {
    const svgEl = this.getSvgElement();
    if (!svgEl) return {x: clientX, y: clientY};

    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    
    const ctm = svgEl.getScreenCTM();
    if (ctm) {
      const svgP = pt.matrixTransform(ctm.inverse());
      return {x: svgP.x, y: svgP.y};
    }
    return {x: clientX, y: clientY};
  }

  private getSvgElement(): SVGSVGElement | null {
    if (!this.svgElement) {
      this.svgElement = this.hostEl.nativeElement.querySelector('svg.board');
    }
    return this.svgElement;
  }

  // --- Zoom, Pan & Click ---

  onWheel(e: WheelEvent) {
    if(!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && !e.button) {
      e.preventDefault();
      const zoomFactor = 1.1;
      let currentZoom = this.zoom();
      if (e.deltaY < 0) currentZoom *= zoomFactor;
      else currentZoom /= zoomFactor;
      
      currentZoom = Math.max(0.2, Math.min(currentZoom, 5));
      
      const target = this.getMouseSVGPoint(e as any);
      this.zoom.set(currentZoom);
      
      const rX = e.offsetX / this.boardWidth();
      const rY = e.offsetY / this.boardHeight();
      const newPanX = target.x - rX * (this.boardWidth() / currentZoom);
      const newPanY = target.y - rY * (this.boardHeight() / currentZoom);

      this.panX.set(newPanX);
      this.panY.set(newPanY);
    }
  }

  onBoardMouseDown(e: MouseEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      this.isPanning = true;
      this.lastMousePoint = { x: e.clientX, y: e.clientY };
    } else if (e.button === 0) {
      if (e.target === this.getSvgElement() || (e.target as Element).tagName === 'rect') {
        this.simulator.clearSelection();
      }
    }
  }

  onGateClick(e: MouseEvent, id: string) {
    e.stopPropagation();
    this.simulator.toggleSelection(id, e.shiftKey);
  }

  onWireClick(e: MouseEvent, id: string) {
    e.stopPropagation();
    this.simulator.toggleSelection(id, e.shiftKey);
  }

  // --- Drag & Drop ---

  onCdkDragStarted(event: any) {
    const el = event.source.data as CircuitElement;
    this.draggingElement.set(el);
    const pos = el.position || {x:0, y:0};
    this.dragOffset = { x: pos.x, y: pos.y };
  }

  onGateDoubleClick(e: MouseEvent, el: CircuitElement) {
    if (el.type === 'INPUT') {
      e.stopPropagation();
      this.simulator.toggleInput(el.id);
    } else {
      e.stopPropagation();
      const newName = prompt('Enter a label for this element:', el.name || '');
      if (newName !== null) {
        this.simulator.setElementName(el.id, newName);
      }
    }
  }

  onCdkDragMoved(event: any) {
    const el = this.draggingElement();
    if (!el) return;
    
    const source = event.source;
    const transform = source._dragRef._activeTransform;
    
    if (transform) {
      el.position = {
        x: this.dragOffset.x + transform.x / this.zoom(),
        y: this.dragOffset.y + transform.y / this.zoom()
      };
    }
  }

  onCdkDragEnded() {
    const el = this.draggingElement();
    if (el) {
      const pos = el.position || {x:0, y:0};
      this.dragOffset = { x: pos.x, y: pos.y };
      this.simulator.recordDragPositionChange();
    }
    this.draggingElement.set(null);
  }

  // --- Wiring ---

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

  // --- Mouse / Touch Core Events ---

  onMouseMove(e: MouseEvent) {
    if (this.isPanning) {
      const dx = (e.clientX - this.lastMousePoint.x) / this.zoom();
      const dy = (e.clientY - this.lastMousePoint.y) / this.zoom();
      this.panX.set(this.panX() - dx);
      this.panY.set(this.panY() - dy);
      this.lastMousePoint = { x: e.clientX, y: e.clientY };
    } else if (this.startDrawingPin) {
      const svgP = this.getMouseSVGPoint(e);
      this.currentMousePos.set(svgP);
    }
  }

  onMouseUp(e: MouseEvent) {
    this.isPanning = false;
    this.draggingElement.set(null);
    if (this.startDrawingPin) {
      this.startDrawingPin = null;
      this.drawingWire.set(null);
    }
  }

  onTouchMove(e: TouchEvent) {
    if (!this.startDrawingPin) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    if (touch) {
      const svgP = this.getTouchSVGPoint(touch.clientX, touch.clientY);
      this.currentMousePos.set(svgP);
    }
  }

  onTouchEnd(e: TouchEvent) {
    if (!this.startDrawingPin) return;
    e.preventDefault();

    const touch = e.changedTouches[0];
    if (touch) {
      const targetPin = this.findPinAtPoint(touch.clientX, touch.clientY);
      if (targetPin) {
        this.finishWire(targetPin);
        return;
      }
    }
    this.cancelWire();
  }

  onTouchCancel() {
    this.cancelWire();
  }

  private findPinAtPoint(clientX: number, clientY: number): Pin | null {
    const svgP = this.getTouchSVGPoint(clientX, clientY);
    const hitRadius = 16; 

    for (const el of this.elements()) {
      for (let i = 0; i < el.inputs.length; i++) {
        const pos = this.calcPinPos(el, 'IN', i, el.inputs.length);
        if (this.isWithinRadius(svgP, pos, hitRadius)) return el.inputs[i];
      }
      for (let i = 0; i < el.outputs.length; i++) {
        const pos = this.calcPinPos(el, 'OUT', i, el.outputs.length);
        if (this.isWithinRadius(svgP, pos, hitRadius)) return el.outputs[i];
      }
    }
    return null;
  }

  private isWithinRadius(a: {x: number, y: number}, b: {x: number, y: number}, radius: number): boolean {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return (dx * dx + dy * dy) <= (radius * radius);
  }

  private cancelWire() {
    this.startDrawingPin = null;
    this.drawingWire.set(null);
  }
}
