import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-analytics-page',
  template: `<h1 class="page-title">Analytics</h1>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPageComponent {}
