import { createSign } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { scrapeAndPersistStocks } from "@/server/stocks/service";
import { calculateCurrentYield, calculateTargetPrice } from "@/lib/calc";

type ImportedSheetRow = {
  code: string;
  name: string | null;
  targetYield: number | null;
  annualDividend: number | null;
  price: number | null;
};

export async function importStocksFromGoogleSheets() {
  const { rows, source, message, dividendMap } = await loadSheetRows();

  if (message) {
    return {
      imported: 0,
      skipped: 0,
      message
    };
  }

  let imported = 0;
  let deleted = 0;
  const incomingCodes = new Set(rows.map((row) => row.code));

  const existingStocks = await prisma.stock.findMany({
    select: { id: true, code: true }
  });

  const codesToDelete = existingStocks
    .filter((stock) => !incomingCodes.has(stock.code))
    .map((stock) => stock.id);

  if (codesToDelete.length > 0) {
    const result = await prisma.stock.deleteMany({
      where: {
        id: { in: codesToDelete }
      }
    });
    deleted = result.count;
  }

  for (const row of rows) {
    const existing = await prisma.stock.findUnique({
      where: { code: row.code }
    });
    const nextDividend = row.annualDividend ?? dividendMap.get(row.code) ?? existing?.annualDividend ?? null;
    const nextPrice = row.price ?? existing?.price ?? null;
    const nextTargetYield = row.targetYield ?? existing?.targetYield ?? null;

    await prisma.stock.upsert({
      where: { code: row.code },
      update: {
        name: row.name ?? existing?.name ?? null,
        targetYield: nextTargetYield,
        annualDividend: nextDividend,
        price: nextPrice,
        currentYield: calculateCurrentYield(nextDividend, nextPrice),
        targetPrice: calculateTargetPrice(nextDividend, nextTargetYield)
      },
      create: {
        code: row.code,
        name: row.name,
        targetYield: nextTargetYield,
        annualDividend: nextDividend,
        price: nextPrice,
        currentYield: calculateCurrentYield(nextDividend, nextPrice),
        targetPrice: calculateTargetPrice(nextDividend, nextTargetYield)
      }
    });

    imported++;
  }

  const scrapeResult = await scrapeAndPersistStocks({});

  return {
    imported,
    skipped: 0,
    deleted,
    marketUpdated: scrapeResult.updated,
    marketFailed: scrapeResult.failed,
    message:
      `${source} から ${imported}件取り込み、${deleted}件を同期削除しました。` +
      ` その後、市況データを ${scrapeResult.updated}件更新、${scrapeResult.failed}件失敗しました。`
  };
}

export function parseGoogleSheetsCsv(csvText: string) {
  const rows = parseCsv(csvText);
  return parseSheetRows(rows);
}

function parseGoogleSheetsValues(values: string[][]) {
  return parseSheetRows(values);
}

