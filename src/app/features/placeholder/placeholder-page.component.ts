import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { StateMessageComponent } from '../../shared/ui/state-message.component';

/** Stands in for pages the design shows in the navigation but the brief does not require. */
@Component({
  selector: 'app-placeholder-page',
  imports: [StateMessageComponent],
  template: `
    <h1 class="page-title">{{ heading() }}</h1>
    <app-state-message title="Not built yet" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderPageComponent {
  /** Bound from the route's data. */
  readonly heading = input.required<string>();
}
