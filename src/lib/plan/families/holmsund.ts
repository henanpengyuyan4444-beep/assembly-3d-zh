import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, Vec3 } from "../../types";

/**
 * HOLMSUND, read from the manuals for the sleeper sectional (chaise on the left, as in the photo) and its cover. The
 * covers go onto the pieces first. The long back and the chaise's side arm are joined with two pins, the chaise box
 * is pushed into the corner and held to the back by four threaded rods with sleeve nuts (driven with the rail tool),
 * plus a Z bracket inside. The sofa section is built lying on its back: the seat frame goes into the armrest on its
 * base rail, the end panel goes on with two pins, four more rods hold the seat to the rail, a second Z bracket and
 * seven feet go on, and two hook brackets let it hook onto the chaise. The pull-out bed gets four castors and its
 * front panel, slides in under the seat, and the back cushions go on last.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

/** A box from its min and max corners (mm). */
const box = (id: string, name: string, lo: Vec3, hi: Vec3, o: Partial<CustomPart> = {}): CustomPart => ({
  id,
  name,
  size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]],
  pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2],
  material: "soft",
  ...o,
});

function sectional(): CustomParams {
  // IKEA: 230 wide, 90 deep (151 at the chaise), 96 high with the back cushions, seat 44 high, back 66 high
  const yFoot = 40, ySeat = 440, zB0 = -450, zB1 = -300, zF = 450, zChaise = 1060;
  const xL = -1150, xArm = -1020, xCh = -400, xEnd = -380, xR0 = 1000, xR = 1150;
  const yRail = 300;
  const parts: CustomPart[] = [
    box("BK", "Back", [xArm, 0, zB0], [xR0, 660, zB1]),
    box("CA", "Chaise arm", [xL, 0, zB0], [xArm, 620, zChaise]),
    box("CB", "Chaise with lid", [xArm, 0, zB1], [xCh, ySeat, zChaise]),
    box("SA", "Armrest", [xR0, yFoot, zB0], [xR, 640, zF]),
    box("RR", "Base rail", [xEnd, yFoot, zB1], [xR0, yRail, zB1 + 100], { material: "board" }),
    box("SF", "Seat frame", [xEnd, yRail, zB1], [xR0, ySeat, zF]),
    box("SE", "End panel", [xCh, yFoot, zB1], [xEnd, ySeat, zF]),
    box("PO", "Bed frame", [xEnd + 10, 50, zB1 + 110], [xR0 - 10, yRail - 10, zF - 30], { material: "board" }),
    box("PF", "Bed front", [xEnd, yFoot, zF - 30], [xR0, yRail - 10, zF]),
  ];
  // back cushions: three big ones on the sofa, two smaller on the chaise
  const cushion = (id: string, x: number, w: number, h: number) =>
    parts.push({ id, name: w > 400 ? "Back cushion" : "Small back cushion", size: [w, h, 170], pos: [x, ySeat + h / 2, zB1 + 95], rot: [-0.15, 0, 0], material: "soft" });
  cushion("K1", -800, 300, 450);
  cushion("K2", -500, 300, 450);
  cushion("K3", -150, 430, 520);
  cushion("K4", 290, 430, 520);
  cushion("K5", 730, 430, 520);

  const ROD = { len: 100, dia: 8, name: "Threaded rod" };
  const SLEEVE = { dia: 10, name: "Sleeve nut" };
  const chaiseRods: Vec3[] = [-900, -520].flatMap((x) => [120, 320].map((y) => [x, y, zB1] as Vec3));
  const seatRods: Vec3[] = [-200, 150, 500, 850].map((x) => [x, yRail - 100, zB1 + 50] as Vec3);
  const feet: [string, Vec3][] = [
    ["SA", [xR0 + 75, yFoot, zB0 + 80]],
    ["SA", [xR0 + 75, yFoot, zF - 80]],
    ["SE", [xCh + 10, yFoot, zB1 + 50]],
    ["SE", [xCh + 10, yFoot, zF - 60]],
    ...[-100, 300, 700].map((x): [string, Vec3] => ["RR", [x, yFoot, zB1 + 50]]),
  ];
  const xBed = (xEnd + xR0) / 2;
  const castors: Vec3[] = [-1, 1].flatMap((sx) => [zB1 + 160, zF - 80].map((z) => [xBed + sx * 600, 50, z] as Vec3));
  const pinPlates: Vec3[] = [-1, 1].map((sx) => [xBed + sx * 500, 170, zF - 30] as Vec3);

  return {
    parts,
    steps: [
      {
        title: "Put the covers on first",
        detail: "Follow the cover guide: the back, both arms, the chaise box and lid, the seat frame and the bed frame each get their cover before they are joined. It is easier with two.",
        people: 2,
      },
      {
        title: "Pin the chaise arm to the back",
        detail: "Stand both on the floor and push them together on the two joining pins.",
        add: ["BK", "CA"],
        fix: [at("dowel", [200, 450].map((y) => [xArm, y, zB1 - 75] as Vec3), [-1, 0, 0], "BK", "CA", { len: 80, dia: 12, name: "Joining pin" })],
        warnings: ["floor"],
      },
      { title: "Push the chaise box into the corner", detail: "Slide it in against the back and the chaise arm.", add: ["CB"], from: { CB: [0, 0, 800] } },
      {
        title: "Bolt the chaise to the back",
        detail: "Open the lid and hold it open. Turn the four threaded rods with their sleeve nuts through the box into the back, using the rail tool with the Allen key until it clicks.",
        fix: [at("stud", chaiseRods, [0, 0, -1], "CB", "BK", ROD), at("nut", chaiseRods, [0, 0, -1], "CB", "BK", SLEEVE)],
        tools: ["allen"],
        warnings: ["hand"],
      },
      {
        title: "Screw a Z bracket inside the chaise",
        detail: "At the back of the box on the sofa side, two bolts. Then close the lid gently.",
        fix: [
          at("plate", [[xCh, 380, zB1 + 60]], [1, 0, 0], "CB", undefined, { name: "Z bracket", len: 4, dia: 60 }),
          at("bolt", [-25, 25].map((d) => [xCh, 380, zB1 + 60 + d] as Vec3), [1, 0, 0], "CB", undefined, { len: 20, dia: 6 }),
        ],
        tools: ["allen"],
      },
      {
        title: "Fit the seat frame into the armrest",
        detail: "The sofa section is built lying on its back. Stand the armrest on its end, lay the base rail down and push the seat frame into the armrest along it.",
        add: ["SA", "RR", "SF"],
        people: 2,
        warnings: ["two"],
        from: { SA: [600, 0, 0], RR: [0, 0, 600], SF: [0, 0, 600] },
      },
      {
        title: "Pin on the end panel",
        detail: "Two joining pins go into the end of the seat frame; push the end panel onto them.",
        add: ["SE"],
        fix: [at("dowel", [zB1 + 200, zF - 100].map((z) => [xEnd, 370, z] as Vec3), [1, 0, 0], "SF", "SE", { len: 80, dia: 12, name: "Joining pin" })],
        from: { SE: [-500, 0, 0] },
      },
      {
        title: "Bolt the seat frame to the base rail",
        detail: "Four threaded rods with sleeve nuts up through the rail into the seat frame, driven with the rail tool as before.",
        fix: [at("stud", seatRods, [0, 1, 0], "RR", "SF", ROD), at("nut", seatRods, [0, 1, 0], "RR", "SF", SLEEVE)],
        tools: ["allen"],
      },
      {
        title: "Screw on the second Z bracket",
        detail: "Inside the end panel, low at the back, with two long bolts.",
        fix: [
          at("plate", [[xEnd, 200, zB1 + 130]], [-1, 0, 0], "SE", undefined, { name: "Z bracket", len: 4, dia: 60 }),
          at("bolt", [-25, 25].map((d) => [xEnd, 200 + d, zB1 + 130] as Vec3), [-1, 0, 0], "SE", "RR", { len: 40, dia: 6 }),
        ],
        tools: ["allen"],
      },
      {
        title: "Screw in the seven feet",
        detail: "Turn each foot clockwise by hand until it is snug.",
        fix: (["SA", "SE", "RR"] as const).map((on) => {
          const pts = feet.filter(([p]) => p === on).map(([, q]) => q);
          return at("foot", pts, [0, 1, 0], on, undefined, { len: yFoot, dia: 50 });
        }),
      },
      {
        title: "Screw on the hook brackets and hook the sofa on",
        detail: "Two screws through each hook bracket into the end panel. Stand the sofa section up and lower its hooks onto the chaise.",
        fix: [
          at("plate", [zB1 + 120, zF - 150].map((z) => [xCh, 300, z] as Vec3), [1, 0, 0], "SE", "CB", { name: "Hook bracket", len: 4, dia: 40 }),
          at("screw", [zB1 + 120, zF - 150].flatMap((z) => [-20, 20].map((d) => [xCh, 300, z + d] as Vec3)), [1, 0, 0], "SE", undefined, { len: 16, dia: 4 }),
        ],
        tools: ["screwdriver"],
        people: 2,
      },
      {
        title: "Screw the castors under the bed frame",
        detail: "Lay the bed frame upside down. Two screws through each castor's plate.",
        fix: [
          at("castor", castors, [0, 1, 0], "PO", undefined, { len: 50, dia: 45 }),
          at("screw", castors.flatMap((p) => [-20, 20].map((d) => [p[0] + d, p[1], p[2]] as Vec3)), [0, 1, 0], "PO", undefined, { len: 16, dia: 4 }),
        ],
        tools: ["screwdriver"],
        wait: ["PO"],
        from: { PO: [0, 0, 900] },
      },
      {
        title: "Fit the front panel to the bed frame",
        detail: "A pin plate at each end of the front panel, two screws each. The pins point into the bed frame.",
        fix: [
          at("plate", pinPlates, [0, 0, 1], "PF", "PO", { name: "Pin plate", len: 4, dia: 40 }),
          at("screw", pinPlates.flatMap((p) => [-20, 20].map((d) => [p[0] + d, p[1], p[2]] as Vec3)), [0, 0, 1], "PF", undefined, { len: 16, dia: 4 }),
        ],
        tools: ["screwdriver"],
        wait: ["PF"],
        from: { PF: [0, 0, 900] },
      },
      {
        title: "Slide the bed in under the seat",
        detail: "Push it in on its castors from the front and hook its two catches into the frame. Pull it out once to check it runs freely.",
        add: ["PO", "PF"],
        from: { PO: [0, 0, 900], PF: [0, 0, 900] },
      },
      { title: "Add the back cushions", detail: "Two smaller ones on the chaise, three big ones on the sofa.", add: ["K1", "K2", "K3", "K4", "K5"], from: { K1: [0, 300, 0], K2: [0, 300, 0], K3: [0, 300, 0], K4: [0, 300, 0], K5: [0, 300, 0] } },
    ],
  };
}

const family: Family = {
  names: ["HOLMSUND"],
  recipe(s) {
    if (/sleeper sectional/i.test(s.variant) || /holmsund-sleeper-sectional/.test(s.slug ?? "")) return sectional();
    return null;
  },
};
export default family;
