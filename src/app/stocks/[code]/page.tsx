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
    <main className="min-h-screen bg-mist px-6 py-10 text-ink">
      <div className="mx-auto max-w-5xl rounded-[32px] bg-white p-8 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-pine/60">{stock.code}</p>
            <h1 className="mt-3 text-3xl font-semibold">{stock.name ?? "名称未取得"}</h1>
            <p className="mt-3 text-sm text-ink/70">{stock.sector ?? "業種未設定"}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="株価" value={formatMoney(stock.price)} />
          <MetricCard label="年間配当" value={formatMoney(stock.annualDividend)} />
          <MetricCard label="現在利回り" value={formatPercent(stock.currentYield)} />
          <MetricCard label="目安株価" value={formatMoney(stock.targetPrice)} />
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">更新ログ</h2>
          <div className="mt-4 overflow-hidden rounded-3xl border border-black/5">
            <table className="min-w-full divide-y divide-black/5 text-sm">
              <thead className="bg-pine text-left text-white">
                <tr>
                  <th className="px-4 py-3 font-medium">日時</th>
                  <th className="px-4 py-3 font-medium">取得元</th>
                  <th className="px-4 py-3 font-medium">状態</th>
                  <th className="px-4 py-3 font-medium">メッセージ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 bg-white">
                {stock.scrapeLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3">{formatDateTime(log.scrapedAt)}</td>
                    <td className="px-4 py-3">{log.source}</td>
                    <td className="px-4 py-3">{log.status}</td>
                    <td className="px-4 py-3 text-ink/65">{log.message ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-mist p-5">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-pine">{value}</p>
    </div>
  );
}
