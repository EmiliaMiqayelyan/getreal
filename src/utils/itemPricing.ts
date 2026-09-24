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

/** Pieces / contents - digits only. */
export function parseContentsInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Case weight and similar decimal quantities. */
export function parseDecimalInput(value: string) {
  const normalized = value.replace(/[^0-9.]/g, "");
  if (!normalized || normalized === ".") return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isValidPositiveDecimalInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parsed = parseDecimalInput(trimmed);
  return parsed > 0;
}

/** Unit sourced by lb: (oz / 16) × price per lb. */
export function calcCostPerPieceFromLb(
  pricePerLb: number,
  pieceWeightOz: number,
) {
  if (
    !Number.isFinite(pricePerLb) ||
    pricePerLb <= 0 ||
    !Number.isFinite(pieceWeightOz) ||
    pieceWeightOz <= 0
  ) {
    return 0;
  }

  return (pieceWeightOz / 16) * pricePerLb;
}

/** Case by lbs: case price ÷ total case weight. */
export function calcCostPerLbFromCase(
  casePrice: number,
  caseWeightLbs: number,
) {
  if (
    !Number.isFinite(casePrice) ||
    casePrice <= 0 ||
    !Number.isFinite(caseWeightLbs) ||
    caseWeightLbs <= 0
  ) {
    return 0;
  }

  return casePrice / caseWeightLbs;
}

/** Case price ÷ pieces per case (also used as cost per piece). */
export function calcCostPerPieceFromCase(
  casePrice: number,
  piecesPerCase: number,
) {
  if (
    !Number.isFinite(casePrice) ||
    casePrice <= 0 ||
    !Number.isFinite(piecesPerCase) ||
    piecesPerCase <= 0
  ) {
    return 0;
  }

  return casePrice / piecesPerCase;
}

/** @deprecated Prefer calcCostPerPieceFromCase - kept for older call sites. */
export function calcCostPerUnit(buyingPrice: number, contents: number) {
  return calcCostPerPieceFromCase(buyingPrice, contents);
}

/**
 * 40% margin suggested price in the Figma prototype is markup on cost:
 * cost × (1 + 40/100).
 */
export function calcSuggestedPrice(costPerPiece: number, marginPercent = 40) {
  if (costPerPiece <= 0 || marginPercent < 0) return 0;
  return costPerPiece * (1 + marginPercent / 100);
}

/**
 * Final margin in the Figma prototype is markup % on cost:
 * ((sell − cost) ÷ cost) × 100.
 */
export function calcFinalMarginPercent(
  sellingPrice: number,
  costPerPiece: number,
) {
  if (costPerPiece <= 0) return 0;
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) return 0;
  return ((sellingPrice - costPerPiece) / costPerPiece) * 100;
}

export function formatFinalMarginPercent(value: number) {
  if (!Number.isFinite(value)) return "0.00%";
  return `${value.toFixed(2)}%`;
}

function formulaAmount(value: number, forceDecimals = false) {
  if (!Number.isFinite(value)) return "$ 0.00";
  const rounded = Math.round(value * 100) / 100;
  const text =
    !forceDecimals && Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(2);
  return `$ ${text}`;
}

/** Live formula captions from the pricing prototype. */
export function pricingFormulaLines(
  input: PricingInputs & { costPerLb: number; costPerPiece: number },
) {
  if (input.sourcePer === "Unit") {
    const ounces = input.pieceWeightOz > 0 ? input.pieceWeightOz : 0;
    return [
      `Cost per piece = (Piece weight)/16 × Price per lb (e.g. ${ounces} / 16 × ${formulaAmount(input.buyingPrice)} = ${formulaAmount(input.costPerPiece, true)} )`,
    ];
  }

  if (input.sourcePer === "Case" && input.caseBy === "Lbs / case") {
    return [
      `Cost per lb = Case price ÷ Total case weight (${formulaAmount(input.buyingPrice)} ÷ ${input.caseWeightLbs || 0} lbs = ${formulaAmount(input.costPerLb, true)} )`,
      `Cost per piece = Case price ÷ Pieces per case (${formulaAmount(input.buyingPrice)} ÷ ${input.piecesPerCase || 0} = ${formulaAmount(input.costPerPiece, true)} )`,
    ];
  }

  if (input.sourcePer === "Case" && input.caseBy === "Units / case") {
    return [
      `Cost per piece = Case price ÷ Pieces per case (${formulaAmount(input.buyingPrice)} ÷ ${input.piecesPerCase || 0} = ${formulaAmount(input.costPerPiece, true)} )`,
    ];
  }

  return [];
}

export type PricingSourcePer = "Unit" | "Case";
export type PricingCaseBy = "Lbs / case" | "Units / case";

export type PricingInputs = {
  sourcePer: PricingSourcePer | "";
  caseBy: PricingCaseBy | "";
  buyingPrice: number;
  pieceWeightOz: number;
  caseWeightLbs: number;
  piecesPerCase: number;
};

export type PricingBreakdown = {
  costPerLb: number;
  costPerPiece: number;
  suggestedPrice: number;
};

export function calcPricingBreakdown(input: PricingInputs): PricingBreakdown {
  const empty = { costPerLb: 0, costPerPiece: 0, suggestedPrice: 0 };

  if (input.sourcePer === "Unit") {
    const costPerPiece = calcCostPerPieceFromLb(
      input.buyingPrice,
      input.pieceWeightOz,
    );
    return {
      costPerLb: 0,
      costPerPiece,
      suggestedPrice: calcSuggestedPrice(costPerPiece),
    };
  }

  if (input.sourcePer === "Case") {
    if (input.caseBy === "Lbs / case") {
      const costPerLb = calcCostPerLbFromCase(
        input.buyingPrice,
        input.caseWeightLbs,
      );
      const costPerPiece = calcCostPerPieceFromCase(
        input.buyingPrice,
        input.piecesPerCase,
      );
      return {
        costPerLb,
        costPerPiece,
        suggestedPrice: calcSuggestedPrice(costPerPiece),
      };
    }

    if (input.caseBy === "Units / case") {
      const costPerPiece = calcCostPerPieceFromCase(
        input.buyingPrice,
        input.piecesPerCase,
      );
      return {
        costPerLb: 0,
        costPerPiece,
        suggestedPrice: calcSuggestedPrice(costPerPiece),
      };
    }
  }

  return empty;
}
