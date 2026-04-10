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
  const freshCount = stocks.filter((stock) => {
    if (!stock.updatedAt) return false;
    return Date.now() - stock.updatedAt.getTime() < 1000 * 60 * 60 * 24;
  }).length;

  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="rounded-[32px] border border-white/10 bg-[#0b1322]/85 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-cyan-200/70">Dividend Monitor</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                高配当株一覧
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                銘柄コード、株価、年間配当、現在利回り、目安利回り、目安株価をまとめて確認できます。
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SummaryCard label="表示銘柄" value={`${stocks.length}件`} tone="cyan" />
                <SummaryCard label="24時間以内に更新" value={`${freshCount}件`} tone="emerald" />
                <SummaryCard label="検索条件" value={query || "すべて"} tone="violet" />
              </div>
            </div>
            <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[340px]">
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

function SummaryCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone: "cyan" | "emerald" | "violet";
}) {
  const toneClass =
    tone === "cyan"
      ? "from-cyan-400/18 to-sky-400/8 text-cyan-100"
      : tone === "emerald"
        ? "from-emerald-400/18 to-lime-400/8 text-emerald-100"
        : "from-violet-400/18 to-fuchsia-400/8 text-violet-100";

  return (
    <div className={`rounded-[24px] border border-white/10 bg-gradient-to-br ${toneClass} px-4 py-4`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}
