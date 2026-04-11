import { prisma } from "@/lib/prisma";
import { calculateCurrentYield, calculateTargetPrice } from "@/lib/calc";
import { scrapeStockSnapshot } from "@/server/scrape";
import { fetchYahooQuotesBatch } from "@/server/scrape/yahoo";

const CONCURRENCY = 5;

type ScrapeAndPersistStocksArgs = {
  code?: string;
  onProgress?: (done: number, total: number, code: string) => void;
};

export async function scrapeAndPersistStocks({ code, onProgress }: ScrapeAndPersistStocksArgs) {
  const stocks = await prisma.stock.findMany({
    where: code ? { code } : undefined,
    orderBy: { code: "asc" }
  });
  const yahooQuotes = await fetchYahooQuotesBatch(stocks.map((stock) => stock.code));

  let updated = 0;
  let failed = 0;
  let done = 0;

  // Process stocks in parallel batches
  for (let i = 0; i < stocks.length; i += CONCURRENCY) {
    const batch = stocks.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async (stock) => {
        const yahoo = yahooQuotes.get(stock.code);
        const needsFallback =
          !yahoo ||
          !yahoo.price ||
          !yahoo.annualDividend ||
          !yahoo.name;

        const fallbackSnapshot = needsFallback ? await scrapeStockSnapshot(stock.code) : null;

        const snapshot = {
          code: stock.code,
          name: yahoo?.name ?? fallbackSnapshot?.name ?? null,
          annualDividend: yahoo?.annualDividend ?? fallbackSnapshot?.annualDividend ?? null,
          price: yahoo?.price ?? fallbackSnapshot?.price ?? null,
          source:
            [
              yahoo && (yahoo.price || yahoo.annualDividend || yahoo.name)
                ? yahoo.source ?? "Yahoo Finance"
                : null,
              fallbackSnapshot?.source ?? null
            ]
              .filter(Boolean)
              .join(" + ") || "No source",
          message: fallbackSnapshot?.message ?? yahoo?.message
        };

        if (!snapshot.price && !snapshot.annualDividend) {
          await prisma.scrapeLog.create({
            data: {
              stockId: stock.id,
              source: snapshot.source,
              status: "failed",
              message: snapshot.message ?? "price and annualDividend were both unavailable"
            }
          });
          return { success: false, code: stock.code };
        }

        const nextDividend = snapshot.annualDividend ?? stock.annualDividend;
        const nextPrice = snapshot.price ?? stock.price;
        const nextYield = calculateCurrentYield(nextDividend, nextPrice);
        const nextTargetPrice = calculateTargetPrice(nextDividend, stock.targetYield);

        await prisma.stock.update({
          where: { id: stock.id },
          data: {
            name: snapshot.name ?? stock.name,
            annualDividend: nextDividend,
            price: nextPrice,
            currentYield: nextYield,
            targetPrice: nextTargetPrice,
            updatedAt: new Date()
          }
        });

        await prisma.scrapeLog.create({
          data: {
            stockId: stock.id,
            source: snapshot.source,
            status: "success",
            message: snapshot.message
          }
        });

        return { success: true, code: stock.code };
      })
    );

    for (const result of results) {
      done++;
      if (result.status === "fulfilled" && result.value.success) {
        updated++;
      } else {
        failed++;
      }
      onProgress?.(done, stocks.length, result.status === "fulfilled" ? result.value.code : "error");
    }
  }

  return {
    updated,
    failed,
    message: `更新完了: ${updated}件成功 / ${failed}件失敗`
  };
}
