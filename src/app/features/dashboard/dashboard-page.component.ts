import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { API_BASE_URL } from '../../core/api/api-base-url.token';
import { usersResource } from '../../core/api/users.resource';
import { errorMessage } from '../../core/http/api-error';
import { Statistic, StatisticsResponse } from '../../core/models/statistic.model';
import { FilterBarComponent } from '../../shared/ui/filter-bar.component';
import { StateMessageComponent } from '../../shared/ui/state-message.component';
import { TaskFiltersService } from '../../state/task-filters.service';
import { TaskStore } from '../../state/task.store';
import { TaskActionsService } from '../task-form/task-actions.service';
import { BoardSkeletonComponent } from './board-skeleton.component';
import { StatCardComponent } from './stat-card.component';
import { TaskBoardComponent } from './task-board.component';

const CARD_DEFAULTS: readonly Omit<Statistic, 'value'>[] = [
  { id: 'stat-001', title: 'Total Tasks', icon: '📊' },
  { id: 'stat-002', title: 'Completed', icon: '✅' },
  { id: 'stat-003', title: 'In Progress', icon: '🔄' },
  { id: 'stat-004', title: 'Overdue', icon: '⚠️' },
].map((card) => ({
  ...card,
  change: '0',
  changeLabel: '',
  changeType: 'neutral',
  color: '',
}));

@Component({
  selector: 'app-dashboard-page',
  imports: [
    MatButtonModule,
    BoardSkeletonComponent,
    FilterBarComponent,
    StatCardComponent,
    StateMessageComponent,
    TaskBoardComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly usersRef = usersResource();
  private readonly statistics = httpResource<StatisticsResponse>(
    () => `${this.baseUrl}/statistics`,
  );

  protected readonly store = inject(TaskStore);
  protected readonly filters = inject(TaskFiltersService);
  protected readonly actions = inject(TaskActionsService);

  protected readonly users = computed(() =>
    this.usersRef.hasValue() ? this.usersRef.value() : [],
  );

  protected readonly loadError = computed(() => {
    const error = this.store.error();
    return error ? errorMessage(error) : null;
  });

  /**
   * Counts come from the task list so they follow every create, move and delete. The
   * statistics endpoint only supplies the trend text, and the cards still work without it.
   */
  protected readonly stats = computed<Statistic[]>(() => {
    const { total, completed, inProgress, overdue } = this.store.counts();
    const values = [total, completed, inProgress, overdue];
    const trends = this.statistics.hasValue() ? this.statistics.value().statistics : [];

    return CARD_DEFAULTS.map((card, index) => ({
      ...card,
      ...trends.find((trend) => trend.id === card.id),
      value: values[index],
    }));
  });

  protected readonly noMatches = computed(
    () => this.filters.hasActiveFilters() && this.store.filteredTasks().length === 0,
  );
}
