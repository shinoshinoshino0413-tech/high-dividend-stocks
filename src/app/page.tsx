import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl rounded-[32px] border border-white/10 bg-[#0b1322]/85 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.3)] backdrop-blur sm:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-200/70">
            High Dividend Stocks
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            スプレッドシート運用から卒業するための
            <span className="block bg-gradient-to-r from-cyan-200 via-sky-300 to-violet-300 bg-clip-text text-transparent">
              高配当株モニター
            </span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300">
            株価・配当金の更新、利回り計算、更新ログの確認をひとつの画面にまとめる最小構成です。
            まずは一覧画面と手動更新から始めて、あとで定期実行や通知を足せるようにしています。
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/stocks"
              className="rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-sky-400"
            >
              銘柄一覧を見る
            </Link>
            <a
              href="#setup"
              className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-300/30 hover:bg-white/10"
            >
              セットアップ手順を見る
            </a>
          </div>
        </div>

        <section id="setup" className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            ["1. 初期化", "PrismaとPostgreSQLで銘柄テーブルを作成し、ローカル確認から本番運用へつなげます。"],
            ["2. 更新", "一覧画面の更新ボタンかAPIで、株価・配当金を取得して保存します。"],
            ["3. 拡張", "Cron、通知、Google Sheets連携をあとから追加できます。"]
          ].map(([title, body]) => (
            <div key={title} className="rounded-[24px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.18)]">
              <h2 className="text-lg font-semibold text-cyan-100">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
