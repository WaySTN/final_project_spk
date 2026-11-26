const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const intFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

export function formatIdr(amount: number): string {
  if (!Number.isFinite(amount)) return "-";
  return idrFormatter.format(Math.round(amount));
}

export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return intFormatter.format(Math.round(value));
}

export function formatDecimal(value: number, digits = 6): string {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatWeightPercent(weight: number, digits = 2): string {
  if (!Number.isFinite(weight)) return "-";
  return `${formatDecimal(weight * 100, digits)}%`;
}

export function formatDateJakarta(input: string | Date | null | undefined): string {
  if (!input) return "-";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return String(input);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTimeJakarta(input: string | Date | null | undefined): string {
  if (!input) return "-";
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return String(input);
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date) + " WIB"
  );
}

export function isSafeHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Natural numeric comparator for non-contiguous alternative codes (A1, A2, ..., A10, ..., A42).
 * Preserves original code numbers without lexicographical misordering (e.g. A10 before A2).
 */
export function compareAlternativeCodes(a: string, b: string): number {
  const ma = /^([A-Za-z]+)(\d+)$/.exec(a.trim());
  const mb = /^([A-Za-z]+)(\d+)$/.exec(b.trim());
  if (ma && mb && ma[1]!.toUpperCase() === mb[1]!.toUpperCase()) {
    return Number(ma[2]) - Number(mb[2]);
  }
  return a.localeCompare(b, "en", { numeric: true });
}

export function formatRelativeDeltaPercent(delta: number): string {
  if (!Number.isFinite(delta) || Math.abs(delta) < 1e-12) return "Baseline";
  const pct = Math.round(delta * 100);
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

export function formatBatteryValue(
  item: { batteryWh: number | null; batteryHours: number | null },
  c6Metric: "battery_wh" | "battery_hours" = "battery_wh",
): string {
  if (c6Metric === "battery_hours") {
    if (item.batteryHours !== null && Number.isFinite(item.batteryHours)) {
      return `${formatDecimal(item.batteryHours, 1)} jam`;
    }
    return "-";
  }
  if (item.batteryWh !== null && Number.isFinite(item.batteryWh)) {
    const digits = Number.isInteger(item.batteryWh) ? 0 : 2;
    return `${formatDecimal(item.batteryWh, digits)} Wh`;
  }
  return "-";
}
