"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function UpdateButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    setMessage(null);

    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const result = (await response.json()) as { updated: number; failed: number; message?: string };

    setMessage(result.message ?? `更新完了: ${result.updated}件成功 / ${result.failed}件失敗`);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col items-start gap-3 sm:w-auto">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:from-fuchsia-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {isPending ? "更新中..." : "株価・配当金を更新"}
      </button>
      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </div>
  );
}
