export function formatQty(qty: string | number) {
  return Number(qty).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatNeedBy(value: string) {
  if (value === "dock_date") return "dock date";
  if (value === "ship_date") return "ship date";
  if (value === "wafer_start_week") return "wafer-start week";
  return value;
}

export function signedDelta(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (Number.isNaN(n) || n === 0) return formatQty(n);
  const formatted = formatQty(Math.abs(n));
  return n > 0 ? `+${formatted}` : `−${formatted}`;
}
