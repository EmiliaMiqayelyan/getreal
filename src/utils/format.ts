export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatPricePerUnit(price: number, unit: string): string {
  return `${formatCurrency(price)} / ${unit}`;
}
