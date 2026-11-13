/**
 * 离线自检：不调 API，只验 BOM 约束与校验逻辑本身。
 *
 *   node --experimental-transform-types --no-warnings --import ./scripts/voice/register.mjs \
 *     scripts/scan-bom-check.ts
 */
import {
  bomQtyOf,
  constrainSpec,
  dropUnknownKinds,
  enforceBomQty,
  kindOf,
  mergeSplitHalves,
  renumber,
  validatePlan,
  type Bom,
  type DraftPart,
  type DraftSpec,
} from "@/lib/scan/bom";

let failed = 0;
function check(name: string, pass: boolean, detail = "") {
  if (!pass) failed++;
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
}
const near = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol;

const part = (id: string, name: string, size: [number, number, number], pos: [number, number, number]): DraftPart => ({
  id,
  name,
  size,
  pos,
});

/* ---------- 1. 名称归类 ---------- */
check("侧板 → vertical", kindOf("左侧板") === "vertical");
check("层板 → shelf", kindOf("可调层板") === "shelf");
check("背板 → back", kindOf("背板") === "back");

/* ---------- 2. 劈半合并 ---------- */
const halves = [
  part("F", "层板", [323, 18, 320], [-170.5, 454.5, 0]),
  part("G", "层板", [323, 18, 320], [170.5, 454.5, 0]),
  part("H", "层板", [700, 18, 320], [0, 900, 0]),
];
const merged = mergeSplitHalves(halves, 700);
check("两块半板合并成一块", merged.merged === 1, `merged=${merged.merged}`);
check("合并后宽度等于两块半板外缘之和", merged.parts.some((p) => near(p.size[0], 664, 8)), `${merged.parts.map((p) => p.size[0]).join(",")}`);
check("整宽层板原样保留", merged.parts.filter((p) => near(p.size[0], 700, 4)).length === 1 && merged.parts.length === 2, `${merged.parts.length} 块`);

/* ---------- 3. 按 BOM 数量裁剪 ---------- */
const bom: Bom = {
  product: { name: "测试柜", size: { w: 700, h: 1800, d: 320 } },
  parts: [
    { label: "1", name: "侧板", qty: 2 },
    { label: "4", name: "层板", qty: 2 },
    { label: "5", name: "背板", qty: 1 },
  ],
  hardware: [{ kind: "dowel", qty: 16 }],
};
check("BOM 竖板数量 = 2", bomQtyOf(bom, "vertical") === 2);

const threeVerticals = [
  part("A", "左侧板", [18, 1764, 320], [-341, 900, 0]),
  part("B", "中隔板", [18, 1764, 320], [0, 900, 0]),
  part("C", "右侧板", [18, 1764, 320], [341, 900, 0]),
];
const enforced = enforceBomQty(threeVerticals, bom);
check("多出来的第三块竖板被丢掉", enforced.parts.length === 2 && enforced.dropped.length === 1, `${enforced.parts.length}/${enforced.dropped.length}`);

const unknown = dropUnknownKinds([...threeVerticals, part("P", "随机零件", [10, 10, 10], [0, 0, 0])], bom);
check("BOM 里没有的类别被丢掉", unknown.dropped.length === 1);

const renamed = renumber([part("Z", "侧板", [18, 1000, 300], [0, 500, 0]), part("Y", "背板", [700, 1800, 3], [0, 900, -150])]);
check("重新编号从 A 开始", renamed[0].id === "A" && renamed[1].id === "B");

/* ---------- 4. 一整条约束链 ---------- */
const badSpec: DraftSpec = {
  size: { w: 700, h: 1800, d: 320 },
  parts: [
    part("A", "左侧板", [18, 1764, 320], [-341, 900, 0]),
    part("B", "右侧板", [18, 1764, 320], [341, 900, 0]),
    part("F", "层板", [323, 18, 320], [-170.5, 454.5, 0]),
    part("G", "层板", [323, 18, 320], [170.5, 454.5, 0]),
    part("H", "层板", [323, 18, 320], [-170.5, 900, 0]),
    part("I", "层板", [323, 18, 320], [170.5, 900, 0]),
    part("J", "背板", [700, 1800, 3], [0, 900, -150]),
  ],
  steps: [
    { title: "把侧板和底板装起来", add: ["A", "B"] },
    { title: "锁紧偏心轮" },
    { title: "装入层板", add: ["F", "G", "H", "I"] },
    { title: "钉上背板", add: ["J"] },
    { title: "固定到墙上" },
    { title: "检查方正" },
    { title: "再检查一次" },
    { title: "收尾" },
  ],
};
const before = validatePlan(badSpec, bom);
check("改造前 A2 失败", before.find((c) => c.id === "A2")?.pass === false);

const fixed = constrainSpec(badSpec, bom);
const after = validatePlan(fixed.spec, bom);
check("约束后 A1 通过", after.find((c) => c.id === "A1")?.pass === true, after.find((c) => c.id === "A1")?.detail);
check("约束后 A2 通过", after.find((c) => c.id === "A2")?.pass === true, after.find((c) => c.id === "A2")?.detail);
check("没有中隔板时合并 2 处劈半", fixed.merged === 2, `merged=${fixed.merged}`);
check("最终零件数 = BOM 展开数", fixed.spec.parts.length === 5, `${fixed.spec.parts.length}`);
check("步骤里不再引用被删的 id", fixed.spec.steps.every((s) => (s.add ?? []).every((id) => fixed.spec.parts.some((p) => p.id === id))));

