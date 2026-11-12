import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * EKRAR, read from the coat stand's manual. Three steel legs with their hooks cross like a tripod: a connector is
 * screwed to the first leg where they cross (two screws), the other two legs are screwed to it (two each), and a
 * plain top section is screwed by hand onto the end of each leg.
 */

/** A round tube from a to b, as a piece of a part centred at c. */
function tube(a: Vec3, b: Vec3, d: number, c: Vec3): PartPiece {
  const v: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...v);
  const n = v.map((x) => x / L);
  return { shape: "cyl", size: [d, L, d], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot: [Math.atan2(n[2], n[1]), 0, -Math.asin(n[0])] };
}

/** One part made of tubes given end to end in product mm; its box and centre are worked out. */
function tubes(id: string, name: string, segs: [Vec3, Vec3, number][]): CustomPart {
  const lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const [a, b, d] of segs)
    for (const p of [a, b])
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], p[k] - (k === 1 ? 0 : d / 2));
        hi[k] = Math.max(hi[k], p[k] + (k === 1 ? 0 : d / 2));
      }
  const c: Vec3 = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  return { id, name, size: [0, 1, 2].map((k) => hi[k] - lo[k]) as Vec3, pos: c, material: "metal", pieces: segs.map(([a, b, d]) => tube(a, b, d, c)) };
}

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function recipe(s: ProductSpec): CustomParams {
  const H = s.size.h * 10;
  const R = 315; // IKEA: 63 cm across the feet
  const yX = H * 0.66; // where the legs cross
  const yJoin = H * 0.82; // where each top section screws on
  const rTop = 120; // the top ends, out from the middle on the far side
  const d = 22;
  const angles = [0, 1, 2].map((i) => Math.PI / 2 + (i * 2 * Math.PI) / 3);
  // a point on leg i, r out from the middle along its own direction (negative: past the middle, on the far side)
  const at = (i: number, r: number, y: number): Vec3 => [r * Math.cos(angles[i]), y, r * Math.sin(angles[i])];
  const rJoin = -rTop * ((yJoin - yX) / (H - yX));
  const parts: CustomPart[] = [];
  angles.forEach((a, i) => {
    const out = (p: Vec3, len: number): Vec3 => [p[0] + len * Math.cos(a), p[1] + 30, p[2] + len * Math.sin(a)];
    const back = (p: Vec3, len: number): Vec3 => [p[0] - len * Math.cos(a), p[1] + 30, p[2] - len * Math.sin(a)];
    const low = at(i, R * 0.42, yX * 0.58);
    const high = at(i, rJoin * 0.4, yX + (yJoin - yX) * 0.4);
    parts.push(
      tubes(`L${i}`, "Leg", [
        [at(i, R, 0), at(i, 0, yX), d],
        [at(i, 0, yX), at(i, rJoin, yJoin), d],
        [low, out(low, 90), 16],
        [high, back(high, 90), 16],
      ]),
    );
    parts.push(tubes(`T${i}`, "Top section", [[at(i, rJoin, yJoin), at(i, -rTop, H), d]]));
  });
  parts.push({ id: "C", name: "Connector", size: [46, 90, 46], pos: [0, yX, 0], material: "board", pieces: [{ shape: "cyl", size: [46, 90, 46], pos: [0, 0, 0] }] });
  const screws = (i: number) => fx("screw", [-25, 25].map((dy) => at(i, 22, yX + dy)), [-Math.cos(angles[i]), 0, -Math.sin(angles[i])], "C", { len: 16, dia: 5, mate: `L${i}` });
  const steps: CustomStep[] = [
    { title: "Screw the connector to the first leg", detail: "At the bend where the legs cross. Two screws, through the connector into the leg.", add: ["L0", "C"], fix: [screws(0)], tools: ["screwdriver"], warnings: ["floor"] },
    {
      title: "Screw the other two legs to the connector",
      detail: "Two screws for each. Turn the stand so each leg can be screwed on from outside, hooks facing out.",
      add: ["L1", "L2"],
      fix: [screws(1), screws(2)],
      tools: ["screwdriver"],
    },
    {
      title: "Screw on the three top sections",
      detail: "Each one screws by hand onto the end of a leg. Turn it until it's tight and straight.",
      add: ["T0", "T1", "T2"],
      from: { T0: [0, 220, 0], T1: [0, 220, 0], T2: [0, 220, 0] },
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["EKRAR"],
  recipe(s) {
    if (!/coat/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
