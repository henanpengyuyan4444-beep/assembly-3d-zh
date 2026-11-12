import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * EKENÄSET, read from its manuals. The armchair comes as an upholstered seat, an upholstered back and two solid wood
 * side frames (armrest, two legs and a seat rail in one piece). Two studs go into the back of the seat and the back is
 * lowered onto them by two people and nutted on. Studs, a dowel and a cam bolt go into each side frame, felt pads under
 * the legs, then each frame is pushed onto the seat and nutted from inside, the two cam locks turned in the back and
 * every nut tightened with the spanner that comes with it. The first beech version has a third stud per frame,
 * nutted inside the back through its zips; the later ones have a connector bolt there instead, and the high-back
 * armchair gets a weighted headrest laid over the top.
 * The footstool is built upside down: dowels into its frame, two leg frames on, bolted from inside, pads, turned over.
 * The bench is a frame of two end frames and two long rails held by four corner brackets, laid upside down onto the
 * seat and screwed through the brackets.
 */

type Kind = CustomFix["kind"];
const fx = (kind: Kind, at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
const r1 = (n: number) => Math.round(n * 10) / 10;
const G = [-1, 1] as const;

/** A box piece, turned about x only (the legs and back lean forwards or backwards, never sideways). */
const bx = (size: Vec3, pos: Vec3, tilt = 0): PartPiece => ({ shape: "box", size, pos, ...(tilt ? { rot: [tilt, 0, 0] as Vec3 } : {}) });

/** A stick from (y0, z0) to (y1, z1) at x: its length and lean worked out from the two ends. */
function stick(x: number, t: number, y0: number, z0: number, y1: number, z1: number): PartPiece {
  const dy = y1 - y0, dz = z1 - z0;
  return bx([t, Math.hypot(dy, dz), t], [x, (y0 + y1) / 2, (z0 + z1) / 2], Math.atan2(dz, dy));
}

function extent(p: PartPiece): [Vec3, Vec3] {
  const a = p.rot?.[0] ?? 0;
  const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  const h: Vec3 = [p.size[0] / 2, (c * p.size[1] + s * p.size[2]) / 2, (s * p.size[1] + c * p.size[2]) / 2];
  return [p.pos.map((v, i) => v - h[i]) as Vec3, p.pos.map((v, i) => v + h[i]) as Vec3];
}

/** A part drawn as pieces placed in product coordinates: works out its box and moves the pieces relative to it. */
function built(id: string, name: string, pieces: PartPiece[], material: CustomPart["material"]): CustomPart {
  const boxes = pieces.map(extent);
  const lo = [0, 1, 2].map((i) => Math.min(...boxes.map((b) => b[0][i]))) as Vec3;
  const hi = [0, 1, 2].map((i) => Math.max(...boxes.map((b) => b[1][i]))) as Vec3;
  const mid = lo.map((v, i) => r1((v + hi[i]) / 2)) as Vec3;
  return {
    id,
    name,
    size: lo.map((v, i) => r1(hi[i] - v)) as Vec3,
    pos: mid,
    material,
    pieces: pieces.map((p) => ({ ...p, pos: p.pos.map((v, i) => r1(v - mid[i])) as Vec3 })),
  };
}

/** A leaning box as a whole part: centre and size of the box before it leans. */
const leaning = (id: string, name: string, size: Vec3, pos: Vec3, tilt: number, material: CustomPart["material"]): CustomPart => ({ id, name, size, pos, rot: [tilt, 0, 0], material });

/* ---------- armchair ---------- */

const STUD = { len: 90, dia: 8, name: "Threaded stud" };
const CONNECTOR = { kind: "stud" as Kind, len: 70, dia: 10, name: "Connector bolt" };
const NUT = { len: 7, dia: 8 };
const WASHER = { len: 2, dia: 20 };
const PAD = { len: 4, dia: 28, name: "Felt pad" };
const FT = 40; // side frame wood, square

interface Chair {
  W: number;
  D: number;
  H: number; // top of the back
  seatH: number;
  armH: number;
  tilt: number; // the back's lean, radians (negative leans back)
  high: boolean; // high back with a headrest
  beech: boolean; // the first version: three studs a frame, the third nutted inside the back through its zips
  z0: number; // the chair's centre front to back (moved back when a footstool stands in front)
}

function armchair(o: Chair): CustomParams {
  const { W, D, seatH, armH, tilt } = o;
  const zF = o.z0 + D / 2; // front of the armrests
  const xi = W / 2 - FT; // inner face of a side frame
  const xs = W / 2 - FT / 2;
  const yRail = 270; // the seat rail the studs come out of
  const legTop = armH - 30;
  const zLeg = (y: number) => zF - 770 + (130 * y) / legTop; // the back leg leans forwards as it rises

  const side = (id: "L" | "R", sx: number): CustomPart =>
    built(
      id,
      "Side frame",
      [
        bx([FT, 30, 700], [sx * xs, armH - 15, zF - 350]),
        stick(sx * xs, FT, 0, zF - 100, legTop, zF - 140),
        stick(sx * xs, FT, 0, zF - 770, legTop, zF - 640),
        bx([FT, 60, 590], [sx * xs, yRail, zF - 405]),
      ],
      "wood",
    );

  // the seat: a cushion on springs, with a low ledge at the back that the back stands on
  const seat = built(
    "S",
    "Seat",
    [
      bx([2 * xi, seatH - 260, 500], [0, (seatH + 260) / 2, zF - 310]),
      bx([2 * xi, 70, 130], [0, 295, zF - 625]),
    ],
    "soft",
  );
  const yLedge = 330;
  const zBack = zF - 620; // where the back's bottom edge stands
  const T = 130;
  const c = Math.cos(tilt), sn = Math.sin(tilt);
  const yB = yLedge + 15 + (T / 2) * Math.abs(sn);
  const L = (o.H - yB - (T / 2) * Math.abs(sn)) / c;
  const back = leaning("B", "Back", [2 * xi, Math.round(L), T], [0, r1(yB + (L / 2) * c), r1(zBack + (L / 2) * sn)], tilt, "soft");
  // a point on the back's middle line at height y, and on its rear face
  const backZ = (y: number) => zBack + ((y - yB) / c) * sn;
  const rearZ = (y: number) => backZ(y) - (T / 2) * c;

  const parts: CustomPart[] = [seat, back, side("L", -1), side("R", 1)];
  if (o.high) {
    const t = L - 130;
    const n: Vec3 = [0, -sn, c];
    parts.push(leaning("P", "Headrest", [380, 160, 80], [0, r1(yB + t * c + 105 * n[1]), r1(zBack + t * sn + 105 * n[2])], tilt, "soft"));
  }

  const xb = 180;
  const backStuds: Vec3[] = G.map((sx) => [sx * xb, yLedge, zBack]);
  const backNuts: Vec3[] = G.map((sx) => [sx * xb, yLedge + 40, zBack]);
  const railZ = [zF - 560, zF - 240];
  const sideStuds = (sx: number): Vec3[] => railZ.map((z) => [sx * xi, yRail, z]);
  const sideNuts = (sx: number): Vec3[] => railZ.map((z) => [sx * (xi - 40), yRail, z]);
  const yUp = 450; // the third stud or the connector, from the back leg into the back's side
  const upper = (sx: number): Vec3 => [sx * xi, yUp, r1(zLeg(yUp))];
  const yCam = Math.min(legTop - 50, 540);
  const camBolt = (sx: number): Vec3 => [sx * xi, yCam, r1(zLeg(yCam))];
  const dowel = (sx: number): Vec3 => [sx * xi, yCam + 45, r1(zLeg(yCam + 45))];
  const cams: Vec3[] = G.map((sx) => [sx * (xi - 35), yCam, r1(rearZ(yCam))]);
  const feet: Vec3[] = G.flatMap((sx) => [[sx * xs, 0, zF - 100], [sx * xs, 0, zF - 770]] as Vec3[]);
  const into = (sx: number): Vec3 => [sx, 0, 0]; // into the side frame from its inside face

  const frameIn = (sx: number) => {
    const id = sx < 0 ? "L" : "R";
    return [
      fx("washer", sideNuts(sx), [sx, 0, 0], { ...WASHER, on: "S" }),
      fx("nut", sideNuts(sx), [sx, 0, 0], { ...NUT, on: "S", mate: id }),
    ];
  };

  const steps: CustomStep[] = [
    {
      title: "Screw two studs into the seat",
      detail: "Into the two holes at the back of the seat, by hand, until they stop.",
      add: ["S"],
      fix: [fx("stud", backStuds, [0, -1, 0], { ...STUD, on: "S" })],
    },
    {
      title: "Lower the back onto the studs",
      detail: "One of you each side. Its bottom rail drops over the two studs and sits on the ledge at the back of the seat.",
      add: ["B"],
      people: 2,
      from: { B: [0, 320, 0] },
    },
    {
      title: "Nut the back to the seat",
      detail: "A washer under each nut, then tighten both with the spanner.",
      fix: [fx("washer", backNuts, [0, -1, 0], { ...WASHER, on: "B" }), fx("nut", backNuts, [0, -1, 0], { ...NUT, on: "B", mate: "S" })],
      tools: ["wrench"],
    },
  ];
  if (o.beech) {
    steps.push({
      title: "Screw six studs into the side frames",
      detail: "Three in each frame, on the inside, by hand until they stop.",
      add: ["L", "R"],
      from: { L: [-300, 0, 0], R: [300, 0, 0] },
      fix: G.map((sx) => fx("stud", [...sideStuds(sx), upper(sx)], into(sx), { ...STUD, on: sx < 0 ? "L" : "R", mate: "S" })),
    });
  } else {
    steps.push(
      {
        title: "Screw a connector bolt into each side frame",
        detail: "Into the hole high up on the inside of the back leg, by hand.",
        add: ["L", "R"],
        from: { L: [-300, 0, 0], R: [300, 0, 0] },
        fix: G.map((sx) => fx("stud", [upper(sx)], into(sx), { ...CONNECTOR, on: sx < 0 ? "L" : "R", mate: "B" })),
      },
      {
        title: "Screw four studs into the side frames",
        detail: "Two in each seat rail, on the inside, by hand until they stop.",
        fix: G.map((sx) => fx("stud", sideStuds(sx), into(sx), { ...STUD, on: sx < 0 ? "L" : "R", mate: "S" })),
      },
    );
  }
  steps.push(
    {
      title: "Tap a dowel into each side frame",
      detail: "Just above the cam bolt hole on the back leg, by hand.",
      fix: G.map((sx) => fx("dowel", [dowel(sx)], into(sx), { on: sx < 0 ? "L" : "R", mate: "B" })),
    },
    {
      title: "Screw a cam bolt into each side frame",
      detail: "Below the dowel, with the screwdriver, until only the head stands out.",
      fix: G.map((sx) => fx("camScrew", [camBolt(sx)], into(sx), { on: sx < 0 ? "L" : "R", mate: "B" })),
      tools: ["screwdriver"],
    },
    {
      title: "Stick felt pads under the legs",
      detail: "One under each of the four legs, pressed on firmly.",
      fix: [fx("glide", feet, [0, 1, 0], PAD)],
    },
    {
      title: "Push the left side frame onto the seat",
      detail: "The studs go through the holes in the seat frame. A washer and a nut on each from inside, turned on loosely.",
      fix: frameIn(-1),
      tools: ["wrench"],
    },
    {
      title: "Push the right side frame on",
      detail: "Check the holes in the seat rail face the seat, as the drawing shows. Two more washers and nuts, loose.",
      fix: frameIn(1),
      tools: ["wrench"],
    },
    {
      title: "Turn the two cam locks in the back",
      detail: "Drop one into each hole at the back, arrow towards the cam bolt, and turn clockwise until it grips.",
      fix: [fx("cam", cams, [0, 0, 1], { on: "B" })],
      tools: ["screwdriver"],
    },
    {
      title: "Tighten the nuts under the seat",
      detail: "All four, with the spanner. The washer goes under the nut, never on top.",
      tools: ["wrench"],
    },
  );
  if (o.beech) {
    const inner: Vec3[] = G.map((sx) => [sx * (xi - 40), yUp, r1(zLeg(yUp))]);
    steps.push(
      { title: "Open the two zips at the back", detail: "Pull them up so you can reach inside the back." },
      {
        title: "Nut the top studs inside the back",
        detail: "A washer and a nut on the stud coming in from each side frame, tightened with the spanner.",
        fix: G.flatMap((sx) => {
          const at = inner.filter((p) => Math.sign(p[0]) === sx);
          return [fx("washer", at, [sx, 0, 0], { ...WASHER, on: "B" }), fx("nut", at, [sx, 0, 0], { ...NUT, on: "B", mate: sx < 0 ? "L" : "R" })];
        }),
        tools: ["wrench"],
      },
      { title: "Close the zips", detail: "Pull both zips back down." },
    );
  }
  if (o.high) {
    steps.push({ title: "Lay the headrest over the top of the back", detail: "The weighted flap goes over the back, the pad hangs at the front where your head rests.", add: ["P"] });
  }
  return { parts, steps };
}

/* ---------- footstool ---------- */

const STOOL = { W: 600, D: 420, H: 420, legs: 270 };
const SLEEVE = { name: "Sleeve bolt", len: 80, dia: 8 };

function footstool(z0: number): CustomParams {
  const { W, D, H, legs } = STOOL;
  const lx = W / 2 - 60, lz = D / 2 - 55;
  const yIn = legs + 60; // the leg tops sit in the corners of the frame
  const parts: CustomPart[] = [{ id: "T", name: "Footstool", size: [W, H - legs, D], pos: [0, (H + legs) / 2, z0], material: "soft" }];
  for (const sx of G)
    parts.push(
      built(
        sx < 0 ? "TL" : "TR",
        "Leg frame",
        [
          bx([40, yIn, 40], [sx * lx, yIn / 2, z0 - lz]),
          bx([40, yIn, 40], [sx * lx, yIn / 2, z0 + lz]),
          bx([30, 40, 2 * lz - 40], [sx * lx, 130, z0]),
        ],
        "wood",
      ),
    );
  const dowels: Vec3[] = G.flatMap((sx) => G.flatMap((sz) => [[sx * lx, legs, z0 + sz * lz - 12], [sx * lx, legs, z0 + sz * lz + 12]] as Vec3[]));
  const bolts = (sx: number): Vec3[] => G.map((sz) => [sx * (lx - 50), legs + 30, z0 + sz * lz]);
  const feet: Vec3[] = G.flatMap((sx) => G.map((sz) => [sx * lx, 0, z0 + sz * lz] as Vec3));
  const steps: CustomStep[] = [
    {
      title: "Lay the footstool upside down and tap in eight dowels",
      detail: "On a rug or the flattened box. Two dowels in each corner of the frame.",
      add: ["T"],
      pose: "-y",
      warnings: ["floor"],
      fix: [fx("dowel", dowels, [0, 1, 0], { on: "T" })],
    },
    {
      title: "Press the two leg frames onto the dowels",
      detail: "The legs go into the corners and the rail between them faces out to the side.",
      add: ["TL", "TR"],
    },
    {
      title: "Bolt each leg from inside the frame",
      detail: "A washer on each bolt, then through the frame into the leg, tightened with the Allen key.",
      fix: G.flatMap((sx) => [fx("washer", bolts(sx), [sx, 0, 0], { ...WASHER, on: "T" }), fx("bolt", bolts(sx), [sx, 0, 0], { ...SLEEVE, on: "T", mate: sx < 0 ? "TL" : "TR" })]),
      tools: ["allen"],
    },
    { title: "Stick felt pads under the legs", detail: "One on the end of each leg, pressed on firmly.", fix: [fx("glide", feet, [0, 1, 0], PAD)] },
    { title: "Turn the footstool over", detail: "Stand it on its feet and check it doesn't rock.", pose: "+y" },
  ];
  return { parts, steps };
}

/* ---------- bench ---------- */

const BUTTON = { len: 16, dia: 6, name: "Button head bolt" };
const CORNER = { len: 100, dia: 40, name: "Corner bracket" };

function bench(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const seatT = 150;
  const yS = H - seatT; // underside of the seat
  const LEG = 45;
  const ix = W / 2 - 35 - LEG / 2, iz = D / 2 - 35 - LEG / 2; // leg centres
  const RH = 60, RT = 22;
  const yR = yS - RH / 2;
  const end = (id: string, sx: number) =>
    built(
      id,
      "End frame",
      [
        bx([LEG, yS, LEG], [sx * ix, yS / 2, -iz]),
        bx([LEG, yS, LEG], [sx * ix, yS / 2, iz]),
        bx([RT, RH, 2 * iz - LEG], [sx * ix, yR, 0]),
      ],
      "wood",
    );
  const rl = 2 * ix - LEG;
  const zr = iz;
  const parts: CustomPart[] = [
    { id: "F", name: "Long rail", size: [rl, RH, RT], pos: [0, yR, -zr], material: "wood" },
    { id: "K", name: "Long rail", size: [rl, RH, RT], pos: [0, yR, zr], material: "wood" },
    end("E1", -1),
    end("E2", 1),
    { id: "S", name: "Seat", size: [W, seatT, D], pos: [0, H - seatT / 2, 0], material: "soft" },
  ];
  const xe = ix - LEG / 2; // where the rails meet the legs
  const dowels: Vec3[] = G.flatMap((sx) => G.flatMap((sz) => [[sx * xe, yR - 15, sz * zr], [sx * xe, yR + 15, sz * zr]] as Vec3[]));
  const corner = (sx: number, sz: number): Vec3 => [sx * (xe - 40), yS - 30, sz * (zr - RT / 2 - 40)];
  const diag = (sx: number, sz: number): Vec3 => [r1(sx * 0.707), 0, r1(sz * 0.707)];
  // two bolts through each arm of a bracket: one arm on the long rail, one on the end frame's rail
  const bracketBolts = (sx: number): CustomFix[] =>
    G.flatMap((sz) => [
      fx("bolt", [[sx * (xe - 60), yS - 18, sz * (zr - RT / 2)], [sx * (xe - 60), yS - 42, sz * (zr - RT / 2)]], [0, 0, sz], { ...BUTTON, mate: sz < 0 ? "F" : "K" }),
      fx("bolt", [[sx * (ix - RT / 2), yS - 18, sz * (zr - 60)], [sx * (ix - RT / 2), yS - 42, sz * (zr - 60)]], [sx, 0, 0], { ...BUTTON, mate: sx < 0 ? "E1" : "E2" }),
    ]);
  const brackets = (sx: number) => fx("angle", G.map((sz) => corner(sx, sz)), diag(sx, 1), { ...CORNER });
  const seatBolts: Vec3[] = G.flatMap((sx) => G.map((sz) => [sx * (xe - 40), yS, sz * (zr - RT / 2 - 40)] as Vec3));
  const feet: Vec3[] = G.flatMap((sx) => G.map((sz) => [sx * ix, 0, sz * iz] as Vec3));
  const steps: CustomStep[] = [
    {
      title: "Tap the dowels into the long rails",
      detail: "Two in each end of both rails, eight in all.",
      add: ["F", "K"],
      fix: G.flatMap((sx) => G.map((sz) => fx("dowel", dowels.filter((p) => Math.sign(p[0]) === sx && Math.sign(p[2]) === sz), [-sx, 0, 0], { on: sz < 0 ? "F" : "K", mate: sx < 0 ? "E1" : "E2" }))),
    },
    {
      title: "Push both long rails into an end frame",
      detail: "One rail at a time, onto the dowels. The bracket holes on each rail face in, towards the other rail.",
      add: ["E1"],
    },
    {
      title: "Fit two corner brackets at this end",
      detail: "Four bolts through each bracket, two into the rail and two into the end frame. Turn them in by hand and leave them a little loose.",
      fix: [brackets(-1), ...bracketBolts(-1)],
    },
    {
      title: "Push the other end frame onto the rails",
      detail: "The dowels go into the holes in its legs.",
      add: ["E2"],
    },
    {
      title: "Fit the last two corner brackets",
      detail: "Four bolts each, by hand, still a little loose.",
      fix: [brackets(1), ...bracketBolts(1)],
    },
    {
      title: "Lay the seat upside down and lower the frame onto it",
      detail: "On a rug or the flattened box, legs pointing up.",
      add: ["S"],
      pose: "-y",
      warnings: ["floor"],
    },
    {
      title: "Bolt the brackets to the seat",
      detail: "One bolt through the middle hole of each bracket into the seat, by hand first.",
      fix: [fx("bolt", seatBolts, [0, 1, 0], { ...BUTTON, on: "S" })],
    },
    { title: "Tighten the four seat bolts", detail: "With the Allen key.", tools: ["allen"] },
    { title: "Tighten all the bracket bolts", detail: "The sixteen bolts in the corner brackets, firmly, with the Allen key.", tools: ["allen"] },
    { title: "Stick felt pads under the legs", detail: "One on the end of each leg, pressed on firmly.", fix: [fx("glide", feet, [0, 1, 0], PAD)] },
    { title: "Turn the bench over", detail: "Lift it, don't roll it over on its legs, and check it stands without rocking.", pose: "+y" },
  ];
  return { parts, steps };
}

/* ---------- which guide ---------- */

const REGULAR = { W: 640, D: 780, H: 760, seatH: 450, armH: 630, tilt: -0.25, high: false };
const HIGH = { W: 650, D: 960, H: 1070, seatH: 440, armH: 620, tilt: -0.36, high: true };

function chairGuide(s: ProductSpec): CustomParams {
  const slug = s.slug ?? "";
  const high = /high-back/.test(slug);
  const foot = /footstool/.test(slug);
  const base = high ? HIGH : REGULAR;
  // the beech armchair in Kilanda is the first version; the oak and walnut effect ones have the connector bolts
  const beech = slug === "ekenaset-armchair";
  const z0 = foot ? -(STOOL.D + 150) / 2 : 0;
  const a = armchair({ ...base, beech, z0 });
  if (!foot) return a;
  // the footstool first: it is built upside down, and turning it over at the end leaves the armchair the right way up
  const f = footstool(z0 + base.D / 2 + 150 + STOOL.D / 2);
  f.steps[0].title = "Start with the footstool: lay it upside down and tap in eight dowels";
  a.steps[0].title = "Now the armchair: screw two studs into the seat";
  return { parts: [...f.parts, ...a.parts], steps: [...f.steps, ...a.steps] };
}

const family: Family = {
  names: ["EKENÄSET", "EKENASET"],
  recipe(s) {
    const slug = s.slug ?? "";
    if (/armchair/.test(slug)) return chairGuide(s);
    if (/bench/.test(slug)) return bench(s);
    return null;
  },
};
export default family;
