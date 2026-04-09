import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f5f1e5,_#eef2eb_42%,_#dfe7db)] text-ink">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl rounded-[32px] border border-white/70 bg-white/75 p-10 shadow-panel backdrop-blur">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-pine/70">
            High Dividend Stocks
          </p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight">
            スプレッドシート運用から卒業するための
            <span className="block text-pine">高配当株モニター</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-ink/75">
            株価・配当金の更新、利回り計算、更新ログの確認をひとつの画面にまとめる最小構成です。
            まずは一覧画面と手動更新から始めて、あとで定期実行や通知を足せるようにしています。
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/stocks"
              className="rounded-full bg-pine px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2f24]"
            >
              銘柄一覧を見る
            </Link>
            <a
              href="#setup"
              className="rounded-full border border-pine/20 bg-white px-6 py-3 text-sm font-semibold text-pine transition hover:border-pine/40"
            >
              セットアップ手順を見る
            </a>
          </div>
        </div>

        <section id="setup" className="mt-14 grid gap-4 md:grid-cols-3">
          {[
            ["1. 初期化", "PrismaとSQLiteで銘柄テーブルを作成し、サンプル銘柄を投入します。"],
            ["2. 更新", "一覧画面の更新ボタンかAPIで、株価・配当金を取得して保存します。"],
            ["3. 拡張", "Cron、通知、Google Sheets連携をあとから追加できます。"]
          ].map(([title, body]) => (
            <div key={title} className="rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-panel">
              <h2 className="text-lg font-semibold text-pine">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-ink/75">{body}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
