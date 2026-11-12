import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartMaterial, PartPiece, Vec3 } from "../../types";

/*
 * SMÖRKULL office chair with armrests, read from IKEA's manual. The five legs push into the hub and each takes two
 * screws; the castors click into the leg ends and the gas lift (cap off) stands in the base. The seat lies upside
 * down on a table: each armrest is screwed under it with four screws (marked R and L), the mechanism goes on with
 * four bolts, and the back's bracket with four more. Then the seat is pressed onto the gas lift and sat on to lock.
 * IKEA's sizes: 65 x 66 cm, up to 115 high, seat 44 to 56 high, 48 wide and 49 deep. Drawn at its lowest.
 */

/** One part drawn as boxes given in finished-product mm. */
function boxes(id: string, name: string, list: [Vec3, Vec3, PartMaterial?][], material: PartMaterial): CustomPart {
  const lo = [0, 1, 2].map((k) => Math.min(...list.map((b) => b[0][k]))) as Vec3;
  const hi = [0, 1, 2].map((k) => Math.max(...list.map((b) => b[1][k]))) as Vec3;
  const pos = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2) as Vec3;
  const pieces: PartPiece[] = list.map(([a, b, m]) => ({
    shape: "box",
    size: [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    pos: [(a[0] + b[0]) / 2 - pos[0], (a[1] + b[1]) / 2 - pos[1], (a[2] + b[2]) / 2 - pos[2]],
    ...(m ? { material: m } : {}),
  }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos, material, pieces };
}
const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
/** The seat and everything screwed to it is built on a table beside the base, then lifted onto the gas lift. */
const SEAT = ["S", "AR", "AL", "M", "K", "B"];
const aside = (ids: string[]): Record<string, Vec3> => Object.fromEntries(ids.map((id) => [id, [550, 0, 0] as Vec3]));
const span = (a: number, b: number): [number, number] => [Math.min(a, b), Math.max(a, b)];

function chair(): CustomParams {
  const R = 320, AY0 = 70, AY1 = 105, HUB = 90; // legs, castors under their ends
  const SY = 450, MY = 345; // top of the seat, underside of the mechanism
  const angles = [0, 1, 2, 3, 4].map((i) => (i * 2 * Math.PI) / 5);
  const legs = angles.map((a, i): CustomPart => ({
    id: `L${i + 1}`,
    name: "Leg",
    material: "metal",
    size: [45, AY1 - AY0, R - HUB / 2],
    pos: [(Math.sin(a) * (R + HUB / 2)) / 2, (AY0 + AY1) / 2, (Math.cos(a) * (R + HUB / 2)) / 2],
    rot: [0, a, 0],
  }));
  const arm = (id: string, g: number): CustomPart => {
    const [x0, x1] = span(g * 110, g * 270), [u0, u1] = span(g * 250, g * 280), [p0, p1] = span(g * 240, g * 290);
    return boxes(id, "Armrest", [
      [[x0, MY + 60, -80], [x1, MY + 80, 20]],
      [[u0, MY + 60, -60], [u1, 650, -20]],
      [[p0, 650, -170], [p1, 680, 90]],
    ], "metal");
  };
  const parts: CustomPart[] = [
    { id: "H", name: "Hub", shape: "cyl", material: "metal", size: [HUB, 60, HUB], pos: [0, 95, 0] },
    ...legs,
    { id: "G", name: "Gas lift", shape: "cyl", material: "metal", size: [50, MY - 110, 50], pos: [0, (MY + 110) / 2, 0] },
    { id: "S", name: "Seat", size: [480, SY - MY - 35, 490], pos: [0, (MY + 35 + SY) / 2, 20], material: "soft" },
    arm("AR", 1),
    arm("AL", -1),
    { id: "M", name: "Mechanism", size: [180, 35, 230], pos: [0, MY + 17.5, -10], material: "metal" },
    boxes("K", "Back bracket", [[[-50, MY - 20, -280], [50, MY, -120]], [[-50, MY - 20, -300], [50, 600, -280]]], "metal"),
    { id: "B", name: "Backrest", size: [470, 1040 - 520, 70], pos: [0, (1040 + 520) / 2, -320], material: "soft", rot: [-0.1, 0, 0] },
  ];
  const ends = angles.map((a): Vec3 => [Math.sin(a) * (R - 20), AY0, Math.cos(a) * (R - 20)]);
  const legScrews: Vec3[] = angles.flatMap((a) => [70, 100].map((r): Vec3 => [Math.sin(a) * r, AY1, Math.cos(a) * r]));
  const armScrews = (g: number): Vec3[] => [130, 230].flatMap((x) => [-60, 0].map((z): Vec3 => [g * x, MY + 60, z]));
  return {
    parts,
    steps: [
      {
        title: "Push the legs into the hub",
        detail: "On a rug. Slide each leg into its socket until the holes line up.",
        add: ["H", ...legs.map((l) => l.id)],
        warnings: ["floor"],
      },
      {
        title: "Screw each leg to the hub",
        detail: "Two of the small screws down through each leg.",
        fix: [fix("screw", legScrews, [0, -1, 0], { on: "H", len: 12, dia: 6 })],
        tools: ["allen"],
      },
      {
        title: "Click the castors into the legs",
        detail: "Turn the base over and push each castor in until it clicks, then stand it on its castors.",
        fix: [fix("castor", ends, [0, 1, 0], { len: 60, dia: 50 })],
        pose: "-y",
      },
      { title: "Take the cap off the gas lift", detail: "Pull it off the top and throw it away.", pose: "+y" },
      { title: "Stand the gas lift in the base", detail: "Narrow end up. It just sits in the hole for now.", add: ["G"], from: { G: [0, 300, 0] } },
      {
        title: "Screw the armrests under the seat",
        detail: "Seat upside down on a table, beside the base. The arm marked R goes on the right, L on the left; four countersunk screws in each.",
        fix: [-1, 1].map((g) => fix("screw", armScrews(g), [0, 1, 0], { on: g < 0 ? "AL" : "AR", mate: "S", len: 16, dia: 6 })),
        wait: ["S", "AR", "AL"],
        from: aside(["S", "AR", "AL"]),
        tools: ["allen"],
      },
      {
        title: "Bolt the mechanism under the seat",
        detail: "Lever to the right. Four bolts through the mechanism into the seat.",
        fix: [fix("bolt", [-1, 1].flatMap((g) => [-100, 80].map((z): Vec3 => [g * 70, MY, z])), [0, 1, 0], { on: "M", mate: "S", len: 20, dia: 8 })],
        wait: ["M"],
        from: aside(["M"]),
        tools: ["allen"],
      },
      {
        title: "Bolt the back to the mechanism",
        detail: "Slide the back's bracket into the back of the mechanism and fix it with four bolts.",
        fix: [fix("bolt", [-1, 1].flatMap((g) => [-210, -150].map((z): Vec3 => [g * 25, MY - 20, z])), [0, 1, 0], { on: "K", mate: "M", len: 20, dia: 8 })],
        wait: ["K", "B"],
        from: aside(["K", "B"]),
        tools: ["allen"],
      },
      {
        title: "Press the seat onto the gas lift",
        detail: "Turn the seat over, set the mechanism over the top of the gas lift and push down.",
        add: SEAT,
        from: Object.fromEntries(SEAT.map((id) => [id, [0, 300, 0] as Vec3])),
      },
      { title: "Sit down to lock it", detail: "Your weight presses the seat home for good. The levers set the height and the back's tilt." },
    ],
  };
}

const family: Family = {
  names: ["SMÖRKULL", "SMORKULL"],
  recipe(s) {
    if (/office chair/i.test(`${s.variant} ${s.slug ?? ""}`.replace(/-/g, " "))) return chair();
    return null;
  },
};
export default family;
