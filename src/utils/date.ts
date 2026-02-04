import { format, parseISO, isBefore, startOfDay, isToday, isValid } from 'date-fns';

/**
 * Safely parses an ISO date string, returning null if parsing fails or the result is invalid.
 * Handles both 'yyyy-MM-dd' format and full ISO timestamps with time components.
 */
export const safeParseISO = (dateString: string): Date | null => {
  try {
    const parsed = parseISO(dateString);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Formats a date string to 'MMM d, yyyy' format (e.g., "Jan 15, 2024").
 * Returns empty string for null, undefined, or invalid date strings.
 */
export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '';
  const parsed = safeParseISO(date);
  if (!parsed) return '';
  return format(parsed, 'MMM d, yyyy');
};

/**
 * Formats a date string to 'MMM d' format (e.g., "Jan 15").
 * Returns empty string for null, undefined, or invalid date strings.
 */
export const formatDateShort = (date: string | null | undefined): string => {
  if (!date) return '';
  const parsed = safeParseISO(date);
  if (!parsed) return '';
  return format(parsed, 'MMM d');
};

/**
 * Checks if a due date is in the past (before today).
 * Returns false for null, undefined, or invalid date strings.
 */
export const isPastDue = (dueDate: string | null | undefined): boolean => {
  if (!dueDate) return false;
  const parsed = safeParseISO(dueDate);
  if (!parsed) return false;
  const due = startOfDay(parsed);
  const today = startOfDay(new Date());
  return isBefore(due, today);
};

/**
 * Checks if a date string represents today's date.
 * Returns false for null, undefined, or invalid date strings.
 */
export const isDateToday = (date: string | null | undefined): boolean => {
  if (!date) return false;
  const parsed = safeParseISO(date);
  if (!parsed) return false;
  return isToday(parsed);
};

/**
 * Converts a Date object to an ISO date string in 'yyyy-MM-dd' format.
 * This normalizes both Date objects and ISO timestamps to a consistent format
 * suitable for date comparisons (without time components).
 */
export const toISODateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

/**
 * Normalizes any date input (Date object or ISO string) to 'yyyy-MM-dd' format.
 * Returns empty string for invalid inputs.
 * Use this to ensure consistent date format for comparisons.
 */
export const normalizeDateString = (date: Date | string | null | undefined): string => {
  if (!date) return '';

  if (date instanceof Date) {
    return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
  }

  const parsed = safeParseISO(date);
  return parsed ? format(parsed, 'yyyy-MM-dd') : '';
};
