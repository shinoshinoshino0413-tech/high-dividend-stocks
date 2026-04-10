import Link from "next/link";
import { formatDateTime, formatMoney, formatPercent } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import type { StockListItem } from "@/types/stock";

export function StocksTable({ stocks }: { stocks: StockListItem[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:hidden">
        {stocks.map((stock) => {
          const emphasis = getStockEmphasis(stock);

          return (
            <article
              key={stock.code}
              className={`rounded-[24px] border p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur ${emphasis.cardClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">{stock.code}</p>
                  <Link href={`/stocks/${stock.code}`} className="mt-2 block text-lg font-semibold text-white">
                    {stock.name ?? "名称未取得"}
                  </Link>
                  {emphasis.label ? <PriorityBadge label={emphasis.label} tone={emphasis.tone} className="mt-3" /> : null}
                </div>
                <StatusBadge updatedAt={stock.updatedAt} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MobileMetric label="年間配当" value={formatMoney(stock.annualDividend)} />
                <MobileMetric label="株価" value={formatMoney(stock.price)} valueClass={emphasis.priceClass} />
                <MobileMetric label="現在利回り" value={formatPercent(stock.currentYield)} />
                <MobileMetric label="目安利回り" value={formatPercent(stock.targetYield)} />
              </div>

              <div className="mt-3 rounded-2xl bg-[#0a1324] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">目安株価</span>
                  <span className="text-base font-semibold text-cyan-100">{formatMoney(stock.targetPrice)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">最終更新: {formatDateTime(stock.updatedAt)}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-[28px] border border-white/10 bg-[#09111d]/80 lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-[#101a2f] text-left text-slate-200">
              <tr>
                {["コード", "企業名", "年間配当", "株価", "現在利回り", "目安利回り", "目安株価", "状態", "更新日時"].map((label) => (
                  <th key={label} className="px-4 py-4 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-transparent text-slate-200">
              {stocks.map((stock) => {
                const emphasis = getStockEmphasis(stock);

                return (
                  <tr key={stock.code} className={`transition hover:bg-white/[0.03] ${emphasis.rowClass}`}>
                    <td className="px-4 py-4 font-semibold text-cyan-200">{stock.code}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Link href={`/stocks/${stock.code}`} className="font-medium text-white hover:text-cyan-200">
                          {stock.name ?? "名称未取得"}
                        </Link>
                        {emphasis.label ? <PriorityBadge label={emphasis.label} tone={emphasis.tone} /> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4">{formatMoney(stock.annualDividend)}</td>
                    <td className={`px-4 py-4 ${emphasis.priceClass}`}>{formatMoney(stock.price)}</td>
                    <td className="px-4 py-4">{formatPercent(stock.currentYield)}</td>
                    <td className="px-4 py-4">{formatPercent(stock.targetYield)}</td>
                    <td className="px-4 py-4">{formatMoney(stock.targetPrice)}</td>
                    <td className="px-4 py-4">
                      <StatusBadge updatedAt={stock.updatedAt} />
                    </td>
                    <td className="px-4 py-4 text-slate-400">{formatDateTime(stock.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MobileMetric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl bg-[#0a1324] px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-base font-semibold ${valueClass ?? "text-slate-100"}`}>{value}</p>
    </div>
  );
}

function PriorityBadge({
  label,
  tone,
  className = ""
}: {
  label: string;
  tone: "rose" | "amber";
  className?: string;
}) {
  const toneClass =
    tone === "rose"
      ? "border-rose-400/25 bg-rose-400/12 text-rose-100"
      : "border-amber-400/25 bg-amber-400/12 text-amber-100";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-[0.2em] ${toneClass} ${className}`}>
      {label}
    </span>
  );
}

function getStockEmphasis(stock: StockListItem) {
  const price = stock.price;
  const targetPrice = stock.targetPrice;

  if (price != null && targetPrice != null && targetPrice > 0) {
    if (price <= targetPrice) {
      return {
        label: "買い圏",
        tone: "rose" as const,
        cardClass: "border-rose-400/35 bg-rose-400/[0.08]",
        rowClass: "bg-rose-400/[0.05]",
        priceClass: "text-rose-200"
      };
    }

    if (price <= targetPrice * 1.1) {
      return {
        label: "あと10%",
        tone: "amber" as const,
        cardClass: "border-amber-400/35 bg-amber-400/[0.07]",
        rowClass: "bg-amber-300/[0.04]",
        priceClass: "text-amber-100"
      };
    }
  }

  return {
    label: null,
    tone: null,
    cardClass: "border-white/10 bg-white/[0.04]",
    rowClass: "",
    priceClass: "text-slate-100"
  };
}
