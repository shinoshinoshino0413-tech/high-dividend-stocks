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
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#9d4f30] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "更新中..." : "株価・配当金を更新"}
      </button>
      {message ? <p className="text-sm text-ink/70">{message}</p> : null}
    </div>
  );
}
