import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * OLSERÖD, read from the side table's manual. A C-shaped steel frame built lying on its back: two side frames (an
 * upright with an arm at the floor and an arm at the top) are joined by the pouch frame on two knob screws and a cross
 * rail on two Allen bolts, then a bow pushes onto the tips of each pair of arms and two screws lock each joint. Twelve
 * plugs fill the spare holes. Upside down on the top, four brackets screw it to the frame, and the fabric pouch wraps
 * the pouch frame.
 */

const T = 22; // square tube

function part(id: string, name: string, abs: PartPiece[], lo: Vec3, hi: Vec3, material: CustomPart["material"]): CustomPart {
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const pieces = abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

const box = (lo: Vec3, hi: Vec3): PartPiece => ({ shape: "box", size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2] });

function table(s: ProductSpec): CustomParams {
  // IKEA: 53 long, 50 wide, 63 high, 59 free under the top
  const W = s.size.w * 10 || 530, D = s.size.d * 10 || 500, H = s.size.h * 10 || 630;
  const topT = 18, yT = H - topT - T / 2; // centre of the top arms
  const xs = 500 / 2 - T / 2; // the frame is a little narrower than the top
  const zB = -D / 2 + T / 2, zF = D / 2 - T / 2, zJ = 110; // uprights at the back, joints where the bows start
  const yRail = 460, yPouch = 550;
  const side = (id: string, sx: number) =>
    part(
      id,
      "Side frame",
      [
        box([sx * xs - T / 2, 0, zB - T / 2], [sx * xs + T / 2, yT + T / 2, zB + T / 2]),
        box([sx * xs - T / 2, 0, zB - T / 2], [sx * xs + T / 2, T, zJ]),
        box([sx * xs - T / 2, yT - T / 2, zB - T / 2], [sx * xs + T / 2, yT + T / 2, zJ]),
      ],
      [sx * xs - T / 2, 0, zB - T / 2],
      [sx * xs + T / 2, yT + T / 2, zJ],
      "metal",
    );
  const bow = (id: string, y: number) =>
    part(
      id,
      "Front bow",
      [
        box([-xs - T / 2, y - T / 2, zF - T / 2], [xs + T / 2, y + T / 2, zF + T / 2]),
        ...[-1, 1].map((sx) => box([sx * xs - T / 2, y - T / 2, zJ], [sx * xs + T / 2, y + T / 2, zF])),
      ],
      [-xs - T / 2, y - T / 2, zJ],
      [xs + T / 2, y + T / 2, zF + T / 2],
      "metal",
    );
  const xi = xs - T / 2, rod = 10, zP = zB + 170;
  const pouchFrame = part(
    "PF",
    "Pouch frame",
    [
      ...[-1, 1].map((sx) => box([sx * (xi - rod / 2) - rod / 2, yPouch - rod / 2, zB - rod / 2], [sx * (xi - rod / 2) + rod / 2, yPouch + rod / 2, zP + rod / 2])),
      box([-xi, yPouch - rod / 2, zB + 30 - rod / 2], [xi, yPouch + rod / 2, zB + 30 + rod / 2]),
      box([-xi, yPouch - rod / 2, zP - rod / 2], [xi, yPouch + rod / 2, zP + rod / 2]),
    ],
    [-xi, yPouch - rod / 2, zB - rod / 2],
    [xi, yPouch + rod / 2, zP + rod / 2],
    "metal",
  );
  const parts: CustomPart[] = [
    pouchFrame,
    side("SL", -1),
    side("SR", 1),
    { id: "R", name: "Cross rail", size: [2 * xs - T, T, T], pos: [0, yRail, zB], material: "metal" },
    bow("BB", T / 2),
    bow("BT", yT),
    { id: "TOP", name: "Table top", size: [W, topT, 440], pos: [0, H - topT / 2, D / 2 - 220], material: "board" },
    { id: "P", name: "Fabric pouch", size: [2 * xi - 2 * rod - 4, 110, zP - zB - 40], pos: [0, yPouch - rod / 2 - 55, (zB + 30 + zP) / 2], material: "soft" },
  ];
  const outX = (sx: number) => sx * (xs + T / 2);
  const sides = [-1, 1] as const;
  const sideId = (sx: number) => (sx < 0 ? "SL" : "SR");
  const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, ...o });
  const perSide = (kind: CustomFix["kind"], y: number, mate: string, o: Partial<CustomFix> = {}): CustomFix[] =>
    sides.map((sx) => at(kind, [[outX(sx), y, zB]], [-sx, 0, 0], sideId(sx), { mate, ...o }));
  const jointScrews = sides.flatMap((sx) =>
    [T / 2, yT].map((y) => at("screw", [[outX(sx), y, zJ + 15], [outX(sx), y, zJ + 40]], [-sx, 0, 0], y < 100 ? "BB" : "BT", { len: 16, dia: 5, mate: sideId(sx) })),
  );
  const plugs = sides.map((sx) =>
    at("cap", [[outX(sx), T / 2, -60], [outX(sx), T / 2, 40], [outX(sx), yT, -60], [outX(sx), yT, 40], [outX(sx), 200, zB], [outX(sx), 360, zB]], [-sx, 0, 0], sideId(sx), { name: "Hole plug", len: 6, dia: 10 }),
  );
  const yU = H - topT; // underside of the top
  const brk: Vec3[] = sides.flatMap((sx) => [-90, 160].map((z): Vec3 => [sx * (xs - T / 2 - 16), yU, z]));
  return {
    parts,
    steps: [
      {
        title: "Put the bushings on the pouch frame",
        detail: "Press one onto the hole at each end of the frame, where it will turn.",
        fix: [at("washer", sides.map((sx): Vec3 => [sx * xi, yPouch, zB]), [1, 0, 0], "PF", { name: "Bushing", len: 4, dia: 16 })],
        wait: ["PF"],
        pose: "+z",
      },
      {
        title: "Lay the two side frames on their backs",
        detail: "Work on a rug. Stand them with the uprights flat on the floor and the arms pointing up, holes facing in.",
        add: ["SL", "SR"],
        warnings: ["floor"],
      },
      {
        title: "Fit the pouch frame with the knob screws",
        detail: "Hold it between the uprights and turn a knob screw through each upright by hand. Leave them a little loose if you want the pouch to swing.",
        add: ["PF"],
        fix: perSide("stud", yPouch, "PF", { name: "Knob screw", len: 20, dia: 8 }),
      },
      {
        title: "Bolt the cross rail between the uprights",
        detail: "Drop it in below the pouch frame and fasten each end with a bolt and the Allen key.",
        add: ["R"],
        fix: perSide("bolt", yRail, "R", { len: 50, dia: 6 }),
      },
      {
        title: "Push a bow onto one pair of arms",
        detail: "Slide its ends over the tips of the floor arms until the holes line up, with the holes on the outside.",
        add: ["BB"],
        from: { BB: [0, 0, 180] },
      },
      {
        title: "Push the other bow onto the top arms",
        detail: "The same way, checking the holes line up before you go on.",
        add: ["BT"],
        from: { BT: [0, 0, 180] },
      },
      {
        title: "Screw each joint together",
        detail: "Two screws through the outside of each of the four joints.",
        fix: jointScrews,
      },
      {
        title: "Plug the spare holes",
        detail: "Push a plug into each open hole on the sides and press its pin in until it sits flush.",
        fix: plugs,
      },
      {
        title: "Stick the felt pads under the top",
        detail: "Lay the top face down on a rug and turn the frame upside down beside it. Stick the four pads where the frame will rest.",
        fix: [at("glide", sides.flatMap((sx) => [-150, 200].map((z): Vec3 => [sx * xs, yU, z])), [0, 1, 0], "TOP", { name: "Felt pad", len: 3, dia: 20 })],
        wait: ["TOP"],
        pose: "-y",
        warnings: ["floor"],
      },
      {
        title: "Set the frame onto the top",
        detail: "Line the top arms up with the felt pads, the open side of the frame over the long edge of the top.",
        add: ["TOP"],
      },
      {
        title: "Screw the four brackets to the top",
        detail: "Hook each bracket against the inside of a tube, not over it, and fix it with two screws.",
        fix: [
          at("angle", brk, [0, 1, 0], "TOP", { name: "Top bracket", len: 40, dia: 20 }),
          at("screw", brk.flatMap(([x, y, z]): Vec3[] => [[x, y, z - 12], [x, y, z + 12]]), [0, 1, 0], "TOP", { len: 12, dia: 4 }),
        ],
      },
      {
        title: "Tighten the brackets",
        detail: "Push each bracket firmly against its tube, then tighten both screws.",
        tools: ["screwdriver"],
      },
      { title: "Turn the table over", detail: "Lift it by the frame and stand it on the floor.", pose: "+y" },
      {
        title: "Wrap the pouch round its frame",
        detail: "Fold its edges over the two long rods and close the touch and close strips underneath.",
        add: ["P"],
      },
      {
        title: "Lower it when you need to",
        detail: "For a low coffee table, unhook the top, turn the frame onto its side and hook the top back on with the same brackets.",
      },
    ],
  };
}

const family: Family = {
  names: ["OLSERÖD", "OLSEROD"],
  recipe: (s) => (/side table/i.test(`${s.variant} ${s.slug ?? ""}`) || /olserod-side/.test(s.slug ?? "") ? table(s) : null),
};
export default family;
