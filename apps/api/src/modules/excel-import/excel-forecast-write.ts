/**
 * Portal republish is POST /forecasts/:id/versions (append-only).
 * Excel was calling publish() for every forecasts-sheet row, so FC-88421
 * either 409'd or — if forecast_id was omitted — created a second live
 * demand line that could be committed and converted independently.
 *
 * An incoming forecast_id that already exists must follow the same
 * append-only path. Do not match on part/date; empty cells are not guessed.
 */
export type ExcelForecastWrite =
  | { mode: "publish" }
  | { mode: "republish" }
  | { mode: "reject"; message: string };

export function resolveExcelForecastWrite(
  incomingForecastId: string | undefined,
  existing: { buyerId: string } | null,
  sessionBuyerId: string | null,
): ExcelForecastWrite {
  if (!incomingForecastId || !existing) return { mode: "publish" };
  if (!sessionBuyerId || existing.buyerId !== sessionBuyerId) {
    return {
      mode: "reject",
      message: `${incomingForecastId} belongs to another buying partner`,
    };
  }
  return { mode: "republish" };
}
