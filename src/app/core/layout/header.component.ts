import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink } from '@angular/router';

import { ActivityStore } from '../../state/activity.store';
import { TaskFiltersService } from '../../state/task-filters.service';
import { errorMessage } from '../http/api-error';
import { ActivityPanelComponent } from './activity-panel.component';
import { SearchBoxComponent } from './search-box.component';

const PAGES_WITH_TASK_RESULTS = ['/dashboard', '/tasks'];

@Component({
  selector: 'app-header',
  imports: [
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MatButtonModule,
    RouterLink,
    ActivityPanelComponent,
    SearchBoxComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  private readonly router = inject(Router);

  protected readonly filters = inject(TaskFiltersService);
  protected readonly activity = inject(ActivityStore);

  readonly showMenuButton = input(false);
  readonly menuToggle = output();

  protected readonly panelOpen = signal(false);
  protected readonly panelPositions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  ];

  protected readonly activityError = computed(() => {
    const error = this.activity.error();
    return error ? errorMessage(error) : null;
  });

  protected onSearch(term: string): void {
    this.filters.search.set(term);

    // Results only show on some pages, so typing elsewhere must take the user to them.
    const showsResults = PAGES_WITH_TASK_RESULTS.some((page) => this.router.url.startsWith(page));
    if (term && !showsResults) {
      this.router.navigateByUrl('/dashboard');
    }
  }
}
