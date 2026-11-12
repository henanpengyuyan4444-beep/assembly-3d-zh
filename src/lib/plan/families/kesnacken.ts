import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartMaterial, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * KESNACKEN bar stool, read from IKEA's manual. The cover is pulled over the seat pad and hooked in under its edges.
 * The steel frame is two U-shaped leg frames joined by two side rails: the rails slide into the front frame and take
 * a bolt and sleeve nut each, then the back frame goes onto their other ends. The frame is laid on the upside-down
 * seat and bolted to it, two bolts at the front and two at the back. The footrest is screwed to the back legs and
 * bolted through the front legs, and everything is tightened. IKEA's sizes: 43 x 50 cm, 77 high, seat 66 high.
 */

const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
const rod = (dia: number, a: Vec3, b: Vec3, pos: Vec3): PartPiece => {
  const along = a[0] !== b[0] ? 0 : a[2] !== b[2] ? 2 : 1;
  const len = Math.abs(a[along] - b[along]);
  return {
    shape: "cyl",
    size: [dia, len, dia],
    pos: [(a[0] + b[0]) / 2 - pos[0], (a[1] + b[1]) / 2 - pos[1], (a[2] + b[2]) / 2 - pos[2]],
    rot: along === 0 ? [0, 0, Math.PI / 2] : along === 2 ? [Math.PI / 2, 0, 0] : [0, 0, 0],
  };
};
const tubes = (id: string, name: string, list: [Vec3, Vec3][], material: PartMaterial = "metal"): CustomPart => {
  const lo = [0, 1, 2].map((k) => Math.min(...list.flatMap((r) => [r[0][k], r[1][k]])) - 11) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...list.flatMap((r) => [r[0][k], r[1][k]])) + 11) as Vec3;
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  return { id, name, material, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos, pieces: list.map(([a, b]) => rod(22, a, b, pos)) };
};

function stool(s: ProductSpec): CustomParams {
  const W = Math.round(s.size.w * 10) || 430, H = Math.round(s.size.h * 10) || 770;
  const D = 500, SY = 660; // IKEA: 50 deep, seat 66 high
  const FY = 590; // frame top, under the seat
  const lx = W / 2 - 30, zF = 190, zB = -190, foot = 260;
  const seatPos: Vec3 = [0, (FY + 11 + H) / 2, 10];
  const seat: CustomPart = {
    id: "S",
    name: "Seat",
    material: "soft",
    size: [W, H - FY - 11, D - 20],
    pos: seatPos,
    pieces: [
      { shape: "box", size: [W, SY + 10 - FY - 11, D - 20], pos: [0, (FY + 11 + SY + 10) / 2 - seatPos[1], 0] },
      // the back of the seat curves up
      { shape: "box", size: [W, H - SY - 10, 90], pos: [0, (SY + 10 + H) / 2 - seatPos[1], -(D - 20) / 2 + 45] },
    ],
  };
  const parts: CustomPart[] = [
    seat,
    tubes("F", "Front leg frame", [[[-lx, 0, zF], [-lx, FY, zF]], [[lx, 0, zF], [lx, FY, zF]], [[-lx, FY, zF], [lx, FY, zF]]]),
    tubes("R0", "Side rail", [[[-lx, FY, zB + 11], [-lx, FY, zF - 11]]]),
    tubes("R1", "Side rail", [[[lx, FY, zB + 11], [lx, FY, zF - 11]]]),
    tubes("K", "Back leg frame", [[[-lx, 0, zB], [-lx, FY, zB]], [[lx, 0, zB], [lx, FY, zB]], [[-lx, FY, zB], [lx, FY, zB]]]),
    tubes("P", "Footrest", [
      [[-lx + 11, foot, zF], [lx - 11, foot, zF]],
      [[-lx, foot, zB + 11], [-lx, foot, zF - 11]],
      [[lx, foot, zB + 11], [lx, foot, zF - 11]],
    ]),
  ];
  const sides = [-1, 1] as const;
  return {
    parts,
    steps: [
      {
        title: "Pull the cover over the seat",
        detail: "Lay the seat pad upside down on a rug and stretch the cover over it, front corners first.",
        add: ["S"],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Hook the cover under the edges", detail: "Press the edge of the cover into the groove all round the underside of the seat." },
      { title: "Tuck in the corners", detail: "Push the fabric in at both corners so it lies flat and tight." },
      {
        title: "Join the side rails to the front frame",
        detail: "Slide both rails into the frame, then a bolt from one side and a sleeve nut from the other at each joint. Not tight yet.",
        add: ["F", "R0", "R1"],
        fix: [
          fix("bolt", sides.map((g): Vec3 => [g * lx, FY + 11, zF - 25]), [0, -1, 0], { len: 20, dia: 6, mate: "F" }),
          fix("nut", sides.map((g): Vec3 => [g * lx, FY - 11, zF - 25]), [0, 1, 0], { name: "Sleeve nut", len: 12, dia: 10 }),
        ],
        tools: ["allen"],
        from: { F: [0, -300, 0], R0: [0, 0, -300], R1: [0, 0, -300] },
      },
      { title: "Push the back frame onto the rails", detail: "Lay the frame on the rug and press the back frame onto the free ends of the rails.", add: ["K"], from: { K: [0, 0, -250] } },
      {
        title: "Bolt the front frame to the seat",
        detail: "Turn the frame over onto the upside-down seat. Two bolts through the front of the frame into the seat.",
        fix: [fix("bolt", sides.map((g): Vec3 => [g * 110, FY - 11, zF]), [0, 1, 0], { len: 40, dia: 6, on: "F", mate: "S" })],
        tools: ["allen"],
      },
      {
        title: "Bolt the back frame to the seat",
        detail: "Two bolts through the back of the frame. These ones have flat heads.",
        fix: [fix("bolt", sides.map((g): Vec3 => [g * 110, FY - 11, zB]), [0, 1, 0], { len: 30, dia: 6, on: "K", mate: "S" })],
        tools: ["allen"],
      },
      {
        title: "Screw the footrest to the back legs",
        detail: "Its two ends sit against the back legs; one countersunk screw through each.",
        add: ["P"],
        fix: [fix("screw", sides.map((g): Vec3 => [g * lx, foot, zB + 25]), [0, 0, -1], { len: 16, dia: 6, on: "P", mate: "K" })],
        tools: ["allen"],
        from: { P: [0, 300, 0] },
      },
      {
        title: "Bolt the footrest through the front legs",
        detail: "A long bolt through each front leg into the end of the footrest.",
        fix: sides.map((g) => fix("bolt", [[g * (lx + 11), foot, zF]], [-g, 0, 0], { len: 50, dia: 6, mate: "P" })),
        tools: ["allen"],
      },
      { title: "Tighten all the bolts", detail: "Go round every joint, the rail bolts too, until the frame no longer moves.", tools: ["allen"], kind: "bolts" },
      { title: "Stand the stool up", detail: "Check it stands steady on all four feet.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["KESNACKEN"],
  recipe(s) {
    if (!/stool/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return stool(s);
  },
};
export default family;
