import type { Family } from "./family";
import type { PartMaterial, PartPiece, Pose, ProductSpec, StepKind, ToolId, Vec3, WarnId } from "../../types";
import type { HwDef, PlanBuilder } from "../builder";

/*
 * STJÄRNÖ, read from its two manuals (single and twin in white; double and queen in anthracite). A steel tube bed:
 * the headboard comes in two pieces, its frame and a leg piece (two legs joined by a steel band), the footboard is
 * welded in one. The headboard lies on its front, the legs are pushed into its tubes and bolted; it is turned over
 * and two rail bolts go into each leg, head and foot, left standing out. The side rails' keyhole ends hang on those
 * bolts (the footboard goes on with two people), the wide beds get a centre beam on a leg hooked between the two
 * bands, then every rail bolt is tightened with the click handle, caps cover the keyholes, slat holders clip onto
 * the rails' ledges, felt strips are stuck along them and the slats go in (sold separately).
 * IKEA's sizes: single 98 x 199, twin 105 x 199, double 143 x 199, queen 161 x 211; headboard 118 or 135 cm,
 * footboard 69 or 74 cm, 22 or 26 cm free under the bed.
 */

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const LEG_BOLT: HwDef = { kind: "bolt", len: 16, dia: 6, name: "Countersunk bolt" };
const RAIL_BOLT: HwDef = { kind: "stud", len: 30, dia: 8, name: "Rail bolt" };
const CAP: HwDef = { kind: "cap", len: 4, dia: 30, name: "Cover cap" };
const HOLDER: HwDef = { kind: "clamp", len: 30, dia: 24, name: "Slat holder" };
const HOLDER_S: HwDef = { kind: "clamp", len: 24, dia: 20, name: "Small slat holder" };
const SCREW: HwDef = { kind: "screw", len: 12, dia: 4 };

interface StepIn {
  title: string;
  detail?: string;
  tools?: ToolId[];
  people?: 1 | 2;
  pose?: Pose;
  warnings?: WarnId[];
  kind?: StepKind;
  scene?: string;
  check?: "square";
}

/** Bounding box of some pieces, and the pieces moved so the box is centred on 0. */
function shape(pieces: PartPiece[]): { size: Vec3; mid: Vec3; pieces: PartPiece[] } {
  const lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const p of pieces) {
    const a = p.rot?.[2] ?? 0;
    // only turned about z here: a tilted piece's extent in x and y
    const ex = Math.abs(Math.cos(a)) * p.size[0] + Math.abs(Math.sin(a)) * p.size[1];
    const ey = Math.abs(Math.sin(a)) * p.size[0] + Math.abs(Math.cos(a)) * p.size[1];
    const e: Vec3 = [ex, ey, p.size[2]];
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], p.pos[i] - e[i] / 2);
      hi[i] = Math.max(hi[i], p.pos[i] + e[i] / 2);
    }
  }
  const r = (n: number) => Math.round(n * 10) / 10;
  const mid: Vec3 = [r((lo[0] + hi[0]) / 2), r((lo[1] + hi[1]) / 2), r((lo[2] + hi[2]) / 2)];
  return {
    size: [r(hi[0] - lo[0]), r(hi[1] - lo[1]), r(hi[2] - lo[2])],
    mid,
    pieces: pieces.map((p) => ({ ...p, pos: [r(p.pos[0] - mid[0]), r(p.pos[1] - mid[1]), r(p.pos[2] - mid[2])] })),
  };
}

/** Parts placed where they end up; steps bring them in, in the main scene or shown on their own in another. */
class Kit {
  private keys = new Map<string, string>();
  private boxes = new Map<string, { pos: Vec3; rot: Vec3 }>();
  private types = new Map<string, string>();
  private pose: Pose = "+y";
  constructor(public b: PlanBuilder) {}

