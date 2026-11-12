import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LUBBAN, read from the trolley's manual. The trolley is built lying on its side on a rug. One side frame (two
 * uprights joined by the rattan-wrapped handle, castors already on) lies flat; the deep basket stands on it and takes
 * two Allen bolts, the shallow basket follows on the frame's studs with a washer and cap nut each. The second frame is
 * laid on top and gets its two nuts, then the trolley is rolled over for its two bolts. Stood up, the bolts are
 * tightened with the Allen key and the nuts with the spanner, four felt pads go on the shallow basket and the tray
 * drops in.
 */

function tube(a: Vec3, b: Vec3, dia: number, material?: PartMaterial): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return { shape: "cyl", size: [dia, len, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(d[2], d[1]), 0, -Math.atan2(d[0], Math.hypot(d[1], d[2]))], material };
}

function part(id: string, name: string, abs: PartPiece[], lo: Vec3, hi: Vec3, material: PartMaterial): CustomPart {
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const pieces = abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

/** A round woven wall: segments around a circle of radius r, from y0 to y1. */
function ring(r: number, y0: number, y1: number, n = 18): PartPiece[] {
  const seg = 2 * r * Math.tan(Math.PI / n) + 2;
  return Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n;
    return { shape: "box", size: [seg, y1 - y0, 10], pos: [Math.sin(a) * (r - 5), (y0 + y1) / 2, Math.cos(a) * (r - 5)], rot: [0, a, 0] } as PartPiece;
  });
}

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3 | Vec3[], on: string, o: Partial<CustomFix> = {}): CustomFix[] =>
  at.map((p, i) => ({ kind, count: 1, at: [p], dir: Array.isArray(dir[0]) ? (dir as Vec3[])[i] : (dir as Vec3), on, ...o }));

