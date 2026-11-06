import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { toIsoDate } from '../../shared/utils/date.utils';
import { dueDateNotInPast, notBlank, notInFuture } from './task-form.validators';

const daysFromNow = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

describe('notBlank', () => {
  it('rejects whitespace', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ blank: true });
  });

  it('accepts text, and leaves empty values to Validators.required', () => {
    expect(notBlank(new FormControl('Title'))).toBeNull();
    expect(notBlank(new FormControl(''))).toBeNull();
  });
});

describe('dueDateNotInPast', () => {
  const validator = dueDateNotInPast();

  it('rejects past dates', () => {
    expect(validator(new FormControl(daysFromNow(-1)))).toEqual({ pastDate: true });
  });

  it('accepts today and later', () => {
    expect(validator(new FormControl(new Date()))).toBeNull();
    expect(validator(new FormControl(daysFromNow(3)))).toBeNull();
  });

  it('leaves empty values to Validators.required', () => {
    expect(validator(new FormControl(null))).toBeNull();
  });

  it('lets an overdue task keep the date it already has', () => {
    const existing = daysFromNow(-5);
    const editing = dueDateNotInPast(toIsoDate(existing));

    expect(editing(new FormControl(existing))).toBeNull();
    expect(editing(new FormControl(daysFromNow(-4)))).toEqual({ pastDate: true });
  });
});

describe('notInFuture', () => {
  it('rejects future dates only', () => {
    expect(notInFuture(new FormControl(daysFromNow(1)))).toEqual({ futureDate: true });
    expect(notInFuture(new FormControl(new Date()))).toBeNull();
    expect(notInFuture(new FormControl(null))).toBeNull();
  });
});
