import * as cheerio from "cheerio";

export async function fetchDividendFromKabutan(code: string) {
  const url = `https://kabutan.jp/stock/?code=${code}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      cache: "no-store"
    });
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    const bodyText = $.text();
    const htmlPatterns = [
      /<th[^>]*>\s*<span class="kubun1">[\s\S]*?予[\s\S]*?<\/span>\s*\d{4}\.\d{2}[\s\S]{0,250}?<td>([\d,]+(?:\.\d+)?)<\/td>\s*<td>\d{2}\/\d{2}\/\d{2}<\/td>/,
      /<th[^>]*>\s*<span class="kubun1">[\s\S]*?予[\s\S]*?<\/span>\s*\d{4}\.\d{2}[\s\S]{0,120}?<td>([\d,]+(?:\.\d+)?)<\/td>[\s\S]{0,120}?<\/tr>/
    ];
    const patterns = [
      /年間配当[^0-9]{0,20}([\d,]+(?:\.\d+)?)/,
      /一株配当[^0-9]{0,20}([\d,]+(?:\.\d+)?)/,
      /予想配当利回り[\s\S]{0,80}?([\d,]+(?:\.\d+)?)円/,
      /予\s*202\d\.\d{2}[\s\S]{0,120}?([\d,]+(?:\.\d+)?)\s+\d{2}\/\d{2}\/\d{2}/
    ];

    for (const pattern of htmlPatterns) {
      const match = html.match(pattern);
      if (!match) continue;

      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0 && value < 100000) return value;
    }

    for (const pattern of patterns) {
      const match = bodyText.match(pattern);
      if (!match) continue;

      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0) return value;
    }
  } catch {
    return null;
  }

  return null;
}
