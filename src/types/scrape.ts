export type StockSnapshot = {
  code: string;
  name?: string | null;
  annualDividend?: number | null;
  price?: number | null;
  source: string;
  message?: string;
};
