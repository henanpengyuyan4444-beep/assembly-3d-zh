/**
 * BOM 先行：把手册扫描拆成"先定零件表，再排步骤"两段，并在合成阶段做硬约束。
 *
 * 这里只有纯函数，不碰网络，方便离线自检（scripts/scan-bom-check.ts）。
 */
import type { Vec3 } from "../types";

export type BomPart = {
  label: string;
  name: string;
  qty: number;
  /** 毫米，[宽, 高, 深]；图上没标就留空 */
  size?: Vec3 | null;
};

export type BomHardware = { kind: string; qty: number; size?: string };

export type Bom = {
  product?: { name?: string; brand?: string; size?: { w: number; h: number; d: number } };
  parts: BomPart[];
  hardware: BomHardware[];
};

export type DraftPart = {
  id: string;
  label?: string;
  name: string;
  size: Vec3;
  pos: Vec3;
  material?: "board" | "fiber" | "wood" | "metal" | "soft";
};

export type DraftStep = {
  title: string;
  detail?: string;
  add?: string[];
  fix?: { kind: string; count?: number; to?: string[] }[];
  tools?: string[];
  pose?: string;
  warnings?: string[];
};

export type DraftSpec = {
  name?: string;
  brand?: string;
  variant?: string;
  size?: { w: number; h: number; d: number };
  parts: DraftPart[];
  steps: DraftStep[];
};

/** 零件的结构类别：同类的板在计划里只应该出现 BOM 规定的次数。 */
export type PartKind = "vertical" | "shelf" | "top" | "bottom" | "back" | "plinth" | "other";

const SYNONYMS: [PartKind, RegExp][] = [
  ["back", /背板|后背|背条/],
  ["plinth", /踢脚|底条|踢脚板/],
  ["top", /顶板|台面|上盖/],
  ["bottom", /底板|下板/],
  ["vertical", /侧板|竖板|旁板|立板|边框/],
  ["shelf", /层板|搁板|隔板|横板|活动板/],
];

export function kindOf(name: string): PartKind {
  for (const [kind, re] of SYNONYMS) if (re.test(name)) return kind;
  return "other";
}

/** 名称归一：去空格标点，转小写，便于跨语言比较。 */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[\s_\-()（）,，.。/\\]+/g, "");
}

/** BOM 里某一类的合计数量；BOM 没提到这一类时返回 null（表示无从约束）。 */
const VERTICAL_NAME = /侧板|竖板|旁板|立板/;

/**
 * BOM 里某一类的合计数量。竖板按名称判定（不含"隔板"这类可能竖放的内部件），
 * BOM 没提到这一类时返回 null（表示无从约束）。
 */
export function bomQtyOf(bom: Bom, kind: PartKind): number | null {
  const items = bom.parts.filter((p) => (kind === "vertical" ? VERTICAL_NAME.test(p.name) : kindOf(p.name) === kind));
  if (!items.length) return null;
  return items.reduce((n, p) => n + Math.max(1, Math.round(p.qty || 1)), 0);
}

/** 计划里零件的结构类别：高度超过 1000mm 的板一律算竖板，哪怕它叫"隔板"。 */
export function structKind(p: DraftPart): PartKind {
  const byName = kindOf(p.name);
  if (byName === "back") return "back";
  if (VERTICAL_NAME.test(p.name)) return "vertical"; // 侧板哪怕只有 800 高也算
  if (byName === "shelf" && p.size[1] > 800) return "vertical"; // 高"隔板"其实是竖板
  return byName;
}

const isFullWidth = (w: number, productW: number | undefined) => !productW || w >= productW * 0.8;

/**
 * 把被劈成两半的板合回一块：同名、同 y/z、x 左右对称、各自都不够整宽，
 * 合起来接近整机宽度。返回合并后的零件列表。
 */
