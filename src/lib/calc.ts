export function calculateCurrentYield(annualDividend: number | null, price: number | null) {
  if (!annualDividend || !price || price <= 0) return null;
  return (annualDividend / price) * 100;
}

export function calculateTargetPrice(annualDividend: number | null, targetYield: number | null) {
  if (!annualDividend || !targetYield || targetYield <= 0) return null;
  return annualDividend / (targetYield / 100);
}
