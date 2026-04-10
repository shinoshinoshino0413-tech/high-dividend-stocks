import Link from "next/link";
import { formatDateTime, formatMoney, formatPercent } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import type { StockListItem } from "@/types/stock";

export function StocksTable({ stocks }: { stocks: StockListItem[] }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:hidden">
        {stocks.map((stock) => (
          <article
            key={stock.code}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.18)] backdrop-blur"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">{stock.code}</p>
                <Link href={`/stocks/${stock.code}`} className="mt-2 block text-lg font-semibold text-white">
                  {stock.name ?? "名称未取得"}
                </Link>
              </div>
              <StatusBadge updatedAt={stock.updatedAt} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MobileMetric label="年間配当" value={formatMoney(stock.annualDividend)} />
              <MobileMetric label="株価" value={formatMoney(stock.price)} />
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
        ))}
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
              {stocks.map((stock) => (
                <tr key={stock.code} className="transition hover:bg-white/[0.03]">
                  <td className="px-4 py-4 font-semibold text-cyan-200">{stock.code}</td>
                  <td className="px-4 py-4">
                    <Link href={`/stocks/${stock.code}`} className="font-medium text-white hover:text-cyan-200">
                      {stock.name ?? "名称未取得"}
                    </Link>
                  </td>
                  <td className="px-4 py-4">{formatMoney(stock.annualDividend)}</td>
                  <td className="px-4 py-4">{formatMoney(stock.price)}</td>
                  <td className="px-4 py-4">{formatPercent(stock.currentYield)}</td>
                  <td className="px-4 py-4">{formatPercent(stock.targetYield)}</td>
                  <td className="px-4 py-4">{formatMoney(stock.targetPrice)}</td>
                  <td className="px-4 py-4">
                    <StatusBadge updatedAt={stock.updatedAt} />
                  </td>
                  <td className="px-4 py-4 text-slate-400">{formatDateTime(stock.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#0a1324] px-4 py-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-100">{value}</p>
    </div>
  );
}