export function mergeSplitHalves(parts: DraftPart[], productW?: number): { parts: DraftPart[]; merged: number } {
  if (!productW) return { parts, merged: 0 };
  const out: DraftPart[] = [];
  const used = new Set<number>();
  let merged = 0;

  parts.forEach((p, i) => {
    if (used.has(i)) return;
    if (kindOf(p.name) !== "shelf" || isFullWidth(p.size[0], productW)) return;
    const mate = parts.findIndex((q, j) => {
      if (j <= i || used.has(j)) return false;
      if (kindOf(q.name) !== "shelf") return false;
      if (isFullWidth(q.size[0], productW)) return false;
      const sameRow = Math.abs(q.pos[1] - p.pos[1]) < 20 && Math.abs(q.pos[2] - p.pos[2]) < 20;
      const mirrored = Math.abs(q.pos[0] + p.pos[0]) < 20;
      const sameWidth = Math.abs(q.size[0] - p.size[0]) < 20;
      if (!(sameRow && mirrored && sameWidth)) return false;
      // 两半之间夹着竖板时, 它们是两列各自的层板, 不能合并
      const between = parts.findIndex((v, k) => {
        if (k === i || k === j) return false;
        if (structKind(v) !== "vertical") return false;
        const insideX = Math.abs(v.pos[0]) < Math.abs(p.pos[0]) - 1;
        const overlapY = Math.abs(v.pos[1] - p.pos[1]) < v.size[1] / 2 + 20;
        return insideX && overlapY;
      });
      return between < 0;
    });
    if (mate < 0) return;
    const q = parts[mate];
    used.add(i);
    const width = p.size[0] + q.size[0] + Math.abs(q.pos[0] - p.pos[0]) - p.size[0] / 2 - q.size[0] / 2;
    used.add(mate);
    merged++;
    out.push({
      ...p,
      name: p.name.replace(/^\s*(左|右|上|下)\s*/, ""),
      size: [Math.round(width), p.size[1], p.size[2]],
      pos: [0, p.pos[1], p.pos[2]],
    });
  });

  return { parts: out.concat(parts.filter((_, i) => !used.has(i))), merged };
}

/** 按 BOM 的类别数量裁剪：多出来的同类零件丢掉（保留最靠中、尺寸最大的）。 */
export function enforceBomQty(parts: DraftPart[], bom: Bom): { parts: DraftPart[]; dropped: DraftPart[] } {
  const kept: DraftPart[] = [];
  const dropped: DraftPart[] = [];
  const kinds: PartKind[] = ["vertical", "shelf", "top", "bottom", "back", "plinth"];

  for (const kind of kinds) {
    const group = parts.filter((p) => structKind(p) === kind);
    const qty = bomQtyOf(bom, kind);
    if (qty === null) {
      kept.push(...group);
      continue;
    }
    const ranked = [...group].sort((a, b) => {
      // 优先保留名字就是"侧板"的外侧板, 中隔板之类排后面
      const named = (x: DraftPart) => (VERTICAL_NAME.test(x.name) ? 0 : 1);
      const area = (x: DraftPart) => x.size[0] * x.size[1];
      const outer = (x: DraftPart) => Math.abs(x.pos[0]);
      return named(a) - named(b) || area(b) - area(a) || outer(b) - outer(a);
    });
    kept.push(...ranked.slice(0, qty));
    dropped.push(...ranked.slice(qty));
  }

  const others = parts.filter((p) => kindOf(p.name) === "other");
  return { parts: kept.concat(others), dropped };
}

/** 丢掉 BOM 里没有的零件类别（BOM 完全为空时不做约束）。 */
export function dropUnknownKinds(parts: DraftPart[], bom: Bom): { parts: DraftPart[]; dropped: DraftPart[] } {
  if (!bom.parts.length) return { parts, dropped: [] };
  const known = new Set(bom.parts.map((p) => kindOf(p.name)));
  const dropped = parts.filter((p) => !known.has(kindOf(p.name)));
  return { parts: parts.filter((p) => known.has(kindOf(p.name))), dropped };
}

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // 24 个，去掉容易看错的 I 和 O

/** 下标 → 唯一 id：A..Z，之后 AA、AB…，不会回绕撞车。 */
export function idAt(i: number): string {
  const round = Math.floor(i / LETTERS.length);
  const letter = LETTERS[i % LETTERS.length];
  return round === 0 ? letter : `${LETTERS[(round - 1) % LETTERS.length]}${letter}`;
}

/** 重新编号，避免删除后 id 出现空洞被引擎当成缺件。 */
export function renumber<T extends { id: string }>(parts: T[]): T[] {
  return parts.map((p, i) => ({ ...p, id: idAt(i) }));
}

export type ValidateOptions = { productW?: number; minSteps?: number };

export type Check = { id: string; title: string; pass: boolean; detail: string };