/* ---------- 5. 引用闭合的反例 ---------- */
const ghost: DraftSpec = { ...fixed.spec, steps: [...fixed.spec.steps, { title: "装一个不存在的板", add: ["Z"] }] };
check("引用不存在的 id 判 A3 失败", validatePlan(ghost, bom).find((c) => c.id === "A3")?.pass === false);


/* ---------- 6. 评审反例：fix.to 跟着重编号 ---------- */
const fixSpec: DraftSpec = {
  size: { w: 700, h: 1800, d: 320 },
  parts: [
    part("A", "左侧板", [18, 1764, 320], [-341, 900, 0]),
    part("B", "右侧板", [18, 1764, 320], [341, 900, 0]),
    part("C", "层板", [664, 18, 320], [0, 454.5, 0]),
    part("D", "层板", [664, 18, 320], [0, 900, 0]),
    part("E", "背板", [700, 1800, 3], [0, 900, -150]),
  ],
  steps: [{ title: "锁紧", fix: [{ kind: "cam", count: 4, to: ["A", "B"] }] }],
};
const fixOut = constrainSpec(fixSpec, bom);
const toIds = fixOut.spec.steps[0].fix?.[0]?.to ?? [];
check("fix.to 指向仍然存在的零件", toIds.length === 2 && toIds.every((id) => fixOut.spec.parts.some((p) => p.id === id)), toIds.join(","));
check("fix.to 跟着重编号走", toIds.join(",") === "A,B", toIds.join(","));

/* ---------- 7. 悬空 id 被丢掉，不会复活 ---------- */
const ghostSpec: DraftSpec = { ...fixSpec, steps: [{ title: "装不存在", add: ["Z"], fix: [{ kind: "screw", to: ["Z"] }] }] };
const ghostOut = constrainSpec(ghostSpec, bom);
check("被删零件的 id 不会留给别的零件", ghostOut.spec.steps[0].add?.length === 0, JSON.stringify(ghostOut.spec.steps[0]));
check("fix.to 里的悬空 id 也被清掉", (ghostOut.spec.steps[0].fix?.[0]?.to ?? []).length === 0);

/* ---------- 8. 两列柜：中间有竖板时不许合并 ---------- */
const twoCol = [
  part("V", "中隔板", [18, 1764, 320], [0, 900, 0]),
  part("F", "层板", [323, 18, 320], [-170.5, 454.5, 0]),
  part("G", "层板", [323, 18, 320], [170.5, 454.5, 0]),
];
const twoColOut = mergeSplitHalves(twoCol, 700);
check("中间夹着竖板的两块板不合并", twoColOut.merged === 0, `merged=${twoColOut.merged}`);

/* ---------- 9. 超过 24 个零件不撞 id ---------- */
const many = Array.from({ length: 30 }, (_, i) => part(String(i), "层板", [664, 18, 320], [0, 100 + i * 30, 0]));
const ids = new Set(renumber(many).map((p) => p.id));
check("30 个零件 id 仍唯一", ids.size === 30, `${ids.size}`);
check("第 25 个 id 是双字母", renumber(many)[24].id.length === 2, renumber(many)[24].id);

/* ---------- 10. 小家具：800 高的侧板也算竖板 ---------- */
const smallBom: Bom = { product: { size: { w: 500, h: 800, d: 300 } }, parts: [{ label: "1", name: "侧板", qty: 2 }], hardware: [] };
const smallSpec: DraftSpec = {
  size: { w: 500, h: 800, d: 300 },
  parts: [part("A", "左侧板", [18, 760, 300], [-241, 380, 0]), part("B", "右侧板", [18, 760, 300], [241, 380, 0])],
  steps: [],
};
check("800 高的侧板也认作竖板", validatePlan(smallSpec, smallBom).find((c) => c.id === "A1")?.pass === true);

/* ---------- 11. BOM 有层板但一块都没排出来 ---------- */
const noShelf: DraftSpec = { ...smallSpec, parts: [part("A", "左侧板", [18, 760, 300], [-241, 380, 0]), part("B", "右侧板", [18, 760, 300], [241, 380, 0])] };
const shelfBom: Bom = { ...smallBom, parts: [{ label: "1", name: "侧板", qty: 2 }, { label: "2", name: "层板", qty: 2 }] };
check("少排层板时 A2 判失败", validatePlan(noShelf, shelfBom).find((c) => c.id === "A2")?.pass === false);
check("少排层板时 A5 判失败", validatePlan(noShelf, shelfBom).find((c) => c.id === "A5")?.pass === false);


/* ---------- 12. 多出来的第三块竖板被裁掉 ---------- */
const threePanel: DraftSpec = {
  size: { w: 700, h: 1800, d: 320 },
  parts: [
    part("A", "左侧板", [18, 1764, 320], [-341, 900, 0]),
    part("B", "右侧板", [18, 1764, 320], [341, 900, 0]),
    part("E", "中隔板", [18, 1764, 320], [0, 900, 0]),
    part("C", "层板", [664, 18, 320], [0, 454.5, 0]),
    part("D", "层板", [664, 18, 320], [0, 900, 0]),
  ],
  steps: [{ title: "装侧板" }],
};
const threeOut = constrainSpec(threePanel, bom);
check("三块竖板裁成两块", threeOut.spec.parts.filter((p) => p.size[1] > 1000).length === 2, `${threeOut.spec.parts.length} 个零件`);
check("三块竖板时 A1 通过", validatePlan(threeOut.spec, bom).find((c) => c.id === "A1")?.pass === true);

console.log(`\n${failed === 0 ? "全部通过" : failed + " 项失败"}`);
if (failed) process.exitCode = 1;
