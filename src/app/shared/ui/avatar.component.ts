import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Decorative initials circle. The name is always printed next to it, so it stays hidden. */
@Component({
  selector: 'app-avatar',
  template: `{{ initials() }}`,
  styles: `
    :host {
      display: inline-grid;
      flex: none;
      place-items: center;
      width: var(--avatar-size, 24px);
      height: var(--avatar-size, 24px);
      border-radius: 50%;
      color: #fff;
      background: var(--color-primary);
      font-size: 10px;
      font-weight: 600;
    }
  `,
  host: { 'aria-hidden': 'true' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  readonly initials = input.required<string>();
}
