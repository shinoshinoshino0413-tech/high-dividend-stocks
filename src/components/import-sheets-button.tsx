"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ImportSheetsButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleClick() {
    setMessage(null);

    const response = await fetch("/api/import/sheets", {
      method: "POST"
    });
    const result = (await response.json()) as { message?: string };

    setMessage(result.message ?? "取り込みが完了しました。");
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
        className="w-full rounded-2xl border border-cyan-300/20 bg-white/5 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/35 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {isPending ? "取込と更新を実行中..." : "Google Sheets から取込して更新"}
      </button>
      {message ? <p className="text-sm text-slate-300">{message}</p> : null}
    </div>
  );
}
