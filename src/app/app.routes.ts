import { Routes } from '@angular/router';

import { ShellComponent } from './core/layout/shell.component';

const loadPlaceholder = () =>
  import('./features/placeholder/placeholder-page.component').then(
    (m) => m.PlaceholderPageComponent,
  );

export const routes: Routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard | Task Manager',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then(
            (m) => m.DashboardPageComponent,
          ),
      },
      {
        path: 'tasks',
        title: 'Tasks | Task Manager',
        loadComponent: () =>
          import('./features/tasks/tasks-page.component').then((m) => m.TasksPageComponent),
      },
      {
        path: 'calendar',
        title: 'Calendar | Task Manager',
        data: { heading: 'Calendar' },
        loadComponent: loadPlaceholder,
      },
      {
        path: 'analytics',
        title: 'Analytics | Task Manager',
        loadComponent: () =>
          import('./features/analytics/analytics-page.component').then(
            (m) => m.AnalyticsPageComponent,
          ),
      },
      {
        path: 'team',
        title: 'Team | Task Manager',
        loadComponent: () =>
          import('./features/team/team-page.component').then((m) => m.TeamPageComponent),
      },
      {
        path: 'settings',
        title: 'Settings | Task Manager',
        data: { heading: 'Settings' },
        loadComponent: loadPlaceholder,
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
