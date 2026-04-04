export function calcMoMChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function getDirection(change: number): "up" | "down" | "neutral" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "neutral";
}

export function isInverseMetric(label: string): boolean {
  const inverse = [
    "failed", "abandoned", "reversed", "churn", "cpc",
    "unsubscribed", "lost revenue", "total lost",
  ];
  const lower = label.toLowerCase();
  return inverse.some((term) => lower.includes(term));
}

export function getBadgeColor(direction: "up" | "down" | "neutral", isInverse: boolean) {
  if (direction === "neutral") {
    return { bg: "#F3F4F6", text: "#6B7280" };
  }
  const isPositive = isInverse ? direction === "down" : direction === "up";
  if (isPositive) {
    return { bg: "#ECFDF5", text: "#059669" };
  }
  return { bg: "#FEF2F2", text: "#DC2626" };
}
