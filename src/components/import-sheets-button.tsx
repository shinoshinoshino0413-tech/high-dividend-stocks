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
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full border border-pine/20 bg-white px-6 py-3 text-sm font-semibold text-pine transition hover:border-pine/40 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "取込と更新を実行中..." : "Google Sheets から取込して更新"}
      </button>
      {message ? <p className="text-sm text-ink/70">{message}</p> : null}
    </div>
  );
}
