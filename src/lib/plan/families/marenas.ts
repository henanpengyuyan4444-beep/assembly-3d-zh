import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * MÅRENÄS, read from the armchair's manual and its cover's. The chair is built lying on its side: one side frame (two
 * legs and the side rail) lies on the floor, the padded seat and then the back with its armrests are pressed onto the
 * frame's pegs, and the other side frame goes on top. Three barrel nuts go into the holes in the panels and three long
 * bolts through each side frame into them, the top side first, then rolled over for the other. Stood up, all six are
 * tightened and the cover is pulled on and tucked in under the seat.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

function chair(s: ProductSpec): CustomParams {
  // IKEA: 59 wide, 56 deep, 81 high; the seat 48 high, 52 wide and 42 deep
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const seatTop = 480, armTop = 650;
  const L = 40, rail = 60; // legs, side rail height
  const xs = W / 2 - 30; // side frames
  const yR0 = seatTop - 20 - rail, yR1 = seatTop - 20;
  const zLf = D / 2 - 35, zLb = -D / 2 + 30;
  const side = (sx: number): CustomPart => {
    const x = sx * xs;
    const abs: PartPiece[] = [
      { shape: "box", size: [L, yR0, L], pos: [x, yR0 / 2, zLf] },
      { shape: "box", size: [L, yR0, L], pos: [x, yR0 / 2, zLb] },
      { shape: "box", size: [L, rail, zLf - zLb + L], pos: [x, (yR0 + yR1) / 2, (zLf + zLb) / 2] },
    ];
    const c: Vec3 = [x, yR1 / 2, (zLf + zLb) / 2];
    return {
      id: sx < 0 ? "SL" : "SR",
      name: "Side frame",
      size: [L, yR1, zLf - zLb + L],
      pos: c,
      material: "wood",
      pieces: abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 })),
    };
  };
  const xi = xs - L / 2; // inner face of the side rails
  const zBk = -D / 2 + 10, backT = 90;
  const seat: CustomPart = { id: "SEAT", name: "Seat", size: [2 * xi, seatTop - yR0, D - 20 - backT], pos: [0, (yR0 + seatTop) / 2, zBk + backT + (D - 20 - backT) / 2], material: "soft" };
  // the back panel carries the armrests: a wing along each side rail, from the back to the front
  const wing = 90;
  const backAbs: PartPiece[] = [
    { shape: "box", size: [W - 10, H - yR0, backT], pos: [0, (yR0 + H) / 2, zBk + backT / 2] },
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [wing, armTop - yR1, D - 20 - backT], pos: [sx * (W / 2 - 5 - wing / 2), (yR1 + armTop) / 2, zBk + backT + (D - 20 - backT) / 2] })),
  ];
  const bc: Vec3 = [0, (yR0 + H) / 2, (zBk + D / 2 - 10) / 2];
  const back: CustomPart = {
    id: "BACK",
    name: "Back with armrests",
    size: [W - 10, H - yR0, D - 20],
    pos: bc,
    material: "soft",
    pieces: backAbs.map((p) => ({ ...p, pos: [p.pos[0] - bc[0], p.pos[1] - bc[1], p.pos[2] - bc[2]] as Vec3 })),
  };
  // three bolts each side: two into the back, one into the seat, each meeting a barrel nut
  const yB = (yR0 + yR1) / 2;
  const zs = [zBk + 30, zBk + backT - 30, D / 2 - 110];
  const into = ["BACK", "BACK", "SEAT"];
  const side3 = (sx: number) => {
    const id = sx < 0 ? "SL" : "SR";
    return [
      ...zs.map((z, i) => fx("nut", [[sx * (xi - 60), yR0, z]], [0, 1, 0], into[i], { name: "Barrel nut", len: 20, dia: 10 })),
      ...zs.map((z, i) => fx("bolt", [[sx * (xs + L / 2), yB, z]], [-sx, 0, 0], id, { name: "Allen bolt", len: 90, dia: 6, mate: into[i] })),
    ];
  };
  return {
    parts: [side(-1), seat, back, side(1)],
    steps: [
      {
        title: "Press the seat onto a side frame",
        detail: "Lay one side frame on the floor, legs pointing at you. Push the seat down onto its peg.",
        add: ["SL", "SEAT"],
        pose: "+x",
        warnings: ["floor"],
      },
      { title: "Press the back onto the frame", detail: "Its two pegs go into the holes at the back end of the rail.", add: ["BACK"] },
      { title: "Lay the other side frame on top", detail: "Line its pegs up with the holes in the seat and the back and press it down.", add: ["SR"] },
      {
        title: "Bolt the top side frame on",
        detail: "Drop a barrel nut into each of the three holes, slot turned to face the bolt. Turn the three long bolts in, not tight yet.",
        fix: side3(1),
        tools: ["allen", "flathead"],
      },
      { title: "Roll it over and bolt the other side", detail: "Three barrel nuts and three bolts the same way.", fix: side3(-1), tools: ["allen", "flathead"], pose: "-x" },
      { title: "Stand it up and tighten all six bolts", detail: "With the chair on its legs, turn each bolt in firmly with the Allen key.", tools: ["allen"], pose: "+y", check: "square" },
      {
        title: "Pull on the cover",
        detail: "Over the back first, then down over the armrests and the seat. Turn the chair over to tuck the flaps in under the seat and close the fasteners.",
      },
    ],
  };
}

const family: Family = {
  names: ["MÅRENÄS", "MARENAS"],
  recipe: (s) => (/chair/i.test(`${s.variant} ${s.slug ?? ""}`) ? chair(s) : null),
};
export default family;
