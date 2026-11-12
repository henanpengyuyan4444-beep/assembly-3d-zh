/**
 * Prints the newest feedback, and which guides get the most.
 *
 *   npm run feedback              the newest 30
 *   npm run feedback -- 100       the newest 100
 *   npm run feedback -- --json    every entry kept, as JSON lines
 *
 * Reads the Redis that src/lib/feedback.ts writes to (KV_REST_API_URL and KV_REST_API_TOKEN, or the UPSTASH_ ones,
 * from the environment or .env.local; `vercel env pull .env.local` fetches them), or .feedback/feedback.jsonl.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const json = args.includes("--json");
const n = json ? 20_000 : Number(args.find((a) => /^\d+$/.test(a)) ?? 30);

const env: Record<string, string | undefined> = { ...process.env };
const local = path.join(ROOT, ".env.local");
if (existsSync(local))
  for (const line of readFileSync(local, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }

interface Entry {
  at: string;
  kind: string;
  slug?: string;
  name?: string;
  variant?: string;
  match?: boolean;
  topic?: string;
  step?: number;
  phase?: string;
  note?: string;
  email?: string;
  device?: string;
}

async function load(): Promise<{ entries: Entry[]; counts: Record<string, number>; from: string }> {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const r = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify([
        ["LRANGE", "feedback", "0", String(n - 1)],
        ["HGETALL", "feedback:slugs"],
      ]),
    });
    if (!r.ok) throw new Error(`redis said ${r.status}`);
    const [list, hash] = (await r.json()) as { result: string[] }[];
    const counts: Record<string, number> = {};
    for (let i = 0; i < hash.result.length; i += 2) counts[hash.result[i]] = Number(hash.result[i + 1]);
    return { entries: list.result.map((s) => JSON.parse(s)), counts, from: "redis" };
  }
  const file = path.join(ROOT, ".feedback", "feedback.jsonl");
  if (!existsSync(file)) return { entries: [], counts: {}, from: "nowhere yet (no Redis configured, no .feedback/feedback.jsonl)" };
  const all: Entry[] = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const counts: Record<string, number> = {};
  for (const e of all) if (e.slug) counts[e.slug] = (counts[e.slug] ?? 0) + 1;
  return { entries: all.reverse().slice(0, n), counts, from: file };
}

const { entries, counts, from } = await load();
if (json) {
  for (const e of entries) console.log(JSON.stringify(e));
  process.exit(0);
}
console.log(`${entries.length} newest from ${from}\n`);
for (const e of entries) {
  const what = e.kind === "general" ? (e.topic ?? "note") : e.match ? "matched" : "didn't match";
  const where = [e.name, e.variant].filter(Boolean).join(" ") || e.slug || "";
  const at = [e.phase, e.step ? `step ${e.step}` : ""].filter(Boolean).join(", ");
  console.log(`${e.at.slice(0, 16).replace("T", " ")}  ${what.padEnd(12)} ${where}${at ? ` (${at})` : ""}${e.device ? `  [${e.device}]` : ""}`);
  if (e.note) console.log(`    ${e.note.replace(/\n/g, "\n    ")}`);
  if (e.email) console.log(`    reply to ${e.email}`);
}
const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
if (top.length) console.log(`\nmost feedback:\n${top.map(([s, c]) => `  ${String(c).padStart(4)}  ${s}`).join("\n")}`);
