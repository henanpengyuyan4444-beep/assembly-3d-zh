/**
 * 复查：拿上一次在线运行存下来的 out/scan-bom.json，用最新的校验规则重算，不花 API 钱。
 *
 *   node --experimental-transform-types --no-warnings --import ./scripts/voice/register.mjs \
 *     scripts/scan-bom-review.ts [out/scan-bom.json]
 */
import fs from "node:fs";
import { validatePlan, type Bom, type DraftSpec } from "@/lib/scan/bom";

const file = process.argv[2] ?? "out/scan-bom.json";
if (!fs.existsSync(file)) {
  console.error("找不到 " + file + "，先跑 scripts/scan-bom.ts");
  process.exit(1);
}

const saved = JSON.parse(fs.readFileSync(file, "utf8")) as {
  bom: Bom;
  spec: DraftSpec;
  raw?: DraftSpec;
  seconds?: number;
};

const bom = saved.bom;
const spec = saved.spec;
const checks = validatePlan(spec, bom, { productW: bom.product?.size?.w ?? spec.size?.w });

const verticals = spec.parts.filter((p) => p.size[1] > 1000 && !/背板/.test(p.name));
console.log(`BOM 零件 ${bom.parts.length} 条：${bom.parts.map((p) => `${p.name}x${p.qty}`).join(", ")}`);
console.log(`计划零件 ${spec.parts.length} 个，竖板 ${verticals.length} 块，步骤 ${spec.steps.length} 步`);
console.log(`BOM 整机尺寸：${bom.product?.size ? `${bom.product.size.w}x${bom.product.size.h}x${bom.product.size.d}` : "缺"}`);
for (const c of checks) console.log(`  ${c.pass ? "PASS" : "FAIL"} ${c.id} ${c.title} — ${c.detail}`);

const hard = checks.filter((c) => ["A1", "A2", "A3", "A5"].includes(c.id));
const pass = hard.every((c) => c.pass);
console.log(`\n结论：${pass ? "硬性标准全部通过" : "硬性标准未通过，扫描只能当草稿"}`);
if (!pass) process.exitCode = 2;
