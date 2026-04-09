import { NextResponse } from "next/server";
import { importStocksFromGoogleSheets } from "@/server/sheets/import";

export async function POST() {
  try {
    const result = await importStocksFromGoogleSheets();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ imported: 0, skipped: 0, message }, { status: 500 });
  }
}
