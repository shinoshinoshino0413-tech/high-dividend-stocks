CREATE TABLE IF NOT EXISTS "Stock" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "code" TEXT NOT NULL,
  "name" TEXT,
  "market" TEXT,
  "sector" TEXT,
  "targetYield" REAL,
  "annualDividend" REAL,
  "price" REAL,
  "currentYield" REAL,
  "targetPrice" REAL,
  "note" TEXT,
  "updatedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "modifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Stock_code_key" ON "Stock"("code");

CREATE TABLE IF NOT EXISTS "ScrapeLog" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "stockId" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "message" TEXT,
  "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScrapeLog_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "Stock" ("code", "name", "sector", "targetYield")
VALUES
  ('1301', '極洋', '水産・農林業', 3.5),
  ('2914', 'JT', '食料品', 4.5),
  ('8058', '三菱商事', '卸売業', 3.8),
  ('8316', '三井住友FG', '銀行業', 4.0),
  ('9437', 'NTTドコモ系監視用サンプル', '情報・通信業', 3.6)
ON CONFLICT("code") DO UPDATE SET
  "name" = excluded."name",
  "sector" = excluded."sector",
  "targetYield" = excluded."targetYield";
