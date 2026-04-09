import { scrapeAndPersistStocks } from "@/server/stocks/service";

export async function runDailyUpdate() {
  return scrapeAndPersistStocks({});
}
