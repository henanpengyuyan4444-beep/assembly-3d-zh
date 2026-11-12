import type { Family } from "./family";
import type { CustomPart, CustomParams, CustomStep, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";
import { boxOf } from "../custom";

/**
 * GRÖNSTA, read from IKEA's manuals: no fittings at all. The chair (with or without armrests, one manual) is a
 * moulded shell laid upside down on something soft, with four wooden legs turned into its sockets by hand until
 * their collars sit tight. The bar stool is the same, upside down on a table: the four upper legs go in, the
 * footrest frame is pushed down over their ends, and the four lower legs are turned into the footrest's corners.
 */

interface Pc {
  size: Vec3;
  pos: Vec3;
  rot?: Vec3;
  shape?: "box" | "cyl";
  material?: PartMaterial;
}

/** A round leg from a to b (its axis turned from upright onto the line between them). */
function rod(a: Vec3, b: Vec3, dia: number): Pc {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const u = d.map((v) => v / len) as Vec3;
  if (u[1] < 0) u.forEach((_, i) => (u[i] = -u[i]));
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(u[2], u[1]), 0, -Math.asin(u[0])] };
}

const part = (id: string, name: string, p: Pc, material: PartMaterial): CustomPart => ({ id, name, size: p.size, pos: p.pos, rot: p.rot, shape: p.shape, material: p.material ?? material });

function group(id: string, name: string, pcs: Pc[], material: PartMaterial): CustomPart {
  const bs = pcs.map((p) => boxOf(p));
  const lo = [0, 1, 2].map((k) => Math.min(...bs.map((b) => b.min[k])));
  const hi = [0, 1, 2].map((k) => Math.max(...bs.map((b) => b.max[k])));
  const pos = [0, 1, 2].map((k) => Math.round(((lo[k] + hi[k]) / 2) * 10) / 10) as Vec3;
  const size = [0, 1, 2].map((k) => Math.round((hi[k] - lo[k]) * 10) / 10) as Vec3;
  const pieces: PartPiece[] = pcs.map((p) => ({ shape: p.shape ?? "box", size: p.size, pos: [p.pos[0] - pos[0], p.pos[1] - pos[1], p.pos[2] - pos[2]], rot: p.rot, material: p.material ?? material }));
  return { id, name, size, pos, pieces, material };
}

const CORNERS: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

function chair(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const arms = /arm/i.test(s.variant);
  const ST = (s.seat?.seatH ?? 45) * 10;
  const t = 14; // the shell's wall
  const pan0 = ST - 45;
  const zb = -D / 2 + 20, zf = D / 2 - 10;
  const sw = arms ? W - 40 : W - 60;
  const tilt = 0.14;
  const backH = H - ST + 10;
  const shell: Pc[] = [
    { size: [sw, 45, zf - zb - 30], pos: [0, pan0 + 22.5, (zb + 30 + zf) / 2] },
    { size: [sw - 20, backH, t], pos: [0, ST + backH / 2 - 10, zb + 10 + (Math.sin(tilt) * backH) / 2 - 20], rot: [-tilt, 0, 0] },
  ];
  if (arms) {
    // the shell wraps forward into armrests
    const ah = 230, al = (zf - zb) * 0.62;
    for (const sx of [-1, 1]) shell.push({ size: [t, ah, al], pos: [sx * (sw / 2 - t / 2), ST + ah / 2 - 5, zb + 20 + al / 2] });
  }
  const parts: CustomPart[] = [group("S", arms ? "Shell with armrests" : "Seat shell", shell, "board")];
  const top = (sx: number, sz: number): Vec3 => [sx * (sw / 2 - 90), pan0, sz > 0 ? zf - 110 : zb + 110];
  const foot = (sx: number, sz: number): Vec3 => [sx * (W / 2 - 40), 0, sz > 0 ? D / 2 - 20 : -D / 2 + 30];
  CORNERS.forEach(([sx, sz], i) => parts.push(part(`L${i}`, "Leg", rod(foot(sx, sz), top(sx, sz), 36), "wood")));
  const steps: CustomStep[] = [
    { title: "Lay the shell upside down", detail: "On a rug or the flattened box, so the seat doesn't get scratched.", add: ["S"], pose: "-y", warnings: ["floor"] },
    {
      title: "Screw in the four legs by hand",
      detail: "Clockwise into each socket until the leg's collar sits tight against the shell, with no gap.",
      add: CORNERS.map((_, i) => `L${i}`),
      kind: "legs",
      warnings: ["hand"],
    },
    { title: "Stand the chair up", detail: "Check it stands steady on all four legs.", pose: "+y" },
  ];
  return { parts, steps };
}

