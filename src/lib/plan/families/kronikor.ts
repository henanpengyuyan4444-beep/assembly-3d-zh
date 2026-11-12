import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * KRÖNIKÖR, read from the open storage's manual. A steel A-frame: the narrow top shelf takes the back panel on two
 * dowels and one long screw, the two slanted front legs are screwed to its ends, and with the unit lying on its front
 * the middle and bottom shelves are screwed to the front legs' brackets. The two straight back legs go on last, with
 * six screws into the shelves. It stands on its own, with no wall fixing.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 60.2 wide, 35 deep, 90.5 high
  const W = s.size.w * 10 || 602, H = s.size.h * 10 || 905, D = s.size.d * 10 || 350;
  const leg = 20, t = 18;
  const xl = W / 2 - leg / 2, sw = W - 2 * leg;
  const zB = -D / 2 + leg / 2; // back legs
  const yTop = 650, yMid = 430, yBot = 110;
  const zF0 = D / 2 - leg / 2, zF1 = -D / 2 + 130; // front leg at the floor and under the top shelf
  const zFront = (y: number) => zF0 + ((zF1 - zF0) * y) / yTop;
  const tilt = -Math.atan2(zF0 - zF1, yTop), legL = Math.hypot(zF0 - zF1, yTop);
  const shelf = (id: string, name: string, y: number): CustomPart => {
    const z0 = -D / 2, z1 = zFront(y) + leg / 2;
    return { id, name, size: [sw, t, z1 - z0], pos: [0, y, (z0 + z1) / 2], material: "metal" };
  };
  const front = (id: string, sx: number): CustomPart => ({
    id,
    name: "Front leg",
    shape: "cyl",
    size: [leg, legL, leg],
    pos: [sx * xl, yTop / 2, (zF0 + zF1) / 2],
    rot: [tilt, 0, 0],
    material: "metal",
  });
  const back = (id: string, sx: number): CustomPart => ({ id, name: "Back leg", shape: "cyl", size: [leg, yTop + t / 2, leg], pos: [sx * xl, (yTop + t / 2) / 2, zB], material: "metal" });
  const backH = H - yTop - t / 2;
  const parts: CustomPart[] = [
    shelf("TS", "Top shelf", yTop),
    { id: "BP", name: "Back panel", size: [sw, backH, 10], pos: [0, yTop + t / 2 + backH / 2, -D / 2 + 5], material: "metal" },
    front("FL", -1),
    front("FR", 1),
    shelf("MS", "Shelf", yMid),
    shelf("BS", "Shelf", yBot),
    back("BL", -1),
    back("BR", 1),
  ];
  const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });
  const SCREW = { len: 12, dia: 4 };
  const under = (y: number, z: number, sx: number): Vec3 => [sx * (sw / 2 - 20), y - t / 2, z];
  const toFront = (y: number) => [-1, 1].map((sx) => under(y, zFront(y) - 10, sx));
  return {
    parts,
    steps: [
      {
        title: "Push two dowels into the top shelf",
        detail: "Lay it on a rug and press them into the holes along its back edge.",
        add: ["TS"],
        fix: [fx("dowel", [-1, 1].map((sx): Vec3 => [sx * 150, yTop + t / 2, -D / 2 + 5]), [0, -1, 0], "TS", { mate: "BP" })],
        warnings: ["floor"],
      },
      { title: "Set the back panel on the dowels", detail: "Its plain face goes to the back.", add: ["BP"] },
      {
        title: "Screw the back panel to the shelf",
        detail: "One long screw from underneath, in the middle.",
        fix: [fx("bolt", [[0, yTop - t / 2, -D / 2 + 5]], [0, 1, 0], "TS", { len: 40, dia: 6, mate: "BP", name: "Long screw" })],
      },
      {
        title: "Screw a front leg to each end of the top shelf",
        detail: "Through the hole at the top of each leg, with the long screws. Not fully tight yet.",
        add: ["FL", "FR"],
        fix: [-1, 1].map((sx) => fx("bolt", [[sx * (W / 2), yTop, zF1]], [-sx, 0, 0], sx < 0 ? "FL" : "FR", { len: 40, dia: 6, mate: "TS", name: "Long screw" })),
      },
      {
        title: "Fix the legs' brackets under the shelf",
        detail: "One short screw through each bracket into the top shelf.",
        fix: [fx("screw", [-1, 1].map((sx) => under(yTop, zF1 - 10, sx)), [0, 1, 0], "TS", SCREW)],
      },
      {
        title: "Screw the middle shelf to the front legs",
        detail: "Lay the unit on its front. The shelf's holes go to the front legs' brackets.",
        add: ["MS"],
        fix: [fx("screw", toFront(yMid), [0, 1, 0], "MS", SCREW)],
        pose: "-z",
        warnings: ["floor"],
      },
      { title: "Screw the bottom shelf to the front legs", detail: "The deepest shelf goes at the bottom.", add: ["BS"], fix: [fx("screw", toFront(yBot), [0, 1, 0], "BS", SCREW)] },
      {
        title: "Fit the back legs",
        detail: "Lay them on the shelves' back corners and put a screw through each bracket, six in all.",
        add: ["BL", "BR"],
        fix: ([["TS", yTop], ["MS", yMid], ["BS", yBot]] as const).map(([id, y]) => fx("screw", [-1, 1].map((sx) => under(y, zB + 10, sx)), [0, 1, 0], id, SCREW)),
      },
      { title: "Stand it up and tighten everything", detail: "Tighten the long screws at the top once it stands straight.", tools: ["allen"], pose: "+y", check: "square" },
    ],
  };
}

const family: Family = { names: ["KRÖNIKÖR"], recipe };
export default family;
