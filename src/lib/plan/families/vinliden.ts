import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartItem, PartPiece, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * VINLIDEN, read from the sofa with chaise manual. There are no loose screws: the sofa frame is a fabric sling on
 * two rods that hook into the two armrests, locked by knobs turned with the key in the box. It's built lying on its
 * back: the right armrest goes onto the seat rod, the two of you swing the sling's second rod over into the upper
 * hooks, the curved support goes in the middle and the front rail hooks on, then every knob is tightened. Four legs
 * screw in, with felt pads. The chaise is a separate storage box: four frame panels hook together at the corners,
 * take corner brackets and top corners, a liner goes over it, and upside down it gets four legs and pads. The
 * covers go on both, then the cushions: two seat cushions, the long chaise cushion over the third seat and the box,
 * the box lid, three back cushions and two small pillows.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function sofa(s: ProductSpec): CustomParams {
  // IKEA: 233 wide, 162 deep with the chaise, 108 high; arms 59 high, seat 53 high, 9 cm free under it
  const W = s.size.w * 10, Dall = s.size.d * 10, H = s.size.h * 10;
  const legH = 90, armW = 120, armH = 590, deck = 380, seatTop = 530;
  const inX = W / 2 - armW; // inner face of an arm
  const oD = 650; // the chaise box, in front of the third seat
  const zF = Dall / 2 - oD, zB = -Dall / 2; // the sofa's front and back
  const backT = 180, zBk = zB + backT; // front of the back
  const bx0 = inX - 700, bx1 = inX; // the box's sides
  const bz0 = zF, bz1 = Dall / 2;
  const by = deck - legH;
  const parts: CustomPart[] = [
    ...[-1, 1].map((sx): CustomPart => ({ id: sx < 0 ? "ARM_L" : "ARM_R", name: "Armrest", size: [armW, armH - legH, zF - zB], pos: [sx * (W / 2 - armW / 2), (armH + legH) / 2, (zF + zB) / 2], material: "soft" })),
    {
      id: "SLING",
      name: "Seat and back sling",
      size: [2 * inX, 880 - legH - 40, zF - zB],
      pos: [0, (880 + legH + 40) / 2, (zF + zB) / 2],
      pieces: [
        { shape: "box", size: [2 * inX, 30, zF - zBk], pos: [0, deck - 15 - (880 + legH + 40) / 2, (zF + zBk) / 2 - (zF + zB) / 2], material: "soft" },
        { shape: "box", size: [2 * inX, 880 - deck, 30], pos: [0, (880 + deck) / 2 - (880 + legH + 40) / 2, zB + 40 - (zF + zB) / 2], material: "soft" },
        { shape: "cyl", size: [30, 2 * inX, 30], pos: [0, deck - 15 - (880 + legH + 40) / 2, zF - 20 - (zF + zB) / 2], rot: [0, 0, Math.PI / 2], material: "metal" },
        { shape: "cyl", size: [30, 2 * inX, 30], pos: [0, 880 - 15 - (880 + legH + 40) / 2, zB + 40 - (zF + zB) / 2], rot: [0, 0, Math.PI / 2], material: "metal" },
      ],
    },
    { id: "SUPPORT", name: "Curved support", size: [40, 40, zF - zBk - 40], pos: [0, deck - 60, (zF + zBk) / 2], material: "metal" },
    { id: "RAIL", name: "Front rail", size: [2 * inX, 30, 30], pos: [0, legH + 40, zF - 30], shape: "cyl", material: "metal" },
    ...[-1, 1].flatMap((sx) => [zB + 60, zF - 60].map((z, i): CustomPart => ({ id: `LEG${sx}${i}`, name: "Leg", size: [60, legH, 60], pos: [sx * (W / 2 - 60), legH / 2, z], shape: "cyl", material: "wood" }))),
    // the cover: over the arms and the back, with the skirt down the front
    {
      id: "COVER",
      name: "Sofa cover",
      size: [W + 8, 880 - legH + 4, zF - zB + 8],
      pos: [0, (880 + legH) / 2, (zF + zB) / 2],
      pieces: [
        ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [armW + 8, armH - legH + 4, zF - zB + 8], pos: [sx * (W / 2 - armW / 2), (armH + legH) / 2 - (880 + legH) / 2, 0] })),
        { shape: "box", size: [2 * inX, 880 - legH, backT + 4], pos: [0, 0, zB + backT / 2 - (zF + zB) / 2 - 2] },
        { shape: "box", size: [2 * inX, deck - legH, 6], pos: [0, (deck + legH) / 2 - (880 + legH) / 2, (zF - zB) / 2 + 1] },
      ],
      material: "soft",
    },
    // the chaise box
    ...[-1, 1].map((sz): CustomPart => ({ id: sz < 0 ? "BOX_B" : "BOX_F", name: "Box panel, long", size: [700, by, 20], pos: [(bx0 + bx1) / 2, legH + by / 2, sz < 0 ? bz0 + 10 : bz1 - 10], material: "board" })),
    ...[-1, 1].map((sx): CustomPart => ({ id: sx < 0 ? "BOX_L" : "BOX_R", name: "Box panel, short", size: [20, by, oD - 40], pos: [sx < 0 ? bx0 + 10 : bx1 - 10, legH + by / 2, (bz0 + bz1) / 2], material: "board" })),
    { id: "LINER", name: "Box liner", size: [704, by + 2, oD + 4], pos: [(bx0 + bx1) / 2, legH + by / 2 + 1, (bz0 + bz1) / 2], pieces: [{ shape: "box", size: [704, 4, oD + 4], pos: [0, -by / 2 - 1, 0] }], material: "soft" },
    ...[0, 1, 2, 3].map((i): CustomPart => ({ id: `BLEG${i}`, name: "Leg", size: [60, legH, 60], pos: [i % 2 ? bx1 - 50 : bx0 + 50, legH / 2, i < 2 ? bz0 + 50 : bz1 - 50], shape: "cyl", material: "wood" })),
    {
      id: "BCOVER",
      name: "Box cover",
      size: [708, by + 4, oD + 8],
      pos: [(bx0 + bx1) / 2, legH + by / 2, (bz0 + bz1) / 2],
      pieces: [
        ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [708, by + 4, 4], pos: [0, 0, sz * (oD / 2 + 2)] })),
        ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [4, by + 4, oD + 8], pos: [sx * 352, 0, 0] })),
      ],
      material: "soft",
    },
    { id: "LID", name: "Box lid", size: [700, 20, oD], pos: [(bx0 + bx1) / 2, deck - 10, (bz0 + bz1) / 2], material: "board" },
    // cushions
    ...[0, 1].map((i): CustomPart => ({ id: `SEAT${i}`, name: "Seat cushion", size: [(2 * inX) / 3, seatTop - deck, zF - zBk], pos: [-inX + ((i + 0.5) * 2 * inX) / 3, (deck + seatTop) / 2, (zF + zBk) / 2], material: "soft" })),
    { id: "CHAISE", name: "Chaise cushion", size: [(2 * inX) / 3, seatTop - deck, bz1 - zBk], pos: [inX - inX / 3, (deck + seatTop) / 2, (bz1 + zBk) / 2], material: "soft" },
    ...[0, 1, 2].map((i): CustomPart => ({ id: `BACK${i}`, name: "Back cushion", size: [(2 * inX) / 3 - 10, H - 450, 200], pos: [-inX + ((i + 0.5) * 2 * inX) / 3, (450 + H) / 2, zBk + 100], rot: [-0.12, 0, 0], material: "soft" })),
    ...[-1, 1].map((sx): CustomPart => ({ id: sx < 0 ? "PILLOW_L" : "PILLOW_R", name: "Small pillow", size: [420, 300, 140], pos: [sx * (inX - 230), seatTop + 170, zBk + 290], rot: [-0.3, 0, 0], material: "soft" })),
  ];
  const knobs = (sx: number, ys: number[], z: number): Vec3[] => ys.map((y): Vec3 => [sx * inX, y, z]);
  const sofaLegs = parts.filter((p) => /^LEG/.test(p.id));
  const boxLegs = parts.filter((p) => /^BLEG/.test(p.id));
  const pads = (legs: CustomPart[]) => legs.map((l) => fx("glide", [[l.pos[0], 0, l.pos[2]]], [0, 1, 0], l.id, { name: "Felt pad", dia: 50 }));
  const boxCorners = (y: number): Vec3[] => [bx0 + 20, bx1 - 20].flatMap((x) => [bz0 + 20, bz1 - 20].map((z): Vec3 => [x, y, z]));
  const steps: CustomStep[] = [
    {
      title: "Lay the sling out with the left armrest",
      detail: "Lay the left armrest on its back on a rug and spread the sling out from it, rods across, the marked ends at the armrest.",
      add: ["ARM_L", "SLING"],
      pose: "+z",
      warnings: ["floor"],
    },
    {
      title: "Set the right armrest onto the seat rod",
      detail: "Lower it so both hooks drop over the rod's end.",
      add: ["ARM_R"],
      from: { ARM_R: [300, 0, 0] },
    },
    {
      title: "Lock the seat rod into both armrests",
      detail: "Match the marks on each side, then turn the knob at each end with the key until it holds the rod.",
      fix: [fx("knob", [knobs(-1, [deck - 15], zF - 20)[0]], [1, 0, 0], "ARM_L", { name: "Locking knob" }), fx("knob", [knobs(1, [deck - 15], zF - 20)[0]], [-1, 0, 0], "ARM_R", { name: "Locking knob" })],
      tools: ["allen"],
    },
    {
      title: "Swing the back rod over into the upper hooks",
      detail: "Lift the sling's second rod together, one at each end, and drop it into the hooks matching its marks.",
      people: 2,
      warnings: ["two"],
    },
    {
      title: "Lock the back rod",
      detail: "Turn the knob at each end with the key until it holds.",
      fix: [fx("knob", [knobs(-1, [865], zB + 40)[0]], [1, 0, 0], "ARM_L", { name: "Locking knob" }), fx("knob", [knobs(1, [865], zB + 40)[0]], [-1, 0, 0], "ARM_R", { name: "Locking knob" })],
      tools: ["allen"],
    },
    { title: "Press the rods home", detail: "Push each rod end into its hook until it clicks, and give the knobs another turn.", tools: ["allen"] },
    { title: "Hook the curved support under the middle of the seat", detail: "Its back end goes into the clip on the back rod.", add: ["SUPPORT"] },
    { title: "Clip the other end of the support on", detail: "Turn it so both ends sit in their clips, one at the back and one at the front." },
    { title: "Tighten the support", detail: "Turn its screw with the key. The flat side faces the sling, not the floor.", tools: ["allen"] },
    { title: "Tighten the lower knobs", detail: "One on each armrest, with the key.", tools: ["allen"] },
    {
      title: "Hook the front rail on",
      detail: "Drop it into the hooks on both armrests, then lock it with the knob at each end.",
      add: ["RAIL"],
      fix: [fx("knob", [knobs(-1, [legH + 40], zF - 30)[0]], [1, 0, 0], "ARM_L", { name: "Locking knob" }), fx("knob", [knobs(1, [legH + 40], zF - 30)[0]], [-1, 0, 0], "ARM_R", { name: "Locking knob" })],
      tools: ["allen"],
    },
    { title: "Tighten every knob", detail: "All six, firmly with the key. Tuck the sling's loose edge under its strap.", tools: ["allen"] },
    { title: "Screw in the legs", detail: "Four, one in each corner, clockwise by hand.", add: sofaLegs.map((l) => l.id) },
    { title: "Stick the felt pads on and stand it up", detail: "One under each leg. Then tip the sofa upright onto its legs.", fix: pads(sofaLegs), pose: "+y", people: 2 },
    {
      title: "Hook the chaise box panels together",
      detail: "Stand the four panels in a square, the long ones front and back, and push each corner's hooks down into the slots.",
      add: ["BOX_B", "BOX_F", "BOX_L", "BOX_R"],
      fix: [fx("connector", boxCorners(legH + by / 2), [0, -1, 0], undefined, { name: "Corner hook", len: 20, dia: 12 })],
      pose: "+y",
    },
    { title: "Click the corner brackets in underneath", detail: "One in each bottom corner, pushed up until it clicks.", fix: [fx("connector", boxCorners(legH + 10), [0, 1, 0], undefined, { name: "Corner bracket", len: 20, dia: 30 })] },
    { title: "Press the top corners on", detail: "One on each top corner, pressed down flat.", fix: [fx("cap", boxCorners(deck - 5), [0, -1, 0], undefined, { name: "Top corner", len: 10, dia: 40 })] },
    { title: "Pull the liner over the box", detail: "Turn the box upside down and pull the liner over it.", add: ["LINER"], pose: "-y" },
    { title: "Screw the legs into the box", detail: "Four, clockwise by hand, through the liner.", add: boxLegs.map((l) => l.id) },
    { title: "Stick the felt pads under the box legs", detail: "One under each leg.", fix: pads(boxLegs) },
    { title: "Turn the box over and fasten the liner", detail: "Pull the liner's edges over the top rails and press its strips down all round the inside.", pose: "+y" },
    {
      title: "Pull the cover over the sofa",
      detail: "Fit it over the back and both armrests first, then pull it down the front. Tip the sofa on its back to fasten the strips under the frame.",
      add: ["COVER"],
      from: { COVER: [0, 600, 0] },
    },
    { title: "Fasten the cover all round", detail: "Stand the sofa up and press the strips down along the back and at the ends until the cover sits smooth." },
    { title: "Fit the cover on the chaise box", detail: "Turn the box upside down, pull the cover over its sides and fasten it underneath, then turn it back.", add: ["BCOVER"], from: { BCOVER: [0, 500, 0] } },
    { title: "Put the seat cushions in", detail: "Unpack them and let them fill out. The two seat cushions go at the end away from the chaise.", add: ["SEAT0", "SEAT1"] },
    { title: "Lay the lid on the chaise box", detail: "Set the box in front of the sofa's third seat, then drop the lid in, its handle hole at the front.", add: ["LID"] },
    { title: "Lay the chaise cushion on", detail: "Over the third seat and the box together, zip side down.", add: ["CHAISE"] },
    { title: "Stand the back cushions in", detail: "Three, side by side against the back.", add: ["BACK0", "BACK1", "BACK2"] },
    { title: "Add the small pillows", detail: "One at each end, against the armrest.", add: ["PILLOW_L", "PILLOW_R"] },
  ];
  return { parts, steps };
}

