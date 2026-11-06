import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchBoxComponent } from './search-box.component';

describe('SearchBoxComponent', () => {
  let fixture: ComponentFixture<SearchBoxComponent>;
  let emitted: string[];

  const input = (): HTMLInputElement => fixture.nativeElement.querySelector('input');

  function type(value: string): void {
    input().value = value;
    input().dispatchEvent(new Event('input'));
  }

  beforeEach(() => {
    vi.useFakeTimers();
    fixture = TestBed.createComponent(SearchBoxComponent);
    emitted = [];
    fixture.componentInstance.termChange.subscribe((term) => emitted.push(term));
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  it('waits for typing to pause, then emits only the final value', () => {
    type('b');
    type('bu');
    type('bud');
    expect(emitted).toEqual([]);

    vi.advanceTimersByTime(200);

    expect(emitted).toEqual(['bud']);
  });

  it('does not emit again for an unchanged value', () => {
    type('bud');
    vi.advanceTimersByTime(200);
    type('budg');
    type('bud');
    vi.advanceTimersByTime(200);

    expect(emitted).toEqual(['bud']);
  });

  it('reflects a value pushed in from outside without echoing it back', () => {
    fixture.componentRef.setInput('term', 'from parent');
    fixture.detectChanges();
    vi.advanceTimersByTime(200);

    expect(input().value).toBe('from parent');
    expect(emitted).toEqual([]);
  });

  it('stops listening once destroyed', () => {
    type('bud');
    fixture.destroy();
    vi.advanceTimersByTime(200);

    expect(emitted).toEqual([]);
  });
});
