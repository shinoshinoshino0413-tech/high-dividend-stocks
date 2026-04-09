import { FilterBar } from "@/components/filter-bar";
import { ImportSheetsButton } from "@/components/import-sheets-button";
import { StocksTable } from "@/components/stocks-table";
import { UpdateButton } from "@/components/update-button";
import { getStocks } from "@/server/stocks/queries";

type StocksPageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function StocksPage({ searchParams }: StocksPageProps) {
  const params = (await searchParams) ?? {};
  const query = params.q ?? "";
  const stocks = await getStocks(query);

  return (
    <main className="min-h-screen bg-mist text-ink">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-[32px] bg-white p-8 shadow-panel">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-pine/60">Dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold">高配当株一覧</h1>
              <p className="mt-3 text-sm leading-7 text-ink/70">
                銘柄コード、株価、年間配当、現在利回り、目安利回り、目安株価をまとめて確認できます。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <ImportSheetsButton />
              <UpdateButton />
            </div>
          </div>

          <div className="mt-8">
            <FilterBar defaultQuery={query} count={stocks.length} />
          </div>

          <div className="mt-8">
            <StocksTable stocks={stocks} />
          </div>
        </div>
      </div>
    </main>
  );
}