function trolley(s: ProductSpec): CustomParams {
  // IKEA: 50 wide and deep, 66 high
  const W = s.size.w * 10, H = s.size.h * 10;
  const Rb = W / 2 - 25, Rt = Rb - 10; // deep and shallow baskets
  const u = (Rb + 12) * Math.SQRT1_2; // the uprights stand at 45 degrees round the baskets
  const yTop = H - 20, yFoot = 60;
  const frame = (sx: number) => {
    const x = sx * u;
    const abs: PartPiece[] = [
      tube([x, yFoot, -u], [x, yTop, -u], 20, "metal"),
      tube([x, yFoot, u], [x, yTop, u], 20, "metal"),
      tube([x, yTop, -u - 10], [x, yTop, u + 10], 34, "wood"),
    ];
    for (const z of [-u, u]) {
      abs.push({ shape: "box", size: [24, 24, 30], pos: [x, yFoot - 12, z] });
      abs.push({ shape: "cyl", size: [50, 20, 50], pos: [x, 25, z], rot: [0, 0, Math.PI / 2] });
    }
    return part(sx < 0 ? "FL" : "FR", "Side frame", abs, [x - 25, 0, -u - 30], [x + 25, H, u + 30], "metal");
  };
  const yb0 = 90, yb1 = 290, yt0 = 520, yt1 = 595;
  const deep = [...ring(Rb, yb0 + 10, yb1), { shape: "cyl", size: [2 * Rb - 6, 10, 2 * Rb - 6], pos: [0, yb0 + 5, 0] } as PartPiece];
  const shallow = [
    ...ring(Rt, yt0, yt1),
    { shape: "box", size: [2 * Rt - 10, 10, 16], pos: [0, yt0 + 5, 0], rot: [0, Math.PI / 4, 0], material: "metal" } as PartPiece,
    { shape: "box", size: [2 * Rt - 10, 10, 16], pos: [0, yt0 + 5, 0], rot: [0, -Math.PI / 4, 0], material: "metal" } as PartPiece,
  ];
  const parts: CustomPart[] = [
    frame(-1),
    part("BB", "Deep basket", deep, [-Rb, yb0, -Rb], [Rb, yb1, Rb], "wood"),
    part("BT", "Shallow basket", shallow, [-Rt, yt0, -Rt], [Rt, yt1, Rt], "wood"),
    frame(1),
    { id: "TRAY", name: "Tray", shape: "cyl", size: [2 * Rt - 30, 6, 2 * Rt - 30], pos: [0, yt0 + 17, 0], material: "metal" },
  ];
  // bolts into the deep basket and nuts on the studs for the shallow one, one at each upright
  const at = (sx: number, y: number, inset: number): Vec3[] => [-1, 1].map((sz) => [sx * (u - inset * Math.SQRT1_2), y, sz * (u - inset * Math.SQRT1_2)]);
  const inward = (sx: number): Vec3[] => [-1, 1].map((sz) => [-sx * Math.SQRT1_2, 0, -sz * Math.SQRT1_2]);
  const outward = (sx: number): Vec3[] => inward(sx).map((d) => [-d[0], 0, -d[2]]);
  const yB = (yb0 + yb1) / 2, yN = (yt0 + yt1) / 2;
  const BOLT = { name: "Allen bolt", len: 16, dia: 6 };
  const bolts = (sx: number, on: string) => fx("bolt", at(sx, yB, -12), inward(sx), on, { ...BOLT, mate: "BB" });
  const nuts = (sx: number, on: string) => [
    ...fx("washer", at(sx, yN, 22), outward(sx), on, { dia: 14 }),
    ...fx("nut", at(sx, yN, 26), outward(sx), on, { name: "Cap nut", dia: 10 }),
  ];
  const pads: Vec3[] = [0, 1, 2, 3].map((i) => [Math.cos((i * Math.PI) / 2) * (Rt - 70), yt0 + 10, Math.sin((i * Math.PI) / 2) * (Rt - 70)]);
  return {
    parts,
    steps: [
      {
        title: "Bolt the deep basket to a side frame",
        detail: "Lay one frame flat on a rug and stand the deep basket on it at the castor end. Two bolts through the uprights, not tight yet.",
        add: ["FL", "BB"],
        fix: bolts(-1, "FL"),
        tools: ["allen"],
        pose: "+x",
        warnings: ["floor"],
      },
      {
        title: "Fit the shallow basket onto the studs",
        detail: "Slide its brackets over the studs at the handle end. A washer and a cap nut on each, by hand.",
        add: ["BT"],
        fix: nuts(-1, "BT"),
      },
      { title: "Lay the second frame on top", detail: "Its studs go through the shallow basket's brackets. A washer and a cap nut on each, by hand.", add: ["FR"], fix: nuts(1, "BT") },
      {
        title: "Roll it over and bolt the deep basket",
        detail: "Two bolts through the second frame's uprights into the deep basket, not tight yet. Then stand the trolley up.",
        fix: bolts(1, "FR"),
        tools: ["allen"],
        pose: "-x",
      },
      { title: "Tighten the four bolts", detail: "Stand the trolley on its castors and tighten them with the Allen key.", tools: ["allen"], pose: "+y" },
      { title: "Tighten the four cap nuts", detail: "Hold each one with the spanner and turn until the basket is firm.", tools: ["wrench"] },
      {
        title: "Stick the felt pads in the shallow basket",
        detail: "One on each arm of the cross, so the tray sits quietly.",
        fix: [{ kind: "glide", count: 4, at: pads, dir: [0, -1, 0], on: "BT", name: "Felt pad", len: 4, dia: 20 }],
      },
      { title: "Drop the tray in", detail: "Lay it in the shallow basket on the pads. It lifts out for washing.", add: ["TRAY"] },
    ],
  };
}

const family: Family = {
  names: ["LUBBAN"],
  recipe: (s) => (/trolley/i.test(`${s.variant} ${s.slug ?? ""}`) ? trolley(s) : null),
};
export default family;
