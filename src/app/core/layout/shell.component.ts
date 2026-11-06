import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { map } from 'rxjs';

import { TaskActionsService } from '../../features/task-form/task-actions.service';
import { HeaderComponent } from './header.component';
import { SidebarComponent } from './sidebar.component';

const DRAWER_BREAKPOINT = '(max-width: 959.98px)';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, MatSidenavModule, HeaderComponent, SidebarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  private readonly actions = inject(TaskActionsService);
  private readonly drawer = viewChild.required(MatSidenav);

  protected readonly useDrawer = toSignal(
    inject(BreakpointObserver)
      .observe(DRAWER_BREAKPOINT)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  protected toggleDrawer(): void {
    this.drawer().toggle();
  }

  protected closeDrawerIfOverlay(): void {
    if (this.useDrawer()) {
      this.drawer().close();
    }
  }

  protected newTask(): void {
    this.closeDrawerIfOverlay();
    this.actions.create();
  }

  protected skipToContent(main: HTMLElement): void {
    main.focus();
  }
}
