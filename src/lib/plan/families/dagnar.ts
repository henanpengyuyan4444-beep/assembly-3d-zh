import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * DAGNAR, read from the child's desk chair's manual. Not a gas-lift chair: four castors click into the upside-down
 * base, a square post with a height scale is bolted into the base (two bolts, each with a spring washer and a flat
 * washer), the seat slides down the post and is locked with its knob, the backrest gets its clamp screwed on with
 * four bolts and slides down the post above the seat, the cap clicks onto the top of the post and a stop clicks
 * into the hole under it.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });
const UP: Vec3 = [0, 1, 0];

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10;
  const zP = -60; // the post, behind the seat
  const PX = 40, PZ = 56;
  const yArm = 62, AH = 30; // arms, from the floor (castors under them)
  const L = Math.min(340, (W / 2 - 25) / Math.SQRT1_2);
  const angles = [0, 1, 2, 3].map((i) => Math.PI / 4 + (i * Math.PI) / 2);
  const hub: PartPiece = { shape: "box", size: [86, 80, 86], pos: [0, 0, 0] };
  const yHub = yArm + 40;
  const base: PartPiece[] = [
    hub,
    ...angles.map((a): PartPiece => ({ shape: "box", size: [L - 30, AH, 36], pos: [((L + 30) / 2) * Math.cos(a), yArm + AH / 2 - yHub, ((L + 30) / 2) * Math.sin(a)], rot: [0, -a, 0] })),
  ];
  const yCap = H - 50;
  const yPost0 = yHub - 30;
  const ySeat = 440; // seat top, about the middle of its range
  const yClamp = ySeat - 95;
  const seat: PartPiece[] = [
    { shape: "box", size: [72, 90, 80], pos: [0, 0, 0] }, // the clamp round the post
    { shape: "cyl", size: [40, 30, 40], pos: [0, 0, -55], rot: [Math.PI / 2, 0, 0] }, // its knob, at the back
    { shape: "box", size: [60, 26, 120], pos: [0, 10, 100] },
    { shape: "box", size: [320, 16, 260], pos: [0, 30, 190] },
    { shape: "box", size: [440, 66, 360], pos: [0, ySeat - 33 - yClamp, 190], material: "soft" },
  ];
  const yBack = 690;
  const back: PartPiece[] = [
    { shape: "box", size: [72, 90, 80], pos: [0, 0, 0] },
    { shape: "cyl", size: [40, 30, 40], pos: [0, 0, -55], rot: [Math.PI / 2, 0, 0] },
    { shape: "box", size: [70, 60, 40], pos: [0, 0, 55] },
    { shape: "box", size: [400, 400, 70], pos: [0, 10, 110], material: "soft" },
  ];
  const parts: CustomPart[] = [
    { id: "BA", name: "Base", size: [2 * L * Math.SQRT1_2 + 40, 80, 2 * L * Math.SQRT1_2 + 40], pos: [0, yHub, zP], material: "metal", pieces: base },
    { id: "PO", name: "Post", size: [PX, yCap - yPost0, PZ], pos: [0, (yCap + yPost0) / 2, zP], material: "metal" },
    { id: "SE", name: "Seat", size: [440, ySeat - yClamp + 45, 450], pos: [0, (ySeat + yClamp - 45) / 2, zP + 145], material: "soft", pieces: seat.map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] + yClamp - (ySeat + yClamp - 45) / 2, p.pos[2] - 145] as Vec3 })) },
    { id: "BR", name: "Backrest", size: [400, 410, 215], pos: [0, yBack + 5, zP + 37], material: "soft", pieces: back.map((p) => ({ ...p, pos: [p.pos[0], p.pos[1] - 5, p.pos[2] - 37] as Vec3 })) },
    { id: "CP", name: "Top cap", size: [70, 50, 56], pos: [0, yCap + 25, zP], material: "metal", pieces: [{ shape: "cyl", size: [56, 70, 56], pos: [0, 0, 0], rot: [0, 0, Math.PI / 2] }] },
  ];
  const bolts: Vec3[] = [-18, 18].map((dy) => [0, yHub + dy, zP + 43]);
  const steps: CustomStep[] = [
    {
      title: "Click the castors into the base",
      detail: "Lay the base upside down on a rug. Push each castor's pin straight into an arm until it clicks.",
      add: ["BA"],
      fix: angles.map((a) => fx("castor", [[L * Math.cos(a) - 10 * Math.cos(a), yArm, zP + (L - 10) * Math.sin(a)]], UP, "BA")),
      pose: "-y",
      warnings: ["floor"],
    },
    {
      title: "Bolt the post into the base",
      detail: "Scale to the front, leaning back a little. Each bolt gets a spring washer, then a flat washer. Tighten with the long Allen key.",
      add: ["PO"],
      fix: [
        fx("washer", bolts, [0, 0, -1], "BA", { name: "Flat washer" }),
        fx("washer", bolts.map((p): Vec3 => [p[0], p[1], p[2] + 3]), [0, 0, -1], "BA", { name: "Spring washer" }),
        fx("bolt", bolts.map((p): Vec3 => [p[0], p[1], p[2] + 6]), [0, 0, -1], "BA", { len: 25, dia: 8, mate: "PO" }),
      ],
      tools: ["allen"],
      pose: "+z",
    },
    {
      title: "Slide the seat down the post",
      detail: "Stand the base up. Pull the seat's knob out to free the clamp, then slide the clamp down over the top of the post.",
      add: ["SE"],
      pose: "+y",
      from: { SE: [0, 650, 0] },
    },
    { title: "Lock the seat with its knob", detail: "Let the knob drop into a hole in the post at the height you want, then turn it tight." },
    {
      title: "Bolt the clamp to the backrest",
      detail: "Lay the backrest face down. Four bolts through the clamp's plate into the backrest, with the small Allen key.",
      fix: [fx("bolt", [-1, 1].flatMap((sx) => [-1, 1].map((sy): Vec3 => [sx * 22, yBack + sy * 22, zP + 75])), [0, 0, 1], "BR", { len: 16, dia: 6 })],
      tools: ["allen"],
      wait: ["BR"],
    },
    {
      title: "Slide the backrest down the post",
      detail: "Pull its knob out, slide it down over the top of the post, then let the knob drop into a hole and turn it tight.",
      add: ["BR"],
      from: { BR: [0, 450, 0] },
    },
    { title: "Click the cap onto the post", detail: "Round side up. Press it down until it clicks.", add: ["CP"], from: { CP: [0, 150, 0] } },
    {
      title: "Click the stop into the post",
      detail: "Into the hole near the top of the post, above the backrest's clamp, so the backrest can't be pulled off.",
      fix: [fx("cap", [[0, yCap - 60, zP - PZ / 2]], [0, 0, 1], "PO", { name: "Stop" })],
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["DAGNAR"],
  recipe(s) {
    if (!/chair/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
