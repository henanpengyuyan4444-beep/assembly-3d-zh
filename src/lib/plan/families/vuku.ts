import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * VUKU, read from the wardrobe's manual. It's not a board wardrobe: a fabric cover over a frame of steel tubes,
 * no tools. A plug goes into each of the two plastic hubs, the clothes rail joins the hubs, and two short arms go
 * into each hub. That top frame goes into the cover lying on its back, the arm ends into the four top corners.
 * Each side then gets two long poles, each of two tubes pushed together, from its hub down to the bottom corners.
 * Stood up, the round flaps close over the hubs and two tabs at the top are screwed to the wall. The cover is
 * narrower at the top than at the bottom.
 */

const T = 16; // steel tube

/** A round tube from a to b, as a part. */
function tube(id: string, name: string, a: Vec3, b: Vec3): CustomPart {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(...d);
  const c: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const rot: Vec3 = [Math.atan2(d[2], d[1]), 0, -Math.atan2(d[0], Math.hypot(d[1], d[2]))];
  return { id, name, size: [T, len, T], pos: c, shape: "cyl", rot, material: "metal" };
}

const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function wardrobe(s: ProductSpec): CustomParams {
  // IKEA: 74 wide, 51 deep, 149 high at the bottom; the top is narrower both ways
  const W = s.size.w * 10, D = s.size.d * 10, H = s.size.h * 10;
  const Wt = W - 120, Dt = D - 90;
  const hubY = H - 170;
  const sideX = (y: number) => W / 2 - ((W - Wt) / 2) * (y / H);
  const frontZ = (y: number) => D / 2 - ((D - Dt) / 2) * (y / H);
  const hub = (sx: number): Vec3 => [sx * (sideX(hubY) - 12), hubY, 0];
  const top = (sx: number, sz: number): Vec3 => [sx * (Wt / 2 - 10), H - 10, sz * (Dt / 2 - 10)];
  const foot = (sx: number, sz: number): Vec3 => [sx * (W / 2 - 10), 10, sz * (D / 2 - 10)];

  // the cover: four leaning walls, the top, and the grey plastic band round the bottom, all one piece
  const a = Math.atan((D - Dt) / 2 / H), b = Math.atan((W - Wt) / 2 / H);
  const band = 120, cw = (W + Wt) / 2, cd = (D + Dt) / 2;
  const zipLo = band + 60, zipHi = H - 140, zipX = cw / 2 - 90;
  // a strip of the leaning front between heights y0 and y1 (mm from the floor), in the cover's own frame
  const front = (x0: number, x1: number, y0: number, y1: number, material?: PartPiece["material"]): PartPiece => ({
    shape: "box",
    size: [x1 - x0, (y1 - y0) / Math.cos(a), material ? 4 : 3],
    pos: [(x0 + x1) / 2, (y0 + y1) / 2 - H / 2, frontZ((y0 + y1) / 2) - 1.5 + (material ? 3 : 0)],
    rot: [-a, 0, 0],
    material,
  });
  const coverPieces: PartPiece[] = [
    // the front round the door's opening; the door itself zips shut at the end
    front(-cw / 2, -zipX, 0, H),
    front(zipX, cw / 2, 0, H),
    front(-zipX, zipX, zipHi, H),
    front(-zipX, zipX, 0, zipLo),
    { shape: "box", size: [cw, H, 3], pos: [0, 0, -cd / 2], rot: [a, 0, 0] },
    { shape: "box", size: [3, H, cd], pos: [cw / 2, 0, 0], rot: [0, 0, b] },
    { shape: "box", size: [3, H, cd], pos: [-cw / 2, 0, 0], rot: [0, 0, -b] },
    { shape: "box", size: [Wt, 3, Dt], pos: [0, H / 2 - 1.5, 0] },
    // the zip round the opening
    front(-zipX - 4, -zipX + 4, zipLo, zipHi, "board"),
    front(zipX - 4, zipX + 4, zipLo, zipHi, "board"),
    front(-zipX, zipX, zipHi - 4, zipHi + 4, "board"),
    front(-zipX, zipX, zipLo - 4, zipLo + 4, "board"),
    // the grey bottom and the band round it
    { shape: "box", size: [W, 3, D], pos: [0, -H / 2 + 1.5, 0], material: "metal" },
    { shape: "box", size: [W, band, 4], pos: [0, -H / 2 + band / 2, D / 2 - 2], material: "metal" },
    { shape: "box", size: [W, band, 4], pos: [0, -H / 2 + band / 2, -D / 2 + 2], material: "metal" },
    { shape: "box", size: [4, band, D], pos: [W / 2 - 2, -H / 2 + band / 2, 0], material: "metal" },
    { shape: "box", size: [4, band, D], pos: [-W / 2 + 2, -H / 2 + band / 2, 0], material: "metal" },
  ];
  const parts: CustomPart[] = [
    { id: "HUB_L", name: "Hub", size: [24, 90, 90], pos: hub(-1), material: "board" },
    { id: "HUB_R", name: "Hub", size: [24, 90, 90], pos: hub(1), material: "board" },
    tube("RAIL", "Clothes rail", [hub(-1)[0] + 12, hubY, 0], [hub(1)[0] - 12, hubY, 0]),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => tube(`ARM${sx}${sz}`, "Short tube", lerp(hub(sx), top(sx, sz), 0.15), top(sx, sz)))),
    // each long pole is two tubes pushed together halfway down
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].flatMap((sz) => {
        const p0 = lerp(hub(sx), foot(sx, sz), 0.06), mid = lerp(hub(sx), foot(sx, sz), 0.5);
        return [tube(`UP${sx}${sz}`, "Long tube", p0, mid), tube(`LO${sx}${sz}`, "Long tube", mid, foot(sx, sz))];
      }),
    ),
    { id: "COVER", name: "Cover", size: [W, H, D], pos: [0, H / 2, 0], pieces: coverPieces, material: "soft" },
    { id: "DOOR", name: "Door flap", size: [2 * zipX - 8, (zipHi - zipLo - 8) / Math.cos(a), 3], pos: [0, (zipLo + zipHi) / 2, frontZ((zipLo + zipHi) / 2) - 1.5], rot: [-a, 0, 0], material: "soft" },
  ];

  // the hub's plug goes in from outside the cover's side and is the hook that shows there
  const plug = (sx: number): CustomFix => ({
    kind: "hook",
    name: "Hook plug",
    count: 1,
    at: [[sx * (sideX(hubY) - 2), hubY, 0]],
    dir: [-sx, 0, 0],
    on: sx < 0 ? "HUB_L" : "HUB_R",
  });
  const tabs = [-1, 1].map((sx): Vec3 => [sx * (Wt / 2 - 120), H, -Dt / 2]);
  const wall: CustomFix[] = [
    { kind: "strap", name: "Wall tab", count: 2, at: tabs, dir: [0, 0, -1], on: "COVER", included: true },
    { kind: "plug", count: 2, at: tabs.map((p): Vec3 => [p[0], p[1] + 15, p[2] - 4]), dir: [0, 0, -1] },
    { kind: "screw", count: 2, len: 50, dia: 5, at: tabs.map((p): Vec3 => [p[0], p[1] + 15, p[2]]), dir: [0, 0, -1] },
  ];
  const side = (sx: number) => [-1, 1].map((sz) => `${sx}${sz}`);
  const steps: CustomStep[] = [
    {
      title: "Push a plug into each hub",
      detail: "From the rounded side of the hub, until it clicks. Its head is the hook on the outside later.",
      add: ["HUB_L", "HUB_R"],
      fix: [plug(-1), plug(1)],
    },
    {
      title: "Join the hubs with the clothes rail",
      detail: "The single tube of its length. Push one hub onto each end, plugs facing out.",
      add: ["RAIL"],
    },
    {
      title: "Push the short tubes into the hubs",
      detail: "Two into each hub, one pointing forward and one back, all the way in.",
      add: side(-1).concat(side(1)).map((k) => `ARM${k}`),
    },
    {
      title: "Put the top frame into the cover",
      detail: "Lay the cover on its back, door side up, and open the zip. Fit the frame in at the top and push each short tube's end into its corner pocket.",
      add: ["COVER"],
      pose: "+z",
      warnings: ["floor"],
      from: { COVER: [0, 0, 600] },
    },
    {
      title: "Slide two long tubes up into one side's hub",
      detail: "Use the tubes with a narrow end. Feed each one through its sleeve and push its plain end into the hub until it stops.",
      add: side(-1).map((k) => `UP${k}`),
    },
    {
      title: "Join the lower tubes and seat them in the corners",
      detail: "Push a plain tube onto each narrow end, bend the pole slightly and push its foot into the bottom corner pocket.",
      add: side(-1).map((k) => `LO${k}`),
    },
    {
      title: "Slide the other side's long tubes into its hub",
      detail: "The same as the first side: narrow end down, plain end into the hub.",
      add: side(1).map((k) => `UP${k}`),
    },
    {
      title: "Join them and seat them in the corners",
      detail: "Push the last two tubes on and their feet into the bottom corner pockets.",
      add: side(1).map((k) => `LO${k}`),
    },
    {
      title: "Zip the door shut and stand it up",
      detail: "Stand the wardrobe upright and press each bottom corner down so the poles sit right in their pockets.",
      add: ["DOOR"],
      pose: "+y",
    },
    { title: "Close the flaps over the hubs", detail: "Press the round flap on each side down onto its hook and loop strip." },
    {
      title: "Fix it to the wall",
      detail: "Screw the two tabs at the back of the top to the wall. Screws and plugs aren't included: pick ones made for your wall.",
      fix: wall,
      tools: ["drill", "screwdriver", "pencil"],
      wall: true,
      warnings: ["wall", "tip"],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["VUKU"],
  recipe(s) {
    if (!/wardrobe/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return wardrobe(s);
  },
};
export default family;
