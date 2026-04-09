import { NextResponse } from "next/server";
import { getStocks } from "@/server/stocks/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const stocks = await getStocks(query);
  return NextResponse.json({ stocks });
}
