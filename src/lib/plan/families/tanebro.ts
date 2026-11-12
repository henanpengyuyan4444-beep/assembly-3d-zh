import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * TÅNEBRO, read from the side table's manual. The steel top has a cross of rails and a hub welded underneath. With
 * the top upside down on a rug, the four curved legs go into the hub and each is held by two Allen screws from the
 * side, eight in all. Then the table is turned over.
 */

const TUBE = 20;

/** A round tube from a to b, as a piece of a part centred at c. */
function seg(a: Vec3, b: Vec3, c: Vec3, dia = TUBE): PartPiece {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...d);
  const h = Math.hypot(d[0], d[2]);
  const rot: Vec3 = [0, h ? Math.atan2(-d[2], d[0]) : 0, -Math.atan2(h, d[1])];
  return { shape: "cyl", size: [dia, L, dia], pos: [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], (a[2] + b[2]) / 2 - c[2]], rot };
}

/** Rounds the corners of a line (Chaikin), keeping its ends. */
function smooth(p: [number, number][], n = 2): [number, number][] {
  for (let k = 0; k < n; k++) {
    const q: [number, number][] = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const [a, b] = [p[i], p[i + 1]];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 46 across, 60.5 high
  const Dm = Math.round(s.size.w * 10) || 460, H = Math.round(s.size.h * 10) || 605;
  const tt = 18, yU = H - tt; // underside of the top
  const hubH = 70, hubD = 50;
  const r0 = hubD / 2 + TUBE / 2; // leg tops sit against the hub
  // one leg's line, out from the middle (r) and up from the floor (y): straight down from the hub, then an S out to the foot
  const prof = smooth([[r0, yU], [r0, yU - 120], [r0 + 20, yU - 240], [120, 230], [190, 110], [200, 40], [200, 0]], 1);
  const top: CustomPart = {
    id: "A",
    name: "Table top",
    size: [Dm, tt + hubH, Dm],
    pos: [0, H - (tt + hubH) / 2, 0],
    material: "metal",
    pieces: [
      { shape: "cyl", size: [Dm, tt, Dm], pos: [0, (tt + hubH) / 2 - tt / 2, 0] },
      { shape: "cyl", size: [hubD, hubH, hubD], pos: [0, -tt / 2, 0] },
      ...[0, Math.PI / 2].map((a): PartPiece => ({ shape: "box", size: [Dm - 60, 12, 20], pos: [0, (tt + hubH) / 2 - tt - 6, 0], rot: [0, a + Math.PI / 4, 0] })),
    ],
  };
  const legs: CustomPart[] = [0, 1, 2, 3].map((k) => {
    const phi = (k * Math.PI) / 2;
    const pt = ([r, y]: [number, number]): Vec3 => [r * Math.cos(phi), y, r * Math.sin(phi)];
    const ext = 200 + TUBE / 2;
    const c: Vec3 = [((ext + r0 - TUBE) / 2) * Math.cos(phi), yU / 2, ((ext + r0 - TUBE) / 2) * Math.sin(phi)];
    const size: Vec3 = [Math.abs(Math.cos(phi)) * (ext - r0 + TUBE) + Math.abs(Math.sin(phi)) * TUBE, yU, Math.abs(Math.sin(phi)) * (ext - r0 + TUBE) + Math.abs(Math.cos(phi)) * TUBE];
    const pieces = prof.slice(1).map((p, i) => seg(pt(prof[i]), pt(p), c));
    return { id: `L${k + 1}`, name: "Leg", size, pos: c, material: "metal", pieces };
  });
  const screws: CustomFix[] = legs.map((l, k) => {
    const phi = (k * Math.PI) / 2;
    const r = r0 + TUBE / 2;
    return {
      kind: "bolt",
      count: 2,
      len: 30,
      dia: 6,
      at: [yU - 20, yU - 50].map((y): Vec3 => [r * Math.cos(phi), y, r * Math.sin(phi)]),
      dir: [-Math.cos(phi), 0, -Math.sin(phi)],
      on: l.id,
      mate: "A",
    };
  });
  return {
    parts: [top, ...legs],
    steps: [
      {
        title: "Lay the top upside down",
        detail: "On a rug or the flattened box, so the top doesn't get scratched.",
        add: ["A"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Screw the legs to the hub",
        detail: "Push each leg against the hub in the middle and fit two screws through it with the Allen key. Tighten them all once the four legs are on.",
        add: legs.map((l) => l.id),
        fix: screws,
        tools: ["allen"],
      },
      { title: "Turn it over", detail: "Lift it by the top and stand it on its feet.", pose: "+y" },
    ],
  };
}

const family: Family = { names: ["TÅNEBRO"], recipe };
export default family;
