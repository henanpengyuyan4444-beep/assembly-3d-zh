import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LIXHULT, read from the 35x60 and 60x35 cabinets' manuals (the same steps, one door or two). The steel cabinet
 * clicks together without tools until the legs: two rails with a short post at each end lie on a rug, the side
 * panels drop over the posts with a click, the back slides in and its tabs are bent over at the top, and the bottom
 * drops in. Lying on its back, the front tabs are bent, the four legs go up into the posts and get a screw each.
 * Stood up, the top clicks onto four catches and two more tabs, the shelf slides in on its ribs and the cabinet is
 * screwed to the wall. Each door stands on a pin in the front rail and is lifted onto the top, then its latch clicks in.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

const LEG = 220; // IKEA: 21 cm free under it, so the legs stand 22 cm below the body

function recipe(s: ProductSpec): CustomParams | null {
  if (!/lixhult/i.test(s.slug ?? s.name) || !/cabinet/i.test(s.variant)) return null;
  // our sizes are the body without its legs (IKEA's "height without legs")
  const W = s.size.w * 10, H0 = s.size.h * 10, D = s.size.d * 10;
  const two = W > 450;
  const t = 8; // sheet steel, drawn a little thicker than it is
  const P = 20; // square tube of the posts and legs
  const y0 = LEG; // underside of the body
  const xp = W / 2 - t - P / 2;
  const zp = D / 2 - P / 2;
  const railH = 30, postH = 100;

  const rail: PartPiece[] = [
    { shape: "box", size: [W - 2 * t, railH, P], pos: [0, -postH / 2 + railH / 2, 0] },
    { shape: "box", size: [P, postH, P], pos: [-xp, 0, 0] },
    { shape: "box", size: [P, postH, P], pos: [xp, 0, 0] },
  ];
  const sideH = H0 - t;
  const parts: CustomPart[] = [
    { id: "UF", name: "Leg rail", size: [W - 2 * t, postH, P], pos: [0, y0 + postH / 2, zp], pieces: rail, material: "metal" },
    { id: "UB", name: "Leg rail", size: [W - 2 * t, postH, P], pos: [0, y0 + postH / 2, -zp], pieces: rail, material: "metal" },
    { id: "SL", name: "Side panel", size: [t, sideH, D], pos: [-W / 2 + t / 2, y0 + sideH / 2, 0], material: "metal" },
    { id: "SR", name: "Side panel", size: [t, sideH, D], pos: [W / 2 - t / 2, y0 + sideH / 2, 0], material: "metal" },
    { id: "BK", name: "Back panel", size: [W - 2 * t, sideH - railH, t], pos: [0, y0 + railH + (sideH - railH) / 2, -D / 2 + t / 2], material: "metal" },
    { id: "BT", name: "Bottom panel", size: [W - 2 * t, t, D - 2 * P], pos: [0, y0 + railH - t / 2, 0], material: "metal" },
    { id: "TP", name: "Top panel", size: [W, t, D], pos: [0, y0 + H0 - t / 2, 0], material: "metal" },
  ];
  // the tall cabinet has a shelf; the low one doesn't
  const shelf = H0 > 450;
  if (shelf) parts.push({ id: "SH", name: "Shelf", size: [W - 2 * t - 4, t, D - 40], pos: [0, y0 + Math.round(H0 / 2), 6], material: "metal" });
  const legs = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ id: `L${sx > 0 ? "R" : "L"}${sz > 0 ? "F" : "B"}`, x: sx * xp, z: sz * zp, sx, sz })));
  for (const l of legs) parts.push({ id: l.id, name: "Leg", size: [P - 2, LEG + 80, P - 2], pos: [l.x, (LEG + 80) / 2, l.z], material: "metal" });
  const doorH = H0 - 2 * t - railH + 10;
  const doorY = y0 + railH - 10 + doorH / 2;
  const doors = two
    ? [
        { id: "DL", w: (W - 2 * t) / 2 - 2, x: -(W - 2 * t) / 4, hinge: -1 },
        { id: "DR", w: (W - 2 * t) / 2 - 2, x: (W - 2 * t) / 4, hinge: 1 },
      ]
    : [{ id: "DL", w: W - 2 * t - 4, x: 0, hinge: -1 }];
  for (const d of doors) parts.push({ id: d.id, name: "Door", size: [d.w, doorH, t], pos: [d.x, doorY, D / 2 + t / 2], material: "metal" });

  const legScrews = legs.map((l) => [l.sx * (xp - P / 2), y0 + 50, l.z] as Vec3);
  const wall = [-1, 1].map((sx) => [sx * (W / 2 - 70), y0 + H0 - 60, -D / 2] as Vec3);
  const hingeX = (d: (typeof doors)[number]) => d.x + d.hinge * (d.w / 2 - 15);
  const pins = doors.map((d) => [hingeX(d), y0 + railH, D / 2 - 8] as Vec3);
  const latches = doors.map((d) => [d.x - d.hinge * (d.w / 2 - 25), doorY, D / 2 + t] as Vec3);
  const legIds = legs.map((l) => l.id);
  const doorIds = doors.map((d) => d.id);

  const steps: CustomStep[] = [
    {
      title: "Lay the two leg rails on a rug",
      detail: "Posts pointing up, the holes in the posts facing in towards each other.",
      add: ["UF", "UB"],
      warnings: ["floor"],
    },
    {
      title: "Click the side panels over the posts",
      detail: "Each side slides down over a front and a back post until it clicks.",
      add: ["SL", "SR"],
    },
    {
      title: "Slide the back panel in",
      detail: two ? "Tip it in from above and swing it down against the back edges of the sides." : "Push it in from the front until it sits against the back edges of the sides.",
      add: ["BK"],
      from: { BK: two ? [0, 400, 0] : [0, 0, 420] },
    },
    { title: "Bend over the tabs at the top of the back", detail: "Two tabs, one in each corner. Lever them over with a flat screwdriver.", tools: ["flathead"] },
    { title: "Drop the bottom panel in", detail: "Lay it on the rails and press it down at the front until it locks.", add: ["BT"] },
    { title: "Lay it on its back and lock the front tabs", detail: "Two tabs at the bottom front corners, bent over with the screwdriver.", pose: "+z", tools: ["flathead"], warnings: ["floor"] },
    { title: "Push the legs into the posts", detail: "Each leg slides up into a corner post as far as it goes.", add: legIds, from: Object.fromEntries(legIds.map((id) => [id, [0, -320, 0] as Vec3])) },
    {
      title: "Screw each leg in place",
      detail: "One screw through each post into its leg, from inside the cabinet.",
      fix: [at("screw", legScrews.filter((_, i) => legs[i].sx < 0), [-1, 0, 0], undefined, undefined, { len: 12, dia: 4 }), at("screw", legScrews.filter((_, i) => legs[i].sx > 0), [1, 0, 0], undefined, undefined, { len: 12, dia: 4 })],
      tools: ["screwdriver"],
    },
    {
      title: "Stand it up and click the top on",
      detail: "Lay the top on, press it down over the four catches and push it back until it locks.",
      add: ["TP"],
      pose: "+y",
    },
    { title: "Bend over the tabs at the top front", detail: "The last two tabs, one in each front corner.", tools: ["flathead"] },
    ...(shelf ? [{ title: "Slide the shelf in", detail: "It rests on the ribs pressed into the sides.", add: ["SH"], from: { SH: [0, 0, 420] as Vec3 } }] : []),
    {
      title: "Screw it to the wall",
      detail: "Two screws through the holes at the top of the back. Wall screws and plugs aren't included: pick ones made for your wall.",
      fix: [at("plug", wall, [0, 0, -1], undefined, undefined, { len: 30, dia: 6 }), at("screw", wall, [0, 0, -1], "BK", undefined, { len: 50, dia: 5 })],
      tools: ["drill", "screwdriver", "pencil"],
      warnings: ["wall", "tip"],
      wall: true,
    },
    {
      title: two ? "Push a door pin into each hinge hole" : "Push the door pin into the hinge hole",
      detail: two ? "In the front rail, one at each end." : "In the front rail, on the hinge side.",
      fix: [at("pin", pins, [0, -1, 0], "UF", undefined, { len: 14, dia: 6, name: "Door pin" })],
    },
    {
      title: two ? "Hang the doors" : "Hang the door",
      detail: "Stand the door on its pin, then lift it so the pin at its top goes into the hole in the top panel.",
      add: doorIds,
    },
    {
      title: two ? "Click a latch into each door" : "Click the latch into the door",
      detail: "Push it up into the slot inside the door until it clicks. Its knob comes through the front.",
      fix: [at("knob", latches, [0, 0, -1], undefined, undefined, { len: 18, dia: 16, name: "Latch" })],
    },
  ];
  return { parts, steps };
}

const family: Family = { names: ["LIXHULT"], recipe };
export default family;
