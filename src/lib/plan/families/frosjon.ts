import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomParams, CustomStep, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";
import { boxOf } from "../custom";

/**
 * FRÖSJÖN, read from IKEA's manuals. The shelving units are two black steel side ladders joined by cross rods: the
 * feet go on the ladders first, then, lying on its side, rods are bolted into one ladder and the other ladder is laid
 * on and bolted to them all. Stood up, the steel shelves go in, drop onto their pins and are screwed down; the feet
 * are levelled against the wall and the tall one is screwed to it through the lugs on its top rail. The trolley is a
 * handle arch bolted to the round bottom tray, the top tray and the gallery ring, two posts bolted to all three,
 * castors clicked into the four legs and a glass top laid in.
 */

type Kind = CustomFix["kind"];
interface Pc {
  size: Vec3;
  pos: Vec3;
  rot?: Vec3;
  shape?: "box" | "cyl";
  material?: PartMaterial;
}

const TUBE = 16;
const BOLT = { len: 16, dia: 6 };
const SCREW = { len: 10, dia: 4 };
const FOOT = { len: 20, dia: 32, name: "Adjustable foot" };

const at = (kind: Kind, pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: { len?: number; dia?: number; name?: string } = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

/** A tube from a to b. */
function tube(a: Vec3, b: Vec3, dia = TUBE): Pc {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const pos: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  // a cylinder stands along y: tip it about x towards z, then about z towards x
  const rx = Math.atan2(d[2], Math.hypot(d[1], d[0]) * Math.sign(d[1] || 1));
  const rz = -Math.atan2(d[0], d[1]);
  if (Math.abs(d[2]) < 1e-6) return { shape: "cyl", size: [dia, len, dia], pos, rot: Math.abs(rz) > 1e-6 ? [0, 0, rz] : undefined };
  if (Math.abs(d[0]) < 1e-6) return { shape: "cyl", size: [dia, len, dia], pos, rot: [rx, 0, 0] };
  return { shape: "cyl", size: [dia, len, dia], pos, rot: [rx, 0, rz] };
}

/** One part made of several pieces, given where each sits in the product. */
function group(id: string, name: string, pcs: Pc[], material: PartMaterial = "metal"): CustomPart {
  const bs = pcs.map((p) => boxOf(p));
  const lo = [0, 1, 2].map((k) => Math.min(...bs.map((b) => b.min[k])));
  const hi = [0, 1, 2].map((k) => Math.max(...bs.map((b) => b.max[k])));
  const pos = [0, 1, 2].map((k) => Math.round(((lo[k] + hi[k]) / 2) * 10) / 10) as Vec3;
  const size = [0, 1, 2].map((k) => Math.round((hi[k] - lo[k]) * 10) / 10) as Vec3;
  const pieces: PartPiece[] = pcs.map((p) => ({ shape: p.shape ?? "box", size: p.size, pos: [p.pos[0] - pos[0], p.pos[1] - pos[1], p.pos[2] - pos[2]], rot: p.rot, material: p.material ?? material }));
  return { id, name, size, pos, pieces, material };
}

/* ---------- shelving units ---------- */

function shelving(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const tall = H > 1200;
  const y0 = FOOT.len; // the ladders stand on their feet
  const ys = tall ? [130, 500, 915, 1160, 1390] : [130, 505, 840];
  const n = ys.length;
  const zb = -D / 2 + TUBE / 2;
  const zFront = D / 2 - TUBE / 2;
  // the tall unit's front uprights bend back above the third shelf, so the top two shelves are shallower
  const Dup = tall ? 230 : D;
  const zFrontUp = -D / 2 + Dup - TUBE / 2;
  const jog0 = ys[2] + 80, jog1 = ys[3] - 60;
  const zf = (i: number) => (tall && i >= 3 ? zFrontUp : zFront);
  const top = H - 30;
  const xs = (sx: number) => sx * (W / 2 - TUBE / 2);

  const ladder = (id: string, sx: number) => {
    const x = xs(sx);
    const pcs: Pc[] = [tube([x, y0, zb], [x, top, zb])];
    if (tall) pcs.push(tube([x, y0, zFront], [x, jog0, zFront]), tube([x, jog0, zFront], [x, jog1, zFrontUp]), tube([x, jog1, zFrontUp], [x, top - 20, zFrontUp]));
    else pcs.push(tube([x, y0, zFront], [x, top, zFront]));
    ys.forEach((y, i) => {
      pcs.push(tube([x, y, zb], [x, y, zf(i)], 10));
      pcs.push(tube([x, y + 80, zb], [x, y + 80, zf(i)], 8));
    });
    if (tall) pcs.push(tube([x, top - 20, zb], [x, top - 20, zFrontUp], 12));
    pcs.push({ shape: "cyl", size: [22, 22, 22], pos: [x, top + 11, zb] });
    if (!tall) pcs.push({ shape: "cyl", size: [22, 22, 22], pos: [x, top + 11, zFront] });
    return group(id, "Side frame", pcs);
  };
  const parts: CustomPart[] = [ladder("SL", -1), ladder("SR", 1)];
  const inner = W - 2 * TUBE;
  const rod = (id: string, name: string, y: number, z: number, dia = 10): CustomPart => ({ id, name, size: [inner, dia, dia], pos: [0, y, z], shape: "cyl", material: "metal" });
  const backs: string[] = [], fronts: string[] = [];
  ys.forEach((y, i) => {
    parts.push(rod(`RB${i}`, "Back rail", y + 80, zb, 8));
    backs.push(`RB${i}`);
    parts.push(rod(`RF${i}`, "Front rod", y - 10, zf(i)));
    fronts.push(`RF${i}`);
  });
  if (tall) {
    parts.push({ id: "RT", name: "Top rail", size: [inner, 30, 12], pos: [0, top - 20, zb], material: "metal" });
    backs.push("RT");
  }
  const shelves = ys.map((y, i) => {
    const d = zf(i) - zb - TUBE;
    parts.push({ id: `P${i}`, name: tall && i >= 3 ? "Small shelf" : "Shelf", size: [inner, 10, d], pos: [0, y, (zb + zf(i)) / 2], material: "metal" });
    return `P${i}`;
  });

  const ends = (ids: string[], sx: number): Vec3[] =>
    ids.map((id) => {
      const p = parts.find((q) => q.id === id)!.pos;
      return [sx * (W / 2), p[1], p[2]] as Vec3;
    });
  const feet = (sx: number): Vec3[] => [[xs(sx), y0, zb], [xs(sx), y0, zFront]];
  const shelfScrews: Vec3[] = ys.flatMap((y, i) => [-1, 1].map((sx) => [sx * (W / 2 - 40), y + 5, zf(i) - 20] as Vec3));

  const steps: CustomStep[] = [
    {
      title: "Screw a foot onto each upright",
      detail: "Lay the side frames on a rug and turn a foot onto the bottom of each upright by hand. Do the same on the other side frame.",
      add: ["SL"],
      fix: [at("foot", feet(-1), [0, 1, 0], "SL", undefined, FOOT)],
      pose: "+x",
      repeat: 2,
      warnings: ["floor"],
    },
    {
      title: `Bolt ${backs.length} rails into one side frame`,
      detail: "Flat ends into the side frame, one bolt in each. Leave them a little loose for now.",
      add: backs,
      fix: [at("bolt", ends(backs, -1), [1, 0, 0], "SL", undefined, BOLT)],
      tools: ["allen"],
    },
    {
      title: `Bolt in the ${n} shelf rods`,
      detail: "Along the front, one bolt each.",
      add: fronts,
      fix: [at("bolt", ends(fronts, -1), [1, 0, 0], "SL", undefined, BOLT)],
      tools: ["allen"],
    },
    {
      title: "Lay the other side frame on and bolt it",
      detail: "Guide every rod into its hole, then bolt them all and tighten every bolt on both sides.",
      add: ["SR"],
      fix: [
        at("foot", feet(1), [0, 1, 0], "SR", undefined, FOOT),
        at("bolt", ends([...backs, ...fronts], 1), [-1, 0, 0], "SR", undefined, BOLT),
      ],
      tools: ["allen"],
    },
    { title: "Stand it up and slide in the shelves", detail: tall ? "The two small shelves go at the top." : "Front edge first, one on each level.", add: shelves, pose: "+y" },
    { title: "Drop each shelf onto its pins", detail: "Tip the shelf down at the back so its two pins go into the holes in the frame." },
    {
      title: "Screw the shelves down",
      detail: "Two screws through the front corners of each shelf.",
      fix: [at("screw", shelfScrews, [0, -1, 0], undefined, undefined, SCREW)],
      tools: ["screwdriver"],
    },
    {
      title: "Level it with the feet",
      detail: "Stand it against the wall and turn the feet until it doesn't rock and stands level.",
      tools: ["level"],
      kind: "legs",
    },
  ];
  if (tall) {
    const lugs: Vec3[] = [-1, 1].map((sx) => [sx * (W / 2 - 60), top - 20, -D / 2] as Vec3);
    steps.push({
      title: "Screw it to the wall",
      detail: "Through the two lugs on the top rail. Wall screws and plugs aren't included: pick ones made for your wall.",
      fix: [
        at("plug", lugs.map((p) => [p[0], p[1], p[2] - 10] as Vec3), [0, 0, -1]),
        at("screw", lugs, [0, 0, -1], "RT", undefined, { len: 50, dia: 5 }),
      ],
      tools: ["drill", "screwdriver", "pencil"],
      wall: true,
      warnings: ["wall", "tip"],
    });
  }
  return { parts, steps };
}

/* ---------- trolley ---------- */

function trolley(s: ProductSpec): CustomParams {
  const H = s.size.h * 10;
  const CAS = 60;
  const R = 170; // the arch and posts stand just outside the trays
  const rt = 160; // tray radius
  const yb0 = CAS + 10, yb1 = yb0 + 100; // bottom tray
  const yt0 = 380, yt1 = 420; // top tray
  const yg = 475; // gallery ring
  const yc = H - R; // the arch's centre
  const arch: Pc[] = [tube([-R, CAS, 0], [-R, yc, 0]), tube([R, CAS, 0], [R, yc, 0])];
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const a0 = (Math.PI * i) / segs, a1 = (Math.PI * (i + 1)) / segs;
    arch.push(tube([R * Math.cos(a0), yc + R * Math.sin(a0), 0], [R * Math.cos(a1), yc + R * Math.sin(a1), 0]));
  }
  const ring: Pc[] = [];
  const rs = 16;
  for (let i = 0; i < rs; i++) {
    const t = (2 * Math.PI * (i + 0.5)) / rs;
    const len = 2 * R * Math.sin(Math.PI / rs) + 2;
    ring.push({ size: [len, 8, 8], pos: [R * Math.cos(t), yg, R * Math.sin(t)], rot: [0, -t - Math.PI / 2, 0] });
  }
  const post = (id: string, sz: number) =>
    group(id, "Post", [tube([0, CAS, sz * R], [0, yg + 20, sz * R]), { shape: "cyl", size: [20, 20, 20], pos: [0, yg + 30, sz * R] }]);
  const parts: CustomPart[] = [
    { id: "B", name: "Bottom tray", size: [2 * rt, yb1 - yb0, 2 * rt], pos: [0, (yb0 + yb1) / 2, 0], shape: "cyl", material: "metal" },
    group("A", "Handle arch", arch),
    { id: "T", name: "Top tray", size: [2 * rt, yt1 - yt0, 2 * rt], pos: [0, (yt0 + yt1) / 2, 0], shape: "cyl", material: "metal" },
    group("G", "Gallery ring", ring),
    post("PF", 1),
    post("PB", -1),
    { id: "GL", name: "Glass top", size: [2 * rt - 20, 5, 2 * rt - 20], pos: [0, yt1 + 2.5, 0], shape: "cyl", material: "glass" },
  ];
  // one bolt on each side, from the tray (or ring) out into the arch's leg
  const archBolts = (y: number, r: number, on: string) => [-1, 1].map((sx) => at("bolt", [[sx * r, y, 0]], [sx, 0, 0], on, "A", BOLT));
  const postBolts = [-1, 1].map((sz) =>
    at("bolt", [(yb0 + yb1) / 2, (yt0 + yt1) / 2, yg].map((y) => [0, y, sz * (y === yg ? R - 8 : rt)] as Vec3), [0, 0, sz], sz > 0 ? "PF" : "PB", undefined, BOLT),
  );
  const steps: CustomStep[] = [
    {
      title: "Bolt the handle arch to the bottom tray",
      detail: "Stand the tray on a rug, the arch's legs either side of it. One bolt through each side.",
      add: ["B", "A"],
      fix: archBolts((yb0 + yb1) / 2, rt, "B"),
      tools: ["allen"],
      warnings: ["floor"],
    },
    {
      title: "Bolt on the top tray",
      detail: "Slide it down inside the arch and bolt it on each side.",
      add: ["T"],
      fix: archBolts((yt0 + yt1) / 2, rt, "T"),
      tools: ["allen"],
    },
    {
      title: "Bolt on the gallery ring",
      detail: "Its lugs go against the arch, one bolt each side.",
      add: ["G"],
      fix: archBolts(yg, R - 8, "G"),
      tools: ["allen"],
    },
    {
      title: "Bolt the two posts on",
      detail: "One at the front and one at the back, each bolted to the bottom tray, the top tray and the ring.",
      add: ["PF", "PB"],
      fix: postBolts,
      tools: ["allen"],
    },
    {
      title: "Click the castors with brakes into the arch",
      detail: "Tip the trolley on its side and push a castor into the bottom of each arch leg until it clicks.",
      fix: [at("castor", [-1, 1].map((sx) => [sx * R, CAS, 0] as Vec3), [0, 1, 0], "A", undefined, { len: CAS, dia: 45, name: "Castor with brake" })],
    },
    {
      title: "Click the other castors into the posts",
      detail: "The same way, until they click.",
      fix: [at("castor", [-1, 1].map((sz) => [0, CAS, sz * R] as Vec3), [0, 1, 0], undefined, undefined, { len: CAS, dia: 45 })],
    },
    { title: "Lay the glass top in the top tray", detail: "Stand the trolley on its castors first. Press the brakes down to keep it still.", add: ["GL"] },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["FRÖSJÖN", "FROSJON"],
  recipe(s) {
    const v = s.variant.toLowerCase();
    if (/trolley/.test(v)) return trolley(s);
    if (/shelving unit/.test(v)) return shelving(s);
    return null;
  },
};
export default family;
