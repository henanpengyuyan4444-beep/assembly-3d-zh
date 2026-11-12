import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * RÅSKOG trolley, read from its manual (one manual for both sizes). Each end post is a pair of steel tubes held by
 * small plates, in a top and a bottom half: the halves are screwed together, then pushed onto the stubs rising
 * from the base frame and screwed. The three trays go in from the bottom up: each one hooks onto the tabs on the
 * posts, a bracket clamps round each post and a bolt goes through it into the tray, nut inside, tightened with the
 * spanner. Then it lies on its side on a rug and the four castors are screwed in, the two with brakes first.
 * The NORRÅVA lid just rests in the top tray.
 * IKEA's sizes: the trays are the width (45 or 38 cm, the long side) by the length (35 or 28 cm).
 */

const T = 19; // post tube
const GAP = 12; // each tube's centre from the middle of the end

function recipe(s: ProductSpec) {
  if (!/^raskog-/.test(s.slug ?? "")) return null;
  // the long side is the width; some guides have it as the depth
  const W = Math.max(s.size.w, s.size.d) * 10, D = Math.min(s.size.w, s.size.d) * 10, H = s.size.h * 10;
  const lid = /norrava/.test(s.slug ?? "");
  const k = H / 770;
  const CH = Math.round(70 * k); // castors, from the floor to the base frame
  const xp = W / 2 - 12; // post tubes
  const xt = xp - T / 2; // tray ends
  const Wt = 2 * xt;
  const th = Math.round(110 * k); // tray height
  const trayTop = [0.38 * H, 0.68 * H, H];
  const yb = CH + 11; // base frame tube centre
  const stubTop = yb + 60;
  const ySplit = Math.round((trayTop[0] + trayTop[1]) / 2);
  const zb = D / 2 - 45; // base frame's long tubes

  const tube = (len: number, pos: Vec3): PartPiece => ({ shape: "cyl", size: [T, len, T], pos });
  const post = (y0: number, y1: number, plates: number[]): PartPiece[] => {
    const c = (y0 + y1) / 2, len = y1 - y0;
    return [tube(len, [0, 0, -GAP]), tube(len, [0, 0, GAP]), ...plates.map((y): PartPiece => ({ shape: "box", size: [3, 40, 2 * GAP], pos: [0, y - c, 0] }))];
  };
  const parts: CustomPart[] = [];
  // base frame: a rectangle of tube with two stubs rising at each end
  const bH = stubTop - (yb - 11);
  const bc = (stubTop + yb - 11) / 2;
  const base: PartPiece[] = [
    ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [2 * xp + 22, 22, 22], pos: [0, yb - bc, sz * zb] })),
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [22, 22, 2 * zb], pos: [sx * xp, yb - bc, 0] })),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz): PartPiece => ({ shape: "cyl", size: [17, stubTop - yb, 17], pos: [sx * xp, (yb + stubTop) / 2 - bc, sz * GAP] }))),
  ];
  parts.push({ id: "B", name: "Base frame", size: [2 * xp + 22, bH, 2 * zb + 22], pos: [0, bc, 0], material: "metal", pieces: base });
  const lowY0 = stubTop - 40;
  for (const sx of [-1, 1]) {
    parts.push({ id: `L${sx}`, name: "Post, bottom half", size: [T, ySplit - lowY0, 2 * GAP + T], pos: [sx * xp, (lowY0 + ySplit) / 2, 0], material: "metal", pieces: post(lowY0, ySplit, [trayTop[0] - 30]) });
    parts.push({ id: `U${sx}`, name: "Post, top half", size: [T, H - ySplit, 2 * GAP + T], pos: [sx * xp, (ySplit + H) / 2, 0], material: "metal", pieces: post(ySplit, H, [trayTop[1] - 30, H - 30]) });
  }
  const tray: PartPiece[] = [
    { shape: "box", size: [Wt, 3, D], pos: [0, -th / 2 + 1.5, 0] },
    ...[-1, 1].map((sz): PartPiece => ({ shape: "box", size: [Wt, th, 2], pos: [0, 0, sz * (D / 2 - 1)] })),
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [2, th, D], pos: [sx * (xt - 1), 0, 0] })),
  ];
  trayTop.forEach((y, i) => parts.push({ id: `T${i}`, name: "Tray", size: [Wt, th, D], pos: [0, y - th / 2, 0], material: "metal", pieces: tray }));
  if (lid) parts.push({ id: "LID", name: "Lid", size: [Wt - 6, 12, D - 6], pos: [0, H - 8, 0], material: "wood" });

  const ends = [-1, 1];
  const joinScrews = (y: number, mate?: string): CustomFix => ({
    kind: "screw",
    count: 4,
    len: 8,
    dia: 4,
    at: ends.flatMap((sx) => [-GAP, GAP].map((z): Vec3 => [sx * (xp + T / 2), y, z])),
    dir: [-1, 0, 0],
    mate,
  });
  // fix the screws' direction per end: they go in from the outside of each post
  const perEnd = (f: CustomFix): CustomFix[] =>
    ends.map((sx) => ({ ...f, count: 2, at: f.at!.filter((p) => Math.sign(p[0]) === sx), dir: [-sx, 0, 0] as Vec3 }));
  const trayFix = (i: number): CustomFix[] => {
    const y = trayTop[i] - 30;
    return ends.flatMap((sx): CustomFix[] => [
      { kind: "clip", name: "Tray bracket", count: 1, at: [[sx * (xp + T / 2 + 2), y, 0]], dir: [-sx, 0, 0] },
      { kind: "bolt", name: "Carriage bolt", count: 1, len: 20, dia: 6, at: [[sx * (xp + T / 2 + 4), y - 26, 0]], dir: [-sx, 0, 0], on: `T${i}` },
      { kind: "nut", count: 1, len: 6, dia: 6, at: [[sx * (xt - 3), y - 26, 0]], dir: [sx, 0, 0], on: `T${i}` },
    ]);
  };
  const castors = (sx: number, name: string): CustomFix => ({
    kind: "castor",
    name,
    count: 2,
    len: CH,
    dia: 50,
    at: [-1, 1].map((sz): Vec3 => [sx * xp, CH, sz * zb]),
    dir: [0, 1, 0],
    on: "B",
  });
  const trayStep = (i: number, title: string, detail: string): CustomStep => ({ title, detail, add: [`T${i}`], fix: trayFix(i), tools: ["wrench"], from: { [`T${i}`]: [0, 260, 0] } });

  const steps: CustomStep[] = [
    {
      title: "Screw the halves of each post together",
      detail: "Push each top half into its bottom half, plates on the same side, and drive one screw through each tube.",
      add: ["L-1", "U-1", "L1", "U1"],
      fix: perEnd(joinScrews(ySplit - 12)),
      tools: ["screwdriver"],
      from: { "U-1": [0, 220, 0], U1: [0, 220, 0] },
    },
    {
      title: "Push the posts onto the base frame",
      detail: "Over the two stubs at each end, then one screw through each tube.",
      add: ["B"],
      fix: perEnd({ ...joinScrews(stubTop - 20), mate: "B" }),
      tools: ["screwdriver"],
      from: { B: [0, -260, 0] },
    },
    trayStep(0, "Hang the bottom tray between the posts", "Hook its ends onto the tabs on the posts. Clamp a bracket round each post, push the bolt through into the tray and tighten the nut inside with the spanner."),
    trayStep(1, "Fit the middle tray the same way", "Hook it on, then a bracket, bolt and nut at each end."),
    trayStep(2, "Fit the top tray", "Hook it on at the top of the posts, then a bracket, bolt and nut at each end."),
    {
      title: "Screw in the castors with brakes",
      detail: "Lay the trolley on its side on a rug. Screw the two castors with brakes into one end of the base frame and tighten them with the spanner.",
      fix: [castors(1, "Castor with brake")],
      tools: ["wrench"],
      pose: "+x",
      warnings: ["floor"],
    },
    {
      title: "Screw in the other two castors",
      detail: "Into the other end of the base frame, tightened with the spanner. Then stand the trolley up.",
      fix: [castors(-1, "Castor")],
      tools: ["wrench"],
    },
    lid
      ? { title: "Stand it up and lay the lid on the top tray", detail: "Push the brake levers down to lock the castors. The lid rests inside the top tray's rim.", add: ["LID"], pose: "+y", from: { LID: [0, 200, 0] } }
      : { title: "Stand it up", detail: "Push a brake lever down to lock its castor, lift it to roll again.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["RÅSKOG", "RASKOG"],
  recipe,
};
export default family;
