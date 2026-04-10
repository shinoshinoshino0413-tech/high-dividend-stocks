type FilterBarProps = {
  defaultQuery: string;
  count: number;
};

export function FilterBar({ defaultQuery, count }: FilterBarProps) {
  return (
    <form className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur md:flex-row md:items-end md:justify-between">
      <div className="flex-1">
        <label htmlFor="q" className="mb-2 block text-sm font-medium text-slate-300">
          コード・企業名で検索
        </label>
        <input
          id="q"
          name="q"
          defaultValue={defaultQuery}
          placeholder="8058 / 三菱商事"
          className="w-full rounded-2xl border border-white/10 bg-[#09111d] px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-300/50 focus:bg-[#0c1627]"
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="rounded-2xl border border-white/10 bg-[#0b1322] px-4 py-3 text-sm text-slate-300">
          表示件数: <span className="font-semibold text-cyan-200">{count}</span>
        </div>
        <button className="rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:from-sky-400 hover:to-cyan-300">
          検索
        </button>
      </div>
    </form>
  );
}
