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

  return (
    <main className="min-h-screen px-4 py-6 text-slate-100 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-white/10 bg-[#0b1322]/85 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">{stock.code}</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{stock.name ?? "名称未取得"}</h1>
            <p className="mt-3 text-sm text-slate-300">{stock.sector ?? "業種未設定"}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="株価" value={formatMoney(stock.price)} />
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
                  <tr key={log.id}>
                    <td className="px-4 py-3">{formatDateTime(log.scrapedAt)}</td>
                    <td className="px-4 py-3">{log.source}</td>
                    <td className="px-4 py-3">{log.status}</td>
                    <td className="px-4 py-3 text-slate-400">{log.message ?? "-"}</td>
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-cyan-100">{value}</p>
    </div>
  );
}
