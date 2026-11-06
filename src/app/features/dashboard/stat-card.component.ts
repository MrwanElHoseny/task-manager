import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Statistic } from '../../core/models/statistic.model';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-stat-card',
  imports: [SkeletonComponent],
  template: `
    <h2 class="title">
      <span aria-hidden="true">{{ stat().icon }}</span>
      {{ stat().title }}
    </h2>
    @if (loading()) {
      <app-skeleton class="value-skeleton" width="56px" height="28px" />
      <app-skeleton width="80px" height="12px" />
    } @else {
      <p class="value">{{ stat().value }}</p>
      <p class="change" [class]="'change--' + stat().changeType">{{ changeText() }}</p>
    }
  `,
  styleUrl: './stat-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  readonly stat = input.required<Statistic>();
  readonly loading = input(false);

  protected readonly changeText = computed(() => {
    const { change, changeLabel } = this.stat();
    return change === '0' ? changeLabel : `${change} ${changeLabel}`.trim();
  });
}
