import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';

export interface TooltipAction {
  id: string;
  label: string;
  icon: string;
  variant?: 'danger' | 'primary' | 'default';
}

export interface TooltipState {
  type: 'gate' | 'wire';
  targetId: string;
  position: { x: number; y: number };
  actions: TooltipAction[];
}

@Component({
  selector: '[app-gate-tooltip]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop to capture dismiss taps -->
    <svg:rect
      x="-50000" y="-50000" width="100000" height="100000"
      fill="transparent"
      (click)="dismiss.emit()"
      (touchend)="dismiss.emit()"
      style="cursor: default;" />

    <svg:foreignObject
      [attr.x]="foX()"
      [attr.y]="foY()"
      [attr.width]="foWidth()"
      height="52">
      <div class="tooltip-container" xmlns="http://www.w3.org/1999/xhtml">
        <div class="tooltip-actions">
          @for (action of state().actions; track action.id) {
            <button
              class="tooltip-btn"
              [class.danger]="action.variant === 'danger'"
              [class.primary]="action.variant === 'primary'"
              [attr.aria-label]="action.label"
              (click)="onAction($event, action.id)"
              (touchend)="onAction($event, action.id)">
              <span class="tooltip-icon">{{ action.icon }}</span>
              <span class="tooltip-label">{{ action.label }}</span>
            </button>
          }
        </div>
        <div class="tooltip-arrow"></div>
      </div>
    </svg:foreignObject>
  `,
  styles: `
    .tooltip-container {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      animation: tooltipIn 0.18s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      pointer-events: auto;
    }

    @keyframes tooltipIn {
      0% {
        opacity: 0;
        transform: scale(0.85) translateY(4px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .tooltip-actions {
      display: flex;
      gap: 2px;
      padding: 4px;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.7);
      border-radius: 10px;
      box-shadow:
        0 4px 16px rgba(31, 38, 135, 0.15),
        0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .tooltip-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      padding: 4px 10px;
      border: none;
      border-radius: 7px;
      background: transparent;
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 44px;
      touch-action: manipulation;

      &:hover,
      &:active {
        background: rgba(99, 102, 241, 0.1);
      }

      &.primary:hover,
      &.primary:active {
        background: rgba(59, 130, 246, 0.15);
      }

      &.danger:hover,
      &.danger:active {
        background: rgba(239, 68, 68, 0.12);
      }
    }

    .tooltip-icon {
      font-size: 16px;
      line-height: 1;
    }

    .tooltip-label {
      font-size: 9px;
      font-weight: 600;
      color: #374151;
      white-space: nowrap;
      letter-spacing: 0.2px;

      .danger & {
        color: #dc2626;
      }

      .primary & {
        color: #2563eb;
      }
    }

    .tooltip-arrow {
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 6px solid rgba(255, 255, 255, 0.92);
      filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05));
    }
  `
})
export class GateTooltipComponent {
  state = input.required<TooltipState>();

  actionSelected = output<string>();
  dismiss = output<void>();

  /**
   * Width of the foreignObject — proportional to actions count
   */
  foWidth = computed(() => {
    const count = this.state().actions.length;
    return Math.max(count * 58, 70);
  });

  /**
   * Center the tooltip above the target position
   */
  foX = computed(() => {
    return this.state().position.x - this.foWidth() / 2;
  });

  foY = computed(() => {
    // Place above the element (element height ~40, tooltip ~52)
    return this.state().position.y - 60;
  });

  onAction(e: Event, actionId: string) {
    e.preventDefault();
    e.stopPropagation();
    this.actionSelected.emit(actionId);
  }
}