  /** A part drawn from pieces given where they sit in the bed (the part is placed at their middle). */
  welded(id: string, name: string, abs: PartPiece[], o: { mat?: PartMaterial; extra?: boolean; turn?: boolean } = {}) {
    const sh = shape(abs);
    this.put(id, name, sh.size, sh.mid, { ...o, pieces: sh.pieces });
  }
  /** The same part as `of`, turned half round about the upright (a rail on the other side). */
  turned(id: string, of: string, pos: Vec3) {
    const src = this.keys.get(of)!;
    const t = this.b.partItem(src).ref;
    this.keys.set(id, this.b.place(t, pos, [0, Math.PI, 0]));
    this.boxes.set(id, { pos, rot: [0, Math.PI, 0] });
  }
  mid(id: string) {
    return this.boxes.get(id)!.pos;
  }
  put(id: string, name: string, size: Vec3, pos: Vec3, o: { mat?: PartMaterial; shape?: "box" | "cyl"; pieces?: PartPiece[]; extra?: boolean } = {}) {
    const tk = [name, size.map(Math.round).join("x"), o.shape ?? "box", o.mat ?? "metal", o.pieces ? JSON.stringify(o.pieces) : ""].join("|");
    let t = this.types.get(tk);
    if (!t) {
      t = this.b.part(name, size, { shape: o.shape ?? "box", material: o.mat ?? "metal", extra: o.extra });
      if (o.pieces) this.b.parts[this.b.parts.length - 1].pieces = o.pieces;
      this.types.set(tk, t);
    }
    this.keys.set(id, this.b.place(t, pos));
    this.boxes.set(id, { pos, rot: [0, 0, 0] });
  }
  key(id: string) {
    const k = this.keys.get(id);
    if (!k) throw new Error(`STJÄRNÖ: no part ${id}`);
    return k;
  }
  step(s: StepIn, body: () => void) {
    const side = !!s.scene && s.scene !== "main";
    if (s.pose && !side) this.pose = s.pose;
    const warnings = new Set<WarnId>(s.warnings ?? []);
    if (s.people === 2) warnings.add("two");
    this.b.step({ title: s.title, detail: s.detail, tools: s.tools ?? [], people: s.people ?? 1, pose: side ? (s.pose ?? "+y") : this.pose, warnings: [...warnings].slice(0, 3), kind: s.kind ?? "general", scene: s.scene, check: s.check }, body);
  }
  add(ids: string[], from?: Vec3 | ((id: string) => Vec3)) {
    this.b.stagger(ids.length > 4 ? 0.14 : 0.24);
    for (const id of ids) this.b.add(this.key(id), typeof from === "function" ? from(id) : from);
    this.b.then(0.12);
  }
  stage(ids: string[], from?: Vec3) {
    this.b.stagger(0.24);
    for (const id of ids) {
      const p = this.boxes.get(id)!;
      this.b.stage(this.key(id), p.pos, p.rot, from);
    }
    this.b.then(0.12);
  }
  fit(def: HwDef, pts: Vec3[], dir: Vec3 | ((p: Vec3) => Vec3), on: string | ((p: Vec3) => string), o: { mate?: string | ((p: Vec3) => string); hole?: false } = {}) {
    if (!pts.length) return;
    const id = (f: string | ((p: Vec3) => string) | undefined, p: Vec3) => (f === undefined ? undefined : this.key(typeof f === "function" ? f(p) : f));
    this.b.stagger(0.05);
    this.b.fits(def, pts.map((at) => ({ at, dir: typeof dir === "function" ? dir(at) : dir, on: id(on, at), mate: id(o.mate, at), hole: o.hole })), Math.min(0.07, 2.4 / Math.max(1, pts.length)));
    this.b.then(0.1);
  }
}

/** The mattress size in the variant ("Standard Single, 90 × 190 cm"), in mm. */
function mattress(s: ProductSpec): [number, number] | null {
  const m = /(\d{2,3})\s*[×x]\s*(\d{3})/.exec(s.variant);
  return m ? [+m[1] * 10, +m[2] * 10] : null;
}

/** IKEA's outside sizes by mattress width (mm): width, length. */
const OUTSIDE: Record<number, [number, number]> = { 900: [980, 1990], 970: [1050, 1990], 1350: [1430, 1990], 1520: [1610, 2110] };

const T = 28; // the frame's tubes
const ROD = 16; // the bars between them

/** A tube frame's rounded top corner as short straight pieces, from the post (angle 0) over to the top tube. */
function corner(cx: number, cy: number, R: number, side: number): PartPiece[] {
  const n = 4, da = Math.PI / 2 / n;
  return range(n).map((i): PartPiece => {
    const m = da * (i + 0.5);
    const rr = R * Math.cos(da / 2);
    return { shape: "cyl", size: [T, 2 * R * Math.sin(da / 2) + 6, T], pos: [cx + side * rr * Math.cos(m), cy + rr * Math.sin(m), 0], rot: [0, 0, side * m] };
  });
}

