import { Component, ChangeDetectionStrategy, inject, signal, computed, ElementRef, OnInit, HostListener, output } from '@angular/core';
import { SimulatorService } from '../../services/simulator.service';
import { GateComponent } from '../gate/gate.component';
import { WireComponent } from '../wire/wire.component';
import { CircuitElement, Wire, Pin } from '../../../core';

@Component({
  selector: 'app-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GateComponent, WireComponent],
  template: `
    <svg 
      class="board" 
      [attr.viewBox]="viewBox()"
      (mousedown)="onBoardMouseDown($event)"
      (mousemove)="onMouseMove($event)" 
      (mouseup)="onMouseUp($event)"
      (mouseleave)="onMouseUp($event)"
      (wheel)="onWheel($event)"
      (wheel)="onWheel($event)"
      (touchstart)="onBoardTouchStart($event)"
      (touchmove)="onTouchMove($event)"
      (touchend)="onTouchEnd($event)"
      (touchcancel)="onTouchCancel()">
      
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#cbd5e1"></circle>
        </pattern>
      </defs>
      
      <!-- Grid Rect needs to be large enough to cover panned areas -->
      <rect x="-50000" y="-50000" width="100000" height="100000" fill="url(#grid)" />

      @for (w of wires(); track w.id) {
        <svg:g app-wire [wire]="w" [tick]="renderTick()" [pathData]="getWirePath(w)" 
               [class.selected]="selectedIds().has(w.id)"
               (click)="onWireClick($event, w.id)"
               (dblclick)="onWireDoubleClick($event, w.id)" />
      }
      
      @if (drawingWire()) {
        <svg:g app-wire [wire]="drawingWire()!" [tick]="0" [pathData]="drawingPath()" style="pointer-events: none;" />
      }

      @for (el of elements(); track el.id) {
        <svg:g 
          app-gate 
          [element]="el" 
          [tick]="renderTick()"
          [activePinId]="selectedPinToConnect()?.id || null"
          [class.selected]="selectedIds().has(el.id)"
          (click)="onGateClick($event, el.id)"
          (pinDown)="startWire($event.pin)"
          (pinUp)="finishWire($event.pin)"
          (dblclick)="onGateDoubleClick($event, el)"
          (mousedown)="onGateMouseDown($event, el)"
          (touchstart)="onGateTouchStart($event, el)">
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

  boardTap = output<{x: number, y: number}>();

  elements = this.simulator.elements;
  wires = this.simulator.wires;
  tick = this.simulator.tickCount;
  private dragTick = signal(0);
  renderTick = computed(() => this.tick() + this.dragTick());
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
  private hasDragged = false;
  
  private longPressTimer: any = null;

  selectedPinToConnect = signal<Pin | null>(null);
  drawingWire = signal<Wire | null>(null);
  private startDrawingPin: Pin | null = null;
  private currentMousePos = signal<{x: number, y: number}>({x:0, y:0});

  private svgElement: SVGSVGElement | null = null;
  private isPanning = false;
  private lastMousePoint = { x: 0, y: 0 };
  
  // Pinch to zoom state
  private initialPinchDistance = 0;
  private initialZoom = 1;
  private isPinching = false;
  private touchDownTime = 0;
  private initialPanX = 0;
  private initialPanY = 0;
  private pinchCenterSVG = {x: 0, y: 0};

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

  onWireDoubleClick(e: MouseEvent, id: string) {
    e.stopPropagation();
    this.simulator.removeWire(id);
  }

  // --- Drag & Drop ---

  private clearLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  onGateMouseDown(e: MouseEvent, el: CircuitElement) {
    if (e.button !== 0) return;
    e.stopPropagation();
    this.hasDragged = false;
    this.draggingElement.set(el);
    this.lastMousePoint = this.getMouseSVGPoint(e);

    this.clearLongPress();
    this.longPressTimer = setTimeout(() => {
      if (!this.hasDragged) {
        this.triggerGateRename(el);
        this.draggingElement.set(null);
      }
    }, 600);
  }

  onGateTouchStart(e: TouchEvent, el: CircuitElement) {
    e.stopPropagation();
    this.hasDragged = false;
    this.draggingElement.set(el);
    const touch = e.touches[0];
    this.lastMousePoint = this.getTouchSVGPoint(touch.clientX, touch.clientY);
    this.touchDownTime = Date.now();

    this.clearLongPress();
    this.longPressTimer = setTimeout(() => {
      if (!this.hasDragged) {
        this.triggerGateRename(el);
        this.draggingElement.set(null);
      }
    }, 600);
  }

  triggerGateRename(el: CircuitElement) {
    const newName = prompt('Enter a label for this element:', el.name || '');
    if (newName !== null) {
      this.simulator.setElementName(el.id, newName);
    }
  }

  onGateDoubleClick(e: MouseEvent, el: CircuitElement) {
    if (el.type === 'INPUT') {
      e.stopPropagation();
      this.simulator.toggleInput(el.id);
    } else {
      e.stopPropagation();
      this.triggerGateRename(el);
    }
  }

  // --- Wiring ---

  startWire(pin: Pin) {
    const current = this.selectedPinToConnect();
    
    if (current) {
        if (current.id === pin.id) {
            // Untap
            this.cancelWire();
            return;
        } else if (current.direction !== pin.direction) {
            // Valid target! connect!
            this.finishWire(pin);
            return;
        } else {
            // Tapped different pin of same direction -> Swap selection
            this.cancelWire();
            // will naturally proceed to select the new one below
        }
    }

    this.selectedPinToConnect.set(pin);
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
    if (!this.startDrawingPin) return;
    if (this.startDrawingPin.id === pin.id) return; // Leave for tap-to-connect!
    
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
    
    this.cancelWire();
  }

  // --- Mouse / Touch Core Events ---
  
  private getDistance(t1: Touch, t2: Touch) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  }
  
  onBoardTouchStart(e: TouchEvent) {
    this.touchDownTime = Date.now();
    if (e.touches.length === 2) {
      e.preventDefault();
      this.isPinching = true;
      this.initialPinchDistance = this.getDistance(e.touches[0], e.touches[1]);
      this.initialZoom = this.zoom();
      
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      this.pinchCenterSVG = this.getTouchSVGPoint(centerX, centerY);
      this.initialPanX = this.panX();
      this.initialPanY = this.panY();
    }
  }

  onMouseMove(e: MouseEvent) {
    if (this.isPanning) {
      const dx = (e.clientX - this.lastMousePoint.x) / this.zoom();
      const dy = (e.clientY - this.lastMousePoint.y) / this.zoom();
      this.panX.set(this.panX() - dx);
      this.panY.set(this.panY() - dy);
      this.lastMousePoint = { x: e.clientX, y: e.clientY };
    } else if (this.draggingElement()) {
      const el = this.draggingElement()!;
      const point = this.getMouseSVGPoint(e);
      const dx = point.x - this.lastMousePoint.x;
      const dy = point.y - this.lastMousePoint.y;
      
      el.position = { x: (el.position?.x || 0) + dx, y: (el.position?.y || 0) + dy };
      this.lastMousePoint = point;
      this.hasDragged = true;
      this.dragTick.update(t => t + 1);
    } else if (this.startDrawingPin) {
      const svgP = this.getMouseSVGPoint(e);
      this.currentMousePos.set(svgP);
    }
  }

  onMouseUp(e: MouseEvent) {
    this.clearLongPress();
    this.isPanning = false;
    if (this.draggingElement()) {
      if (this.hasDragged) {
        this.simulator.recordDragPositionChange();
      }
      this.draggingElement.set(null);
    }
    if (this.startDrawingPin) {
      if (e.target === this.getSvgElement() || (e.target as Element).tagName === 'rect') {
        this.cancelWire();
      }
    }
  }

  onTouchMove(e: TouchEvent) {
    if (e.touches.length === 2 && this.isPinching) {
      e.preventDefault();
      const dist = this.getDistance(e.touches[0], e.touches[1]);
      const scale = dist / this.initialPinchDistance;
      
      let newZoom = this.initialZoom * scale;
      newZoom = Math.max(0.2, Math.min(newZoom, 5));
      this.zoom.set(newZoom);
      
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      const boardRect = this.hostEl.nativeElement.getBoundingClientRect();
      const rX = (centerX - boardRect.left) / this.boardWidth();
      const rY = (centerY - boardRect.top) / this.boardHeight();
      
      const newPanX = this.pinchCenterSVG.x - rX * (this.boardWidth() / newZoom);
      const newPanY = this.pinchCenterSVG.y - rY * (this.boardHeight() / newZoom);
      
      this.panX.set(newPanX);
      this.panY.set(newPanY);
      return;
    }

    if (this.draggingElement()) {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        const point = this.getTouchSVGPoint(touch.clientX, touch.clientY);
        const dx = point.x - this.lastMousePoint.x;
        const dy = point.y - this.lastMousePoint.y;
        
        const el = this.draggingElement()!;
        el.position = { x: (el.position?.x || 0) + dx, y: (el.position?.y || 0) + dy };
        this.lastMousePoint = point;
        this.hasDragged = true;
        this.dragTick.update(t => t + 1);
      }
      return;
    }
    if (!this.startDrawingPin) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    if (touch) {
      const svgP = this.getTouchSVGPoint(touch.clientX, touch.clientY);
      this.currentMousePos.set(svgP);
    }
  }

  onTouchEnd(e: TouchEvent) {
    this.clearLongPress();
    
    if (this.isPinching) {
      if (e.touches.length < 2) {
        this.isPinching = false;
      }
      return;
    }

    const duration = Date.now() - this.touchDownTime;
    const isTap = !this.hasDragged && duration < 300;

    const el = this.draggingElement();
    if (el) {
      if (isTap && el.type === 'INPUT') {
        this.simulator.toggleInput(el.id);
      } else if (this.hasDragged) {
        this.simulator.recordDragPositionChange();
      }
      this.draggingElement.set(null);
      this.simulator.clearSelection();
      return;
    }

    if (!this.startDrawingPin) {
      if (isTap && e.changedTouches[0]) {
         const touch = e.changedTouches[0];
         
         // Try to find a nearby pin if we slightly missed the exact 4px SVG circle
         const maybePin = this.findPinAtPoint(touch.clientX, touch.clientY, 30);
         if (maybePin) {
           this.startWire(maybePin);
           return;
         }
         
         const svgP = this.getTouchSVGPoint(touch.clientX, touch.clientY);
         this.boardTap.emit(svgP);
         this.simulator.clearSelection();
      }
      return;
    }
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
    this.clearLongPress();
    this.isPinching = false;
    this.draggingElement.set(null);
    this.cancelWire();
  }

  private findPinAtPoint(clientX: number, clientY: number, hitRadius: number = 30): Pin | null {
    const svgP = this.getTouchSVGPoint(clientX, clientY);
    
    let closestPin: Pin | null = null;
    let minDistSq = hitRadius * hitRadius;

    for (const el of this.elements()) {
      for (let i = 0; i < el.inputs.length; i++) {
        const pos = this.calcPinPos(el, 'IN', i, el.inputs.length);
        const dx = svgP.x - pos.x;
        const dy = svgP.y - pos.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          closestPin = el.inputs[i];
          minDistSq = dSq;
        }
      }
      for (let i = 0; i < el.outputs.length; i++) {
        const pos = this.calcPinPos(el, 'OUT', i, el.outputs.length);
        const dx = svgP.x - pos.x;
        const dy = svgP.y - pos.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < minDistSq) {
          closestPin = el.outputs[i];
          minDistSq = dSq;
        }
      }
    }
    return closestPin;
  }

  private cancelWire() {
    this.selectedPinToConnect.set(null);
    this.startDrawingPin = null;
    this.drawingWire.set(null);
  }
}