/** 按规格文档里的 A1 到 A4 逐条判定。 */
export function validatePlan(spec: DraftSpec, bom: Bom, opts: ValidateOptions = {}): Check[] {
  const productW = opts.productW ?? spec.size?.w ?? bom.product?.size?.w;
  const verticals = spec.parts.filter((p) => structKind(p) === "vertical");
  const verticalQty = bomQtyOf(bom, "vertical");
  // 层板是薄板: 高 1764 的"隔板"是竖板, 不算层板
  const shelves = spec.parts.filter((p) => kindOf(p.name) === "shelf" && p.size[1] < 100);

  const checks: Check[] = [];

  // BOM 里没有侧板类 = 这张表没读对，不能拿"≤2"糊弄过去
  checks.push({
    id: "A1",
    title: "竖板数量与 BOM 一致",
    pass: verticalQty !== null && verticals.length === verticalQty,
    detail: verticalQty === null ? `BOM 没抽到侧板类零件，判失败（计划 ${verticals.length} 块）` : `计划 ${verticals.length} 块，BOM ${verticalQty}`,
  });

  const narrow = shelves.filter((p) => !isFullWidth(p.size[0], productW));
  const saneW = typeof productW === "number" && productW >= 200;
  const shelfQty = bomQtyOf(bom, "shelf");
  const emptyShelves = (shelfQty ?? 0) > 0 && shelves.length === 0;
  checks.push({
    id: "A2",
    title: "层板没有被劈成两半",
    pass: saneW && narrow.length === 0 && !emptyShelves,
    detail: !saneW
      ? `整机宽度不可用（${productW ?? "缺"}mm），判失败`
      : emptyShelves
        ? `BOM 有 ${shelfQty} 块层板，计划里一块都没有`
        : `整机宽 ${productW}mm，窄于 80% 的层板 ${narrow.length} 块`,
  });

  const known = new Set(spec.parts.map((p) => kindOf(p.name)));
  const missing = bom.parts.filter((p) => !known.has(kindOf(p.name)));
  const used = new Set<string>();
  spec.steps.forEach((s) => (s.add ?? []).forEach((id) => used.add(id)));
  const unknownIds = [...used].filter((id) => !spec.parts.some((p) => p.id === id));
  checks.push({
    id: "A3",
    title: "引用闭合：步骤只用计划里的零件，BOM 的零件都用上",
    pass: missing.length === 0 && unknownIds.length === 0,
    detail: `步骤引用了不存在的 id: ${unknownIds.length} 个；BOM 里没被用到的类别: ${missing.length ? missing.map((m) => m.name).join(", ") : "无"}`,
  });

  const titles = spec.steps.map((s) => s.title).join(" ");
  const wanted: [string, RegExp][] = [
    ["侧板/底板", /侧板|竖板|底板|框体/],
    ["锁紧", /锁紧|拧紧|偏心|螺丝/],
    ["层板", /层板|搁板|隔板/],
    ["背板", /背板/],
    ["上墙", /墙|固定/],
  ];
  const hit = wanted.filter(([, re]) => re.test(titles)).map(([name]) => name);
  const mismatches: string[] = [];
  (["vertical", "shelf", "top", "bottom", "back", "plinth"] as PartKind[]).forEach((k) => {
    const want = bomQtyOf(bom, k);
    if (want === null) return;
    const got = spec.parts.filter((p) => structKind(p) === k).length;
    if (got !== want) mismatches.push(`${k}: 计划 ${got} / BOM ${want}`);
  });
  checks.push({
    id: "A5",
    title: "各类零件数量与 BOM 对账",
    pass: mismatches.length === 0,
    detail: mismatches.length ? mismatches.join("; ") : "各类数量一致",
  });

  checks.push({
    id: "A4",
    title: "步骤覆盖五类动作",
    pass: spec.steps.length >= (opts.minSteps ?? 8) && hit.length >= 4,
    detail: `${spec.steps.length} 步，命中: ${hit.join(", ") || "无"}`,
  });

  return checks;
}

/** 一把梭：合并劈半 → 按 BOM 裁剪 → 去掉 BOM 没有的类别 → 重新编号。 */
export function constrainSpec(spec: DraftSpec, bom: Bom) {
  const productW = spec.size?.w ?? bom.product?.size?.w;
  const mergedRes = mergeSplitHalves(spec.parts, productW);
  const qtyRes = enforceBomQty(mergedRes.parts, bom);
  const knownRes = dropUnknownKinds(qtyRes.parts, bom);
  const survivors = knownRes.parts;
  const parts = renumber(survivors);

  // 步骤里的 id 跟着重编号走：按对象身份一一对应，不靠名字猜
  const oldToNew = new Map<string, string>();
  survivors.forEach((p, i) => oldToNew.set(p.id, parts[i].id));

  const remap = (ids: string[] | undefined) =>
    (ids ?? []).map((id) => oldToNew.get(id)).filter((id): id is string => !!id && parts.some((p) => p.id === id));

  const steps = spec.steps.map((s) => ({
    ...s,
    add: remap(s.add),
    fix: s.fix?.map((f) => ({ ...f, ...(f.to ? { to: remap(f.to) } : {}) })),
  }));

  const ids = new Set(parts.map((p) => p.id));
  if (ids.size !== parts.length) throw new Error("重编号后 id 重复: " + parts.map((p) => p.id).join(","));

  return {
    spec: { ...spec, parts, steps } as DraftSpec,
    merged: mergedRes.merged,
    dropped: qtyRes.dropped.length + knownRes.dropped.length,
  };
}
