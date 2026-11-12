import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, PartItem, PartState, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * KURA, read from the reversible bed's manual, built the way IKEA's photo shows it: the low bed (the manual's third
 * branch; the same frame turned over is the loft bed). Everything is pine bars and white panels held by long wood
 * screws. Each end is put together flat on the floor: a corner post screwed to three bars, the other bars and the
 * panels slid in, then the second post. The two long sides are two rails with a spacer bolted between them on barrel
 * nuts and a long panel slid in. Stood up, the sides are screwed between the ends, a middle post and the two top
 * rails go on, and the slat strips are screwed along the bed rails. The bed is turned over to roll out the slats
 * and lock their holders (32, or 28 on the twin), then turned back onto its feet.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const SCREW = { len: 70, dia: 6 };

interface Plan {
  parts: CustomPart[];
  steps: CustomStep[];
  flatA: string[];
  flatB: string[];
  flatF: string[];
  flatK: string[];
  L: number;
  W: number;
  H: number;
  up: { a: number; b: number; f: number };
}

function plan(s: ProductSpec): Plan | null {
  if (!/kura/i.test(s.slug ?? s.name) || !/bed/i.test(s.variant)) return null;
  // IKEA's measures: 209 x 99 (90x200) or 199 x 105 (US twin), 116 high
  const twin = /twin/i.test(`${s.slug ?? ""} ${s.variant}`);
  const L = twin ? 1990 : 2090, W = twin ? 1050 : 990, H = 1160;
  const P = 50; // posts
  const bt = 30, bh = 45; // bars and rails
  const xA = -L / 2 + P / 2, xB = L / 2 - P / 2;
  const zp = W / 2 - P / 2;
  const bedY = 330; // centre of the bed rails
  const bedTop = bedY + bh / 2;
  const inW = W - 2 * P;
  const parts: CustomPart[] = [];
  const wood = (id: string, name: string, size: Vec3, pos: Vec3) => parts.push({ id, name, size, pos, material: "wood" });
  const panel = (id: string, name: string, size: Vec3, pos: Vec3) => parts.push({ id, name, size, pos, material: "fiber" });

  // ends
  const aBars = [bh / 2, bedY, 600, 870, H - bh / 2];
  const bBars = [bh / 2, bedY, H - bh / 2];
  for (const [e, x] of [["A", xA], ["B", xB]] as const) {
    wood(`${e}P0`, "Corner post", [P, H, P], [x, H / 2, -zp]);
    wood(`${e}P1`, "Corner post", [P, H, P], [x, H / 2, zp]);
  }
  aBars.forEach((y, i) => wood(`AR${i}`, "End bar", [bt, bh, inW], [xA, y, 0]));
  bBars.forEach((y, i) => wood(`BR${i}`, "End bar", [bt, bh, inW], [xB, y, 0]));
  for (let i = 0; i < 4; i++) {
    const y0 = aBars[i] + bh / 2, y1 = aBars[i + 1] - bh / 2;
    panel(`AN${i}`, "End panel", [6, y1 - y0, inW], [xA, (y0 + y1) / 2, 0]);
  }
  panel("BN0", "End panel", [6, bBars[1] - bBars[0] - bh, inW], [xB, (bBars[0] + bBars[1]) / 2, 0]);

  // long sides: bottom rail, bed rail, a spacer between them and a panel
  const len = L - 2 * P;
  const zs = W / 2 - bt / 2;
  for (const [k, sz] of [["K", -1], ["F", 1]] as const) {
    wood(`${k}0`, "Bottom rail", [len, bh, bt], [0, bh / 2, sz * zs]);
    wood(`${k}1`, "Bed rail", [len, bh, bt], [0, bedY, sz * zs]);
    wood(`${k}S`, "Spacer", [bh, bedY - bh, bt], [0, (bedY + bh / 2) / 2, sz * zs]);
    panel(`${k}N`, "Side panel", [len, bedY - 1.5 * bh, 6], [0, (bedY + bh / 2) / 2, sz * zs]);
  }
  // top, middle post, slat strips, slats
  const mx = -L / 2 + Math.round(0.36 * L);
  wood("MP", "Middle post", [bh, H - bh - bedTop, bt], [mx, (bedTop + H - bh) / 2, -zs]);
  wood("TK", "Top rail", [len, bh, bt], [0, H - bh / 2, -zs]);
  wood("TF", "Top rail", [len, bh, bt], [0, H - bh / 2, zs]);
  const zStrip = W / 2 - bt - 12;
  parts.push({ id: "SK", name: "Slat strip", size: [len, 20, 24], pos: [0, bedTop - 10, -zStrip], material: "metal" });
  parts.push({ id: "SF", name: "Slat strip", size: [len, 20, 24], pos: [0, bedTop - 10, zStrip], material: "metal" });
  const nSlat = twin ? 14 : 16; // 28 or 32 holders
  const slatXs = Array.from({ length: nSlat }, (_, i) => -len / 2 + 70 + ((len - 140) * i) / (nSlat - 1));
  const slatW = W - 2 * bt - 10;
  parts.push({
    id: "SL",
    name: "Slatted base",
    size: [len - 60, 15, slatW],
    pos: [0, bedTop + 8, 0],
    pieces: slatXs.map((x) => ({ shape: "box" as const, size: [62, 15, slatW] as Vec3, pos: [x, 0, 0] as Vec3 })),
    material: "wood",
  });
  parts.push({ id: "MAT", name: "Mattress", size: [L - 90, 120, W - 90], pos: [0, bedTop + 16 + 60, 0], material: "soft", extra: true });

  // fittings: long screws through a post into the end of a bar or rail
  const thruZ = (x: number, ys: number[], sz: number, on: string, mate?: string) => at("screw", ys.map((y) => [x, y, sz * (W / 2)] as Vec3), [0, 0, -sz], on, mate, SCREW);
  const thruX = (sx: number, ys: number[], z: number, on: string, mate?: string, o: Partial<CustomFix> = SCREW) =>
    at("screw", ys.map((y) => [sx * (L / 2), y, z] as Vec3), [-sx, 0, 0], on, mate, o);
  const screwed = [aBars[0], aBars[1], aBars[4]];
  const steps: CustomStep[] = [
    { title: "Screw a corner post to three end bars", detail: "Lay them on a rug: the bottom bar, the bed-level bar and the top bar. One long screw through the post into each.", add: ["AP0", "AR0", "AR1", "AR4"], fix: [thruZ(xA, screwed, -1, "AP0")], tools: ["screwdriver"], warnings: ["floor"] },
    { title: "Slide in the two middle bars", detail: "They push onto the post between the others, holes facing the same way.", add: ["AR2", "AR3"] },
    { title: "Slide the four end panels in", detail: "White side out, into the grooves of the bars, all the way to the post.", add: ["AN0", "AN1", "AN2", "AN3"] },
    { title: "Screw on the second post", detail: "Three screws, into the same three bars.", add: ["AP1"], fix: [thruZ(xA, screwed, 1, "AP1")], tools: ["screwdriver"] },
    { title: "Build the other end the same way", detail: "A post screwed to its three bars, three screws.", add: ["BP0", "BR0", "BR1", "BR2"], fix: [thruZ(xB, bBars, -1, "BP0")], tools: ["screwdriver"] },
    { title: "Slide its panel in", detail: "One panel, between the bottom bar and the bed-level bar.", add: ["BN0"] },
    { title: "Screw on its second post", detail: "Three screws, like the first.", add: ["BP1"], fix: [thruZ(xB, bBars, 1, "BP1")], tools: ["screwdriver"] },
    {
      title: "Bolt a spacer between two rails",
      detail: "For each long side: a barrel nut into each end of the spacer, then a long bolt through each rail into it, turned with the cranked key.",
      add: ["K0", "K1", "KS", "F0", "F1", "FS"],
      fix: [
        at("nut", (["K", "F"] as const).flatMap((k) => [bh + 20, bedY - bh / 2 - 20].map((y) => [0, y, (k === "K" ? -1 : 1) * zs] as Vec3)), [0, 0, 1], undefined, undefined, { len: 12, dia: 10, name: "Barrel nut" }),
        at("bolt", ([-1, 1] as const).map((sz) => [0, 0, sz * zs] as Vec3), [0, 1, 0], undefined, undefined, { len: 90, dia: 6 }),
        at("bolt", ([-1, 1] as const).map((sz) => [0, bedY + bh / 2, sz * zs] as Vec3), [0, -1, 0], undefined, undefined, { len: 90, dia: 6 }),
      ],
      tools: ["allen"],
    },
    { title: "Slide a long panel into each side", detail: "Into the grooves between the rails, white side out.", add: ["KN", "FN"] },
    { title: "Tighten the four bolts", detail: "Firmly, so the spacers sit square in the middle of the rails.", tools: ["allen"], kind: "bolts" },
    {
      title: "Stand the panel end up and screw a long side to it",
      detail: "One holds while the other screws. Two screws through the post, into the bottom and bed rails.",
      fix: [thruX(-1, [bh / 2, bedY], -zs, "AP0", "K0")],
      people: 2,
      warnings: ["two"],
      tools: ["screwdriver"],
    },
    { title: "Screw the other end on", detail: "Two screws through its post into the same long side.", fix: [thruX(1, [bh / 2, bedY], -zs, "BP0", "K0")], people: 2, warnings: ["two"], tools: ["screwdriver"] },
    { title: "Screw the second long side to that end", detail: "Two screws through the post into its rails.", fix: [thruX(1, [bh / 2, bedY], zs, "BP1", "F0")], tools: ["screwdriver"] },
    { title: "Fix it at the panel end with the long screw", detail: "The extra-long screw goes through the post into the bed rail.", fix: [thruX(-1, [bedY], zs, "AP1", "F1", { len: 100, dia: 6, name: "Long screw" })], tools: ["screwdriver"] },
    { title: "Screw in the bottom rail there", detail: "One screw through the post into the bottom rail.", fix: [thruX(-1, [bh / 2], zs, "AP1", "F0")], tools: ["screwdriver"] },
    { title: "Stand the middle post on the back bed rail", detail: "Its peg goes into the hole in the top of the rail.", add: ["MP"] },
    { title: "Screw the middle post down", detail: "One screw up through the bed rail into the post.", fix: [at("screw", [[mx, bedY - bh / 2, -zs]], [0, 1, 0], "K1", "MP", SCREW)], tools: ["screwdriver"] },
    { title: "Lay the back top rail on", detail: "Between the tops of the corner posts, over the middle post.", add: ["TK"] },
    {
      title: "Screw the back top rail on",
      detail: "Through each corner post, and down into the middle post.",
      fix: [thruX(-1, [H - bh / 2], -zs, "AP0", "TK"), thruX(1, [H - bh / 2], -zs, "BP0", "TK"), at("screw", [[mx, H, -zs]], [0, -1, 0], "TK", "MP", SCREW)],
      tools: ["screwdriver"],
    },
    { title: "Lay the front top rail on", detail: "Between the two front corner posts.", add: ["TF"] },
    { title: "Screw the front top rail on", detail: "One screw through each corner post.", fix: [thruX(-1, [H - bh / 2], zs, "AP1", "TF"), thruX(1, [H - bh / 2], zs, "BP1", "TF")], tools: ["screwdriver"] },
    {
      title: "Screw the slat strips along the bed rails",
      detail: "Nine short screws in each strip, the centre hole lined up with the middle of the rail.",
      add: ["SK", "SF"],
      fix: (["SK", "SF"] as const).map((id) =>
        at("screw", Array.from({ length: 9 }, (_, i) => [-len / 2 + 100 + ((len - 200) * i) / 8, bedTop - 10, (id === "SK" ? -1 : 1) * (zStrip - 12)] as Vec3), [0, 0, id === "SK" ? -1 : 1], id, id === "SK" ? "K1" : "F1", { len: 16, dia: 4 }),
      ),
      tools: ["screwdriver"],
    },
    { title: "Turn the bed over and roll out the slats", detail: "Turn it over together, then stand inside it and unroll the slats onto the strips.", add: ["SL"], pose: "-y", people: 2, warnings: ["two"] },
    {
      title: "Click a holder onto each slat end",
      detail: `${2 * nSlat} holders, pushed through the slat into the strip until they click.`,
      fix: [at("clip", slatXs.flatMap((x) => [-1, 1].map((sz) => [x, bedTop + 16, sz * (slatW / 2 - 20)] as Vec3)), [0, -1, 0], "SL", undefined, { len: 12, dia: 14, name: "Slat holder" })],
    },
    {
      title: "Twist in the locks",
      detail: "One in each holder, a quarter turn until it stops. Check every slat is held at both ends.",
      fix: [at("cap", slatXs.flatMap((x) => [-1, 1].map((sz) => [x, bedTop + 18, sz * (slatW / 2 - 20)] as Vec3)), [0, -1, 0], "SL", undefined, { len: 6, dia: 16, name: "Slat lock" })],
    },
    { title: "Turn the bed back onto its feet", detail: "Together. Then lay in your mattress: no thicker than 12 cm.", add: ["MAT"], pose: "+y", people: 2, warnings: ["two"] },
  ];
  return {
    parts,
    steps,
    flatA: ["AP0", "AP1", ...aBars.map((_, i) => `AR${i}`), "AN0", "AN1", "AN2", "AN3"],
    flatB: ["BP0", "BP1", ...bBars.map((_, i) => `BR${i}`), "BN0"],
    flatK: ["K0", "K1", "KS", "KN"],
    flatF: ["F0", "F1", "FS", "FN"],
    L,
    W,
    H,
    up: { a: 10, b: 11, f: 12 },
  };
}

