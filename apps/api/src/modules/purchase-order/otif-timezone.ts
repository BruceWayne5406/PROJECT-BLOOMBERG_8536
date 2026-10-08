/**
 * Dock/need-by and OTIF are calendar dates in the trading-partner timezone.
 * Scoring `timestamptz::date` (UTC) marks an on-time Chicago/Austin evening
 * receipt as the next UTC day — a false late vs the last promise.
 */

export function calendarDateInZone(value: Date | string, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError("Invalid receipt timestamp");
  }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (!year || !month || !day) return date.toISOString().slice(0, 10);
    return `${year}-${month}-${day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function otifOnTimeVsPromise(input: {
  promiseDate: string | null | undefined;
  receiptAt: Date | string | null | undefined;
  timeZone: string;
}): boolean | null {
  if (input.receiptAt == null || input.receiptAt === "") return null;
  if (!input.promiseDate) return false;
  return calendarDateInZone(input.receiptAt, input.timeZone) <= input.promiseDate;
}
