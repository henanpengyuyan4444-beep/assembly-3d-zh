import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * NORRMJÖLE table (steel legs, melamine top), read from its two manuals: the round 105 and the oval 170x97.
 * A shoe goes on the top end of each of the four leaning legs and a cap on the foot. With the top upside down on a
 * rug, two people screw the legs on one by one (two screws a leg on the round, three on the oval), each leg
 * leaning across the middle so they all cross. A hub goes in under the crossing and another on top of it, and a
 * long bolt (two on the oval) pulls them together through a nut. Then the table is turned over.
 * IKEA's sizes: 105 round x 75; 170 x 97 x 75.
 */

const H = 750, TT = 20; // height, top thickness
const LW = 45, LT = 25; // leg bar

/** Euler angles (x then z) that turn a part's y axis onto d. */
function along(d: Vec3): Vec3 {
  const n = Math.hypot(...d);
  const [x, y, z] = [d[0] / n, d[1] / n, d[2] / n];
  return [Math.atan2(z, y), 0, Math.atan2(-x, Math.hypot(y, z))];
}

function recipe(s: ProductSpec) {
  const slug = s.slug ?? "";
  if (!/^norrmjole-table/.test(slug)) return null;
  const oval = /170/.test(slug);
  const W = oval ? 1700 : 1050, Dp = oval ? 970 : 1050;
  const yU = H - TT; // underside of the top
  const parts: CustomPart[] = [];
  if (oval) {
    const pieces: PartPiece[] = [
      { shape: "box", size: [W - Dp, TT, Dp], pos: [0, 0, 0] },
      { shape: "halfcyl", size: [Dp, TT, Dp / 2], pos: [(W - Dp) / 2 + Dp / 4, 0, 0], rot: [0, Math.PI / 2, 0] },
      { shape: "halfcyl", size: [Dp, TT, Dp / 2], pos: [-(W - Dp) / 2 - Dp / 4, 0, 0], rot: [0, -Math.PI / 2, 0] },
    ];
    parts.push({ id: "TOP", name: "Table top", size: [W, TT, Dp], pos: [0, H - TT / 2, 0], material: "board", pieces });
  } else parts.push({ id: "TOP", name: "Table top", size: [W, TT, Dp], pos: [0, H - TT / 2, 0], shape: "cyl", material: "board" });

  // each leg runs from under the top on one side, across the middle, to the floor on the other side
  const angles = oval ? [22, 158, 202, 338] : [45, 135, 225, 315];
  const rt = oval ? 450 : 330, rf = oval ? 700 : 400;
  const legs = angles.map((deg, i) => {
    const a = (deg * Math.PI) / 180;
    const u: Vec3 = [Math.cos(a), 0, Math.sin(a)];
    const side: Vec3 = [-u[2], 0, u[0]];
    const off = (i % 2 ? 1 : -1) * (LT / 2 + 1);
    const top: Vec3 = [-u[0] * rt + side[0] * off, yU, -u[2] * rt + side[2] * off];
    const foot: Vec3 = [u[0] * rf + side[0] * off, 0, u[2] * rf + side[2] * off];
    return { id: `L${i}`, top, foot, u };
  });
  for (const l of legs) {
    const d: Vec3 = [l.foot[0] - l.top[0], l.foot[1] - l.top[1], l.foot[2] - l.top[2]];
    const len = Math.hypot(...d) - 30;
    const c: Vec3 = [(l.top[0] + l.foot[0]) / 2, (l.top[1] + l.foot[1]) / 2, (l.top[2] + l.foot[2]) / 2];
    parts.push({ id: l.id, name: "Leg", size: [LW, len, LT], pos: c, material: "metal", rot: along(d) });
  }
  const yc = (yU * rf) / (rt + rf); // where the legs cross
  const hub = oval ? [220, 45, 120] : [130, 45, 130];
  parts.push({ id: "H1", name: oval ? "Upper hub" : "Hub", size: hub as Vec3, pos: [0, yc + 40, 0], material: "metal" });
  parts.push({ id: "H2", name: oval ? "Lower hub" : "Hub", size: hub as Vec3, pos: [0, yc - 40, 0], material: "metal" });

  const nScrews = oval ? 3 : 2;
  const screwsFor = (l: (typeof legs)[number]): CustomFix => {
    const at = Array.from({ length: nScrews }, (_, k): Vec3 => {
      const t = (k - (nScrews - 1) / 2) * 28;
      return [l.top[0] + l.u[0] * t, yU, l.top[2] + l.u[2] * t];
    });
    return { kind: "screw", count: at.length, len: 16, dia: 6, at, dir: [0, 1, 0], on: l.id, mate: "TOP" };
  };
  const boltXs = oval ? [-55, 55] : [0];

  const steps: CustomStep[] = [
    {
      title: "Fit the leg ends and lay the top face down",
      detail: "Press the angled shoe onto the top end of each leg and the cap onto its foot, until they sit flush. Lay the top face down on a rug.",
      add: ["TOP"],
      pose: "-y",
      warnings: ["floor"],
    },
    ...legs.map((l, i): CustomStep => ({
      title: i === 0 ? "Screw the first leg to the top" : i === 3 ? "Screw on the last leg" : "Screw on the next leg",
      detail:
        i === 0
          ? `One person holds the leg leaning across the middle while the other turns in ${nScrews} screws through the shoe.`
          : i === 3
            ? "Its foot goes the other way, so all four cross in the middle."
            : "Lean it across the first one so they cross in the middle.",
      add: [l.id],
      fix: [
        { kind: "connector", name: "Leg shoe", count: 1, len: 40, dia: 50, at: [l.top], dir: [0, 1, 0], on: l.id },
        { kind: "cap", name: "Foot cap", count: 1, len: 20, dia: 40, at: [l.foot], dir: [0, -1, 0], on: l.id },
        screwsFor(l),
      ],
      tools: ["allen"],
      people: 2,
    })),
    oval
      ? { title: "Push the upper hub in under the crossing", detail: "It's the one with two raised rims. Slide it between the legs and the top, its notches on the legs.", add: ["H1"] }
      : { title: "Press the nut into a hub", detail: "Into the hex hole in the middle, until it sits flat.", fix: [{ kind: "nut", count: 1, len: 8, dia: 13, at: [[0, yc + 62, 0]], dir: [0, -1, 0], on: "H1" }] },
    oval
      ? { title: "Press the nuts into the upper hub", detail: "Into the two hex holes, until they sit flat.", fix: [{ kind: "nut", count: 2, len: 8, dia: 13, at: boltXs.map((x): Vec3 => [x, yc + 62, 0]), dir: [0, -1, 0], on: "H1" }] }
      : { title: "Push the hub in under the crossing", detail: "Nut side towards the top, its notches on the legs.", add: ["H1"] },
    { title: "Lay the other hub over the crossing", detail: "Its notches sit on the legs from the other side.", add: ["H2"] },
    {
      title: oval ? "Bolt the hubs together" : "Bolt the hubs together",
      detail: oval ? "Two long bolts through the lower hub into the nuts. Tighten them in turns." : "A long bolt through the middle into the nut. Tighten it until the legs can't move.",
      fix: [{ kind: "bolt", count: boltXs.length, len: 110, dia: 8, at: boltXs.map((x): Vec3 => [x, yc - 62, 0]), dir: [0, 1, 0], on: "H2", mate: "H1" }],
      tools: ["allen"],
    },
    { title: "Turn the table over", detail: "Two people, lifting by the top, not the legs.", people: 2, pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["NORRMJÖLE", "NORRMJOLE"],
  recipe,
};
export default family;
