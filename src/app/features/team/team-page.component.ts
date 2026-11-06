import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { usersResource } from '../../core/api/users.resource';
import { errorMessage } from '../../core/http/api-error';
import { User } from '../../core/models/user.model';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';
import { StateMessageComponent } from '../../shared/ui/state-message.component';
import { isOverdue } from '../../shared/utils/task.utils';
import { TaskStore } from '../../state/task.store';

interface TeamMember extends User {
  open: number;
  overdue: number;
  done: number;
}

@Component({
  selector: 'app-team-page',
  imports: [MatButtonModule, AvatarComponent, SkeletonComponent, StateMessageComponent],
  templateUrl: './team-page.component.html',
  styleUrl: './team-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPageComponent {
  private readonly store = inject(TaskStore);

  protected readonly users = usersResource();
  protected readonly skeletonCards = [1, 2, 3, 4];

  protected readonly loadError = computed(() => {
    const error = this.users.error();
    return error ? errorMessage(error) : null;
  });

  protected readonly members = computed<TeamMember[]>(() => {
    const users = this.users.hasValue() ? this.users.value() : [];
    const tasks = this.store.tasks();

    return users.map((user) => {
      const assigned = tasks.filter((task) => task.assignee.id === user.id);
      const done = assigned.filter((task) => task.status === 'done').length;
      return {
        ...user,
        done,
        open: assigned.length - done,
        overdue: assigned.filter((task) => isOverdue(task)).length,
      };
    });
  });
}
