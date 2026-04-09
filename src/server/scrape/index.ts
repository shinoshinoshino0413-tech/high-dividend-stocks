import type { StockSnapshot } from "@/types/scrape";
import { fetchFromStooq } from "@/server/scrape/stooq";
import {
  fetchDividendFromYahooFinancePage,
  fetchDividendFromYahooSummary,
  fetchFromYahooQuote,
  fetchPriceFromYahooChart
} from "@/server/scrape/yahoo";
import { fetchDividendFromKabutan } from "@/server/scrape/kabutan";

export async function scrapeStockSnapshot(code: string): Promise<StockSnapshot> {
  const yahoo = await fetchFromYahooQuote(code);
  const yahooSummary = yahoo.annualDividend ? { dividend: null, name: null } : await fetchDividendFromYahooSummary(code);
  const yahooChartPrice = yahoo.price ? null : await fetchPriceFromYahooChart(code);
  const stooqPrice = yahoo.price || yahooChartPrice ? null : await fetchFromStooq(code);
  const yahooFinanceDividend =
    yahoo.annualDividend || yahooSummary.dividend ? null : await fetchDividendFromYahooFinancePage(code);
  const kabutanDividend =
    yahoo.annualDividend || yahooSummary.dividend || yahooFinanceDividend ? null : await fetchDividendFromKabutan(code);

  return {
    code,
    name: yahoo.name ?? yahooSummary.name ?? null,
    annualDividend:
      yahoo.annualDividend ?? yahooSummary.dividend ?? yahooFinanceDividend ?? kabutanDividend ?? null,
    price: yahoo.price ?? yahooChartPrice ?? stooqPrice ?? null,
    source: [
      yahoo.price || yahoo.annualDividend || yahoo.name ? "Yahoo Finance" : null,
      yahooSummary.dividend || yahooSummary.name ? "Yahoo Summary" : null,
      yahooFinanceDividend ? "Yahoo Finance HTML" : null,
      yahooChartPrice ? "Yahoo Chart" : null,
      stooqPrice ? "stooq" : null,
      kabutanDividend ? "株探" : null
    ]
      .filter(Boolean)
      .join(" + ") || "No source",
    message: yahoo.message
  };
}
