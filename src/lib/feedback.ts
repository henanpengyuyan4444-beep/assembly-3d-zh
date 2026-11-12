import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Where feedback goes. With a Redis on Upstash (Vercel's marketplace sets KV_REST_API_URL and KV_REST_API_TOKEN, or
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN), every entry is kept in the list `feedback`, newest first, and
 * counted per guide in the hash `feedback:slugs`. In development without one it goes to .feedback/feedback.jsonl.
 * Every entry is logged as well (grep for [feedback]), so nothing is lost while the store is being set up.
 * Read it back with `npm run feedback`.
 */

export interface FeedbackEntry {
  id: string;
  at: string;
  kind: "match" | "general";
  slug?: string;
  name?: string;
  variant?: string;
  match?: boolean;
  topic?: string;
  step?: number;
  phase?: string;
  note?: string;
  email?: string;
  via?: string;
  page?: string;
  device?: string;
}

/** The newest entries kept; older ones fall off the end. */
const KEEP = 20_000;

function redis() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function feedbackStore(): "redis" | "file" | "log" {
  if (redis()) return "redis";
  return process.env.NODE_ENV === "production" ? "log" : "file";
}

export async function saveFeedback(entry: FeedbackEntry): Promise<boolean> {
  console.info("[feedback]", JSON.stringify(entry));
  const db = redis();
  if (db) {
    const json = JSON.stringify(entry);
    const cmds = [["LPUSH", "feedback", json], ["LTRIM", "feedback", "0", String(KEEP - 1)], ...(entry.slug ? [["HINCRBY", "feedback:slugs", entry.slug, "1"]] : [])];
    const r = await fetch(`${db.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${db.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(cmds),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);
    if (!r?.ok) console.error("[feedback] store failed", r?.status ?? "network");
    return !!r?.ok;
  }
  if (process.env.NODE_ENV !== "production") {
    const dir = path.join(process.cwd(), ".feedback");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "feedback.jsonl"), JSON.stringify(entry) + "\n");
  }
  return true;
}
