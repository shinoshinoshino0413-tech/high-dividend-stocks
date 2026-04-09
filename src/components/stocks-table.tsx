import Link from "next/link";
import { formatDateTime, formatMoney, formatPercent } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import type { StockListItem } from "@/types/stock";

export function StocksTable({ stocks }: { stocks: StockListItem[] }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/5">
      <table className="min-w-full divide-y divide-black/5 text-sm">
        <thead className="bg-pine text-left text-white">
          <tr>
            {["コード", "企業名", "年間配当", "株価", "現在利回り", "目安利回り", "目安株価", "状態", "更新日時"].map((label) => (
              <th key={label} className="px-4 py-3 font-medium">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5 bg-white">
          {stocks.map((stock) => (
            <tr key={stock.code} className="transition hover:bg-[#f8faf7]">
              <td className="px-4 py-3 font-medium text-pine">{stock.code}</td>
              <td className="px-4 py-3">
                <Link href={`/stocks/${stock.code}`} className="font-medium hover:underline">
                  {stock.name ?? "名称未取得"}
                </Link>
              </td>
              <td className="px-4 py-3">{formatMoney(stock.annualDividend)}</td>
              <td className="px-4 py-3">{formatMoney(stock.price)}</td>
              <td className="px-4 py-3">{formatPercent(stock.currentYield)}</td>
              <td className="px-4 py-3">{formatPercent(stock.targetYield)}</td>
              <td className="px-4 py-3">{formatMoney(stock.targetPrice)}</td>
              <td className="px-4 py-3">
                <StatusBadge updatedAt={stock.updatedAt} />
              </td>
              <td className="px-4 py-3 text-ink/65">{formatDateTime(stock.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
