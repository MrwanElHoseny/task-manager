# Task Manager

A task management dashboard built with Angular 21: a drag-and-drop board, a sortable task table, a team workload view and an activity feed, running against a JSON Server mock API.

## Setup

Requires Node 22.12+ or 24+ (`.nvmrc` pins 24).

```bash
npm install
npm start
```

`npm start` builds the mock database if it doesn't exist, then runs the API on port 3000 and the app on <http://localhost:4200>.

> **Path note:** `ng test` finds no specs if the absolute project path contains parentheses, such as `Senior Front End Test (Angular)`. The Angular test builder passes absolute paths to Vitest as globs, and parentheses are glob syntax. Clone or move the project to a path without them.

### Scripts

| Script                  | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `npm start`             | API and app together                                      |
| `npm run web`           | App only                                                  |
| `npm run api`           | Mock API only                                             |
| `npm run build`         | Production build                                          |
| `npm test`              | Unit and integration tests, once                          |
| `npm run test:watch`    | Tests in watch mode                                       |
| `npm run test:coverage` | Tests with coverage; fails below 80%                      |
| `npm run lint`          | ESLint                                                    |
| `npm run format`        | Prettier                                                  |
| `npm run data:reset`    | Regenerates the data with fresh dates and rebuilds the db |

### Configuration

Settings live in `src/environments/environment.ts`:

| Setting      | Default | Purpose                                                                           |
| ------------ | ------- | --------------------------------------------------------------------------------- |
| `apiBaseUrl` | `/api`  | Base URL for API calls; `proxy.conf.json` forwards it to port 3000 in development |
| `cacheTtlMs` | `60000` | How long GET responses stay in the HTTP cache                                     |

### Mock data

`data-fetching/generate-data.js` is the script supplied with the assignment, unchanged. It writes `tasks.json` and `statistics.json`, which are committed. `scripts/build-db.mjs` combines them into `mock-api/db.json`, adding users, seeded activity and a board `order` for each task. That file is gitignored because JSON Server rewrites it on every change.

Changes persist across reloads. Run `npm run data:reset` to start over.

## Architecture

```
src/app/
  core/       models, API services, HTTP interceptors, app shell
  state/      signal stores shared across pages
  shared/     presentational components and pure utilities
  features/   lazily loaded pages, plus the task form
  testing/    spec fixtures
```

Dependencies point one way: `features` use `state` and `shared`, and everything can use `core` models. The one exception is the shell, which opens the task form through `TaskActionsService` for the sidebar's New Task button.

**Smart and presentational components.** Pages such as `DashboardPageComponent` inject stores and services. `TaskBoardComponent`, `TaskColumnComponent`, `TaskCardComponent`, `StatCardComponent` and `FilterBarComponent` only use inputs and outputs, so they can be tested without HTTP.

**Who does what when a task changes:**

- `TaskApiService` makes the HTTP call.
- `TaskStore` holds the state and decides how a change affects it.
- `TaskActionsService` handles the user-facing side: dialogs, confirmations and snackbars.

### State management

State is plain signals in root services. NgRx would be more ceremony than an app with one main collection needs.

- **`TaskStore`** owns the task list and derives filtered tasks, board columns and counts with `computed()`.
- **`TaskFiltersService`** holds filter state. It's a root service because the search box is in the header, outside the routed pages. The filter bar binds to its signals directly using two-way `model()` bindings.
- **`ActivityStore`** owns the feed.

### Reading and writing data

Reads use `httpResource`, including its loading and error signals. Writes use `HttpClient`, because `httpResource` is read-only by design. After a write, the store updates the resource's local value instead of refetching.

`httpResource` is still marked experimental in Angular 21. I used it because the brief asks for it; its API could change in a later version.

`resource.value()` throws while a resource is in an error state, so stores read it through `hasValue()`. Otherwise a single failed request would crash every template that depends on it.

### HTTP interceptors

They run in this order: cache, error, retry.

- **Cache:** serves repeat GETs from memory until the TTL expires. A successful write drops that URL and its parent collection, so a `PATCH /tasks/42` also invalidates `/tasks`. Failed responses and failed writes leave the cache alone. It matters most for `/users` and `/statistics`, which pages fetch again on each visit.
- **Error:** turns `HttpErrorResponse` into a typed `ApiError` with a message that's safe to show, so components never inspect HTTP details.
- **Retry:** retries GETs twice with exponential backoff, only on status 0 or 5xx. It sits closest to the network so the error interceptor only sees the final failure. Writes are never retried, because a POST that timed out may already have been applied.

### Decisions worth explaining

**Stat values are calculated, not read from `/statistics`.** The supplied statistics say 156 total tasks, but the supplied data has 17, and static numbers wouldn't react to changes. Values come from the task list so they update after every change. Title, icon and trend text ("+12 this week") come from the API, so **the trend text is static mock data**. As a result the dashboard shows 17 where the Figma shows 156.

