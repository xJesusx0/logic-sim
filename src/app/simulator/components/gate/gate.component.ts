import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { PinComponent } from '../pin/pin.component';
import { CircuitElement, Pin, LogicGate, LOGIC_COLORS } from '../../../core';

@Component({
  selector: '[app-gate]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PinComponent],
  template: `
    <svg:g [attr.transform]="transform()" class="gate-group">
      @if (isIO()) {
        <svg:rect x="0" y="0" width="40" height="40" rx="4" [attr.fill]="background()" stroke="#4b5563" stroke-width="2"/>
        <svg:text x="20" y="25" text-anchor="middle" font-family="Inter" font-size="12" font-weight="bold" fill="#374151">
          {{ label() }}
        </svg:text>
      } @else {
        <svg:path [attr.d]="gatePath()" fill="#f3f4f6" stroke="#4b5563" stroke-width="2"/>
        <svg:text x="35" y="25" text-anchor="middle" font-family="Inter" font-size="14" font-weight="bold" fill="#374151">
          {{ label() }}
        </svg:text>
      }

      @for (p of inputs(); track p.id; let i = $index) {
        <svg:g app-pin [pin]="p" [tick]="tick()" 
          [attr.transform]="getPinTransform('IN', i, inputs().length)"
          (pinDown)="pinDown.emit($event)"
          (pinUp)="pinUp.emit($event)">
        </svg:g>
      }
      
      @for (p of outputs(); track p.id; let i = $index) {
        <svg:g app-pin [pin]="p" [tick]="tick()" 
          [attr.transform]="getPinTransform('OUT', i, outputs().length)"
          (pinDown)="pinDown.emit($event)"
          (pinUp)="pinUp.emit($event)">
        </svg:g>
      }
    </svg:g>
  `,
  styles: `
    .gate-group {
      cursor: grab;
    }
    .gate-group:active {
      cursor: grabbing;
    }
  `
})
export class GateComponent {
  element = input.required<CircuitElement>();
  tick = input<number>(0);
  
  pinDown = output<{event: MouseEvent, pin: Pin}>();
  pinUp = output<{event: MouseEvent, pin: Pin}>();

  inputs = computed(() => this.element().inputs);
  outputs = computed(() => this.element().outputs);

  transform = computed(() => {
    this.tick(); // Depend on tick to visually update without object recreation
    const pos = this.element().position || { x: 0, y: 0 };
    return `translate(${pos.x}, ${pos.y})`;
  });

  isIO = computed(() => this.element().type === 'INPUT' || this.element().type === 'OUTPUT');
  
  label = computed(() => {
    this.tick();
    const el = this.element();
    if (el.type === 'GATE') return (el as LogicGate).gateType;
    if (el.type === 'INPUT') return (el as any).outputs[0].value;
    if (el.type === 'OUTPUT') return 'LED';
    return el.type;
  });

  background = computed(() => {
    this.tick();
    const el = this.element();
    if (el.type === 'OUTPUT') {
      const val = (el as any).colorState;
      if (val === '1') return LOGIC_COLORS.LED_1;
      if (val === '0') return LOGIC_COLORS.LED_0;
      if (val === 'X') return LOGIC_COLORS.LED_X;
      if (val === 'Z') return LOGIC_COLORS.LED_Z;
    }
    return '#f3f4f6';
  });

  gatePath = computed(() => {
    // Generico D-shape logic gate
    return 'M 0 0 h 40 a 20 20 0 0 1 20 20 a 20 20 0 0 1 -20 20 h -40 Z';
  });

  getPinTransform(dir: 'IN'|'OUT', index: number, total: number) {
    const isIO = this.isIO();
    const height = 40; 
    const width = isIO ? 40 : 60;
    
    const spacing = height / (total + 1);
    const y = spacing * (index + 1);
    const x = dir === 'IN' ? 0 : width;
    
    return `translate(${x}, ${y})`;
  }
}
