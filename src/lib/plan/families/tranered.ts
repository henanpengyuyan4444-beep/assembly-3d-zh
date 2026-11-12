import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, ProductSpec, Vec3 } from "../../types";

/**
 * TRANERED, read from the coffee table's manual. The table is a closed box on two plank legs: a top and a bottom
 * with a divider between them, two side walls, and a flap at the front and back that tips down on pivot pins, held by
 * stays. The divider goes onto the top (cam bolts and dowels), then the box is built lying on its left side: the left
 * wall, the bottom (screwed into the divider), the right wall, cam locks all round, the stays and the two flaps. It is
 * turned upside down for the legs, which are joined by a crossbar and locked on with four big cams, then stood up by
 * two people. Bumpers go under the legs and inside the flaps.
 */

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 90 x 90, 41 high
  const W = s.size.w * 10 || 900, D = s.size.d * 10 || 900, H = s.size.h * 10 || 410;
  const t = 18, legH = 140, yb = legH, yt = H;
  const xi = W / 2 - t, zi = D / 2 - t; // inner faces of the walls and the flaps
  const yTopUp = yt - 10, yA = yTopUp - t / 2, yD = yb + t / 2;
  const yBlo = yb + t, yBhi = yTopUp - t;
  const xL = 300, legD = D - 200, xX = xL - 12.5;
  const parts: CustomPart[] = [
    { id: "A", name: "Top panel", size: [2 * xi, t, 2 * zi], pos: [0, yA, 0], material: "board" },
    { id: "B", name: "Divider", size: [2 * xi, yBhi - yBlo, t], pos: [0, (yBlo + yBhi) / 2, 0], material: "board" },
    { id: "C1", name: "Side wall", size: [t, yt - yb, D], pos: [-W / 2 + t / 2, (yb + yt) / 2, 0], material: "board" },
    { id: "D", name: "Bottom panel", size: [2 * xi, t, 2 * zi], pos: [0, yD, 0], material: "board" },
    { id: "C2", name: "Side wall", size: [t, yt - yb, D], pos: [W / 2 - t / 2, (yb + yt) / 2, 0], material: "board" },
    ...[1, -1].map((sz, i): CustomPart => ({ id: `E${i + 1}`, name: "Flap", size: [2 * xi - 2, yTopUp - yb - 2, t], pos: [0, (yb + yTopUp) / 2, sz * (D / 2 - t / 2)], material: "board" })),
    ...[-1, 1].map((sx, i): CustomPart => ({ id: `L${i + 1}`, name: "Leg", size: [25, legH, legD], pos: [sx * xL, legH / 2, 0], material: "board" })),
    { id: "X", name: "Crossbar", size: [2 * xX - 12.5, 80, 25], pos: [0, 70, 0], material: "board" },
  ];
  const six = [-360, -216, -72, 72, 216, 360];
  const wallId = (sx: number) => (sx < 0 ? "C1" : "C2");
  const edgeDowels = (id: string, y: number): CustomFix[] =>
    [-1, 1].map((sx) => ({ kind: "dowel", count: 6, at: six.map((z): Vec3 => [sx * xi, y, z]), dir: [sx, 0, 0], on: id, mate: wallId(sx) }));
  const wallBolts = (sx: number): CustomFix[] => [
    { kind: "camScrew", count: 2, at: [-300, 300].map((z): Vec3 => [sx * xi, yA, z]), dir: [sx, 0, 0], on: wallId(sx), mate: "A" },
    { kind: "camScrew", count: 1, at: [[sx * xi, (yBlo + yBhi) / 2, 0]], dir: [sx, 0, 0], on: wallId(sx), mate: "B" },
    { kind: "camScrew", count: 2, at: [-300, 300].map((z): Vec3 => [sx * xi, yD, z]), dir: [sx, 0, 0], on: wallId(sx), mate: "D" },
  ];
  const camsA = (sx: number): CustomFix => ({ kind: "cam", count: 2, at: [-300, 300].map((z): Vec3 => [sx * (xi - 30), yA - t / 2, z]), dir: [0, 1, 0], on: "A" });
  const camB = (sx: number): CustomFix => ({ kind: "cam", count: 1, at: [[sx * (xi - 30), (yBlo + yBhi) / 2, t / 2]], dir: [0, 0, -1], on: "B" });
  const camsD = (sx: number): CustomFix => ({ kind: "cam", count: 2, at: [-300, 300].map((z): Vec3 => [sx * (xi - 30), yD + t / 2, z]), dir: [0, -1, 0], on: "D" });
  const yStay = (yb + yTopUp) / 2 + 30;
  const stays = (sx: number): CustomFix[] => [
    { kind: "connector", name: "Flap stay", count: 2, at: [-1, 1].map((sz): Vec3 => [sx * xi, yStay, sz * (zi - 40)]), dir: [sx, 0, 0], on: wallId(sx) },
    { kind: "screw", count: 4, len: 12, dia: 4, at: [-1, 1].flatMap((sz) => [-15, 15].map((dy): Vec3 => [sx * xi, yStay + dy, sz * (zi - 55)])), dir: [sx, 0, 0], on: wallId(sx) },
  ];
  const pivots = (sz: number, id: string): CustomFix[] => [
    { kind: "pin", name: "Pivot pin", count: 1, at: [[-xi, yb + 20, sz * (D / 2 - t / 2)]], dir: [-1, 0, 0], on: id, mate: "C1" },
    { kind: "pin", name: "Pivot pin with catch", count: 1, at: [[xi, yb + 20, sz * (D / 2 - t / 2)]], dir: [1, 0, 0], on: id, mate: "C2" },
  ];
  return {
    parts,
    steps: [
      {
        title: "Screw two cam bolts into the top panel",
        detail: "Lay the top face down on a rug. The bolts go along the middle, where the divider will stand.",
        add: ["A"],
        fix: [{ kind: "camScrew", count: 2, at: [-300, 300].map((x): Vec3 => [x, yA - t / 2, 0]), dir: [0, 1, 0], on: "A", mate: "B" }],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Tap the dowels into the top panel", detail: "Six along each of the two edges that meet the side walls.", fix: edgeDowels("A", yA), tools: ["hammer"] },
      {
        title: "Tap dowels into the divider",
        detail: "Two in each end.",
        fix: [-1, 1].map((sx): CustomFix => ({ kind: "dowel", count: 2, at: [yBlo + 70, yBhi - 70].map((y): Vec3 => [sx * xi, y, 0]), dir: [sx, 0, 0], on: "B", mate: wallId(sx) })),
        wait: ["B"],
        tools: ["hammer"],
      },
      { title: "Stand the divider on the top panel", detail: "Its holes go over the two cam bolts.", add: ["B"] },
      { title: "Lock the divider on", detail: "Turn the two cam locks in the divider until they pull it tight.", fix: [{ kind: "cam", count: 2, at: [-300, 300].map((x): Vec3 => [x, yBhi - 30, t / 2]), dir: [0, 0, -1], on: "B" }] },
      {
        title: "Screw the cam bolts into the side walls",
        detail: "Five in each wall: two for the top, one for the divider and two for the bottom.",
        fix: [...wallBolts(-1), ...wallBolts(1)],
        wait: ["C1", "C2"],
      },
      {
        title: "Press the pin sockets into the side walls",
        detail: "One at the bottom of each end of both walls, for the flaps' pivot pins.",
        fix: [-1, 1].map((sx): CustomFix => ({ kind: "connector", name: "Pin socket", count: 2, at: [-1, 1].map((sz): Vec3 => [sx * xi, yb + 20, sz * (D / 2 - t / 2)]), dir: [sx, 0, 0], on: wallId(sx) })),
      },
      { title: "Lay the top on a side wall", detail: "Turn the top and divider on their side and lower them onto one wall, dowels and bolts into its holes.", add: ["C1"], pose: "+x" },
      { title: "Lock the top and the divider to the wall", detail: "Turn the three cam locks.", fix: [camsA(-1), camB(-1)] },
      { title: "Tap the dowels into the bottom panel", detail: "Six along each wall edge, as on the top.", fix: edgeDowels("D", yD), wait: ["D"], tools: ["hammer"] },
      { title: "Fit the bottom panel", detail: "Lower it onto the wall, parallel to the top, its holes over the divider's edge.", add: ["D"] },
      {
        title: "Screw the bottom to the divider",
        detail: "Two long screws through the bottom into the divider's edge, turned in with the crank key.",
        fix: [{ kind: "bolt", name: "Long screw", count: 2, len: 60, dia: 6, at: [-300, 300].map((x): Vec3 => [x, yb, 0]), dir: [0, 1, 0], on: "D", mate: "B" }],
      },
      { title: "Lock the bottom to the wall", detail: "Turn the two cam locks in the bottom.", fix: [camsD(-1)] },
      { title: "Screw two flap stays to the other wall", detail: "Lay the wall flat. Each stay is held by two screws and clicks into its base.", fix: stays(1) },
      { title: "Put the other wall on", detail: "Lower it onto the top, divider and bottom, stays inside.", add: ["C2"] },
      { title: "Lock the wall on", detail: "Five cam locks: two in the top, one in the divider, two in the bottom.", fix: [camsA(1), camB(1), camsD(1)] },
      { title: "Screw two flap stays to the first wall", detail: "Inside the box, the same way as on the other wall.", fix: stays(-1) },
      {
        title: "Push the pivot pins into the flaps",
        detail: "One in each end of both flaps, near the bottom edge. The two kinds of pin go in opposite ends.",
        fix: [...pivots(1, "E1"), ...pivots(-1, "E2")],
        wait: ["E1", "E2"],
      },
      { title: "Fit the flaps", detail: "Smooth face out. Slide each flap's pins into the sockets in the walls and press until they catch.", add: ["E1", "E2"] },
      {
        title: "Screw the stays to the flaps",
        detail: "Hold each flap half open and screw the free ends of its two stays to it, two screws each.",
        fix: [-1, 1].map((sz): CustomFix => ({ kind: "screw", count: 4, len: 12, dia: 4, at: [-1, 1].flatMap((sx) => [-15, 15].map((dy): Vec3 => [sx * (xi - 40), yStay + dy, sz * zi])), dir: [0, 0, sz], on: sz > 0 ? "E1" : "E2" })),
      },
      { title: "Turn the box upside down", detail: "Tip it over onto the rug so the bottom faces up.", pose: "-y", warnings: ["floor"] },
      {
        title: "Screw the leg cam bolts into the bottom",
        detail: "Four big cam bolts, two over each leg's place.",
        fix: [{ kind: "camScrew", name: "Leg cam bolt", count: 4, len: 30, dia: 8, at: [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * xL, yb, sz * 250])), dir: [0, 1, 0], on: "D", mate: "L1" }],
      },
      {
        title: "Screw a cam bolt into each leg",
        detail: "In the inside face, where the crossbar meets it.",
        fix: [-1, 1].map((sx, i): CustomFix => ({ kind: "camScrew", count: 1, at: [[sx * (xL - 12.5), 90, 0]], dir: [sx, 0, 0], on: `L${i + 1}`, mate: "X" })),
        wait: ["L1", "L2", "X"],
        from: { L1: [0, 0, 700], L2: [0, 0, 700], X: [0, 0, 700] },
      },
      {
        title: "Tap the dowels into the crossbar and legs",
        detail: "One small dowel in each end of the crossbar, and four big dowels along the top edge of each leg. Press a big cam into each leg's two holes.",
        fix: [
          ...[-1, 1].map((sx): CustomFix => ({ kind: "dowel", count: 1, at: [[sx * xX, 50, 0]], dir: [sx, 0, 0], on: "X", mate: sx < 0 ? "L1" : "L2" })),
          ...[-1, 1].map((sx, i): CustomFix => ({ kind: "dowel", count: 4, len: 40, dia: 10, at: [-300, -100, 100, 300].map((z): Vec3 => [sx * xL, legH, z]), dir: [0, -1, 0], on: `L${i + 1}`, mate: "D" })),
          ...[-1, 1].map((sx, i): CustomFix => ({ kind: "cam", name: "Big cam", count: 2, dia: 25, at: [-250, 250].map((z): Vec3 => [sx * (xL - 12.5), legH - 30, z]), dir: [sx, 0, 0], on: `L${i + 1}` })),
        ],
        tools: ["hammer"],
      },
      {
        title: "Fit the legs and crossbar to the bottom",
        detail: "Push the legs onto the crossbar, turn its two cam locks, then lower the legs onto the bottom so the big cam bolts go into the cams.",
        add: ["X", "L1", "L2"],
        fix: [{ kind: "cam", count: 2, at: [-1, 1].map((sx): Vec3 => [sx * (xX - 40), 90, 12.5]), dir: [0, 0, -1], on: "X" }],
      },
      { title: "Lock the legs on", detail: "Turn the four big cams in the legs until the legs sit tight against the bottom.", tools: ["screwdriver"] },
      {
        title: "Press bumpers under the legs",
        detail: "Two under each leg, one at each end.",
        fix: [{ kind: "glide", name: "Bumper", count: 4, at: [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * xL, 0, sz * (legD / 2 - 40)])), dir: [0, 1, 0] }],
      },
      { title: "Turn the table over", detail: "Lift it together by the box, not the legs, and stand it on its legs.", pose: "+y", people: 2 },
      {
        title: "Press the bumpers onto the flaps",
        detail: "Open each flap and press four bumpers onto its inside face, near the corners, so it closes softly.",
        fix: [-1, 1].map((sz): CustomFix => ({
          kind: "glide",
          name: "Bumper",
          count: 4,
          at: [-1, 1].flatMap((sx) => [yb + 40, yTopUp - 30].map((y): Vec3 => [sx * (xi - 40), y, sz * zi])),
          dir: [0, 0, sz],
          on: sz > 0 ? "E1" : "E2",
        })),
      },
      { title: "Adjust the stays", detail: "Turn the screw on each stay until both flaps open slowly and close flush.", tools: ["screwdriver"] },
    ],
  };
}

const family: Family = { names: ["TRANERED"], recipe };
export default family;
