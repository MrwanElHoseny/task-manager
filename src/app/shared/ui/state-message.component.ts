import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Centered message for empty and failed states; actions are projected as content. */
@Component({
  selector: 'app-state-message',
  template: `
    <p class="title">{{ title() }}</p>
    @if (detail()) {
      <p class="detail">{{ detail() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: block;
      padding: 48px 16px;
      border-radius: var(--radius-card);
      text-align: center;
      background: var(--color-surface);
      box-shadow: var(--shadow-card);
    }
    .title {
      margin: 0 0 4px;
      font-size: 15px;
      font-weight: 600;
    }
    .detail {
      margin: 0 0 16px;
      color: var(--color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateMessageComponent {
  readonly title = input.required<string>();
  readonly detail = input<string>();
}
