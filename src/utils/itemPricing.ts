export function parseMoneyInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isValidMoneyInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;

  const normalized = trimmed.replace(/[^0-9.]/g, "");
  if (!normalized || normalized === ".") return false;

  const parts = normalized.split(".");
  if (parts.length > 2) return false;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0;
}

export function formatMoneyInput(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

export function formatCalculatedMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0.00";
  return value.toFixed(2);
}

export function calcCostPerUnit(buyingPrice: number, contents: number) {
  if (
    !Number.isFinite(buyingPrice) ||
    buyingPrice <= 0 ||
    !Number.isFinite(contents) ||
    contents <= 0
  ) {
    return 0;
  }

  return buyingPrice / contents;
}

export function calcSuggestedPrice(costPerUnit: number, marginPercent = 40) {
  if (costPerUnit <= 0 || marginPercent >= 100) return 0;
  return costPerUnit / (1 - marginPercent / 100);
}

export function calcFinalMarginPercent(sellingPrice: number, costPerUnit: number) {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - costPerUnit) / sellingPrice) * 100;
}

export function formatFinalMarginPercent(value: number) {
  if (!Number.isFinite(value)) return "0.00%";
  return `${value.toFixed(2)}%`;
}

export function parseContentsInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}
