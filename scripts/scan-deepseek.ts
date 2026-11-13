/**
 * 用 DeepSeek 的看图模型跑一遍"手册页 → 结构化草稿"的链路。
 *
 * 用法:
 *   node --experimental-transform-types --no-warnings --import ./scripts/voice/register.mjs scripts/scan-deepseek.ts <页图1> [页图2 ...]
 *
 * key 从 DEEPSEEK_API_KEY 读, 没有就读 .secrets/deepseek.key (不入库)。
 * 结果写到 out/scan-draft.json, 同时打印摘要。
 */
import fs from "node:fs";
import path from "node:path";
import { PAGE_PROMPT_ZH, PLAN_PROMPT_ZH } from "@/lib/scan/prompts.zh";

const BASE = process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
const MODEL = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-flash";

function apiKey() {
  const env = process.env.DEEPSEEK_API_KEY?.trim();
  if (env) return env;
  const file = path.join(process.cwd(), ".secrets", "deepseek.key");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  throw new Error("没有 key: 设 DEEPSEEK_API_KEY, 或把 key 写进 .secrets/deepseek.key");
}

function mimeOf(file: string) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

async function chat(key: string, messages: unknown[], maxTokens: number, json: boolean) {
  for (const withJson of json ? [true, false] : [false]) {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0,
        ...(withJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    const text = await res.text();
    if (res.ok) {
      const j = JSON.parse(text);
      return String(j?.choices?.[0]?.message?.content ?? "");
    }
    if (res.status === 400 && withJson) continue;
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  throw new Error("没有可用模型");
}

function extractJson(text: string): unknown {
  const t = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : t;
  const a = body.indexOf("{");
  const b = body.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try {
    return JSON.parse(body.slice(a, b + 1));
  } catch {
    return null;
  }
}

async function main() {
  const files = process.argv.slice(2).filter((f) => fs.existsSync(f));
  if (!files.length) throw new Error("给几张说明书页图 (png/jpg)");
  const key = apiKey();

  const notes: unknown[] = [];
  for (const [i, file] of files.entries()) {
    const b64 = fs.readFileSync(file).toString("base64");
    const text = await chat(
      key,
      [
        {
          role: "user",
          content: [
            { type: "text", text: PAGE_PROMPT_ZH },
            { type: "image_url", image_url: { url: `data:${mimeOf(file)};base64,${b64}` } },
          ],
        },
      ],
      2000,
      true,
    );
    const note = extractJson(text) ?? { kind: "other" };
    notes.push(note);
    const n = note as { kind?: string; parts?: unknown[]; steps?: unknown[] };
    console.log(`第 ${i + 1} 页: kind=${n.kind ?? "?"} parts=${n.parts?.length ?? 0} steps=${n.steps?.length ?? 0}`);
  }

  const input = [
    "说明书页的读图笔记, 按顺序:",
    ...notes.map((n, i) => `第 ${i + 1} 页: ${JSON.stringify(n)}`),
  ].join("\n");

  const planText = await chat(
    key,
    [
      { role: "system", content: PLAN_PROMPT_ZH },
      { role: "user", content: input },
    ],
    8000,
    true,
  );
  const spec = extractJson(planText);
  if (!spec) throw new Error("规划阶段没给出 JSON: " + planText.slice(0, 300));

  const s = spec as { name?: string; parts?: unknown[]; steps?: unknown[] };
  fs.mkdirSync("out", { recursive: true });
  fs.writeFileSync("out/scan-draft.json", JSON.stringify(spec, null, 2), "utf8");
  console.log(`\n草稿: ${s.name ?? "?"}  零件 ${s.parts?.length ?? 0} 个, 步骤 ${s.steps?.length ?? 0} 步`);
  console.log("已写入 out/scan-draft.json");
}

main().catch((e) => {
  console.error("失败:", (e as Error).message);
  process.exit(1);
});
