import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  SHEETS_CSV_URL: z.string().optional().default(""),
  GOOGLE_SPREADSHEET_ID: z.string().optional().default(""),
  GOOGLE_SHEET_NAME: z.string().optional().default("一覧"),
  GOOGLE_DIVIDEND_SHEET_NAME: z.string().optional().default("配当"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional().default(""),
  GOOGLE_PRIVATE_KEY: z.string().optional().default("")
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  SHEETS_CSV_URL: process.env.SHEETS_CSV_URL,
  GOOGLE_SPREADSHEET_ID: process.env.GOOGLE_SPREADSHEET_ID,
  GOOGLE_SHEET_NAME: process.env.GOOGLE_SHEET_NAME,
  GOOGLE_DIVIDEND_SHEET_NAME: process.env.GOOGLE_DIVIDEND_SHEET_NAME,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY
});
