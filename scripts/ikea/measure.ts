/**
 * Reads the measurements IKEA gives on each product's own page, for every guide we ship, so build.ts can use real
 * sizes where the product listings give none (most seats and sofas) and check.ts can catch a drawing that is off.
 *
 *   npm run ikea:measure                fetch what is not cached yet, then write measures.json
 *   npm run ikea:measure -- --from-end  only fill the cache, last guide first (a second runner alongside the first)
 *
 * One page per guide (its first article number), one at a time, at most about two a second. Every page is cached
 * under scripts/ikea/cache/ already trimmed to facts, and measures.json is git ignored like facts.json: the page
 * title, the measurements, the package count, the short product description and the addresses of its assembly
 * instructions. No prices, reviews or images are kept, except the address of the main photo, for side by side
 * checks on this machine only.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { metric } from "./us";

const DIR = import.meta.dirname;
const CACHE = path.join(DIR, "cache");
const OUT = path.join(DIR, "measures.json");
const ITEMS = path.join(DIR, "../../src/data/ikea-items.ts");
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 bygga-catalog/1.0";
const GAP_MS = 500;

export interface Page {
  /** the page's own title: name, type and what makes this variant ("with chaise longue/Knäbäck grey-green") */
  title: string;
  market: "gb" | "us";
  item: string;
  /** IKEA's measurement rows as they read ("Seat height": "45 cm"), inches turned into cm */
  m: Record<string, string>;
  packages?: number;
  about: string[];
  photo?: string;
  /** the product's assembly instructions on ikea.com, one PDF per box that needs building */
  manuals?: string[];
}

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();

/** The facts on one product page, or null when it isn't a product page. */
function read(html: string, market: "gb" | "us", item: string): Page | null {
  const title = html.match(/<title>([^<]*)/)?.[1];
  // an article the market doesn't sell lands on a listing page instead of its own
  const canonical = html.match(/rel="canonical" href="([^"]*)"/)?.[1] ?? "";
  if (!title || !/\/p\//.test(canonical) || !/pipf-measurements/.test(html)) return null;
  const m: Record<string, string> = {};
  for (const r of html.matchAll(/measurement-name">([^<]*)<\/span><span class="pipf-measurements-tab__measurement-value">([^<]*)</g)) {
    const k = decode(r[1]);
    let v = decode(r[2]);
    if (/"\s*$/.test(v)) v = metric(v) ?? v;
    if (!(k in m)) m[k] = v.replace(/\s+/g, " ");
  }
  const pk = html.match(/This product comes as (\d+) packages?/) ?? html.match(/This product comes as (one|1) package/);
  const details = html.slice(html.indexOf('id="product-details"'));
  const about = [...details.slice(0, details.indexOf("Designer") > 0 ? details.indexOf("Designer") : 4000).matchAll(/<p[^>]*>([^<]{12,400})<\/p>/g)].map((p) => decode(p[1])).slice(0, 6);
  const photo = html.match(/https:\/\/www\.ikea\.com\/[a-z]{2}\/en\/images\/products\/[a-z0-9_-]+__\d+_pe\d+_s5\.jpg/)?.[0];
  const manuals = [...new Set([...html.matchAll(/https:\/\/www\.ikea\.com\/[a-z]{2}\/[a-z]{2}\/assembly_instructions\/[a-z0-9_.-]+\.pdf/gi)].map((r) => r[0]))];
  return { title: decode(title).replace(/\s+-\s+IKEA.*$/, ""), market, item, m, packages: pk ? (/\d/.test(pk[1]) ? Number(pk[1]) : 1) : undefined, about, photo, manuals };
}

let last = 0;
async function page(market: "gb" | "us", item: string): Promise<Page | null> {
  const file = path.join(CACHE, `page-${market}-${item}.json`);
  // pages read before the manuals were kept are read again
  if (existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, "utf8")) as Page | null;
    if (cached === null || cached.manuals) return cached;
  }
  const wait = last + GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await fetch(`https://www.ikea.com/${market}/en/p/-${item}/`, { headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": market === "us" ? "en-US" : "en-GB" } }).catch(() => null);
    if (r?.status === 404) {
      writeFileSync(file, "null");
      return null;
    }
    const html = r?.ok ? await r.text().catch(() => null) : null;
    if (html !== null) {
      const p = read(html, market, item);
      writeFileSync(file, JSON.stringify(p));
      return p;
    }
    console.log(`  ${r?.status ?? "network"} on ${market} ${item}, retry ${attempt}`);
    await new Promise((res) => setTimeout(res, 3000 * attempt));
  }
  return null;
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  const text = readFileSync(ITEMS, "utf8");
  const fromEnd = process.argv.includes("--from-end");
  const all = [...text.matchAll(/^([a-z0-9-]+)\|([\d ]+)$/gm)].map((g) => ({ slug: g[1], items: g[2].split(" ") }));
  const guides = fromEnd ? all.reverse() : all;
  const prev: Record<string, Page> = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
  const out: Record<string, Page> = {};
  let n = 0;
  for (const g of guides) {
    let found: Page | null = null;
    // the first article that has a page: the UK one, or the US one for products only the US sells
    for (const item of g.items.slice(0, 3)) {
      found = (await page("gb", item)) ?? (await page("us", item));
      if (found) break;
    }
    if (found) out[g.slug] = found;
    // a page that couldn't be read this time keeps what was read last time, if that was a product page
    else if (prev[g.slug] && /^[A-ZÅÄÖÜÉØÆ]{2,}/.test(prev[g.slug].title)) out[g.slug] = prev[g.slug];
    if (++n % 50 === 0) {
      console.log(`${n}/${guides.length}`);
      if (!fromEnd) writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"'));
    }
  }
  if (fromEnd) return;
  writeFileSync(OUT, JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"'));
  console.log(`${Object.keys(out).length} of ${guides.length} guides measured`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
