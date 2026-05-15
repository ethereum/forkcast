const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

const getDateFormatter = (timeZone: string): Intl.DateTimeFormat => {
  let fmt = dateFormatCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    dateFormatCache.set(timeZone, fmt);
  }
  return fmt;
};

const formatDatePartsAsIso = (year: string, month: string, day: string): string => `${year}-${month}-${day}`;

const formatLocalDateAsIso = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return formatDatePartsAsIso(year, month, day);
};

const formatTimeZoneDateAsIso = (date: Date, timeZone: string): string => {
  const parts = getDateFormatter(timeZone).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    return formatLocalDateAsIso(date);
  }

  return formatDatePartsAsIso(year, month, day);
};

export const formatDateInTimeZone = (date: Date, timeZone?: string): string => {
  if (!timeZone) return formatLocalDateAsIso(date);

  return formatTimeZoneDateAsIso(date, timeZone);
};

export const getTodayDateString = (now: Date = new Date(), timeZone?: string): string =>
  formatDateInTimeZone(now, timeZone);

export const getUtcDateString = (date: Date = new Date()): string => date.toISOString().slice(0, 10);

export const isOnOrAfterLocalToday = (
  dateString: string,
  now: Date = new Date(),
  timeZone?: string
): boolean => dateString >= getTodayDateString(now, timeZone);

export const isOnOrAfterUtcToday = (
  dateString: string,
  now: Date = new Date()
): boolean => dateString >= getUtcDateString(now);
