import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { importStocksFromGoogleSheets } from "@/server/sheets/import";
import { scrapeAndPersistStocks } from "@/server/stocks/service";

async function handleCron(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasSheetsConfig = Boolean(
    env.SHEETS_CSV_URL ||
      (env.GOOGLE_SPREADSHEET_ID &&
        env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
        env.GOOGLE_PRIVATE_KEY)
  );

  const result = hasSheetsConfig
    ? await importStocksFromGoogleSheets()
    : await scrapeAndPersistStocks({});

  return NextResponse.json({
    mode: hasSheetsConfig ? "sheets-sync-and-market-update" : "market-update-only",
    ...result
  });
}

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}