**Overdue is calculated from `dueDate` and status.** The stored `isOverdue` is missing on most records and goes stale as time passes, so `build-db.mjs` strips it.

**Due dates are parsed as local dates.** `new Date('2025-01-15')` means UTC midnight, which is the previous day in any time zone behind UTC. `parseLocalDate` avoids that.

**Drag and drop uses fractional ordering.** A dropped card takes the midpoint of its neighbours' `order`, so a move is a single PATCH rather than a rewrite of the column. It's optimistic: the board updates immediately and rolls back that one task with a snackbar if the save fails.

**Dialog closing is handled by the form.** Dialogs open with `disableClose`, and the form listens for backdrop clicks and Escape itself, so it can ask before discarding unsaved changes.

**An overdue task can be edited without rescheduling it.** `dueDateNotInPast` accepts the date the task already has. Without that, fixing a typo in an overdue task's title would force a new due date.

**Emoji icons.** The design and `statistics.json` both use emoji, so I kept them instead of loading an icon font. They're `aria-hidden`, with text labels beside them. They do render slightly differently per operating system.

## Forms

The task form is a typed Reactive Form in a dialog.

- **Custom validators:** `notBlank`, `dueDateNotInPast`, `notInFuture`.
- **Dynamic controls:** `completedAt` is added only while the status is Done, and tags are a `FormArray` behind a chip input.
- **State and errors:** Save is blocked while pending, field errors appear on submit along with focus moving to the first invalid field, and server errors show inside the dialog without losing the user's input.

## Performance

- `OnPush` on every component, enforced by ESLint, and the app runs zoneless (the Angular 21 default).
- Every page is a lazy route. The task form is loaded with a dynamic import the first time it's opened, because the datepicker and chips are its heaviest dependencies.
- `@for` tracks by id, and `mat-table` uses `trackBy`.
- Subscriptions end through `takeUntilDestroyed` or complete on their own, as one-shot HTTP calls do.
- The font is self-hosted, so there's no external font request.
- Initial bundle: about 147 kB transferred, measured from the production build.

## Accessibility and responsive design

- Landmarks, a skip link, labelled icon buttons, visible focus and `aria-pressed` on the status filter. ESLint's template accessibility rules are on.
- CDK drag and drop isn't keyboard accessible, so every card's menu also offers "Move to…".
- Animations respect `prefers-reduced-motion`.
- Below 1200px: stats go 2×2 and the board scrolls horizontally. Below 960px: the sidebar becomes a drawer. Below 768px: the table hides secondary columns. Below 600px: the board is one column and the task form is full screen.

This has not had a formal WCAG audit or screen reader testing.

## Testing

Vitest with TestBed and `HttpTestingController`. The 80% coverage threshold is set in `angular.json`.

| Layer                                    | Approach                                                          |
| ---------------------------------------- | ----------------------------------------------------------------- |
| Utilities, validators                    | Plain unit tests, including date and time zone edge cases         |
| Interceptors                             | Real `HttpClient` with a fake backend and fake timers for backoff |
| Stores                                   | Real `httpResource` against a fake backend, including rollback    |
| Presentational components                | Inputs in, DOM and outputs checked                                |
| `DashboardPageComponent` and other pages | Integration tests: real stores, only HTTP faked                   |
| Routes                                   | Each lazy route loads and redirects work                          |

Dragging isn't simulated in the specs; they call the column's drop handler with a drop event. The real drag was checked by hand in a browser.

## Code quality

ESLint uses `angular-eslint`'s recommended and template accessibility rules, plus required `OnPush` and class suffixes. Prettier handles formatting. A Husky pre-commit hook runs both on staged files through `lint-staged`. Husky installs its hook during `npm install`, so that needs to run after `git init`.

## Known limitations

- **Task analytics charts are not built.** The Analytics page is intentionally empty for now, so the brief's charts by priority and status are still outstanding.
- **Calendar and Settings** are labelled placeholders. They're in the design's navigation but not in the brief.
- **Trend text on the stat cards** is static mock data.
- **No authentication.** The signed-in user is hard-coded to John Doe, and the client writes `createdAt`, `updatedAt` and activity entries that a real backend would own.
- **Activity is a separate POST** after each change, not part of the same transaction. A failed POST loses that feed entry but keeps the change.
- **Fractional order can run out of precision** after many drops into the same gap. A real backend would renumber the column.
- **Filters aren't in the URL,** so a filtered view can't be shared or bookmarked.
- **"Overdue" is calculated when tasks change,** so a tab left open past midnight stays out of date until the next change or reload.
- **Design values** were taken from Figma screenshots, not from Dev Mode, so exact spacing may differ slightly. The green hover on Done cards is an assumption, since it wasn't fully visible.

## Future improvements

- Build the analytics charts, with Chart.js loaded only in the Analytics chunk.
- Sync filters to query parameters.
- Add end-to-end tests with Playwright for drag and drop.
- Add CI, a container setup, and translations.
