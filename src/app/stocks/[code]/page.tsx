import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatMoney, formatPercent } from "@/lib/format";

type StockDetailPageProps = {
  params: Promise<{ code: string }>;
};

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { code } = await params;
  const stock = await prisma.stock.findUnique({
    where: { code },
    include: {
      scrapeLogs: {
        orderBy: { scrapedAt: "desc" },
        take: 20
      }
    }
  });

  if (!stock) notFound();

  const distance =
    stock.price != null && stock.targetPrice != null && stock.targetPrice > 0
      ? ((stock.price - stock.targetPrice) / stock.targetPrice) * 100
      : null;
  const inBuyZone = distance != null && distance <= 0;

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-[#0b1322]/85 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur sm:p-8">
        <Link
          href="/stocks"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:border-cyan-300/30 hover:bg-white/10"
        >
          ← 一覧に戻る
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{stock.code}</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{stock.name ?? "名称未取得"}</h1>
            <p className="mt-3 text-sm text-slate-300">{stock.sector ?? "業種未設定"}</p>
          </div>
          {distance != null && (
            <div className={`rounded-2xl border px-5 py-3 text-center ${inBuyZone ? "border-rose-400/30 bg-rose-400/10" : "border-white/10 bg-white/5"}`}>
              <p className="text-xs text-slate-400">目安株価まで</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${inBuyZone ? "text-rose-300" : distance <= 10 ? "text-amber-300" : "text-slate-100"}`}>
                {inBuyZone ? `${Math.abs(distance).toFixed(1)}% 下` : `あと ${distance.toFixed(1)}%`}
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="株価" value={formatMoney(stock.price)} highlight={inBuyZone} />
          <MetricCard label="年間配当" value={formatMoney(stock.annualDividend)} />
          <MetricCard label="現在利回り" value={formatPercent(stock.currentYield)} />
          <MetricCard label="目安株価" value={formatMoney(stock.targetPrice)} />
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-white">更新ログ</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-[#09111d]/80">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-sm">
                <thead className="bg-[#101a2f] text-left text-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">日時</th>
                    <th className="px-4 py-3 font-medium">取得元</th>
                    <th className="px-4 py-3 font-medium">状態</th>
                    <th className="px-4 py-3 font-medium">メッセージ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-transparent text-slate-200">
                  {stock.scrapeLogs.map((log) => (
                    <tr key={log.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(log.scrapedAt)}</td>
                      <td className="px-4 py-3">{log.source}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${log.status === "success" ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                          {log.status === "success" ? "成功" : "失敗"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">{log.message ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-[24px] border p-5 ${highlight ? "border-rose-400/30 bg-rose-400/[0.08]" : "border-white/10 bg-white/[0.05]"}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${highlight ? "text-rose-200" : "text-cyan-100"}`}>{value}</p>
    </div>
  );
}
