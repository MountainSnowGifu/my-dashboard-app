export function formatCurrency(
  amount: number,
  currency = 'JPY',
  locale = 'ja-JP',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount);
}

export function formatNumber(value: number, locale = 'ja-JP'): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(value: number, locale = 'ja-JP'): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
