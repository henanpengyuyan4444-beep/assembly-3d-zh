import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/*
 * SKÅLBODA armchair, read from IKEA's manual. The underframe is two bent steel tubes that cross on the floor: laid
 * upside down on a rug, they are held at the crossing by one bolt, turned in by hand. The wire shell, also upside
 * down, gets a rubber ring on each of its four pins; then it is pushed down into the tube ends, and the chair goes
 * over once more to tighten the bolt.
 * IKEA's sizes: 64 wide, 69 deep, 71 high, seat 34 high, 63 x 46, 25 free under it.
 */

const TUBE = 20;
const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

/** A rod from a to b, as a piece of a part centred at c. */
function rod(a: Vec3, b: Vec3, c: Vec3, dia = TUBE): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  return {
    shape: "cyl",
    size: [dia, len, dia],
    pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]],
    rot: [Math.atan2(d[2], d[1]), 0, Math.asin(-d[0] / len)],
  };
}
/** A thin slab from edge a to edge b (both centred on x = 0), w wide. */
function slab(a: [number, number], b: [number, number], w: number, c: Vec3): PartPiece {
  const [ya, za] = a, [yb, zb] = b;
  return {
    shape: "box",
    size: [w, 10, Math.hypot(yb - ya, zb - za)],
    pos: [0, (ya + yb) / 2 - c[1], (za + zb) / 2 - c[2]],
    rot: [-Math.atan2(yb - ya, zb - za), 0, 0],
  };
}
/** A part made of pieces, sized to the corners it spans. */
function part(id: string, name: string, lo: Vec3, hi: Vec3, pieces: (c: Vec3) => PartPiece[]): CustomPart {
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, material: "metal", pieces: pieces(c) };
}

function armchair(): CustomParams {
  const PY = 300; // tops of the four tube ends, where the shell's pins go in
  const FZ = 280, BZ = -150, FX = 290, BX = 270; // pins: front and back corners
  const fy = TUBE / 2, foot = 20; // floor bars, and how far the feet sit out past the pins
  const frame = (id: string, g: number): CustomPart => {
    const a: Vec3 = [-g * FX, fy, FZ + foot], b: Vec3 = [g * BX, fy, BZ - 50];
    const ta: Vec3 = [-g * FX, PY, FZ], tb: Vec3 = [g * BX, PY, BZ];
    return part(id, "Leg tube", [-FX - 10, 0, BZ - 60], [FX + 10, PY, FZ + foot + 10], (c) => [rod(a, b, c), rod(a, ta, c), rod(b, tb, c)]);
  };
  // the crossing of the two floor bars
  const t = (FX + 0) / (FX + BX);
  const cross: Vec3 = [0, 0, FZ + foot + t * (BZ - 50 - FZ - foot)];
  const shell = part("S", "Wire shell", [-320, PY - 10, -345], [320, 710, 345], (c) => [
    slab([340, 345], [240, -120], 600, c),
    slab([240, -120], [710, -345], 640, c),
    ...[-1, 1].map((g) => rod([g * FX, PY + 5, FZ], [g * BX, PY + 5, BZ], c, 12)),
    ...[-1, 1].map((g) => rod([g * 300, 330, 330], [g * 320, 700, -335], c, 10)),
  ]);
  const pins: Vec3[] = [-1, 1].flatMap((g): Vec3[] => [[g * FX, PY, FZ], [g * BX, PY, BZ]]);
  return {
    parts: [frame("A", 1), frame("B", -1), shell],
    steps: [
      {
        title: "Cross the leg tubes and bolt them loosely",
        detail: "Upside down on a rug, lay one tube across the other and turn the bolt in by hand at the crossing. Don't tighten it yet.",
        add: ["A", "B"],
        fix: [fix("bolt", [cross], [0, 1, 0], { on: "A", mate: "B", len: 16, dia: 6 })],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Put a rubber ring on each pin",
        detail: "Lay the shell upside down and push a ring down over each of its four pins.",
        fix: [fix("washer", pins, [0, 1, 0], { on: "S", name: "Rubber ring" })],
        wait: ["S"],
      },
      {
        title: "Push the shell into the tube ends",
        detail: "Stand the frame up and press each pin down into its tube end until the rings sit on the tubes.",
        add: ["S"],
        pose: "+y",
        from: { S: [0, 300, 0] },
      },
      {
        title: "Tighten the bolt at the crossing",
        detail: "Turn the chair over onto the rug and tighten the bolt fully with the Allen key.",
        pose: "-y",
        tools: ["allen"],
        warnings: ["floor"],
      },
    ],
  };
}

const family: Family = {
  names: ["SKÅLBODA", "SKALBODA"],
  recipe(s) {
    if (/armchair/i.test(`${s.variant} ${s.slug ?? ""}`)) return armchair();
    return null;
  },
};
export default family;