const rx = (v: Vec3, a: number): Vec3 => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];
const rz = (v: Vec3, a: number): Vec3 => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];

/**
 * The ends and the long sides are built lying flat on the floor, out of the bed's way, and stand up where they
 * belong at the step that joins them.
 */
function build(b: PlanBuilder, s: ProductSpec) {
  const p = plan(s);
  if (!p) return false;
  buildCustom(b, { ...s, custom: { parts: p.parts, steps: p.steps } });
  const byId = new Map(p.parts.map((x) => [x.id, x]));
  const item = (id: string) => {
    const part = byId.get(id)!;
    return b.items.find((x): x is PartItem => x.kind === "part" && x.final.pos.every((v, k) => Math.abs(v - part.pos[k]) < 0.5));
  };
  const lay = (ids: string[], until: number, place: (c: Vec3) => { pos: Vec3; rot: Vec3 }) => {
    for (const id of ids) {
      const it = item(id);
      if (!it || !it.states.length) continue;
      const first = it.states[0];
      const f = place(byId.get(id)!.pos);
      const up: PartState = { step: until, scene: first.scene, pos: it.final.pos, rot: it.final.rot, from: [0, 160, 0], delay: 0 };
      it.states = [{ ...first, pos: f.pos, rot: f.rot }, up];
    }
  };
  const { L, W, H } = p;
  const xA = -L / 2 + 25, xB = L / 2 - 25;
  // an end lies flat on the floor beside where it will stand, its top towards the bed
  lay(p.flatA, p.up.a, (c) => {
    const r = rz([c[0] - xA, c[1], c[2]], -Math.PI / 2);
    return { pos: [-L / 2 - 150 - H + r[0], 26 + r[1], r[2]], rot: [0, 0, -Math.PI / 2] };
  });
  lay(p.flatB, p.up.b, (c) => {
    const r = rz([c[0] - xB, c[1], c[2]], Math.PI / 2);
    return { pos: [L / 2 + 150 + H + r[0], 26 + r[1], r[2]], rot: [0, 0, Math.PI / 2] };
  });
  // a long side lies on its outside face, in front of or behind where the bed will stand
  const zs = W / 2 - 15;
  lay(p.flatK, p.up.a, (c) => {
    const r = rx([c[0], c[1], c[2] + zs], -Math.PI / 2);
    return { pos: [r[0], 20 + r[1], -W / 2 - 150 + r[2]], rot: [-Math.PI / 2, 0, 0] };
  });
  lay(p.flatF, p.up.f, (c) => {
    const r = rx([c[0], c[1], c[2] - zs], Math.PI / 2);
    return { pos: [r[0], 20 + r[1], W / 2 + 150 + r[2]], rot: [Math.PI / 2, 0, 0] };
  });
  return true;
}

const family: Family = { names: ["KURA"], build };
export default family;
