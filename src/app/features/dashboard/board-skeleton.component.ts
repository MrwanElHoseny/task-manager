import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-board-skeleton',
  imports: [SkeletonComponent],
  template: `
    <p class="visually-hidden" role="status">Loading tasks…</p>
    @for (column of columns; track column) {
      <div class="column">
        <app-skeleton class="heading" width="90px" height="16px" />
        @for (card of cards; track card) {
          <div class="card">
            <app-skeleton width="48px" height="18px" />
            <app-skeleton width="70%" />
            <app-skeleton height="12px" />
            <app-skeleton width="40%" height="12px" />
          </div>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
    }
    .column {
      padding: 14px;
      border-radius: var(--radius-card);
      background: var(--color-surface);
      box-shadow: var(--shadow-card);
    }
    .heading {
      margin-bottom: 16px;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 10px;
      padding: 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardSkeletonComponent {
  protected readonly columns = [1, 2, 3];
  protected readonly cards = [1, 2];
}
