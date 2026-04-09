import type { StockSnapshot } from "@/types/scrape";

export async function fetchFromYahooQuote(code: string): Promise<Partial<StockSnapshot>> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${code}.T`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return { source: "Yahoo Finance", message: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as {
      quoteResponse?: {
        result?: Array<{
          shortName?: string;
          regularMarketPrice?: number;
          trailingAnnualDividendRate?: number;
          dividendRate?: number;
        }>;
      };
    };

    const item = data.quoteResponse?.result?.[0];
    if (!item) {
      return { source: "Yahoo Finance", message: "No quote data" };
    }

    return {
      name: item.shortName ?? null,
      price: pickPositive(item.regularMarketPrice),
      annualDividend: pickPositive(item.trailingAnnualDividendRate) ?? pickPositive(item.dividendRate),
      source: "Yahoo Finance"
    };
  } catch (error) {
    return {
      source: "Yahoo Finance",
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function fetchDividendFromYahooSummary(code: string) {
  const url =
    `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${code}.T` +
    `?modules=summaryDetail,price`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) return { dividend: null, name: null };

    const data = (await response.json()) as {
      quoteSummary?: {
        result?: Array<{
          price?: {
            shortName?: string;
          };
          summaryDetail?: {
            dividendRate?: { raw?: number } | number;
            trailingAnnualDividendRate?: { raw?: number } | number;
          };
        }>;
      };
    };

    const item = data.quoteSummary?.result?.[0];
    const summary = item?.summaryDetail;
    const dividend = pickPositive(
      extractRawNumber(summary?.trailingAnnualDividendRate) ??
        extractRawNumber(summary?.dividendRate)
    );
    const name = item?.price?.shortName ?? null;

    return { dividend, name };
  } catch {
    return { dividend: null, name: null };
  }
}

export async function fetchDividendFromYahooFinancePage(code: string) {
  const urls = [
    `https://finance.yahoo.co.jp/quote/${code}.T/dividend`,
    `https://finance.yahoo.co.jp/quote/${code}.T`
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        cache: "no-store"
      });

      if (!response.ok) continue;

      const html = await response.text();
      const bodyText = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ");

      const patterns = [
        /1株(?:当たり)?配当(?:金)?（会社予想）[^0-9]{0,30}([\d,]+(?:\.\d+)?)円/,
        /1株配当（会社予想）[^0-9]{0,30}([\d,]+(?:\.\d+)?)円/,
        /配当情報[\s\S]{0,300}?1株(?:当たり)?配当(?:金)?（会社予想）[^0-9]{0,30}([\d,]+(?:\.\d+)?)円/
      ];

      for (const pattern of patterns) {
        const match = bodyText.match(pattern);
        if (!match) continue;

        const value = Number(match[1].replace(/,/g, ""));
        if (Number.isFinite(value) && value > 0) {
          return value;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function fetchPriceFromYahooChart(code: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${code}.T?interval=1d&range=5d`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number };
          indicators?: {
            quote?: Array<{
              close?: Array<number | null>;
            }>;
          };
        }>;
      };
    };

    const result = data.chart?.result?.[0];
    const metaPrice = pickPositive(result?.meta?.regularMarketPrice);
    if (metaPrice) return metaPrice;

    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    for (let i = closes.length - 1; i >= 0; i--) {
      const close = pickPositive(closes[i]);
      if (close) return close;
    }

    return null;
  } catch {
    return null;
  }
}

export async function fetchYahooQuotesBatch(codes: string[]) {
  const quoteMap = new Map<string, Partial<StockSnapshot>>();
  if (codes.length === 0) return quoteMap;

  const batchSize = 50;

  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize);
    const symbols = batch.map((code) => `${code}.T`).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "application/json"
        },
        cache: "no-store"
      });

      if (!response.ok) {
        batch.forEach((code) => {
          quoteMap.set(code, {
            source: "Yahoo Finance",
            message: `HTTP ${response.status}`
          });
        });
        continue;
      }

      const data = (await response.json()) as {
        quoteResponse?: {
          result?: Array<{
            symbol?: string;
            shortName?: string;
            regularMarketPrice?: number;
            trailingAnnualDividendRate?: number;
            dividendRate?: number;
          }>;
        };
      };

      const results = data.quoteResponse?.result ?? [];
      const seenCodes = new Set<string>();

      for (const item of results) {
        const code = String(item.symbol ?? "").replace(/\.T$/i, "");
        if (!code) continue;
        seenCodes.add(code);

        quoteMap.set(code, {
          name: item.shortName ?? null,
          price: pickPositive(item.regularMarketPrice),
          annualDividend: pickPositive(item.trailingAnnualDividendRate) ?? pickPositive(item.dividendRate),
          source: "Yahoo Finance"
        });
      }

      batch.forEach((code) => {
        if (!seenCodes.has(code) && !quoteMap.has(code)) {
          quoteMap.set(code, {
            source: "Yahoo Finance",
            message: "No quote data"
          });
        }
      });
    } catch (error) {
      batch.forEach((code) => {
        quoteMap.set(code, {
          source: "Yahoo Finance",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      });
    }
  }

  return quoteMap;
}

function pickPositive(value?: number | null) {
  return typeof value === "number" && value > 0 ? value : null;
}

function extractRawNumber(value?: { raw?: number } | number | null) {
  if (typeof value === "number") return value;
  if (value && typeof value.raw === "number") return value.raw;
  return null;
}