/** One roll of slats on two tapes, lying along the bed. */
function slatRoll(w: number, len: number, y: number, z: number): PartPiece[] {
  const n = Math.max(8, Math.round(len / 110));
  const pitch = (len - 63) / (n - 1);
  return [
    ...range(n).map((i): PartPiece => ({ shape: "box", size: [w, 10, 63], pos: [0, y + 3, z - len / 2 + 31.5 + i * pitch] })),
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [24, 4, len], pos: [sx * (w / 2 - 90), y - 4, z], material: "fiber" })),
  ];
}

function build(b: PlanBuilder, s: ProductSpec) {
  if (!/^stjarno-bed-frame/.test(s.slug ?? "")) return false;
  const mt = mattress(s);
  if (!mt) return false;
  const [mw, ml] = mt;
  const wide = mw >= 1200; // the anthracite manual: taller ends, more bars, a centre beam
  const [W, L] = OUTSIDE[mw] ?? [mw + 80, ml + 90];
  const H = wide ? 1350 : 1180, F = wide ? 740 : 690;
  const y0 = wide ? 260 : 220; // free height under the bed: the bands' bottom edge
  const y1 = y0 + 170; // their top edge
  const yl = y0 + 50; // the ledge the slats lie on
  const yJ = y1 + 60; // where the headboard's legs push into its tubes
  const R = 110; // rounded top corners
  const xL = W / 2 - T / 2, zH = -L / 2 + T / 2, zF = L / 2 - T / 2;
  const k = new Kit(b);

  // the headboard frame: two posts, a rounded top, two bars with upright bars between them
  const hBot = y1 + 180, hTop = H - 170;
  const nH = wide ? 7 : 3, nF = wide ? 5 : 3;
  const spread = (n: number) => range(n).map((i) => -xL + ((i + 1) * 2 * xL) / (n + 1));
  const top = (y: number, z: number): PartPiece[] => [
    { shape: "cyl", size: [T, 2 * (xL - R) + 2, T], pos: [0, y - T / 2, z], rot: [0, 0, Math.PI / 2] },
    ...corner(xL - R, y - T / 2 - R, R, 1).map((p) => ({ ...p, pos: [p.pos[0], p.pos[1], z] as Vec3 })),
    ...corner(-(xL - R), y - T / 2 - R, R, -1).map((p) => ({ ...p, pos: [p.pos[0], p.pos[1], z] as Vec3 })),
  ];
  const bar = (y: number, z: number): PartPiece => ({ shape: "cyl", size: [ROD + 4, 2 * xL - T, ROD + 4], pos: [0, y, z], rot: [0, 0, Math.PI / 2] });
  const rods = (xs: number[], ya: number, yb: number, collar: number, z: number): PartPiece[] => [
    ...xs.map((x): PartPiece => ({ shape: "cyl", size: [ROD, yb - ya, ROD], pos: [x, (ya + yb) / 2, z] })),
    ...xs.map((x): PartPiece => ({ shape: "cyl", size: [ROD + 12, 34, ROD + 12], pos: [x, collar, z] })),
  ];
  const postTop = H - T / 2 - R;
  k.welded("HB", "Headboard", [
    ...[-1, 1].map((sx): PartPiece => ({ shape: "cyl", size: [T, postTop - yJ, T], pos: [sx * xL, (postTop + yJ) / 2, zH] })),
    ...top(H, zH),
    bar(hBot, zH),
    bar(hTop, zH),
    ...rods(spread(nH), hBot, hTop, hTop, zH),
  ]);

  // a steel band between two legs, its ledge facing into the bed
  const band = (z: number, dz: number, inset: number): PartPiece[] => [
    { shape: "box", size: [2 * xL - T, y1 - y0, 4], pos: [0, (y0 + y1) / 2, z + dz * (T / 2 - 2)] },
    { shape: "box", size: [2 * xL - T - 2 * inset, 3, 30], pos: [0, yl, z + dz * (T / 2 + 15)] },
  ];
  const foot = (x: number, z: number): PartPiece => ({ shape: "cyl", size: [40, 14, 40], pos: [x, 7, z], material: "soft" });
  k.welded("HL", "Headboard legs", [
    ...[-1, 1].map((sx): PartPiece => ({ shape: "cyl", size: [T - 2, yJ - 14, T - 2], pos: [sx * xL, (yJ + 14) / 2, zH] })),
    ...[-1, 1].map((sx) => foot(sx * xL, zH)),
    ...band(zH, 1, 22),
  ]);

  // the footboard, welded in one with its legs and band
  const fBar = F - 95;
  const fPost = F - T / 2 - R;
  k.welded("FB", "Footboard", [
    ...[-1, 1].map((sx): PartPiece => ({ shape: "cyl", size: [T, fPost - 14, T], pos: [sx * xL, (fPost + 14) / 2, zF] })),
    ...[-1, 1].map((sx) => foot(sx * xL, zF)),
    ...top(F, zF),
    bar(fBar, zF),
    ...rods(spread(nF), y1, fBar, fBar, zF),
    ...band(zF, -1, 22),
  ]);

  // the side rails: a band with a ledge along its bottom and a keyhole tab bent in at each end
  const xr = xL + 10;
  const zr0 = zH + T / 2, zr1 = zF - T / 2, Lr = zr1 - zr0;
  const rail: PartPiece[] = [
    { shape: "box", size: [4, y1 - y0, Lr], pos: [xr, (y0 + y1) / 2, 0] },
    { shape: "box", size: [30, 3, Lr - 8], pos: [xr - 17, yl, 0] },
    ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [26, y1 - y0, 3], pos: [xr - 13, (y0 + y1) / 2, sz * (Lr / 2 - 1.5)] })),
  ];
  k.welded("R1", "Side rail", rail);
  const rm = k.mid("R1");
  k.turned("R-1", "R1", [-rm[0], rm[1], rm[2]]);

  // the wide beds' centre beam, on a leg in the middle, hooked onto the two bands' ledges
  const zb0 = zH + T / 2 + 2, zb1 = zF - T / 2 - 2;
  if (wide) {
    k.welded("CB", "Centre beam", [
      { shape: "box", size: [40, 40, zb1 - zb0 - 60], pos: [0, yl - 20 + 1.5, (zb0 + zb1) / 2] },
      ...[zb0 + 16, zb1 - 16].map((z): PartPiece => ({ shape: "box", size: [60, 4, 32], pos: [0, yl + 3.5, z] })),
      { shape: "cyl", size: [25, yl - 40 - 14, 25], pos: [0, (yl - 40 + 14) / 2, (zb0 + zb1) / 2] },
      foot(0, (zb0 + zb1) / 2),
    ]);
  }

  // felt strips stuck along the rails' ledges (and the beam)
  const yS = yl + 2.5;
  const strips = (x: number, w: number, prefix: string) =>
    range(3).map((i) => {
      const len = (Lr - 240) / 3;
      const z = zr0 + 120 + len / 2 + i * len;
      const id = `${prefix}${i}`;
      k.put(id, "Felt strip", [w, 2, len - 30], [x, yS, z], { mat: "soft" });
      return id;
    });
  const stripIds = [...strips(-(xr - 17), 26, "SL"), ...strips(xr - 17, 26, "SR"), ...(wide ? strips(0, 36, "SC") : [])];

  // the slats, sold separately: one roll across the whole bed
  const ys = yS + 1;
  const sw = 2 * (xr - 2) - 10, sl = zb1 - zb0 - 70;
  k.welded("SB", "Slatted bed base", slatRoll(sw, sl, ys + 6, (zb0 + zb1) / 2), { mat: "wood", extra: true });

  const sides = [-1, 1];
  const railY = [y0 + 40, y1 - 40];
  const legPts = (z: number) => sides.flatMap((sx) => railY.map((y) => [sx * xL, y, z] as Vec3));

  k.step(
    { title: "Push the legs into the headboard", detail: "Lay the headboard on its front on a rug. Push the leg piece's tubes into the posts until the holes line up, then fit two bolts at each joint.", pose: "-z", tools: ["allen"], warnings: ["floor"], kind: "legs" },
    () => {
      k.add(["HB"], [0, 0, -300]);
      k.add(["HL"], [0, -300, 0]);
      k.fit(LEG_BOLT, sides.flatMap((sx) => [yJ + 18, yJ + 48].map((y) => [sx * xL, y, zH - T / 2] as Vec3)), [0, 0, 1], "HB", { mate: "HL" });
    },
  );
  k.step(
    { title: "Turn it over and fit the rail bolts", detail: "Two bolts into the inside of each leg. Stop with about 8 mm still standing out: the rails hang on them.", pose: "+z", tools: ["allen"], kind: "bolts" },
    () => k.fit(RAIL_BOLT, legPts(zH + T / 2 + 4), [0, 0, -1], "HL", { hole: false }),
  );
  k.step(
    { title: "Fit the rail bolts into the footboard", detail: "Lay the footboard on its front and do the same: two bolts in each leg, 8 mm standing out.", pose: "-z", scene: "foot", tools: ["allen"], warnings: ["floor"], kind: "bolts" },
    () => {
      k.stage(["FB"], [0, 0, 300]);
      k.fit(RAIL_BOLT, legPts(zF - T / 2 - 4), [0, 0, 1], "FB", { hole: false });
    },
  );
  k.step(
    { title: "Hang the side rails on the headboard", detail: "Stand the headboard up. Push each rail's keyholes over the two bolts and slide it down until it sits, ledge facing in.", pose: "+y", kind: "join" },
    () => k.add(["R-1", "R1"], [0, 250, 0]),
  );
  k.step(
    { title: "Hang the footboard on the rails", detail: "Together: one holds the rails up while the other guides the footboard's bolts into the keyholes and pushes it down.", people: 2, kind: "join" },
    () => k.add(["FB"], [0, 250, 250]),
  );
  if (wide) {
    k.step({ title: "Hook the centre beam onto the headboard", detail: "Rest its head end on the ledge of the headboard's band, in the middle.", kind: "join" }, () => k.add(["CB"], [0, 300, 0]));
    k.step({ title: "Lower it onto the footboard", detail: "Lay the other end on the footboard's ledge. The leg under the middle should just touch the floor.", kind: "join" }, () => {});
  }
  k.step(
    { title: "Tighten all the rail bolts", detail: "Fit the long Allen key into the handle from the bag and tighten each of the eight bolts until the handle clicks.", tools: ["allen"], check: "square", kind: "bolts" },
    () => {},
  );
  k.step({ title: "Press the caps over the keyholes", detail: "One over each bolt on the inside of the rail ends, eight in all.", kind: "general" }, () => {
    const zc = (z: number) => z;
    k.fit(CAP, legPts(zc(zr0 + 4)), [0, 0, -1], (p) => (p[0] < 0 ? "R-1" : "R1"), { hole: false });
    k.fit(CAP, legPts(zc(zr1 - 4)), [0, 0, 1], (p) => (p[0] < 0 ? "R-1" : "R1"), { hole: false });
  });
  const zHold = [zr0 + 50, zr1 - 50];
  k.step({ title: "Clip the slat holders onto the rails", detail: "Two at the head end, two at the foot. Hook each one into the slot in the ledge and turn it until it sits.", kind: "general" }, () =>
    k.fit(HOLDER, sides.flatMap((sx) => zHold.map((z) => [sx * (xr - 17), yl + 1.5, z] as Vec3)), [0, -1, 0], (p) => (p[0] < 0 ? "R-1" : "R1"), { hole: false }),
  );
  if (wide)
    k.step({ title: "Screw the small holders onto the centre beam", detail: "Two at each end, each held by a screw from underneath.", tools: ["screwdriver"], kind: "screws" }, () => {
      const pts = zHold.flatMap((z) => [-12, 12].map((x) => [x, yl + 5.5, z] as Vec3));
      k.fit(HOLDER_S, pts, [0, -1, 0], "CB", { hole: false });
      k.fit(SCREW, pts.map((p) => [p[0], yl - 38.5, p[2]] as Vec3), [0, 1, 0], "CB");
    });
  k.step({ title: "Stick the felt strips along the ledges", detail: wide ? "Three on each rail and three on the centre beam. Peel off the backing and press them down; don't cut them." : "Three on each rail. Peel off the backing and press them down; don't cut them.", kind: "general" }, () =>
    k.add(stripIds, [0, 150, 0]),
  );
  k.step({ title: "Lay in the slats", detail: "Curved side up, across the ledges. Tuck the end slats under the holders.", kind: "slats" }, () => k.add(["SB"], [0, 250, -500]));
  return true;
}

const family: Family = {
  names: ["STJÄRNÖ"],
  build,
};
export default family;
