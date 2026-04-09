type FilterBarProps = {
  defaultQuery: string;
  count: number;
};

export function FilterBar({ defaultQuery, count }: FilterBarProps) {
  return (
    <form className="flex flex-col gap-4 rounded-[24px] bg-mist p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        <label htmlFor="q" className="mb-2 block text-sm font-medium text-ink/65">
          コード・企業名で検索
        </label>
        <input
          id="q"
          name="q"
          defaultValue={defaultQuery}
          placeholder="8058 / 三菱商事"
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-pine"
        />
      </div>
      <div className="flex items-end gap-3">
        <div className="rounded-2xl bg-white px-4 py-3 text-sm text-ink/70">
          表示件数: <span className="font-semibold text-pine">{count}</span>
        </div>
        <button className="rounded-2xl bg-pine px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0f2f24]">
          検索
        </button>
      </div>
    </form>
  );
}
