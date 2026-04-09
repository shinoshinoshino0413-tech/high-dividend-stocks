export function StatusBadge({ updatedAt }: { updatedAt: Date | null }) {
  const isFresh = updatedAt && Date.now() - updatedAt.getTime() < 1000 * 60 * 60 * 24;
  const label = !updatedAt ? "未更新" : isFresh ? "24時間以内に更新" : "更新待ち";
  const style = !updatedAt
    ? "bg-sand text-ember"
    : isFresh
      ? "bg-[#dff3e7] text-pine"
      : "bg-[#fff4dc] text-[#8a5d1b]";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${style}`}>{label}</span>;
}
