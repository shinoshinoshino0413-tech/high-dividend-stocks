"use client";

import { useState } from "react";

type UserMenuProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  signOutAction: () => Promise<void>;
};

export function UserMenu({ user, signOutAction }: UserMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition hover:border-cyan-300/30 hover:bg-white/10"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-6 w-6 rounded-full" />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-bold text-cyan-200">
            {user.name?.[0] ?? "?"}
          </span>
        )}
        <span className="hidden sm:inline">{user.name ?? user.email}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#0b1322] p-2 shadow-xl">
            <p className="px-3 py-2 text-xs text-slate-400">{user.email}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/10"
              >
                ログアウト
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
