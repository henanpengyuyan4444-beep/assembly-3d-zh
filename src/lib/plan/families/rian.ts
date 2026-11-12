import type { Family } from "./family";
import type { CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * RIAN, read from the side table's manual. Three steel tubes and a top, joined with screws. The upper frame (a bar
 * along the back with a leg at each end) takes the bent tube that runs to the front and down into the third leg, with
 * one long screw and a wedge. Upside down, the U-shaped base goes on the three leg ends with three more, and the
 * frame is then screwed to the underside of the top with four short screws.
 */

const R = 19; // tube
type Rod = [len: number, centre: Vec3, axis: "x" | "y" | "z"];

/** A bent steel tube as straight rods given where they sit in the table; its box is what they fill. */
function tube(id: string, name: string, rods: Rod[]): CustomPart {
  const lo: Vec3 = [Infinity, Infinity, Infinity], hi: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const [len, c, axis] of rods)
    for (let i = 0; i < 3; i++) {
      const half = "xyz"[i] === axis ? len / 2 : R / 2;
      lo[i] = Math.min(lo[i], c[i] - half);
      hi[i] = Math.max(hi[i], c[i] + half);
    }
  const pos = lo.map((v, i) => (v + hi[i]) / 2) as Vec3;
  const pieces = rods.map(([len, c, axis]): PartPiece => ({
    shape: "cyl",
    size: [R, len, R],
    pos: c.map((v, i) => v - pos[i]) as Vec3,
    rot: axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : undefined,
  }));
  return { id, name, size: hi.map((v, i) => v - lo[i]) as Vec3, pos, pieces, material: "metal" };
}

function recipe(s: ProductSpec): CustomParams {
  // IKEA: 50 long, 30 wide, 50 high
  const W = s.size.w * 10 || 500, D = s.size.d * 10 || 300, H = s.size.h * 10 || 500;
  const tT = 18, ty = H - tT; // underside of the top
  const fy = ty - R / 2; // the frame's bars, right under the top
  const zb = -D / 2 + 30, zf = D / 2 - 30; // back and front rails
  const xl = -W / 2 + 70, xr = W / 2 - 90; // back legs
  const by = R / 2; // base tubes on the floor
  const legH = fy - by;

  const my = (fy + by) / 2;
  const x0 = -W / 2 + 10, x1 = W / 2 - 10;
  const zMid = (zb + zf) / 2;
  return {
    parts: [
      tube("A", "Upper frame", [[xr - xl, [(xl + xr) / 2, fy, zb], "x"], [legH, [xl, my, zb], "y"], [legH, [xr, my, zb], "y"]]),
      // runs from the back bar's face to the front, then down into the third leg
      tube("B", "Bent tube", [[zf - zb - R / 2, [0, fy, (zb + R / 2 + zf) / 2], "z"], [legH, [0, my, zf], "y"]]),
      tube("C", "Base", [[x1 - x0, [0, by, zb], "x"], [x1 - x0, [0, by, zf], "x"], [zf - zb, [x0, by, 0], "z"]]),
      { id: "T", name: "Table top", size: [W, tT, D], pos: [0, ty + tT / 2, 0], material: "board" },
    ],
    steps: [
      {
        title: "Screw the bent tube to the upper frame",
        detail: "Put a wedge between the tube's end and the back bar, then drive the long screw through the bar into it. Use a long screw here, not a short one.",
        add: ["A", "B"],
        fix: [{ kind: "screw", count: 1, len: 40, dia: 5, at: [[0, fy, zb - R / 2]], dir: [0, 0, 1], on: "A", mate: "B" }, { kind: "spacer", name: "Wedge", count: 1, at: [[0, fy, zb + R / 2 + 2]], dir: [0, 0, 1], on: "B" }],
        tools: ["screwdriver"],
      },
      {
        title: "Turn it over and screw on the base",
        detail: "Stand the frame on its bars with the three legs up. Lay the base on the leg ends, a wedge under each hole, and drive in three long screws.",
        add: ["C"],
        fix: [
          { kind: "screw", count: 3, len: 40, dia: 5, at: [[xl, 0, zb], [xr, 0, zb], [0, 0, zf]], dir: [0, 1, 0], on: "C" },
          { kind: "spacer", name: "Wedge", count: 3, at: [[xl, R, zb], [xr, R, zb], [0, R, zf]], dir: [0, 1, 0], on: "C" },
        ],
        tools: ["screwdriver"],
        pose: "-y",
      },
      {
        title: "Screw the frame to the top",
        detail: "Lay the top face down on a rug and set the frame on it upside down. Four short screws go up through the frame's bars into the top.",
        add: ["T"],
        fix: [
          { kind: "screw", count: 2, len: 16, dia: 5, at: [[xl + 60, fy - R / 2, zb], [xr - 60, fy - R / 2, zb]], dir: [0, 1, 0], on: "A", mate: "T" },
          { kind: "screw", count: 2, len: 16, dia: 5, at: [[0, fy - R / 2, zMid - 20], [0, fy - R / 2, zf - 40]], dir: [0, 1, 0], on: "B", mate: "T" },
        ],
        tools: ["screwdriver"],
        warnings: ["floor"],
      },
      { title: "Stand the table up", detail: "Turn it over onto the base. The open end slides under a sofa or bed.", pose: "+y" },
    ],
  };
}

const family: Family = { names: ["RIAN"], recipe };
export default family;
