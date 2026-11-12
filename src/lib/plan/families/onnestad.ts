import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * ÖNNESTAD, read from the armchair's manual. A steel tube frame that clicks together on spring buttons: the two side
 * frames click into the base bow, and the two halves of the top frame click together and are locked with one screw.
 * The fabric sling slides over the top bar, the top frame clicks into the side frames, a rod goes through the sling's
 * front hem and is bolted between the side frames, a stiff plate slips into the seat's pocket and the cushions go on.
 */

const R = 28; // tube

function part(id: string, name: string, abs: PartPiece[], lo: Vec3, hi: Vec3, material: CustomPart["material"]): CustomPart {
  const c: Vec3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
  const pieces = abs.map((p) => ({ ...p, pos: [p.pos[0] - c[0], p.pos[1] - c[1], p.pos[2] - c[2]] as Vec3 }));
  return { id, name, size: [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], pos: c, pieces, material };
}

/** A tube from a to b: along x, along z, or sloping in the y-z plane. */
function tube(a: Vec3, b: Vec3, d = R): PartPiece {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  if (Math.abs(dx) > 1) return { shape: "cyl", size: [d, Math.abs(dx), d], pos: mid, rot: [0, 0, Math.PI / 2] };
  return { shape: "cyl", size: [d, Math.hypot(dy, dz), d], pos: mid, rot: [Math.atan2(dz, dy), 0, 0] };
}

/** A flat panel from a to b in the y-z plane, w wide. */
function panel(a: Vec3, b: Vec3, w: number, t: number): PartPiece {
  const dy = b[1] - a[1], dz = b[2] - a[2];
  return { shape: "box", size: [w, Math.hypot(dy, dz), t], pos: [0, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], rot: [Math.atan2(dz, dy), 0, 0] };
}

function armchair(s: ProductSpec): CustomParams {
  const W = s.size.w * 10 || 750, H = s.size.h * 10 || 900, D = s.size.d * 10 || 800;
  const xs = W / 2 - R / 2, zF = D / 2 - R / 2, zB = -D / 2 + R / 2, y0 = R / 2;
  const yS = Math.round(H * 0.37), yT = Math.round(H * 0.78), zT = -D / 2 + 90; // seat rod height, top bar
  const zJ = zB + 180; // where the side frames click into the base bow
  const SX = [-1, 1] as const;
  const base = part(
    "BASE",
    "Base bow",
    [tube([-xs, y0, zB], [xs, y0, zB]), ...SX.map((sx) => tube([sx * xs, y0, zB], [sx * xs, y0, zJ]))],
    [-xs - R / 2, 0, zB - R / 2],
    [xs + R / 2, R, zJ],
    "metal",
  );
  const side = (id: string, sx: number) =>
    part(id, "Side frame", [tube([sx * xs, y0, zJ], [sx * xs, y0, zF]), tube([sx * xs, y0, zF], [sx * xs, yS + 60, zF])], [sx * xs - R / 2, 0, zJ], [sx * xs + R / 2, yS + 60, zF + R / 2], "metal");
  const yUp = yS + 60; // top of the side frames' uprights
  const half = (id: string, sx: number) =>
    part(
      id,
      "Top frame half",
      [tube([sx * xs, yUp, zF], [sx * xs, yT, zT]), tube([0, yT, zT], [sx * xs, yT, zT])],
      [sx < 0 ? -xs - R / 2 : 0, yUp - R / 2, zT - R / 2],
      [sx < 0 ? 0 : xs + R / 2, yT + R / 2, zF + R / 2],
      "metal",
    );
  const sw = 2 * xs - R - 10;
  const yLow = Math.round(yS * 0.7), zLow = zT + 160;
  const sling = part(
    "SLING",
    "Fabric sling",
    [panel([0, yT - R / 2, zT + R / 2], [0, yLow, zLow], sw, 4), panel([0, yLow, zLow], [0, yS, zF - R], sw, 4)],
    [-sw / 2, yLow - 4, zT],
    [sw / 2, yT, zF - R / 2],
    "soft",
  );
  const cushT = 150;
  const parts: CustomPart[] = [
    base,
    side("SL", -1),
    side("SR", 1),
    half("TL", -1),
    half("TR", 1),
    sling,
    { id: "ROD", name: "Front rod", shape: "cyl", size: [2 * xs - R, R - 4, R - 4], pos: [0, yS, zF - R], material: "metal" },
    { id: "PLATE", name: "Seat plate", size: [sw - 40, 8, 360], pos: [0, (yLow + yS) / 2 + 10, (zLow + zF) / 2 - 20], rot: [-Math.atan2(yS - yLow, zF - zLow), 0, 0], material: "board" },
    { id: "CS", name: "Seat cushion", size: [sw - 10, cushT, D - 300], pos: [0, (yLow + yS) / 2 + cushT / 2 + 15, (zLow + zF) / 2], material: "soft" },
    {
      id: "CB",
      name: "Back cushion",
      size: [sw - 10, H - yLow - 140, cushT],
      pos: [0, (H + yLow + cushT) / 2, zT + 110],
      rot: [-0.32, 0, 0],
      material: "soft",
    },
  ];
  const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
  const aside: Vec3 = [0, 0, -1100];
  return {
    parts,
    steps: [
      {
        title: "Click a side frame into the base",
        detail: "Work on a rug. Press the spring button in and push the tubes together until the button clicks out through the hole.",
        add: ["BASE", "SL"],
        warnings: ["floor", "hand"],
      },
      { title: "Click on the other side frame", detail: "The same way. Pull on it to check it's locked.", add: ["SR"], warnings: ["hand"] },
      {
        title: "Join the two halves of the top frame",
        detail: "Click them together in the middle of the top bar, then lock the joint with the screw and the Allen key.",
        fix: [at("bolt", [[0, yT + R / 2, zT]], [0, -1, 0], "TL", "TR", { name: "Locking screw", len: 12, dia: 6 })],
        wait: ["TL", "TR"],
        from: { TL: aside, TR: aside },
      },
      {
        title: "Slide the sling onto the top bar",
        detail: "Turn the top frame over and feed the bar through the sling's top hem, smooth side facing out.",
        wait: ["SLING"],
        from: { SLING: aside },
      },
      {
        title: "Click the top frame into the side frames",
        detail: "Push both ends down into the uprights at once until the two buttons click.",
        add: ["TL", "TR", "SLING"],
        warnings: ["hand"],
      },
      { title: "Push the front rod through the sling", detail: "Feed it through the hem at the front edge of the seat, from one side to the other.", add: ["ROD"], from: { ROD: [-900, 0, 0] } },
      {
        title: "Bolt the rod between the side frames",
        detail: "Turn a bolt in through each upright into the end of the rod, with the round end of the cap facing out.",
        fix: SX.map((sx) => at("bolt", [[sx * (xs + R / 2), yS, zF - R]], [-sx, 0, 0], sx < 0 ? "SL" : "SR", "ROD", { len: 45, dia: 6 })),
      },
      { title: "Slide the plate into the seat pocket", detail: "It goes in under the seat, from the front, and keeps the seat flat.", add: ["PLATE"], from: { PLATE: [0, 0, 600] } },
      { title: "Put the cushions on", detail: "Lay the seat cushion on first, then stand the back cushion on it against the sling.", add: ["CS", "CB"] },
    ],
  };
}

const family: Family = {
  names: ["ÖNNESTAD", "ONNESTAD"],
  recipe: (s) => (/armchair/i.test(`${s.variant} ${s.slug ?? ""}`) ? armchair(s) : null),
};
export default family;
