import type { Family } from "./family";
import type { CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * BLÄDDRA mini chest, read from its manual. No tools and no fittings: the felt case is opened out and zipped along
 * its edge so it holds its shape, each of the three drawers is pulled open by its sides and takes a stiff bottom
 * board, and the drawers slide into the case.
 */

function recipe(s: ProductSpec): CustomParams | null {
  if (!/chest|drawer/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
  // IKEA's measures: 33 wide, 33 high, 38 deep
  const W = 330, H = 330, D = 380, t = 10;
  const parts: CustomPart[] = [];
  const rel = (c: Vec3, p: Vec3): Vec3 => [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
  const caseC: Vec3 = [0, H / 2, 0];
  const casePieces: PartPiece[] = [
    { shape: "box", size: [W, t, D], pos: rel(caseC, [0, H - t / 2, 0]) },
    { shape: "box", size: [W, t, D], pos: rel(caseC, [0, t / 2, 0]) },
    { shape: "box", size: [t, H - 2 * t, D], pos: rel(caseC, [-W / 2 + t / 2, H / 2, 0]) },
    { shape: "box", size: [t, H - 2 * t, D], pos: rel(caseC, [W / 2 - t / 2, H / 2, 0]) },
    { shape: "box", size: [W - 2 * t, H - 2 * t, t], pos: rel(caseC, [0, H / 2, -D / 2 + t / 2]) },
  ];
  parts.push({ id: "CASE", name: "Case", size: [W, H, D], pos: caseC, pieces: casePieces, material: "soft" });

  // three drawers stacked in the opening, each an open felt box with a ring pull, and a board in its bottom
  const dw = W - 2 * t - 6, dd = D - t - 8, gap = 4;
  const dh = (H - 2 * t - 4 * gap) / 3;
  const drawerIds: string[] = [];
  const boardIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const y0 = t + gap + i * (dh + gap);
    const c: Vec3 = [0, y0 + dh / 2, D / 2 - dd / 2];
    const f = 6;
    const pieces: PartPiece[] = [
      { shape: "box", size: [dw, dh, f], pos: [0, 0, dd / 2 - f / 2] },
      { shape: "box", size: [dw, dh - 10, f], pos: [0, -5, -dd / 2 + f / 2] },
      { shape: "box", size: [f, dh - 10, dd - 2 * f], pos: [-dw / 2 + f / 2, -5, 0] },
      { shape: "box", size: [f, dh - 10, dd - 2 * f], pos: [dw / 2 - f / 2, -5, 0] },
      { shape: "box", size: [dw, f, dd], pos: [0, -dh / 2 + f / 2, 0] },
      { shape: "cyl", size: [28, 4, 28], pos: [0, 4, dd / 2 + 2], rot: [Math.PI / 2, 0, 0], material: "metal" },
    ];
    const id = `D${i + 1}`;
    parts.push({ id, name: "Drawer", size: [dw, dh, dd + 4], pos: [c[0], c[1], c[2] + 2], pieces: pieces.map((p) => ({ ...p, pos: [p.pos[0], p.pos[1], p.pos[2] - 2] as Vec3 })), material: "soft" });
    const bid = `B${i + 1}`;
    parts.push({ id: bid, name: "Bottom board", size: [dw - 2 * f - 4, 3, dd - 2 * f - 4], pos: [0, y0 + f + 1.5, c[2]], material: "fiber" });
    drawerIds.push(id);
    boardIds.push(bid);
  }

  const out = 520;
  const steps: CustomStep[] = [
    {
      title: "Open out the case and zip it shut",
      detail: "Unfold it so it stands square, then run the zip all along its edge. Throw away the packaging tag.",
      add: ["CASE"],
    },
    {
      title: "Open out each drawer and drop in its bottom",
      detail: "Pull the sides apart until the drawer stands square, then lay the stiff board flat in the bottom. Do the same with all three.",
      add: drawerIds.flatMap((d, i) => [d, boardIds[i]]),
      from: Object.fromEntries([...drawerIds.map((d) => [d, [0, 0, out] as Vec3]), ...boardIds.map((b) => [b, [0, 260, out] as Vec3])]),
      repeat: 3,
    },
    { title: "Slide the drawers into the case", detail: "Push each one in until its front lines up with the edge of the case." },
  ];
  return { parts, steps };
}

const family: Family = { names: ["BLÄDDRA", "BLADDRA"], recipe };
export default family;
