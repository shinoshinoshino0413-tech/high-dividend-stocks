"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function UpdateButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  async function handleClick() {
    setMessage(null);
    setIsUpdating(true);
    setProgress({ done: 0, total: 0 });

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stream: true })
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const data = line.replace(/^data: /, "").trim();
          if (!data) continue;

          try {
            const parsed = JSON.parse(data) as {
              done?: number;
              total?: number;
              code?: string;
              finished?: boolean;
              message?: string;
              updated?: number;
              failed?: number;
            };

            if (parsed.finished) {
              setMessage(parsed.message ?? `更新完了: ${parsed.updated}件成功 / ${parsed.failed}件失敗`);
            } else if (parsed.done != null && parsed.total != null) {
              setProgress({ done: parsed.done, total: parsed.total });
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "更新に失敗しました");
    } finally {
      setIsUpdating(false);
      startTransition(() => {
        router.refresh();
      });
    }
  }

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isUpdating || isPending}
        className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-fuchsia-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isUpdating
          ? `更新中... ${progress.total > 0 ? `${progress.done}/${progress.total}` : ""}`
          : isPending
            ? "反映中..."
            : "株価・配当金を更新"}
      </button>

      {isUpdating && progress.total > 0 && (
        <div className="overflow-hidden rounded-full bg-white/10">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-fuchsia-400 to-violet-400 transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {message && !isUpdating ? <p className="text-sm text-slate-300">{message}</p> : null}
    </div>
  );
}
