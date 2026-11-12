import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * BETESHÄST, read from the desk's manual (the drawer-on-the-left build; the right-hand one mirrors it). Each end
 * frame is built upside down: cam pins in its top rail, two legs pushed on and locked, the side panel slid down
 * between them and the low stretcher screwed in. Still upside down, the slatted frame and the long back stretcher
 * are bolted between the end frames into barrel nuts. Upright again, connector bolts, a back board on a cam and a
 * screwed divider make the drawer opening, the two drawer runners go in underneath, and the top goes on over dowels,
 * cam pins and cam locks. The drawer comes assembled: it slides in and two stops are turned in behind it.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });

function desk(s: ProductSpec): CustomParams {
  // IKEA: 120 x 60, 76 high
  const W = Math.round(s.size.w * 10) || 1200, D = Math.round(s.size.d * 10) || 600, H = Math.round(s.size.h * 10) || 760;
  const TT = 25, yT = H - TT; // under the top
  const L = 35, xe = W / 2 - 60, ze = D / 2 - 50; // legs
  const yRail = yT - 20; // top of the legs, under the end frames' top rails
  const xi = xe - L / 2; // inner face of the legs
  const fy0 = yT - 80; // the slatted frame's rails, flush with the top rails
  const yPanel = fy0 - 15; // bottom of the side panels
  const xd = 9; // the divider, between drawer and slats
  const zb = -ze, zf = ze;

  const parts: CustomPart[] = [];
  for (const [k, sx] of [["L", -1], ["R", 1]] as const) {
    parts.push({ id: `T${k}`, name: "Top rail", size: [40, 20, D - 40], pos: [sx * xe, yRail + 10, 0], material: "wood" });
    for (const [j, sz] of [["b", -1], ["f", 1]] as const) parts.push({ id: `G${k}${j}`, name: "Leg", size: [L, yRail, L], pos: [sx * xe, yRail / 2, sz * ze], material: "wood" });
    parts.push({ id: `P${k}`, name: "Side panel", size: [16, yRail - yPanel, 2 * ze - L], pos: [sx * xe, (yRail + yPanel) / 2, 0], material: "wood" });
    parts.push({ id: `S${k}`, name: "Side stretcher", size: [30, 40, 2 * ze - L], pos: [sx * xe, 190, 0], material: "wood" });
  }
  // the slatted frame: back rail, a low front rail under the slats and the slats on the right-hand half
  const fc: Vec3 = [0, (fy0 + yT) / 2, 0];
  const nSl = 14, slW = 18, pitch = (xi - xd - 20) / nSl;
  const framePieces: PartPiece[] = [
    { shape: "box", size: [2 * xi, yT - fy0, 20], pos: [0, 0, zb] },
    { shape: "box", size: [2 * xi, 20, 30], pos: [0, fy0 + 10 - fc[1], zf] },
    ...Array.from({ length: nSl }, (_, i): PartPiece => ({ shape: "box", size: [slW, 12, 2 * ze - 30], pos: [xd + 20 + pitch * (i + 0.5), fy0 + 26 - fc[1], 0] })),
  ];
  parts.push({ id: "F", name: "Slatted frame", size: [2 * xi, yT - fy0, 2 * ze + 30], pos: fc, pieces: framePieces, material: "wood" });
  parts.push({ id: "LS", name: "Long stretcher", size: [2 * xi, 40, 30], pos: [0, 270, zb], material: "wood" });
  const dw = xi - xd; // the drawer opening
  const xm = -(xi + xd) / 2;
  const zBoard = zb + 30;
  parts.push({ id: "BB", name: "Back board", size: [dw, yT - fy0, 15], pos: [xm, fc[1], zBoard], material: "wood" });
  parts.push({ id: "DV", name: "Divider", size: [18, yT - fy0, 2 * ze - 30], pos: [0, fc[1], 0], material: "wood" });
  for (const [id, x] of [["RN1", -xi + 10], ["RN2", -xd - 10]] as const)
    parts.push({ id, name: "Drawer runner", size: [20, 15, 2 * ze - 60], pos: [x, fy0 - 8, 0], material: "metal" });
  parts.push({ id: "TOP", name: "Desk top", size: [W, TT, D], pos: [0, H - TT / 2, 0], material: "wood" });
  const dc: Vec3 = [xm, fy0 + 30, (zBoard + 8 + D / 2) / 2];
  const dd = D / 2 - zBoard - 8;
  parts.push({
    id: "DR",
    name: "Drawer",
    size: [dw - 44, 80, dd],
    pos: dc,
    material: "wood",
    pieces: [
      { shape: "box", size: [dw - 44, 70, dd - 18], pos: [0, -5, -9] },
      { shape: "box", size: [dw - 10, yT - fy0 + 8, 18], pos: [0, 4, dd / 2 - 9] },
    ],
  });

  const legs = ["GLb", "GLf", "GRb", "GRf"];
  const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx, sz] as const));
  return {
    parts,
    steps: [
      {
        title: "Screw the cam pins into the top rails",
        detail: "Both end frames are built the same way, upside down on a rug. Turn two pins into each top rail by hand.",
        add: ["TL", "TR"],
        fix: [at("camScrew", corners.map(([sx, sz]) => [sx * xe, yRail, sz * ze] as Vec3), [0, 1, 0], "TL", undefined, { len: 30 })],
        pose: "-y",
        warnings: ["floor"],
      },
      { title: "Push the legs onto the pins", detail: "Two legs on each rail, the holes for the cam locks facing in.", add: legs },
      {
        title: "Lock each leg with a cam lock",
        detail: "Arrow towards the pin, then turn it clockwise until the leg pulls tight against the rail.",
        fix: [-1, 1].map((sz) => at("cam", [-1, 1].map((sx) => [sx * xe, yRail - 25, sz * (ze - L / 2)] as Vec3), [0, 0, sz], legs[0], undefined, { dia: 15 })),
        tools: ["screwdriver"],
      },
      { title: "Slide the side panels in between the legs", detail: "Let each panel down into the grooves until it stops against the top rail.", add: ["PL", "PR"], from: { PL: [0, -350, 0], PR: [0, -350, 0] } },
      {
        title: "Screw in the side stretchers",
        detail: "One screw through each leg into the end of the stretcher, with the small Allen key.",
        add: ["SL", "SR"],
        fix: [-1, 1].map((sz) => at("screw", [-1, 1].map((sx) => [sx * xe, 190, sz * (ze + L / 2)] as Vec3), [0, 0, -sz], "GLf", "SL", { len: 40, dia: 6 })),
        tools: ["allen"],
      },
      {
        title: "Bolt the slatted frame to an end frame",
        detail: "With the end frame still upside down, stand the slatted frame against it, slats nearest. Drop a barrel nut into each rail, then turn the bolts in through the legs.",
        add: ["F"],
        fix: [
          at("nut", [[xi - 30, yT, zb], [xi - 30, fy0 + 20, zf]], [0, -1, 0], "F", undefined, { name: "Barrel nut", len: 14, dia: 10 }),
          at("bolt", [[xe + L / 2, fc[1], zb], [xe + L / 2, fy0 + 10, zf]], [-1, 0, 0], "GRb", "F", { len: 90, dia: 6 }),
        ],
        tools: ["allen"],
      },
      {
        title: "Bolt the long stretcher on",
        detail: "It goes between the back legs, held by one bolt into a barrel nut.",
        add: ["LS"],
        fix: [
          at("nut", [[xi - 30, 290, zb]], [0, -1, 0], "LS", undefined, { name: "Barrel nut", len: 14, dia: 10 }),
          at("bolt", [[xe + L / 2, 270, zb]], [-1, 0, 0], "GRb", "LS", { len: 90, dia: 6 }),
        ],
        tools: ["allen"],
      },
      {
        title: "Bolt the other end frame on",
        detail: "Fit the second end frame onto the free ends of the slatted frame and the stretcher, then three bolts into barrel nuts.",
        fix: [
          at("nut", [[-xi + 30, yT, zb], [-xi + 30, fy0 + 20, zf], [-xi + 30, 290, zb]], [0, -1, 0], "F", undefined, { name: "Barrel nut", len: 14, dia: 10 }),
          at("bolt", [[-xe - L / 2, fc[1], zb], [-xe - L / 2, fy0 + 10, zf], [-xe - L / 2, 270, zb]], [1, 0, 0], "GLb", "F", { len: 90, dia: 6 }),
        ],
        tools: ["allen"],
      },
      { title: "Turn the desk over", detail: "Stand it on its legs.", pose: "+y" },
      {
        title: "Screw the connector bolts into the back rail",
        detail: "Four of them, inside the drawer opening, turned in with the large Allen key until their heads sit against the rail.",
        fix: [at("bolt", [-1, 1].flatMap((k) => [fy0 + 20, yT - 20].map((y) => [xm + k * (dw / 2 - 60), y, zb + 10] as Vec3)), [0, 0, -1], "F", undefined, { name: "Connector bolt", len: 20, dia: 8 })],
        tools: ["allen"],
      },
      {
        title: "Turn a cam pin into the left side panel",
        detail: "It goes in the hole near the back, on the inside face.",
        fix: [at("camScrew", [[-xe + 8, fc[1], zBoard]], [-1, 0, 0], "PL", "BB", { len: 30 })],
      },
      {
        title: "Tap a dowel into the back board",
        detail: "Into the end without the cam hole.",
        fix: [at("dowel", [[-xd, fc[1], zBoard]], [-1, 0, 0], "BB")],
        wait: ["BB"],
      },
      { title: "Slide the back board in", detail: "In front of the connector bolts, its cam end onto the pin in the side panel.", add: ["BB"] },
      {
        title: "Lock the back board with a cam lock",
        detail: "Turn it clockwise until the board pulls tight against the side.",
        fix: [at("cam", [[-xi + 40, yT, zBoard]], [0, -1, 0], "BB", undefined, { dia: 15 })],
        tools: ["screwdriver"],
      },
      {
        title: "Fit the divider and screw it in",
        detail: "Lower it into place between the drawer opening and the slats. Two screws through the back rail, one through the front rail and two into the back board.",
        add: ["DV"],
        fix: [
          at("screw", [[0, fy0 + 20, zb - 10], [0, yT - 20, zb - 10]], [0, 0, 1], "F", "DV", { len: 40, dia: 6 }),
          at("screw", [[0, fy0 + 10, zf + 15]], [0, 0, -1], "F", "DV", { len: 40, dia: 6 }),
          at("screw", [[xd, fy0 + 20, zBoard], [xd, yT - 20, zBoard]], [-1, 0, 0], "DV", "BB", { len: 40, dia: 6 }),
        ],
        tools: ["allen"],
      },
      {
        title: "Screw the drawer runners in underneath",
        detail: "Lay the desk upside down. One runner along each side of the drawer opening, two small screws each.",
        add: ["RN1", "RN2"],
        fix: [at("screw", ["RN1", "RN2"].flatMap((_, i) => [-1, 1].map((sz) => [i ? -xd - 10 : -xi + 10, fy0 - 16, sz * (ze - 60)] as Vec3)), [0, 1, 0], "RN1", undefined, { len: 16, dia: 3.5 })],
        tools: ["screwdriver"],
        pose: "-y",
      },
      {
        title: "Tap the dowels into the frame",
        detail: "Stand the desk up again. Ten dowels go into the holes along the tops of the rails, the divider and the back board.",
        fix: [
          at("dowel", [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * xe, yT, sz * 120] as Vec3)), [0, -1, 0], "TL"),
          at("dowel", [-350, 0, 350].map((x) => [x, yT, zb] as Vec3), [0, -1, 0], "F"),
          at("dowel", [[0, yT, -120], [0, yT, 120]], [0, -1, 0], "DV"),
          at("dowel", [[xm, yT, zBoard]], [0, -1, 0], "BB"),
        ],
        tools: ["hammer"],
        pose: "+y",
      },
      {
        title: "Screw the cam pins into the desk top",
        detail: "Lay the top face down on the rug and turn the seven pins in by hand.",
        fix: [
          at("camScrew", [
            ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * xe, yT, sz * 200] as Vec3)),
            [-200, yT, zb],
            [200, yT, zb],
            [0, yT, 0],
          ], [0, 1, 0], "TOP", undefined, { len: 30 }),
        ],
        wait: ["TOP"],
        warnings: ["floor"],
      },
      { title: "Lay the top on", detail: "Turn it over and lower it so every dowel and pin finds its hole.", add: ["TOP"] },
      {
        title: "Turn the cam locks under the top",
        detail: "Seven of them, from underneath: arrow towards the pin, then clockwise until the top pulls down tight.",
        fix: [
          at("cam", [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * (xe - 20), yRail + 10, sz * 200] as Vec3)), [0, 0, 1], "TL", undefined, { dia: 15 }),
          at("cam", [[-200, yT - 25, zb + 10], [200, yT - 25, zb + 10]], [0, 0, -1], "F", undefined, { dia: 15 }),
          at("cam", [[xd, yT - 25, 0]], [-1, 0, 0], "DV", undefined, { dia: 15 }),
        ],
        tools: ["screwdriver"],
      },
      { title: "Slide the drawer in", detail: "Set it on the runners and push it all the way in.", add: ["DR"], from: { DR: [0, 0, 450] } },
      {
        title: "Turn in the two drawer stops",
        detail: "Pull the drawer half out and screw the stops into the holes at its back, so it can't be pulled out too far.",
        fix: [at("screw", [-1, 1].map((k) => [xm + k * (dw / 2 - 100), dc[1] + 35, dc[2] - dd / 2 + 20] as Vec3), [0, -1, 0], "DR", undefined, { name: "Drawer stop", len: 15, dia: 12 })],
        tools: ["screwdriver"],
      },
    ],
  };
}

const family: Family = {
  names: ["BETESHÄST", "BETESHAST"],
  recipe(s) {
    if (/desk/i.test(s.variant) || /beteshast-desk/.test(s.slug ?? "")) return desk(s);
    return null;
  },
};
export default family;
