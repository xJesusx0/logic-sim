import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Wire, LOGIC_COLORS } from '../../../core';

@Component({
  selector: '[app-wire]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Hitbox for easier selection -->
    <svg:path 
      [attr.d]="pathData()" 
      fill="none" 
      stroke="transparent" 
      stroke-width="15" 
      style="cursor: pointer;" />
      
    <svg:path 
      [attr.d]="pathData()" 
      fill="none" 
      [attr.stroke]="color()" 
      stroke-width="2.5" 
      class="wire" />
  `,
  styles: `
    .wire {
      transition: stroke 0.1s;
    }
  `
})
export class WireComponent {
  wire = input.required<Wire>();
  tick = input<number>(0);
  
  // The board calculates the SVG coordinates
  pathData = input.required<string>();

  color = computed(() => {
    this.tick(); 
    const val = this.wire().value;
    switch(val) {
      case '1': return LOGIC_COLORS.STATE_1;
      case '0': return LOGIC_COLORS.STATE_0;
      case 'Z': return LOGIC_COLORS.STATE_Z;
      case 'X': return LOGIC_COLORS.STATE_X;
      default: return LOGIC_COLORS.DEFAULT;
    }
  });
}
