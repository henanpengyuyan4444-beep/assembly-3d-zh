import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, ProductSpec, Vec3 } from "../../types";

/**
 * BOAXEL, read from the wall upright's, mounting rail's and shelf's manuals. It hangs on the wall: an upright is held
 * against the wall to mark the rail's height, the rail is screwed up through its middle hole, levelled and screwed at
 * its other holes. The two uprights hook onto it 60 cm apart and are screwed to the wall all the way down, the
 * brackets hook into their slots and the shelves are laid on and pressed down until they click.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

function recipe(s: ProductSpec): CustomParams | null {
  if (!/shelving|unit/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
  // IKEA's measures: 62.4 wide, 40 deep, 200.6 high; a 62 cm rail, uprights 60 cm apart, 200 cm long
  const W = 624, D = 400, H = 2006, UX = 300;
  const zw = -D / 2; // the wall
  const parts: CustomPart[] = [];
  parts.push({ id: "RAIL", name: "Mounting rail", size: [W, 30, 12], pos: [0, H - 15, zw + 6], material: "metal" });
  const uz = zw + 12 + 8, up0 = 6;
  parts.push({ id: "UL", name: "Wall upright", size: [25, H - up0, 16], pos: [-UX, (H + up0) / 2, uz], material: "metal" });
  parts.push({ id: "UR", name: "Wall upright", size: [25, H - up0, 16], pos: [UX, (H + up0) / 2, uz], material: "metal" });
  // four shelves at the heights in IKEA's picture, each on two brackets
  const shelfYs = [280, 820, 1415, 1830];
  const bz0 = uz + 8, bz1 = D / 2 - 10, bl = bz1 - bz0;
  const bracketIds: string[] = [];
  const shelfIds: string[] = [];
  shelfYs.forEach((y, i) => {
    [-1, 1].forEach((sx) => {
      const id = `K${i + 1}${sx < 0 ? "L" : "R"}`;
      bracketIds.push(id);
      const strut = Math.hypot(bl * 0.7, 90);
      parts.push({
        id,
        name: "Bracket",
        size: [10, 110, bl],
        pos: [sx * UX, y - 55, bz0 + bl / 2],
        pieces: [
          { shape: "box", size: [10, 22, bl], pos: [0, 44, 0] },
          { shape: "box", size: [10, 110, 14], pos: [0, 0, -bl / 2 + 7] },
          { shape: "box", size: [8, 12, strut], pos: [0, 0, -bl / 2 + (bl * 0.7) / 2], rot: [-Math.atan2(90, bl * 0.7), 0, 0] },
        ],
        material: "metal",
      });
    });
    shelfIds.push(`S${i + 1}`);
    parts.push({ id: `S${i + 1}`, name: "Shelf", size: [2 * UX + 16, 18, bl], pos: [0, y + 9, bz0 + bl / 2], material: "board" });
  });

  const WALL = { len: 50, dia: 5 };
  const railPts = (xs: number[]) => xs.map((x) => [x, H - 15, zw + 12] as Vec3);
  const railMid = railPts([0]), railEnds = railPts([-UX + 40, UX - 40]);
  const upPts = (sx: number) => Array.from({ length: 8 }, (_, i) => [sx * UX, 120 + i * 245, uz + 8] as Vec3);
  const wallFix = (pts: Vec3[], on: string): CustomFix[] => [
    at("plug", pts.map((p) => [p[0], p[1], zw - 30] as Vec3), [0, 0, -1]),
    at("screw", pts, [0, 0, -1], on, undefined, WALL),
  ];
  const steps: CustomStep[] = [
    {
      title: "Mark the rail's height on the wall",
      detail: "Stand an upright on the floor against the wall and mark just above its top. Cut it with a hacksaw first if you need it shorter.",
      tools: ["pencil", "tape"],
      wall: true,
    },
    {
      title: "Screw the rail up through its middle hole",
      detail: "Drill a 7 mm hole at your mark. Wall screws and plugs aren't included: pick ones made for your wall.",
      add: ["RAIL"],
      fix: wallFix(railMid, "RAIL"),
      tools: ["drill", "screwdriver"],
      wall: true,
      warnings: ["wall"],
    },
    { title: "Level the rail and screw in the rest", detail: "Swing it level, mark the other holes, drill and screw them.", fix: wallFix(railEnds, "RAIL"), tools: ["level", "drill", "screwdriver"], wall: true },
    {
      title: "Hook the two uprights onto the rail",
      detail: "60 cm apart, centre to centre, so a 60 cm shelf fits between them. Their tops hook over the rail.",
      add: ["UL", "UR"],
      from: { UL: [0, 200, 120], UR: [0, 200, 120] },
    },
    {
      title: "Screw the uprights to the wall",
      detail: "Eight screws down each upright, through 8 mm holes. Check they hang straight first.",
      fix: [...wallFix(upPts(-1), "UL"), ...wallFix(upPts(1), "UR")],
      tools: ["drill", "screwdriver", "level"],
      wall: true,
      warnings: ["wall"],
    },
    { title: "Hook the brackets into the uprights", detail: "Tilt each one in at the top and press it down so it locks in its slot. Same height on both sides.", add: bracketIds },
    { title: "Lay the shelves on and click them down", detail: "Rest each shelf on its two brackets at the back first, then press down at the front until it clicks.", add: shelfIds, from: Object.fromEntries(shelfIds.map((id) => [id, [0, 250, 150] as Vec3])) },
  ];
  return { parts, steps };
}

const family: Family = { names: ["BOAXEL"], recipe };
export default family;
