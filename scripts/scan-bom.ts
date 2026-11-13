/**
 * BOM 先行的在线流水线：手册页 → BOM → 逐页笔记 → 受约束的计划 → 校验报告。
 *
 *   node --experimental-transform-types --no-warnings --import ./scripts/voice/register.mjs \
 *     scripts/scan-bom.ts <页图1> [页图2 ...]
 */
import fs from "node:fs";
import path from "node:path";
import { BOM_PROMPT_ZH, PAGE_PROMPT_ZH, bomPlanPrompt } from "@/lib/scan/prompts.zh";
import { constrainSpec, validatePlan, type Bom, type DraftSpec } from "@/lib/scan/bom";

const BASE = process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com";
const MODEL = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-flash";

function apiKey() {
  const env = process.env.DEEPSEEK_API_KEY?.trim();
  if (env) return env;
  const file = path.join(process.cwd(), ".secrets", "deepseek.key");
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8").trim();
  throw new Error("没有 key: 设 DEEPSEEK_API_KEY, 或写进 .secrets/deepseek.key");
}

function mimeOf(file: string) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
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

async function chat(key: string, messages: unknown[], maxTokens: number, json: boolean) {
  for (let budget = maxTokens, tries = 0; tries < 2; tries++, budget = Math.min(budget * 2, 32000)) {
    for (const withJson of json ? [true, false] : [false]) {
      const res = await fetch(`${BASE}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: budget,
          thinking: { type: "enabled" },
          reasoning_effort: "high",
          ...(withJson ? { response_format: { type: "json_object" } } : {}),
        }),
      });
      const text = await res.text();
      if (res.ok) {
        const j = JSON.parse(text);
        const choice = j?.choices?.[0];
        const content = String(choice?.message?.content ?? "");
        if (content.trim()) return content;
        if (choice?.finish_reason === "length") break;
        throw new Error("模型没有输出内容");
      }
      if (res.status === 400 && withJson) continue;
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
  }
  throw new Error("没有可用模型");
}

function imageBlock(file: string) {
  const b64 = fs.readFileSync(file).toString("base64");
  return { type: "image_url", image_url: { url: `data:${mimeOf(file)};base64,${b64}` } };
}

async function main() {
  const files = process.argv.slice(2).filter((f) => fs.existsSync(f));
  if (!files.length) throw new Error("给几张说明书页图");
  const key = apiKey();
  const t0 = Date.now();

  // ① BOM：一次把所有页给模型，只要零件表
  const bomText = await chat(
    key,
    [
      {
        role: "user",
        content: [{ type: "text", text: BOM_PROMPT_ZH }, ...files.map(imageBlock)],
      },
    ],
    8000,
    true,
  );
  const bom = extractJson(bomText) as Bom | null;
  if (!bom?.parts?.length) throw new Error("BOM 没抽出来: " + bomText.slice(0, 200));
  const bomMs = Date.now() - t0;
  const bomSuspect = !bom.parts.some((p) => /侧板|竖板|旁板|立板/.test(p.name));
  console.log(`BOM: ${bom.product?.name ?? "?"} 零件 ${bom.parts.length} 条, 五金 ${bom.hardware?.length ?? 0} 条`);
  if (bomSuspect) console.warn("注意: BOM 里没有侧板类零件, 这张表大概率没读对, 后面的验收会判失败");
  bom.parts.forEach((p) => console.log(`   ${p.label} ${p.name} x${p.qty}${p.size ? " " + p.size.join("x") : ""}`));

  // ② 逐页笔记
  const notes: unknown[] = [];
  for (const [i, file] of files.entries()) {
    const text = await chat(
      key,
      [{ role: "user", content: [{ type: "text", text: PAGE_PROMPT_ZH }, imageBlock(file)] }],
      4000,
      true,
    );
    const note = extractJson(text) ?? { kind: "other" };
    notes.push(note);
    const n = note as { kind?: string; steps?: unknown[] };
    console.log(`第 ${i + 1} 页: kind=${n.kind ?? "?"} steps=${n.steps?.length ?? 0}`);
  }

  // ③ 受 BOM 约束的规划
  const planText = await chat(
    key,
    [
      { role: "system", content: bomPlanPrompt(JSON.stringify(bom, null, 2)) },
      {
        role: "user",
        content: notes.map((n, i) => `第 ${i + 1} 页: ${JSON.stringify(n)}`).join("\n"),
      },
    ],
    16000,
    true,
  );
  const raw = extractJson(planText) as DraftSpec | null;
  if (!raw?.parts?.length) throw new Error("规划阶段没给出计划: " + planText.slice(0, 200));

  // ④ 约束与校验
  const constrained = constrainSpec(raw, bom);
  const checks = validatePlan(constrained.spec, bom, { productW: bom.product?.size?.w ?? raw.size?.w });
  const seconds = Math.round((Date.now() - t0) / 1000);

  fs.mkdirSync("out", { recursive: true });
  fs.writeFileSync("out/scan-bom.json", JSON.stringify({ bom, raw, spec: constrained.spec, checks, seconds }, null, 2), "utf8");

  const report = {
    seconds,
    bomMs,
    product: bom.product?.name ?? "",
    sizes: { bom: bom.parts.length, raw: raw.parts.length, final: constrained.spec.parts.length },
    merged: constrained.merged,
    dropped: constrained.dropped,
    bomSuspect,
    steps: constrained.spec.steps.length,
    checks,
  };
  fs.writeFileSync("out/scan-bom-report.json", JSON.stringify(report, null, 2), "utf8");

  console.log(`\n合并劈半: ${constrained.merged} 处; 按 BOM 丢弃: ${constrained.dropped} 个; 最终 ${constrained.spec.parts.length} 个零件 / ${constrained.spec.steps.length} 步`);
  for (const c of checks) console.log(`  ${c.pass ? "PASS" : "FAIL"} ${c.id} ${c.title} — ${c.detail}`);
  console.log(`\n耗时 ${seconds} 秒; 报告 out/scan-bom-report.json`);

  const hard = checks.filter((c) => ["A1", "A2", "A3", "A5"].includes(c.id));
  if (hard.some((c) => !c.pass)) process.exitCode = 2;
}

main().catch((e) => {
  console.error("失败:", (e as Error).message);
  process.exit(1);
});
