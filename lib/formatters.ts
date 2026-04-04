export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `R ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 100_000) {
    return `R ${(amount / 1_000).toFixed(0)}K`;
  }
  return `R ${amount.toLocaleString("en-ZA")}`;
}

export function formatCurrencyExact(amount: number): string {
  return `R ${amount.toLocaleString("en-ZA")}`;
}

export function formatCPC(amount: number): string {
  return `R${amount.toFixed(2)}`;
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 10_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString("en-ZA");
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatChange(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatPeriodLabel(month: number, year: number): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[month - 1]} ${year}`;
}
