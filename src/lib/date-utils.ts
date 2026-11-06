const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from now until `iso`. Negative when the date is in the past. */
export function daysUntil(iso: string, from: Date = new Date()): number {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return Number.NaN;
  const startOfFrom = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const startOfTarget = new Date(
    new Date(target).getFullYear(),
    new Date(target).getMonth(),
    new Date(target).getDate()
  ).getTime();
  return Math.round((startOfTarget - startOfFrom) / MS_PER_DAY);
}

export type DeadlineUrgency = 'danger' | 'warning' | 'neutral';

/** ≤1 day red, ≤3 days amber, further out neutral, past deadlines red. */
export function deadlineUrgency(iso: string, from: Date = new Date()): DeadlineUrgency {
  const days = daysUntil(iso, from);
  if (Number.isNaN(days)) return 'neutral';
  if (days <= 1) return 'danger';
  if (days <= 3) return 'warning';
  return 'neutral';
}

/** "in 3 days" / "tomorrow" / "today" / "2 days overdue" */
export function formatRelativeDeadline(iso: string, from: Date = new Date()): string {
  const days = daysUntil(iso, from);
  if (Number.isNaN(days)) return '';
  if (days < -1) return `${Math.abs(days)} days overdue`;
  if (days === -1) return '1 day overdue';
  if (days === 0) return 'due today';
  if (days === 1) return 'due tomorrow';
  if (days < 7) return `in ${days} days`;
  const weeks = Math.round(days / 7);
  return weeks <= 1 ? 'in 1 week' : `in ${weeks} weeks`;
}

export function formatDeadlineDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Active applications with a deadline inside `withinDays` (used by the filter). */
export function isExpiringSoon(
  deadline: string | null,
  withinDays = 7,
  from: Date = new Date()
): boolean {
  if (!deadline) return false;
  const days = daysUntil(deadline, from);
  return !Number.isNaN(days) && days >= 0 && days <= withinDays;
}
