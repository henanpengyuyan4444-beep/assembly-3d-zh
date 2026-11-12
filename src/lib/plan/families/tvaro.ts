import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * TVARÖ, read from the seat section's manual. Each section comes as a finished rattan frame. Two sections stand side
 * by side and a double clamp goes round their touching side rails at the back and at the front, each held with one
 * Allen bolt and a nut. The third section is clamped on the same way, then the seat and back cushions go in.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

const TUBE = 34;
const LEAN = 0.137; // the back posts lean back about 8 degrees

/** One seat section's rattan frame, centred on its own middle. */
function frame(w: number, D: number, H: number, ySeat: number): PartPiece[] {
  const xr = w / 2 - TUBE / 2, zf = D / 2 - 30, zb0 = -D / 2 + 110, zb1 = -D / 2 + 20;
  const yc = H / 2;
  const rod = (len: number, axis: "x" | "z", pos: Vec3): PartPiece => ({ shape: "cyl", size: [TUBE, len, TUBE], pos: [pos[0], pos[1] - yc, pos[2]], rot: axis === "x" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0] });
  const postLen = Math.hypot(H, zb0 - zb1);
  const out: PartPiece[] = [];
  for (const sx of [-1, 1]) {
    out.push({ shape: "cyl", size: [TUBE, ySeat, TUBE], pos: [sx * xr, ySeat / 2 - yc, zf] });
    out.push({ shape: "cyl", size: [TUBE, postLen, TUBE], pos: [sx * xr, 0, (zb0 + zb1) / 2], rot: [-LEAN, 0, 0] });
    out.push(rod(zf - zb0 + 60, "z", [sx * xr, ySeat, (zf + zb0) / 2]));
    out.push(rod(zf - zb0, "z", [sx * xr, 130, (zf + zb0) / 2]));
  }
  out.push(rod(2 * xr, "x", [0, ySeat, zf]));
  out.push(rod(2 * xr, "x", [0, 130, zf]));
  out.push(rod(2 * xr, "x", [0, ySeat, zb0 - (zb0 - zb1) * (ySeat / H)]));
  // the woven seat and back
  out.push({ shape: "box", size: [2 * xr - TUBE, 14, zf - zb0], pos: [0, ySeat - yc, (zf + zb0) / 2] });
  const yb = (ySeat + H) / 2 + 20;
  out.push({ shape: "box", size: [2 * xr - TUBE, H - ySeat - 80, 12], pos: [0, yb - yc, zb0 - (zb0 - zb1) * (yb / H)], rot: [-LEAN, 0, 0] });
  return out;
}

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 200 wide, 78 deep, 80 high, seat 47 high; three sections of a third each
  const W = (s.size.w || 200) * 10, D = (s.size.d || 78) * 10, H = (s.size.h || 80) * 10;
  const n = Math.max(1, s.sofa?.seats ?? 3);
  const w = W / n, ySeat = 370, yCush = 470;
  const xOf = (i: number) => -W / 2 + w * (i + 0.5);
  const zb0 = -D / 2 + 110, zb1 = -D / 2 + 20;
  const backZ = (y: number) => zb0 - (zb0 - zb1) * (y / H);
  const parts: CustomPart[] = [];
  for (let i = 0; i < n; i++) parts.push({ id: `F${i}`, name: "Seat section", size: [w, H, D], pos: [xOf(i), H / 2, 0], material: "wood", pieces: frame(w, D, H, ySeat) });
  const cT = yCush - ySeat - 7, cw = w - 30;
  const backFace = backZ(ySeat + 60) + 10;
  const bT = 110, bH = 330;
  const zSeatF = D / 2 - 15;
  for (let i = 0; i < n; i++) {
    const z0 = backFace + bT;
    parts.push({ id: `S${i}`, name: "Seat cushion", size: [cw, cT, zSeatF - z0], pos: [xOf(i), ySeat + 7 + cT / 2, (zSeatF + z0) / 2], material: "soft" });
  }
  for (let i = 0; i < n; i++) {
    const y = yCush + bH / 2;
    parts.push({ id: `B${i}`, name: "Back cushion", size: [cw - 10, bH, bT], pos: [xOf(i), y, backZ(y) + 10 + bT / 2], rot: [-LEAN, 0, 0], material: "soft" });
  }
  // a double clamp round the two touching side rails, at the back and at the front of each joint
  const zf = D / 2 - 30;
  const clampZ = [zb0 + 60, zf - 70];
  const joint = (k: number, z: number): CustomFix[] => {
    const x = -W / 2 + w * (k + 1);
    return [
      fx("clamp", [[x, ySeat, z]], [0, -1, 0], { on: `F${k}`, mate: `F${k + 1}`, name: "Double clamp" }),
      fx("bolt", [[x, ySeat + TUBE / 2 + 6, z]], [0, -1, 0], { on: `F${k}`, len: 30, dia: 6 }),
      fx("nut", [[x, ySeat - TUBE / 2 - 6, z]], [0, 1, 0], { on: `F${k}`, dia: 6 }),
    ];
  };
  const steps: CustomStep[] = [
    { title: "Stand two seat sections side by side", detail: "Push them together so their side rails touch along the whole length.", add: ["F0", "F1"] },
    { title: "Clamp the back rails together", detail: "Fit the clamp round both rails from below, drop the nut into its slot and turn the bolt in from above.", fix: joint(0, clampZ[0]), tools: ["allen"] },
    { title: "Clamp the front rails together", detail: "The same at the front. Tighten both bolts once the sections line up.", fix: joint(0, clampZ[1]), tools: ["allen"] },
  ];
  for (let k = 1; k < n - 1; k++) {
    steps.push({
      title: "Clamp on the next section the same way",
      detail: "Back clamp first, then the front one.",
      add: [`F${k + 1}`],
      fix: [...joint(k, clampZ[0]), ...joint(k, clampZ[1])],
      tools: ["allen"],
    });
  }
  steps.push(
    { title: "Lay in the seat cushions", detail: "One on each section, pushed back against the backrest.", add: Array.from({ length: n }, (_, i) => `S${i}`) },
    { title: "Stand the back cushions in place", detail: "Lean each one on the backrest and push it down onto its seat cushion.", add: Array.from({ length: n }, (_, i) => `B${i}`) },
  );
  return { parts, steps };
}

const family: Family = {
  names: ["TVARÖ", "TVARO"],
  recipe(s) {
    if (!/modular sofa/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return recipe(s);
  },
};
export default family;
