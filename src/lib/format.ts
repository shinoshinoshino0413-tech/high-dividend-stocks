const moneyFormatter = new Intl.NumberFormat("ja-JP", {
  maximumFractionDigits: 2
});

const percentFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export function formatMoney(value: number | null | undefined) {
  if (value == null) return "-";
  return `${moneyFormatter.format(value)}円`;
}

export function formatPercent(value: number | null | undefined) {
  if (value == null) return "-";
  return `${percentFormatter.format(value)}%`;
}

export function formatDateTime(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}
