import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * STEFAN, read from the dining chair's manual. Each side comes in one piece: a front leg and a back leg (straight to
 * the seat, then leaning back) joined by a seat rail and a low stretcher. One side lies on a rug; the front and back
 * aprons stand in it on eight dowels, the padded backrest on six more, and the other side goes on top and takes
 * three Allen screws. Turned over, the first side takes its three. Stood up, the seat board hooks in at the back and
 * drops into the frame, and the cushion in its cover is pressed on and the cover tucked round under the board.
 */

const LEG = 38, RAIL_T = 20;
const SCREW = { name: "Allen screw", len: 80, dia: 6 };

function part(id: string, name: string, abs: PartPiece[], lo: Vec3, hi: Vec3, material: CustomPart["material"]): CustomPart {
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const pieces = abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string | undefined, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function chair(s: ProductSpec): CustomParams {
  // IKEA: 42 wide, 49 deep, 90 high, seat 46 high
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const xl = W / 2 - LEG / 2; // leg centres
  const xi = xl - LEG / 2; // inside faces of the sides
  const railTop = 420, railH = 60, railY = railTop - railH / 2;
  const zf = D / 2 - LEG / 2 - 8; // front legs
  const zb = -D / 2 + LEG / 2 + 60; // back legs below the seat
  const lean = 66; // how far the top of a back leg leans back past its foot
  const zTop = zb - lean;
  const ang = Math.atan2(lean, H - railTop);
  const zAt = (y: number) => (y <= railTop ? zb : zb - (lean * (y - railTop)) / (H - railTop));
  const yStr = 170;

  const side = (id: string, sx: number): CustomPart => {
    const x = sx * xl;
    const upLen = Math.hypot(H - railTop, lean);
    const abs: PartPiece[] = [
      { shape: "box", size: [LEG, railTop, LEG], pos: [x, railTop / 2, zb] },
      { shape: "box", size: [LEG, upLen, LEG], pos: [x, (railTop + H) / 2, (zb + zTop) / 2], rot: [-ang, 0, 0] },
      { shape: "box", size: [LEG, railTop, LEG], pos: [x, railTop / 2, zf] },
      { shape: "box", size: [RAIL_T, railH, zf - zb - LEG], pos: [x, railY, (zf + zb) / 2] },
      { shape: "box", size: [RAIL_T, 40, zf - zb - LEG], pos: [x, yStr, (zf + zb) / 2] },
    ];
    return part(id, "Side frame", abs, [x - LEG / 2, 0, zTop - LEG / 2 - 4], [x + LEG / 2, H, zf + LEG / 2], "wood");
  };
  const apron = (id: string, z: number): CustomPart => ({ id, name: "Apron", size: [2 * xi, railH, RAIL_T], pos: [0, railY, z], material: "wood" });
  const yB0 = 560, yB1 = H - 40, yB = (yB0 + yB1) / 2, BT = 40;
  const parts: CustomPart[] = [
    side("SIDE_L", -1),
    apron("APRON_F", zf),
    apron("APRON_B", zb),
    { id: "BACK", name: "Backrest", size: [2 * xi, yB1 - yB0, BT], pos: [0, yB, zAt(yB) + 6], rot: [-ang, 0, 0], material: "soft" },
    side("SIDE_R", 1),
    { id: "SEAT", name: "Seat board", size: [2 * xi + 2 * RAIL_T, 14, zf - zb], pos: [0, railTop + 7, (zf + zb) / 2 + LEG / 2], material: "board" },
    { id: "PAD", name: "Seat cushion", size: [W, 36, zf - zb + 10], pos: [0, railTop + 14 + 18, (zf + zb) / 2 + LEG / 2 + 5], material: "soft" },
  ];

  // two dowels at each end of each apron, three at each end of the backrest
  const apronDowels = (id: string, z: number, g: number) => fx("dowel", [railY - 15, railY + 15].map((y): Vec3 => [g * xi, y, z]), [g, 0, 0], id, { mate: g < 0 ? "SIDE_L" : "SIDE_R" });
  const backDowels = (g: number) => fx("dowel", [yB0 + 50, yB, yB1 - 50].map((y): Vec3 => [g * xi, y, zAt(y) + 6]), [g, 0, 0], "BACK", { mate: g < 0 ? "SIDE_L" : "SIDE_R" });
  const screws = (sx: number) => fx("screw", ([[railY, zf], [railY, zb], [yB, zAt(yB) + 6]] as [number, number][]).map(([y, z]): Vec3 => [sx * W / 2, y, z]), [-sx, 0, 0], sx < 0 ? "SIDE_L" : "SIDE_R", { ...SCREW, mate: undefined });

  return {
    parts,
    steps: [
      {
        title: "Stand the aprons in one side",
        detail: "Lay a side flat on a rug, holes up. Two dowels into each end of both aprons, then push them into the side. The grooves on the aprons face in.",
        add: ["SIDE_L", "APRON_F", "APRON_B"],
        fix: [apronDowels("APRON_F", zf, -1), apronDowels("APRON_B", zb, -1), apronDowels("APRON_F", zf, 1), apronDowels("APRON_B", zb, 1)],
        pose: "+x",
        warnings: ["floor"],
      },
      {
        title: "Fit the backrest into the side",
        detail: "Three dowels into each end of the backrest. Its hollow face goes to the front, where you lean on it.",
        add: ["BACK"],
        fix: [backDowels(-1), backDowels(1)],
      },
      {
        title: "Lay the other side on top and screw it on",
        detail: "Ease it down so all the dowels find their holes. One screw into each apron and one into the backrest.",
        add: ["SIDE_R"],
        fix: [screws(1)],
        from: { SIDE_R: [300, 0, 0] },
        tools: ["allen"],
      },
      {
        title: "Turn it over and screw the first side",
        detail: "Three more screws, the same way. Tighten all six firmly.",
        fix: [screws(-1)],
        pose: "-x",
        tools: ["allen"],
      },
      {
        title: "Hook the seat board in and drop it",
        detail: "Stand the chair up. Slide the back edge of the board under the backrest first, then lower the front into the frame.",
        add: ["SEAT"],
        pose: "+y",
        from: { SEAT: [0, 220, 160] },
      },
      {
        title: "Press the cushion on and tuck the cover under",
        detail: "Lay it on the board, then pull the edge of the cover down round the board on all four sides.",
        add: ["PAD"],
        from: { PAD: [0, 260, 0] },
      },
    ],
  };
}

const family: Family = {
  names: ["STEFAN"],
  recipe: (s) => (/chair/i.test(`${s.variant} ${s.slug ?? ""}`) ? chair(s) : null),
};
export default family;
