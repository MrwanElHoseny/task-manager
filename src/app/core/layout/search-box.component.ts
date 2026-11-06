import { ChangeDetectionStrategy, Component, effect, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

const SEARCH_DEBOUNCE_MS = 200;

@Component({
  selector: 'app-search-box',
  imports: [ReactiveFormsModule],
  template: `
    <span class="icon" aria-hidden="true">🔍</span>
    <input
      type="search"
      placeholder="Search tasks..."
      aria-label="Search tasks"
      [formControl]="control"
    />
  `,
  styleUrl: './search-box.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBoxComponent {
  /** Lets the parent push a value in, e.g. when filters are cleared elsewhere. */
  readonly term = input('');
  readonly termChange = output<string>();

  protected readonly control = new FormControl('', { nonNullable: true });

  constructor() {
    effect(() => this.control.setValue(this.term(), { emitEvent: false }));

    this.control.valueChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.termChange.emit(value));
  }
}