/** Parts built on their own are shown in their own scene for steps `from` to `until`, and come in at `join`. */
function apart(b: PlanBuilder, r: CustomParams, ids: string[], scene: string, from: number, until: number, join: number, off: Vec3) {
  for (let i = from; i < until; i++) if (b.steps[i]) b.steps[i].scene = scene;
  for (const id of ids) {
    const p = r.parts.find((q) => q.id === id)!;
    const it = b.items.find((x): x is PartItem => x.kind === "part" && x.final.pos.every((v, k) => Math.abs(v - p.pos[k]) < 0.5));
    if (!it) continue;
    it.states = it.states.filter((st) => st.step < join).map((st) => ({ ...st, scene }));
    it.states.push({ step: join, scene: "main", pos: it.final.pos, rot: it.final.rot, from: off, delay: 0.2 });
  }
}

const family: Family = {
  names: ["VINLIDEN"],
  build(b, s) {
    if (!/chaise/i.test(`${s.variant} ${s.slug ?? ""}`)) return false;
    const r = sofa(s);
    buildCustom(b, { ...s, custom: r });
    const idx = (re: RegExp) => r.steps.findIndex((x) => re.test(x.title));
    // the chaise box is built on its own and set in front of the sofa when its cover is on
    const box = r.parts.filter((p) => /^(BOX_|BLEG|LINER|BCOVER)/.test(p.id)).map((p) => p.id);
    apart(b, r, box, "box", idx(/box panels together/), idx(/cover over the sofa/), idx(/seat cushions in/), [0, 0, 600]);
    const cov = idx(/cover on the chaise box/);
    if (b.steps[cov]) b.steps[cov].scene = "box";
    return true;
  },
};
export default family;
