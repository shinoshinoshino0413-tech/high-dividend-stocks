import Link from "next/link";
import { formatDateTime, formatMoney, formatPercent } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import type { StockListItem } from "@/types/stock";

export function StocksTable({ stocks }: { stocks: StockListItem[] }) {
  return (
    <div className="space-y-4">
      {/* Mobile card layout */}
      <div className="grid gap-3 lg:hidden">
        {stocks.map((stock) => {
          const emphasis = getStockEmphasis(stock);
          const distance = getDistancePercent(stock.price, stock.targetPrice);

          return (
            <article
              key={stock.code}
              className={`rounded-[24px] border p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur ${emphasis.cardClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold tracking-[0.24em] text-cyan-200/70">{stock.code}</p>
                    {emphasis.label ? <PriorityBadge label={emphasis.label} tone={emphasis.tone} /> : null}
                  </div>
                  <Link href={`/stocks/${stock.code}`} className="mt-2 block text-lg font-semibold text-white">
                    {stock.name ?? "名称未取得"}
                  </Link>
                </div>
                <StatusBadge updatedAt={stock.updatedAt} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MobileMetric label="年間配当" value={formatMoney(stock.annualDividend)} />
                <MobileMetric label="株価" value={formatMoney(stock.price)} valueClass={emphasis.priceClass} />
                <MobileMetric label="現在利回り" value={formatPercent(stock.currentYield)} valueClass={getYieldClass(stock.currentYield, stock.targetYield)} />
                <MobileMetric label="目安利回り" value={formatPercent(stock.targetYield)} />
              </div>

              <div className="mt-3 rounded-2xl bg-[#0a1324] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-400">目安株価</span>
                  <span className="text-base font-semibold text-cyan-100">{formatMoney(stock.targetPrice)}</span>
                </div>
                {distance != null && <DistanceBar distance={distance} />}
                <p className="mt-2 text-xs text-slate-500">最終更新: {formatDateTime(stock.updatedAt)}</p>
              </div>
            </article>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[28px] border border-white/10 bg-[#09111d]/80 lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-[#101a2f] text-left text-slate-200">
              <tr>
                {["コード", "企業名", "年間配当", "株価", "現在利回り", "目安利回り", "目安株価", "目安まで", "状態", "更新日時"].map((label) => (
                  <th key={label} className="px-4 py-4 font-medium whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-transparent text-slate-200">
              {stocks.map((stock) => {
                const emphasis = getStockEmphasis(stock);
                const distance = getDistancePercent(stock.price, stock.targetPrice);

                return (
                  <tr key={stock.code} className={`transition hover:bg-white/[0.03] ${emphasis.rowClass}`}>
                    <td className="px-4 py-4 font-bold tabular-nums text-cyan-200">{stock.code}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <Link href={`/stocks/${stock.code}`} className="font-medium text-white hover:text-cyan-200">
                          {stock.name ?? "名称未取得"}
                        </Link>
                        {emphasis.label ? <PriorityBadge label={emphasis.label} tone={emphasis.tone} /> : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 tabular-nums">{formatMoney(stock.annualDividend)}</td>
                    <td className={`px-4 py-4 tabular-nums font-semibold ${emphasis.priceClass}`}>{formatMoney(stock.price)}</td>
                    <td className={`px-4 py-4 tabular-nums font-semibold ${getYieldClass(stock.currentYield, stock.targetYield)}`}>
                      {formatPercent(stock.currentYield)}
                    </td>
                    <td className="px-4 py-4 tabular-nums">{formatPercent(stock.targetYield)}</td>
                    <td className="px-4 py-4 tabular-nums">{formatMoney(stock.targetPrice)}</td>
                    <td className="px-4 py-4 min-w-[140px]">
                      {distance != null ? <DistanceBar distance={distance} compact /> : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge updatedAt={stock.updatedAt} />
                    </td>
                    <td className="px-4 py-4 text-slate-400 whitespace-nowrap">{formatDateTime(stock.updatedAt)}</td>
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

/** Distance from current price to target price as a percentage. Negative = in buy zone. */
function getDistancePercent(price: number | null, targetPrice: number | null): number | null {
  if (price == null || targetPrice == null || targetPrice <= 0) return null;
  return ((price - targetPrice) / targetPrice) * 100;
}

function DistanceBar({ distance, compact = false }: { distance: number; compact?: boolean }) {
  const inBuyZone = distance <= 0;
  const nearZone = !inBuyZone && distance <= 10;

  const label = inBuyZone
    ? `${Math.abs(distance).toFixed(1)}% 下`
    : `あと ${distance.toFixed(1)}%`;

  const barColor = inBuyZone
    ? "bg-gradient-to-r from-rose-400 to-pink-400"
    : nearZone
      ? "bg-gradient-to-r from-amber-400 to-orange-400"
      : "bg-gradient-to-r from-slate-500 to-slate-400";

  // Clamp bar width between 5% and 100%
  const barWidth = inBuyZone
    ? 100
    : Math.max(5, Math.min(100, ((30 - distance) / 30) * 100));

  return (
    <div className={compact ? "mt-0" : "mt-2"}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 overflow-hidden rounded-full bg-white/8 h-1.5">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <span className={`whitespace-nowrap text-xs font-medium tabular-nums ${inBuyZone ? "text-rose-300" : nearZone ? "text-amber-300" : "text-slate-400"}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

function MobileMetric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl bg-[#0a1324] px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-2 text-base font-semibold tabular-nums ${valueClass ?? "text-slate-100"}`}>{value}</p>
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

function getYieldClass(currentYield: number | null, targetYield: number | null) {
  if (currentYield == null || targetYield == null) return "text-slate-100";
  if (currentYield >= targetYield) return "text-emerald-300";
  if (currentYield >= targetYield * 0.9) return "text-amber-200";
  return "text-slate-100";
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
