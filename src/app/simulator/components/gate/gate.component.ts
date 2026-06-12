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
        <svg:text x="20" y="55" text-anchor="middle" font-family="Inter" font-size="10" font-weight="bold" fill="#374151">
          {{ label() }}
        </svg:text>
      } @else {
        <svg:path [attr.d]="gatePath()" fill="#f3f4f6" stroke="#4b5563" stroke-width="2"/>
        <svg:text x="30" y="55" text-anchor="middle" font-family="Inter" font-size="10" font-weight="bold" fill="#374151">
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
  
  pinDown = output<{event: MouseEvent | TouchEvent, pin: Pin}>();
  pinUp = output<{event: MouseEvent | TouchEvent, pin: Pin}>();

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
    if (el.name) return el.name;
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
    const el = this.element() as LogicGate;
    if (el.type !== 'GATE') return 'M 0 0 h 40 a 20 20 0 0 1 20 20 a 20 20 0 0 1 -20 20 h -40 Z';
    
    switch (el.gateType) {
      case 'AND': 
        return 'M 0 0 h 40 a 20 20 0 0 1 20 20 a 20 20 0 0 1 -20 20 h -40 Z';
      case 'NAND':
        // AND shrunk to 50 + bubble
        return 'M 0 0 h 30 a 20 20 0 0 1 20 20 a 5 5 0 1 1 10 0 a 5 5 0 1 1 -10 0 a 20 20 0 0 1 -20 20 h -30 Z';
      case 'OR':
        return 'M 0 0 C 30 0 50 10 60 20 C 50 30 30 40 0 40 C 15 25 15 15 0 0 Z';
      case 'NOR':
        // OR shrunk + bubble
        return 'M 0 0 C 25 0 40 10 50 20 a 5 5 0 1 1 10 0 a 5 5 0 1 1 -10 0 C 40 30 25 40 0 40 C 15 25 15 15 0 0 Z';
      case 'XOR':
        // Extra line + OR
        return 'M -5 0 C 10 15 10 25 -5 40 L -2 40 C 13 25 13 15 -2 0 Z M 5 0 C 35 0 55 10 60 20 C 55 30 35 40 5 40 C 20 25 20 15 5 0 Z';
      case 'XNOR':
        // Extra line + NOR
        return 'M -5 0 C 10 15 10 25 -5 40 L -2 40 C 13 25 13 15 -2 0 Z M 5 0 C 25 0 40 10 50 20 a 5 5 0 1 1 10 0 a 5 5 0 1 1 -10 0 C 40 30 25 40 5 40 C 20 25 20 15 5 0 Z';
      case 'NOT':
        // Triangle + bubble
        return 'M 0 0 L 50 20 a 5 5 0 1 1 10 0 a 5 5 0 1 1 -10 0 L 0 40 Z';
      default:
        return 'M 0 0 h 40 a 20 20 0 0 1 20 20 a 20 20 0 0 1 -20 20 h -40 Z';
    }
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
