import { prisma } from "@/lib/prisma";
import { calculateCurrentYield, calculateTargetPrice } from "@/lib/calc";
import { scrapeStockSnapshot } from "@/server/scrape";
import { fetchYahooQuotesBatch } from "@/server/scrape/yahoo";

type ScrapeAndPersistStocksArgs = {
  code?: string;
};

export async function scrapeAndPersistStocks({ code }: ScrapeAndPersistStocksArgs) {
  const stocks = await prisma.stock.findMany({
    where: code ? { code } : undefined,
    orderBy: { code: "asc" }
  });
  const yahooQuotes = await fetchYahooQuotesBatch(stocks.map((stock) => stock.code));

  let updated = 0;
  let failed = 0;

  for (const stock of stocks) {
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
      failed++;
      await prisma.scrapeLog.create({
        data: {
          stockId: stock.id,
          source: snapshot.source,
          status: "failed",
          message: snapshot.message ?? "price and annualDividend were both unavailable"
        }
      });
      continue;
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

    updated++;
  }

  return {
    updated,
    failed,
    message: `更新完了: ${updated}件成功 / ${failed}件失敗`
  };
}
