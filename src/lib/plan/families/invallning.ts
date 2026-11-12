import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, Vec3 } from "../../types";

/**
 * INVALLNING, read from the manual for the trolley for boxes. It is not a trolley with shelves but a low wire-grid
 * platform on four castors: a welded steel grid with a double tube rim and a flat plate under each corner. Upside down
 * on a rug, two plain castors are bolted under one end, four bolts and nuts each (Allen key on the bolt, spanner on
 * the nut), then the two castors with brakes under the other end. Then it is turned over onto its wheels.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, ...o });

const rodX = (len: number, dia: number, p: Vec3): PartPiece => ({ shape: "cyl", size: [dia, len, dia], pos: p, rot: [0, 0, Math.PI / 2] });
const rodZ = (len: number, dia: number, p: Vec3): PartPiece => ({ shape: "cyl", size: [dia, len, dia], pos: p, rot: [Math.PI / 2, 0, 0] });

function trolley(): CustomParams {
  // IKEA: 68 long, 39 wide, 9 high; the castors take about 6.5 of that
  const L = 680, D = 390, H = 90;
  const yPlate = 65; // underside of the corner plates, where the castors bolt on
  const RIM = 12, WIRE = 5;
  const yTop = H - RIM / 2, yLow = yTop - RIM;
  const cy = (yPlate + H) / 2; // centre of the grid part
  const r = (y: number) => y - cy;
  const xr = L / 2 - RIM / 2, zr = D / 2 - RIM / 2;
  const pieces: PartPiece[] = [];
  // the double rim, two tube loops one above the other
  for (const y of [yTop, yLow]) {
    for (const sz of [-1, 1]) pieces.push(rodX(L, RIM, [0, r(y), sz * zr]));
    for (const sx of [-1, 1]) pieces.push(rodZ(D - 2 * RIM, RIM, [sx * xr, r(y), 0]));
  }
  // the grid on top: wires along the length and many short ones across
  for (let i = 1; i <= 6; i++) pieces.push(rodX(L - 2 * RIM, WIRE, [0, r(yTop), -zr + (i * 2 * zr) / 7]));
  for (let i = 1; i <= 18; i++) pieces.push(rodZ(D - 2 * RIM, WIRE, [-xr + (i * 2 * xr) / 19, r(yTop - WIRE), 0]));
  // a flat plate under each corner for a castor
  const cx = L / 2 - 50, cz = D / 2 - 50;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pieces.push({ shape: "box", size: [90, 3, 90], pos: [sx * cx, r(yPlate + 1.5), sz * cz] });

  const parts: CustomPart[] = [{ id: "P", name: "Grid platform", size: [L, H - yPlate, D], pos: [0, cy, 0], material: "metal", pieces }];

  // four bolts down through each corner plate and castor plate, a nut under each
  const corner = (sx: number, sz: number) => [-1, 1].flatMap((a) => [-1, 1].map((b) => [sx * cx + a * 25, 0, sz * cz + b * 25] as [number, number, number]));
  const end = (sx: number, brake: boolean): CustomFix[] => {
    const pts = [-1, 1].flatMap((sz) => corner(sx, sz));
    return [
      at("castor", [-1, 1].map((sz) => [sx * cx, yPlate, sz * cz] as Vec3), [0, 1, 0], "P", { len: yPlate, dia: 75, name: brake ? "Castor with brake" : "Castor" }),
      at("bolt", pts.map((p) => [p[0], yPlate + 3, p[2]] as Vec3), [0, -1, 0], "P", { len: 12, dia: 6 }),
      at("nut", pts.map((p) => [p[0], yPlate - 4, p[2]] as Vec3), [0, 1, 0], "P", { dia: 6 }),
    ];
  };

  return {
    parts,
    steps: [
      {
        title: "Bolt the plain castors under one end",
        detail: "Lay the platform upside down on a rug. Four bolts through each corner plate and castor plate: hold the nut with the spanner and turn the bolt with the Allen key.",
        add: ["P"],
        fix: end(-1, false),
        tools: ["allen", "wrench"],
        pose: "-y",
        warnings: ["floor"],
        from: { P: [0, 300, 0] },
      },
      {
        title: "Bolt the braked castors under the other end",
        detail: "The two castors with brakes go at the other end, fixed the same way.",
        fix: end(1, true),
        tools: ["allen", "wrench"],
      },
      { title: "Turn it over onto its castors", detail: "Press the brakes down to keep it still while you load your boxes.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["INVALLNING"],
  recipe(s) {
    if (/trolley/i.test(s.variant) || /invallning-trolley/.test(s.slug ?? "")) return trolley();
    return null;
  },
};
export default family;
