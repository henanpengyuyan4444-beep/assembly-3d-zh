import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartItem, PartPiece, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * KLIPPAN, read from the 2-seat frame's manual and its cover's. No loose cushions: the frame is a sprung seat box
 * that runs the full width, a back frame and two armrests, all padded and lined. The legs screw into the seat box
 * upside down, then it is turned over. The back and the armrests are joined on the floor, upside down: two threaded
 * rods into each end of the back, the armrests pushed on with a washer and a nut on each rod, and two more rods
 * into the foot of each armrest. Turned over, they are lowered onto the seat box together, the sofa is tipped onto
 * its back and four more washers and nuts go on from underneath. The cover is pulled on over the back and the arms,
 * zipped, tucked into the gaps, folded under the frame, and held there by two rods hooked under the springs.
 */

const COV = 8; // the cover's thickness
const STUD = { name: "Threaded rod", len: 70, dia: 8 };

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string | undefined, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

/** A box from its low and high corners, in the finished product. */
const span = (lo: Vec3, hi: Vec3): PartPiece => ({ shape: "box", size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2] });

function sofa(s: ProductSpec): CustomParams {
  // IKEA: 180 wide, 88 deep, 66 high, 11 cm free under it, seat 43 high and 54 deep
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const LEGH = 110, SEAT = 430, ARM = 150;
  const X = W / 2 - COV, Z = D / 2 - COV, TOP = H - COV; // the frames, inside their cover
  const xa = W / 2 - ARM; // inside faces of the armrests
  const zBack = D / 2 - 540 - COV; // front of the back frame: the seat is 54 cm deep
  const box = (id: string, name: string, lo: Vec3, hi: Vec3): CustomPart => ({ id, name, ...span(lo, hi), material: "soft" } as CustomPart);
  const coverAbs: PartPiece[] = [
    span([-W / 2, LEGH, Z], [W / 2, SEAT, D / 2]), // front of the seat box
    span([-W / 2, LEGH, -D / 2], [W / 2, H, -Z]), // the whole back
    ...[-1, 1].flatMap((sx): PartPiece[] => {
      const o = (a: number, b: number): [number, number] => (sx < 0 ? [-b, -a] : [a, b]);
      const [ox0, ox1] = o(X, W / 2), [ax0, ax1] = o(xa, X), [ix0, ix1] = o(xa - COV, xa), [fx0, fx1] = o(xa - COV, W / 2);
      return [
        span([ox0, LEGH, -Z], [ox1, H, Z]), // outside of the armrest and the seat box
        span([ax0, TOP, -Z], [ax1, H, Z]), // top of the armrest
        span([fx0, SEAT, Z], [fx1, H, D / 2]), // front of the armrest
        span([ix0, SEAT + COV, zBack + COV], [ix1, TOP, Z]), // inside of the armrest
      ];
    }),
    span([-xa + COV, SEAT, zBack + COV], [xa - COV, SEAT + COV, Z]), // over the seat
    span([-xa + COV, SEAT + COV, zBack], [xa - COV, TOP, zBack + COV]), // front of the back
    span([-xa, TOP, -Z], [xa, H, zBack + COV]), // top of the back
  ];
  const c: Vec3 = [0, (LEGH + H) / 2, 0];
  const parts: CustomPart[] = [
    box("SEAT", "Seat frame", [-X, LEGH, -Z], [X, SEAT, Z]),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz, i): CustomPart => ({ id: `LEG${sx < 0 ? "L" : "R"}${i}`, name: "Leg", size: [40, LEGH, 40], pos: [sx * (W / 2 - 70), LEGH / 2, sz * (D / 2 - 70)], shape: "cyl", material: "metal" }))),
    box("BACK", "Back frame", [-xa, SEAT, -Z], [xa, TOP, zBack]),
    box("ARM_L", "Armrest", [-X, SEAT, -Z], [-xa, TOP, Z]),
    box("ARM_R", "Armrest", [xa, SEAT, -Z], [X, TOP, Z]),
    { id: "COVER", name: "Cover", size: [W, H - LEGH, D], pos: c, pieces: coverAbs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 })), material: "soft" },
    { id: "ROD_F", name: "Cover rod", size: [14, 2 * xa, 14], pos: [0, LEGH - 7, Z - 60], shape: "cyl", rot: [0, 0, Math.PI / 2], material: "metal" },
    { id: "ROD_B", name: "Cover rod", size: [14, 2 * xa, 14], pos: [0, LEGH - 7, -Z + 60], shape: "cyl", rot: [0, 0, Math.PI / 2], material: "metal" },
  ];
  const legs = parts.filter((p) => p.name === "Leg").map((p) => p.id);
  const ys = [SEAT + 60, TOP - 60];
  const zSide = (zBack - Z) / 2;
  const backRods = (sx: number) => fx("stud", ys.map((y): Vec3 => [sx * xa, y, zSide]), [-sx, 0, 0], "BACK", { ...STUD, mate: sx < 0 ? "ARM_L" : "ARM_R" });
  const armNuts = (sx: number, kind: "washer" | "nut") => fx(kind, ys.map((y): Vec3 => [sx * (xa + 40), y, zSide]), [-sx, 0, 0], sx < 0 ? "ARM_L" : "ARM_R", kind === "nut" ? { len: 7, dia: 8 } : { len: 1.5, dia: 18 });
  const footZ = [-Z + 120, Z - 120];
  const xm = (xa + X) / 2;
  const footRods = (sx: number) => fx("stud", footZ.map((z): Vec3 => [sx * xm, SEAT, z]), [0, 1, 0], sx < 0 ? "ARM_L" : "ARM_R", { ...STUD, mate: "SEAT" });
  const under = (kind: "washer" | "nut") => fx(kind, [-1, 1].flatMap((sx) => footZ.map((z): Vec3 => [sx * xm, LEGH, z])), [0, 1, 0], "SEAT", kind === "nut" ? { len: 7, dia: 8 } : { len: 1.5, dia: 18 });
  const steps: CustomStep[] = [
    {
      title: "Screw the legs into the seat frame",
      detail: "Lay the seat frame upside down on a rug or the flattened box. Turn each leg in by hand until it's snug.",
      add: ["SEAT", ...legs],
      pose: "-y",
      warnings: ["floor"],
    },
    { title: "Turn the seat frame over together", detail: "Lift it by the frame, not by the legs, and stand it on its feet.", pose: "+y", people: 2 },
    {
      title: "Screw two rods into each end of the back",
      detail: "Lay the back frame upside down on the floor. Turn the threaded rods in by hand, about halfway.",
      add: ["BACK"],
      fix: [backRods(-1), backRods(1)],
      pose: "-y",
    },
    {
      title: "Push the armrests on and bolt them",
      detail: "Slide each armrest over its two rods. A washer and a nut on each rod, inside the armrest, tightened with the box spanner.",
      add: ["ARM_L", "ARM_R"],
      fix: [armNuts(-1, "washer"), armNuts(1, "washer"), armNuts(-1, "nut"), armNuts(1, "nut")],
      tools: ["wrench"],
      from: { ARM_L: [-300, 0, 0], ARM_R: [300, 0, 0] },
    },
    {
      title: "Screw two rods into the foot of each armrest",
      detail: "Into the holes in the armrests' undersides, by hand, about halfway.",
      fix: [footRods(-1), footRods(1)],
    },
    { title: "Turn the back and armrests over together", detail: "Lift the whole piece by the armrests and turn it the right way up.", pose: "+y", people: 2 },
    {
      title: "Lower them onto the seat frame together",
      detail: "Hold it above the seat frame and let the four rods drop through the holes at its ends.",
      people: 2,
    },
    { title: "Tip the sofa onto its back together", detail: "Lay it down gently on a rug so you can reach underneath.", pose: "+z", people: 2, warnings: ["floor"] },
    {
      title: "Bolt the armrests to the seat frame",
      detail: "A washer and a nut on each of the four rods, tightened with the box spanner. Line the armrests up flush with the front first.",
      fix: [under("washer"), under("nut")],
      tools: ["wrench"],
    },
    { title: "Stand the sofa up together", pose: "+y", people: 2 },
    {
      title: "Pull the cover over the sofa",
      detail: "Open its zips and start over the back, then down over the armrests and the front of the seat.",
      add: ["COVER"],
      from: { COVER: [0, 400, 0] },
    },
    { title: "Close the zips under the armrests", detail: "Kneel at each armrest and pull its zip shut along the bottom edge." },
    { title: "Tuck the cover into the gaps", detail: "Push the spare fabric well down between the seat and the armrests and along the back, so it stays put." },
    { title: "Lay the sofa on its back and fold the cover under", detail: "Pull the cover's edges round under the seat frame at the front, the back and the sides.", pose: "+z", people: 2 },
    {
      title: "Hook the rods in under the springs",
      detail: "Slide a rod into the channel along each edge of the cover, then hook it under the springs in five places. Stand the sofa up.",
      add: ["ROD_F", "ROD_B"],
      from: { ROD_F: [0, -200, 0], ROD_B: [0, -200, 0] },
    },
  ];
  return { parts, steps };
}