function parseGoogleSheetsGridData(gridData: GoogleSheetGridData) {
  const rowData = gridData.sheets?.[0]?.data?.[0]?.rowData ?? [];
  const rowMetadata = gridData.sheets?.[0]?.data?.[0]?.rowMetadata ?? [];
  const rows: string[][] = [];

  for (let i = 0; i < rowData.length; i++) {
    const metadata = rowMetadata[i];
    if (metadata?.hiddenByFilter || metadata?.hiddenByUser) continue;

    const values = rowData[i]?.values ?? [];
    const row = values.map((cell) => cell.formattedValue ?? "");
    rows.push(row);
  }

  return parseSheetRows(rows);
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

async function loadSheetRows() {
  if (env.SHEETS_CSV_URL) {
    const response = await fetch(env.SHEETS_CSV_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/csv,text/plain,*/*"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Google Sheets CSV fetch failed: HTTP ${response.status}`);
    }

    const csvText = await response.text();
    return {
      rows: parseGoogleSheetsCsv(csvText),
      source: "Google Sheets CSV",
      message: "",
      dividendMap: new Map<string, number>()
    };
  }

  if (
    env.GOOGLE_SPREADSHEET_ID &&
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    env.GOOGLE_PRIVATE_KEY
  ) {
    const [values, dividendValues] = await Promise.all([
      fetchGoogleSheetsGridData(env.GOOGLE_SHEET_NAME, true),
      fetchGoogleSheetsGridData(env.GOOGLE_DIVIDEND_SHEET_NAME, false)
    ]);
    return {
      rows: parseGoogleSheetsGridData(values),
      source: "Google Sheets API",
      message: "",
      dividendMap: parseDividendSheetGridData(dividendValues)
    };
  }

  return {
    rows: [],
    source: "Google Sheets",
    message:
      "SHEETS_CSV_URL も Google Sheets API 用の認証情報も未設定です。README の手順に沿って .env を設定してください。",
    dividendMap: new Map<string, number>()
  };
}

async function fetchGoogleSheetsGridData(sheetName: string, includeRowMetadata: boolean) {
  const accessToken = await getGoogleAccessToken();
  const range = encodeURIComponent(`${sheetName}!A:Y`);
  const fields = includeRowMetadata
    ? "sheets(data(rowData(values(formattedValue)),rowMetadata(hiddenByFilter,hiddenByUser)))"
    : "sheets(data(rowData(values(formattedValue))))";
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${env.GOOGLE_SPREADSHEET_ID}` +
    `?ranges=${range}` +
    `&includeGridData=true` +
    `&fields=${fields}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Sheets API fetch failed: HTTP ${response.status} ${text}`);
  }

  return (await response.json()) as GoogleSheetGridData;
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  );

  const unsigned = `${header}.${claimSet}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n");
  const signature = signer.sign(privateKey);
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google OAuth token fetch failed: HTTP ${response.status} ${text}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Google OAuth token fetch failed: access_token missing");
  }

  return data.access_token;
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseSheetRows(rows: string[][]) {
  const importedRows: ImportedSheetRow[] = [];

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const code = normalizeCode(row[0]);
    if (!code) continue;

    const name = normalizeText(row[1]);
    const targetYield = normalizeNumber(row[24]);
    const annualDividend = normalizeNumber(row[29]);
    const price = normalizeNumber(row[31]);

    importedRows.push({
      code,
      name,
      targetYield,
      annualDividend,
      price
    });
  }

  return importedRows;
}

function parseDividendSheetGridData(gridData: GoogleSheetGridData) {
  const rowData = gridData.sheets?.[0]?.data?.[0]?.rowData ?? [];
  const dividendMap = new Map<string, { year: number; dividend: number }>();

  for (let i = 1; i < rowData.length; i++) {
    const values = rowData[i]?.values ?? [];
    const row = values.map((cell) => cell.formattedValue ?? "");
    const code = normalizeCode(row[1]);
    const year = extractYear(row[2]);
    const dividend = normalizeNumber(row[3]);

    if (!code || !year || dividend == null) continue;

    const current = dividendMap.get(code);
    if (!current || year >= current.year) {
      dividendMap.set(code, { year, dividend });
    }
  }

  return new Map<string, number>(
    Array.from(dividendMap.entries()).map(([code, value]) => [code, value.dividend])
  );
}

function normalizeCode(value?: string) {
  const normalized = String(value ?? "").trim().replace(/\.0$/, "");
  return /^\d{4}$/.test(normalized) ? normalized : null;
}

function normalizeText(value?: string) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeNumber(value?: string) {
  const normalized = String(value ?? "").trim().replace(/[,%\s]/g, "");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function extractYear(value?: string) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})/);
  return match ? Number(match[1]) : null;
}

type GoogleSheetGridData = {
  sheets?: Array<{
    data?: Array<{
      rowMetadata?: Array<{
        hiddenByFilter?: boolean;
        hiddenByUser?: boolean;
      }>;
      rowData?: Array<{
        values?: Array<{
          formattedValue?: string;
        }>;
      }>;
    }>;
  }>;
};