function stool(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  // the seat height is in the name ("64 cm"); the catalog's seatH is the stool's full height
  const named = Number(/(\d+) cm/.exec(s.variant)?.[1]);
  const ST = (named > 40 && named < H / 10 ? named : Math.min(s.seat?.seatH ?? 64, H / 10 - 10)) * 10;
  const pan0 = ST - 45;
  const sw = W - 70, sd = D - 60;
  const shell = group("S", "Seat shell", [
    { size: [sw, 45, sd], pos: [0, pan0 + 22.5, 10] },
    { size: [sw - 40, H - ST, 16], pos: [0, ST + (H - ST) / 2 - 5, -sd / 2 + 20], rot: [-0.2, 0, 0] },
  ], "board");
  const yf = Math.round(ST * 0.36); // the footrest
  const top = (sx: number, sz: number): Vec3 => [sx * 130, pan0, sz * 120];
  const bot = (sx: number, sz: number): Vec3 => [sx * (W / 2 - 25), 0, sz * (D / 2 - 25)];
  const mid = (sx: number, sz: number): Vec3 => {
    const a = top(sx, sz), b = bot(sx, sz), k = (a[1] - yf) / a[1];
    return [a[0] + (b[0] - a[0]) * k, yf, a[2] + (b[2] - a[2]) * k];
  };
  const fx = mid(1, 1)[0], fz = mid(1, 1)[2];
  const ring: Pc[] = [
    { size: [2 * fx, 22, 22], pos: [0, yf, fz] },
    { size: [2 * fx, 22, 22], pos: [0, yf, -fz] },
    { size: [22, 22, 2 * fz], pos: [fx, yf, 0] },
    { size: [22, 22, 2 * fz], pos: [-fx, yf, 0] },
    ...CORNERS.map(([sx, sz]): Pc => ({ shape: "cyl", size: [40, 60, 40], pos: [sx * fx, yf, sz * fz] })),
  ];
  const parts: CustomPart[] = [shell, group("F", "Footrest", ring, "board")];
  CORNERS.forEach(([sx, sz], i) => {
    parts.push(part(`U${i}`, "Upper leg", rod(mid(sx, sz), top(sx, sz), 34), "wood"));
    parts.push(part(`B${i}`, "Lower leg", rod(bot(sx, sz), mid(sx, sz), 34), "wood"));
  });
  const ids = (p: string) => CORNERS.map((_, i) => `${p}${i}`);
  const steps: CustomStep[] = [
    {
      title: "Screw the upper legs into the seat",
      detail: "Lay the seat upside down on a table with a cloth under it. Turn each leg in by hand until there is no gap at the socket.",
      add: ["S", ...ids("U")],
      pose: "-y",
      kind: "legs",
      warnings: ["hand", "floor"],
    },
    { title: "Push the footrest down over the legs", detail: "One corner sleeve onto the end of each leg, all the way down.", add: ["F"] },
    {
      title: "Screw the lower legs into the footrest",
      detail: "Clockwise into each corner sleeve until it sits tight, with no gap.",
      add: ids("B"),
      kind: "legs",
      warnings: ["hand"],
    },
    { title: "Stand the stool up", detail: "Check it stands steady on all four legs.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["GRÖNSTA", "GRONSTA"],
  recipe(s) {
    if (/bar stool/i.test(s.variant)) return stool(s);
    if (/chair/i.test(s.variant)) return chair(s);
    return null;
  },
};
export default family;
