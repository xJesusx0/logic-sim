import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { Pin, LOGIC_COLORS } from '../../../core';

@Component({
  selector: '[app-pin]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- [attr.cx] and [attr.cy] are provided via SVG transform of the parent <g> wrapper -->
    <svg:circle
      [attr.r]="radius()"
      [attr.fill]="color()"
      stroke="#1f2937"
      stroke-width="1.5"
      class="pin"
      (mousedown)="onMouseDown($event)"
      (mouseup)="onMouseUp($event)"
      (touchstart)="onTouchStart($event)"
      (touchend)="onTouchEnd($event)"
    />
  `,
  styles: `
    .pin {
      cursor: crosshair;
      transition: r 0.2s;
    }
    .pin:hover {
      r: 6px;
    }
  `
})
export class PinComponent {
  pin = input.required<Pin>();
  tick = input<number>(0);
  
  radius = input<number>(4);

  color = computed(() => {
    // Al incluir tick() nos aseguramos que el compute corra cada tick
    this.tick(); 
    const val = this.pin().value;
    switch(val) {
      case '1': return LOGIC_COLORS.STATE_1; 
      case '0': return LOGIC_COLORS.STATE_0; 
      case 'Z': return LOGIC_COLORS.STATE_Z; 
      case 'X': return LOGIC_COLORS.STATE_X; 
      default: return LOGIC_COLORS.DEFAULT;
    }
  });

  pinDown = output<{event: MouseEvent | TouchEvent, pin: Pin}>();
  pinUp = output<{event: MouseEvent | TouchEvent, pin: Pin}>();

  onMouseDown(e: MouseEvent) {
    e.stopPropagation();
    this.pinDown.emit({event: e, pin: this.pin()});
  }

  onMouseUp(e: MouseEvent) {
    e.stopPropagation();
    this.pinUp.emit({event: e, pin: this.pin()});
  }

  onTouchStart(e: TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.pinDown.emit({event: e, pin: this.pin()});
  }

  onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.pinUp.emit({event: e, pin: this.pin()});
  }
}
