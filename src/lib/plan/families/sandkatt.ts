import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * SANDKATT, read from the highchair's manual. The steel frame clicks together first: the back hoop's ends push into
 * the back legs and the arms (each bent down into a front leg) slide onto it, the front bar pushes into the arms'
 * ends, then screws, two seat rails and the two tray holders are fitted and everything is tightened. The board goes
 * into the fabric seat, the seat is lowered on and zipped and strapped round the frame, and the tray clicks on last.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const SIDES = [-1, 1] as const;
const T = 22; // tube

/** A straight tube from a to b (mm, in the chair). */
function rod(a: Vec3, b: Vec3, dia = T): PartPiece {
  const v: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const L = Math.hypot(...v);
  const [x, y, z] = v.map((c) => c / L);
  return { shape: "cyl", size: [dia, L, dia], pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(z, y), 0, -Math.asin(x)] };
}

/** A part made of tubes given in chair coordinates. */
function tubes(id: string, name: string, rods: [Vec3, Vec3][]): CustomPart {
  const pts = rods.flat();
  const lo = [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i])) - T / 2), hi = [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i])) + T / 2);
  const pos = lo.map((v, i) => (v + hi[i]) / 2) as Vec3;
  const pieces = rods.map(([a, b]) => {
    const r = rod(a, b);
    return { ...r, pos: r.pos.map((c, i) => c - pos[i]) as Vec3 };
  });
  return { id, name, size: hi.map((v, i) => v - lo[i]) as Vec3, pos, pieces, material: "metal" };
}

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 60 wide, 68 deep, 91 high, seat 31 wide at 56 high
  const W = s.size.w * 10 || 600, D = s.size.d * 10 || 680, H = s.size.h * 10 || 910;
  const ya = 610, yj = 560; // arms, and where the hoop meets the back legs
  const xa = 175, zb = -150, zf = 110; // frame corners
  const xf = W / 2 - T / 2, zl = D / 2 - T / 2; // feet
  const legAt = (y: number, top: Vec3, foot: Vec3): Vec3 => {
    const k = (top[1] - y) / top[1];
    return [top[0] + (foot[0] - top[0]) * k, y, top[2] + (foot[2] - top[2]) * k];
  };
  const back = (sx: number): [Vec3, Vec3] => [[sx * xa, yj, zb], [sx * xf, 0, -zl]];
  const front = (sx: number): [Vec3, Vec3] => [[sx * xa, ya, zf], [sx * xf, 0, zl]];
  const ys = 500; // seat rails
  const parts: CustomPart[] = [
    tubes("HP", "Back hoop", [[[-xa, yj, zb], [-xa, H - 60, zb]], [[xa, yj, zb], [xa, H - 60, zb]], [[-xa, H - 60, zb], [0, H - T / 2, zb]], [[0, H - T / 2, zb], [xa, H - 60, zb]]]),
    ...SIDES.map((sx, i) => tubes(`BL${i + 1}`, "Back leg", [back(sx)])),
    ...SIDES.map((sx, i) => tubes(`AR${i + 1}`, "Arm with front leg", [[[sx * xa, ya, zb + T / 2], [sx * xa, ya, zf]], front(sx)])),
    tubes("FB", "Front bar", [[[-xa, ya, zf + 40], [xa, ya, zf + 40]], ...SIDES.map((sx): [Vec3, Vec3] => [[sx * xa, ya, zf + 40], [sx * xa, ya, zf + T / 2]])]),
    tubes("RB", "Seat rail", [[legAt(ys, ...back(-1)), legAt(ys, ...back(1))]]),
    tubes("RF", "Seat rail", [[legAt(ys, ...front(-1)), legAt(ys, ...front(1))]]),
    ...SIDES.map((sx, i): CustomPart => ({ id: `TH${i + 1}`, name: "Tray holder", size: [30, 30, 40], pos: [sx * xa, ya + 5, 0], material: "metal" })),
  ];
  const seatW = 310, sling0 = 440;
  parts.push(
    (() => {
      // the sling seat with its back, hanging inside the frame
      const y0 = sling0, y1 = H - 40, cz = (zb + zf) / 2, cy = (y0 + y1) / 2;
      const pieces: PartPiece[] = [
        { shape: "box", size: [seatW + 20, 12, zf - zb], pos: [0, y0 + 60 - cy, 0] },
        { shape: "box", size: [seatW + 20, y1 - y0, 16], pos: [0, 0, zb + 10 - cz] },
        ...SIDES.map((sx): PartPiece => ({ shape: "box", size: [8, ya - y0 - 60, zf - zb], pos: [sx * (seatW / 2 + 6), (y0 + 60 + ya) / 2 - cy, 0] })),
      ];
      return { id: "CV", name: "Fabric seat", size: [seatW + 20, y1 - y0, zf - zb] as Vec3, pos: [0, cy, cz] as Vec3, material: "soft" as const, pieces };
    })(),
    { id: "BD", name: "Seat board", size: [seatW - 20, 5, zf - zb - 40], pos: [0, sling0 + 70, (zb + zf) / 2], material: "fiber" },
    { id: "TR", name: "Tray", size: [W - 120, 30, 230], pos: [0, ya + 30, 60], material: "board" },
  );

  return {
    parts,
    steps: [
      {
        title: "Click the frame together",
        detail: "Push the back hoop's ends into the back legs, and the arms onto the hoop, until each button clicks out through its hole.",
        add: ["HP", "BL1", "BL2", "AR1", "AR2"],
      },
      { title: "Push the front bar into the arms", detail: "Both ends go into the front of the arms until the buttons click.", add: ["FB"] },
      {
        title: "Screw the arms to the back hoop",
        detail: "Four countersunk screws, two on each side, with the crank Allen key. The heads sit flush.",
        fix: SIDES.map((sx, i) => at("screw", [[sx * (xa + T / 2), ya - 4, zb], [sx * (xa + T / 2), yj + 10, zb]], [-sx, 0, 0], `AR${i + 1}`, "HP", { len: 14, dia: 6 })),
        tools: ["allen"],
      },
      {
        title: "Bolt in the two seat rails",
        detail: "One between the back legs and one between the front legs, a long bolt through each leg into the rail's end.",
        add: ["RB", "RF"],
        fix: (["RB", "RF"] as const).flatMap((id) =>
          SIDES.map((sx) => {
            const p = legAt(ys, ...(id === "RB" ? back(sx) : front(sx)));
            return at("bolt", [[p[0] + sx * T / 2, p[1], p[2]]], [-sx, 0, 0], undefined, id, { len: 30, dia: 6 });
          }),
        ),
        tools: ["allen"],
      },
      {
        title: "Fit the tray holders on the arms",
        detail: "Click each one down over its arm, then join it with a sleeve nut from the inside and a bolt from the outside.",
        add: ["TH1", "TH2"],
        fix: [
          ...SIDES.map((sx, i) => at("bolt", [[sx * (xa + 15), ya + 5, 0]], [-sx, 0, 0], `TH${i + 1}`, `AR${i + 1}`, { len: 12, dia: 6 })),
          at("nut", SIDES.map((sx) => [sx * (xa - 15), ya + 5, 0] as Vec3), [1, 0, 0], undefined, undefined, { name: "Sleeve nut", len: 14, dia: 8 }),
        ],
        tools: ["allen"],
      },
      { title: "Tighten everything", detail: "Go round all the screws and bolts again, and press each click button to check it is fully out.", tools: ["allen"] },
      { title: "Slide the board into the fabric seat", detail: "Into the pocket under the seat, smooth side up.", wait: ["CV", "BD"] },
      { title: "Lower the seat onto the frame", detail: "The back slides down over the hoop and the straps hang down between the legs.", add: ["CV", "BD"], from: { CV: [0, 400, 0], BD: [0, 400, 0] } },
      { title: "Zip the seat closed at the back", detail: "Pull the zip all the way round the hoop." },
      { title: "Zip the seat underneath", detail: "Turn the chair upside down on a table and close the zip under the seat.", pose: "-y" },
      { title: "Wrap the flap round the front rail", detail: "Fold it round the rail and press the hook and loop strip flat." },
      { title: "Fasten the straps round the arms", detail: "Stand the chair up. Wrap each strap round its arm and press it closed.", pose: "+y" },
      { title: "Slide the tray onto its holders", detail: "Both sides at once, until each one clicks.", add: ["TR"], from: { TR: [0, 0, 300] } },
      { title: "Check the tray is locked", detail: "Press down on both sides until they click, then pull to check it holds. Always use the safety belt." },
    ],
  };
}

const family: Family = { names: ["SANDKATT"], recipe };
export default family;
