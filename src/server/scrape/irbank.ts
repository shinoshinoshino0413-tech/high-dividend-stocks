import * as cheerio from "cheerio";

export async function fetchNameFromIrbank(code: string) {
  const url = `https://irbank.net/${code}`;

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
    const title = $("title").text().trim();
    if (!title) return null;

    const name = title.split("|")[0]?.replace(/\s+/g, " ").trim();
    return name || null;
  } catch {
    return null;
  }
}
