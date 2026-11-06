import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { parseLocalDate, startOfDay } from '../../shared/utils/date.utils';

export function notBlank(control: AbstractControl<string | null>): ValidationErrors | null {
  const { value } = control;
  return value && value.trim() === '' ? { blank: true } : null;
}

/**
 * Rejects past due dates, except the date the task already has. Otherwise an overdue
 * task could not be edited at all without also being rescheduled.
 */
export function dueDateNotInPast(existingDueDate?: string): ValidatorFn {
  const existing = existingDueDate ? parseLocalDate(existingDueDate).getTime() : null;

  return (control: AbstractControl<Date | null>): ValidationErrors | null => {
    const { value } = control;
    if (!value) {
      return null;
    }
    const chosen = startOfDay(value).getTime();
    return chosen < startOfDay(new Date()).getTime() && chosen !== existing
      ? { pastDate: true }
      : null;
  };
}

export function notInFuture(control: AbstractControl<Date | null>): ValidationErrors | null {
  const { value } = control;
  return value && startOfDay(value).getTime() > startOfDay(new Date()).getTime()
    ? { futureDate: true }
    : null;
}
