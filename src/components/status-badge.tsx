export function StatusBadge({ updatedAt }: { updatedAt: Date | null }) {
  const isFresh = updatedAt && Date.now() - updatedAt.getTime() < 1000 * 60 * 60 * 24;
  const label = !updatedAt ? "未更新" : isFresh ? "24時間以内に更新" : "更新待ち";
  const style = !updatedAt
    ? "bg-white/8 text-slate-300 ring-1 ring-white/10"
    : isFresh
      ? "bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-300/20"
      : "bg-amber-300/12 text-amber-100 ring-1 ring-amber-200/15";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>{label}</span>;
}
