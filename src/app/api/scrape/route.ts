import { NextResponse } from "next/server";
import { scrapeAndPersistStocks } from "@/server/stocks/service";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const result = await scrapeAndPersistStocks({ code: body.code });
  return NextResponse.json(result);
}
