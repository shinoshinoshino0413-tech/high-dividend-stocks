export async function fetchFromStooq(code: string) {
  const padded = code.padStart(4, "0");
  const url = `https://stooq.com/q/l/?s=${padded}.jp&f=c&e=csv`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/csv,text/plain,*/*"
      },
      cache: "no-store"
    });
    if (!response.ok) return null;

    const text = await response.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    const cols = lines[1].split(",");
    const price = Number(cols[cols.length - 1]);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch {
    return null;
  }
}
