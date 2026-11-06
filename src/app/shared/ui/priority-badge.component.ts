import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TaskPriority } from '../../core/models/task.model';

@Component({
  selector: 'app-priority-badge',
  template: `<span class="visually-hidden">Priority: </span>{{ priority() }}`,
  styles: `
    :host {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    :host(.high) {
      color: var(--color-danger);
      background: var(--color-danger-surface);
    }
    :host(.medium) {
      color: var(--color-warning);
      background: var(--color-warning-surface);
    }
    :host(.low) {
      color: var(--color-low);
      background: var(--color-low-surface);
    }
  `,
  host: { '[class]': 'priority()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityBadgeComponent {
  readonly priority = input.required<TaskPriority>();
}
