import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { formatTimeAgo } from '../../shared/utils/date.utils';
import { describeActivity } from '../../shared/utils/task.utils';
import { Activity } from '../models/activity.model';

@Component({
  selector: 'app-activity-panel',
  imports: [MatButtonModule],
  templateUrl: './activity-panel.component.html',
  styleUrl: './activity-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityPanelComponent {
  readonly activities = input.required<Activity[]>();
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly retry = output();

  protected readonly describe = describeActivity;
  protected readonly timeAgo = formatTimeAgo;
}
