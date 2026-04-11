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
  // Step 1: Yahoo Quote (primary source for both price and dividend)
  const yahoo = await fetchFromYahooQuote(code);

  // Step 2: Fetch price and dividend fallbacks IN PARALLEL
  const [priceResult, dividendResult] = await Promise.all([
    resolvePriceFallback(code, yahoo.price),
    resolveDividendFallback(code, yahoo.annualDividend)
  ]);

  const finalPrice = yahoo.price ?? priceResult.price;
  const finalDividend = yahoo.annualDividend ?? dividendResult.dividend;
  const finalName = yahoo.name ?? dividendResult.name;

  return {
    code,
    name: finalName,
    annualDividend: finalDividend,
    price: finalPrice,
    source: [
      yahoo.price || yahoo.annualDividend || yahoo.name ? "Yahoo Finance" : null,
      ...priceResult.sources,
      ...dividendResult.sources
    ]
      .filter(Boolean)
      .join(" + ") || "No source",
    message: yahoo.message
  };
}

async function resolvePriceFallback(
  code: string,
  yahooPrice: number | null | undefined
): Promise<{ price: number | null; sources: string[] }> {
  if (yahooPrice) return { price: null, sources: [] };

  // Try Yahoo Chart and Stooq in parallel
  const [chartPrice, stooqPrice] = await Promise.all([
    fetchPriceFromYahooChart(code),
    fetchFromStooq(code)
  ]);

  if (chartPrice) return { price: chartPrice, sources: ["Yahoo Chart"] };
  if (stooqPrice) return { price: stooqPrice, sources: ["stooq"] };
  return { price: null, sources: [] };
}

async function resolveDividendFallback(
  code: string,
  yahooDividend: number | null | undefined
): Promise<{ dividend: number | null; name: string | null; sources: string[] }> {
  if (yahooDividend) return { dividend: null, name: null, sources: [] };

  // Try Yahoo Summary first
  const yahooSummary = await fetchDividendFromYahooSummary(code);
  if (yahooSummary.dividend) {
    return { dividend: yahooSummary.dividend, name: yahooSummary.name, sources: ["Yahoo Summary"] };
  }

  // Try Yahoo Finance HTML and Kabutan in parallel
  const [yahooFinanceDividend, kabutanDividend] = await Promise.all([
    fetchDividendFromYahooFinancePage(code),
    fetchDividendFromKabutan(code)
  ]);

  if (yahooFinanceDividend) {
    return { dividend: yahooFinanceDividend, name: yahooSummary.name, sources: ["Yahoo Finance HTML"] };
  }
  if (kabutanDividend) {
    return { dividend: kabutanDividend, name: yahooSummary.name, sources: ["株探"] };
  }

  return { dividend: null, name: yahooSummary.name, sources: [] };
}