/** The back and the armrests are joined on the floor, away from the seat frame, then lowered onto it at `join`. */
function apart(b: PlanBuilder, r: CustomParams, ids: string[], scene: string, from: number, join: number, off: Vec3) {
  for (let i = from; i < join; i++) if (b.steps[i]) b.steps[i].scene = scene;
  for (const id of ids) {
    const p = r.parts.find((q) => q.id === id)!;
    const it = b.items.find((x): x is PartItem => x.kind === "part" && x.final.pos.every((v, k) => Math.abs(v - p.pos[k]) < 0.5));
    if (!it) continue;
    it.states = it.states.filter((st) => st.step < join).map((st) => ({ ...st, scene }));
    it.states.push({ step: join, scene: "main", pos: it.final.pos, rot: it.final.rot, from: off, delay: 0.2 });
  }
}

const family: Family = {
  names: ["KLIPPAN"],
  build(b, s) {
    if (!/2-seat/i.test(`${s.variant} ${s.slug ?? ""}`) || /bed|chaise/i.test(`${s.variant} ${s.slug ?? ""}`)) return false;
    const r = sofa(s);
    buildCustom(b, { ...s, custom: r });
    const idx = (re: RegExp) => r.steps.findIndex((x) => re.test(x.title));
    apart(b, r, ["BACK", "ARM_L", "ARM_R"], "arms", idx(/each end of the back/), idx(/onto the seat frame/), [0, 320, 0]);
    return true;
  },
};
export default family;
