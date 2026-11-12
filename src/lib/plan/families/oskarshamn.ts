import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * OSKARSHAMN, read from IKEA's manuals.
 *
 * Wing chair: the upholstered body comes in one piece. Lying on its back, each splayed back leg goes in on its two
 * studs and gets two washers and nuts, finger tight; the two front legs screw in by hand and every leg gets a felt
 * pad. Stood up, someone sits in it so the legs settle, then lying back down the four nuts are tightened with the
 * box spanner. Last, the wing back is pushed down onto its two pins in the top of the body.
 * Ottoman (also the set's footstool): upside down, four bun feet screw in by hand, felt pads go under them, and it
 * is turned over.
 */

const box = (size: Vec3, pos: Vec3, rot?: Vec3, material?: PartPiece["material"]): PartPiece => ({ shape: "box", size, pos, ...(rot ? { rot } : {}), ...(material ? { material } : {}) });
const pts = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

/* ---------- wing chair ---------- */

function wingChair(p = "", oz = 0): { parts: CustomPart[]; steps: CustomStep[] } {
  const W = 820, D = 860, H = 990, SH = 440;
  const LH = 175; // underside of the body
  const by = (LH + 640) / 2, bh = 640 - LH; // the body without the wing back
  const at = (x: number, y: number, z: number): Vec3 => [x, y - by, z];
  const body: CustomPart = {
    id: `${p}B`,
    name: "Chair body",
    size: [W - 20, bh, D - 40],
    pos: [0, by, oz],
    material: "soft",
    pieces: [
      box([680, 125, 740], at(0, LH + 62, 10)),
      box([540, SH - LH - 125, 560], at(0, (LH + 125 + SH) / 2, 120)),
      ...[-1, 1].map((g) => box([140, bh - 10, 780], at(g * 335, by - 5, 0), [0, 0, -g * 0.09])),
      box([560, bh - 60, 150], at(0, by + 25, -320), [-0.08, 0, 0]),
    ],
  };
  // the wing back: a tall panel with a wing either side, curved round towards the front
  const wy = (620 + H) / 2, wh = H - 620;
  const wing: CustomPart = {
    id: `${p}W`,
    name: "Wing back",
    size: [W, wh, 260],
    pos: [0, wy, oz - 300],
    material: "soft",
    pieces: [box([620, wh, 140], [0, 0, -40], [-0.08, 0, 0]), ...[-1, 1].map((g) => box([140, wh - 10, 320], [g * 340, -5, 80], [-0.05, g * 0.5, 0]))],
  };
  const fx = 290, fz = 320, bx = 290, bz = -300;
  const tilt = 0.34, splay = 0.15;
  const L = LH / (Math.cos(tilt) * Math.cos(splay));
  const backLeg = (g: number, i: number): CustomPart => ({
    id: `${p}K${i}`,
    name: "Back leg",
    size: [42, L, 42],
    pos: [g * (bx + (L / 2) * Math.sin(splay)), LH / 2, oz + bz - (L / 2) * Math.sin(tilt)],
    rot: [tilt, 0, g * splay],
    shape: "cyl",
    material: "wood",
  });
  const frontLeg = (g: number, i: number): CustomPart => ({ id: `${p}V${i}`, name: "Front leg", size: [40, LH, 40], pos: [g * fx, LH / 2, oz + fz], shape: "cyl", material: "wood" });
  const parts: CustomPart[] = [body, backLeg(-1, 0), backLeg(1, 1), frontLeg(-1, 0), frontLeg(1, 1), wing];
  const nutsAt = (g: number, d: number): Vec3[] => [-18, 18].map((dz): Vec3 => [g * bx, LH + d, oz + bz + dz]);
  const backFoot = (g: number): Vec3 => [g * (bx + L * Math.sin(splay)), 0, oz + bz - L * Math.sin(tilt) * Math.cos(splay)];
  const legNuts = (g: number): CustomFix[] => [pts("washer", nutsAt(g, 18), [0, -1, 0], { dia: 20 }), pts("nut", nutsAt(g, 24), [0, -1, 0], { len: 8, dia: 8 })];
  const steps: CustomStep[] = [
    {
      title: "Fit a back leg and its two nuts",
      detail: "Lay the chair on its back on a rug. Push the leg's two studs through the holes at a back corner, then a washer and a nut on each, finger tight.",
      add: [body.id, `${p}K0`],
      fix: legNuts(-1),
      pose: "+z",
      warnings: ["floor", "hand"],
    },
    { title: "Fit the other back leg the same way", detail: "Two washers and nuts, finger tight for now.", add: [`${p}K1`], fix: legNuts(1), warnings: ["hand"] },
    { title: "Screw in the front legs", detail: "By hand, all the way in until they stop.", add: [`${p}V0`, `${p}V1`] },
    {
      title: "Stick felt pads on the legs and stand it up",
      detail: "One pad on the foot of each leg. Then tip the chair forward onto its legs.",
      fix: [pts("glide", [backFoot(-1), backFoot(1), [-fx, 0, oz + fz], [fx, 0, oz + fz]], [0, 1, 0], { name: "Felt pad", len: 3, dia: 30 })],
    },
    { title: "Sit in the chair for a moment", detail: "Your weight settles the back legs into place before you tighten them.", pose: "+y" },
    {
      title: "Tighten the four nuts",
      detail: "Lay it on its back again and tighten each nut firmly with the box spanner.",
      tools: ["wrench"],
      pose: "+z",
    },
    {
      title: "Push the wing back onto the chair",
      detail: "Stand the chair up. Line the two pins under the wing back up with the holes in the top of the backrest and push it straight down.",
      add: [wing.id],
      pose: "+y",
      from: { [wing.id]: [0, 320, 0] },
    },
  ];
  return { parts, steps };
}

/* ---------- ottoman ---------- */

function ottoman(p = "", oz = 0): { parts: CustomPart[]; steps: CustomStep[] } {
  const W = 570, D = 400, H = 420, FH = 30;
  const cy = (FH + H) / 2, bh = H - FH;
  const body: CustomPart = {
    id: `${p}O`,
    name: "Ottoman",
    size: [W, bh, D],
    pos: [0, cy, oz],
    material: "soft",
    pieces: [
      box([W, bh - 80, D], [0, -40, 0]),
      box([W - 10, 80, D - 10], [0, bh / 2 - 40, 0]),
      box([10, 130, 30], [W / 2 + 3, 30, 0], undefined, "board"), // the strap to lift it by
    ],
  };
  const feet = [-1, 1].flatMap((g) => [-1, 1].map((gz): Vec3 => [g * (W / 2 - 60), FH / 2, oz + gz * (D / 2 - 55)]));
  const parts: CustomPart[] = [body, ...feet.map((q, i): CustomPart => ({ id: `${p}F${i}`, name: "Foot", size: [70, FH, 70], pos: q, shape: "cyl", material: "wood" }))];
  const steps: CustomStep[] = [
    { title: "Turn it upside down and screw in the feet", detail: "On a rug. Each foot screws into a corner by hand until it stops.", add: [body.id, ...parts.slice(1).map((x) => x.id)], pose: "-y", warnings: ["floor"] },
    {
      title: "Stick the felt pads on the feet and turn it over",
      detail: "Press one pad onto each foot, then stand it the right way up.",
      fix: [pts("glide", feet.map(([x, , z]): Vec3 => [x, 0, z]), [0, 1, 0], { name: "Felt pad", len: 3, dia: 30 })],
    },
    { title: "Stand it the right way up", detail: "The lid lifts off for the storage inside.", pose: "+y" },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["OSKARSHAMN"],
  recipe(s: ProductSpec): CustomParams | null {
    const slug = s.slug ?? "";
    if (slug === "oskarshamn-wing-chair") return wingChair();
    if (slug === "oskarshamn-ottoman-storage") return ottoman();
    if (slug === "oskarshamn-wing-chair-footstool") {
      const c = wingChair("c");
      const f = ottoman("f", 760);
      return { parts: [...c.parts, ...f.parts], steps: [...c.steps, ...f.steps.map((st, i) => (i === 0 ? { ...st, title: "Now the footstool: turn it upside down and screw in the feet" } : st))] };
    }
    return null;
  },
};
export default family;
