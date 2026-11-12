import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * LOBERGET, read from the manuals of the two swivel bases it is sold on (MALSKÄR and the children's SIBBEN); each
 * manual ends with the LOBERGET shell going on. MALSKÄR: five legs push into the hub and take two screws each, the
 * base is turned over for its five castors, a cover goes over the hub and the gas lift (cap off) drops in. SIBBEN: two
 * short legs push into the long one's hub and take two screws each, then the base is turned over and the gas lift
 * goes in; it stands on its own feet, no castors. Either way the seat plate is screwed under the upside-down shell
 * with four screws and the shell is pressed down onto the lift.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const SCREW = { len: 16, dia: 6 };

/** A piece turned by `tilt` about x around `pivot` (finished-product mm, relative to the part centre). */
function tilted(p: PartPiece, tilt: number, pivot: Vec3): PartPiece {
  const d: Vec3 = [p.pos[0] - pivot[0], p.pos[1] - pivot[1], p.pos[2] - pivot[2]];
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const r: Vec3 = [d[0], d[1] * c - d[2] * s, d[1] * s + d[2] * c];
  return { ...p, pos: [pivot[0] + r[0], pivot[1] + r[1], pivot[2] + r[2]], rot: [(p.rot?.[0] ?? 0) + tilt, p.rot?.[1] ?? 0, p.rot?.[2] ?? 0] };
}

function recipe(s: ProductSpec): CustomParams | null {
  const t = `${s.slug ?? ""} ${s.name}`.toLowerCase();
  if (!/loberget/.test(t)) return null;
  const junior = /sibben/.test(t);
  if (!junior && !/malsk/.test(t)) return null;
  // IKEA's measures: MALSKÄR 67 wide, seat 45 high; SIBBEN 56 wide, seat 38 high
  const R = junior ? 270 : 325;
  const seatH = junior ? 380 : 450;
  const H = s.size.h * 10;
  const shellW = junior ? 420 : 480, shellD = junior ? 380 : 430, st = 24;
  const plateY = seatH - st - 16;
  const parts: CustomPart[] = [];
  const steps: CustomStep[] = [];

  // the base
  const legY = junior ? 25 : 60;
  const hubY = junior ? 45 : 70;
  if (junior) {
    parts.push({ id: "LX", name: "Long leg with hub", size: [2 * R, 50, 60], pos: [0, legY, 0], pieces: [{ shape: "box", size: [2 * R, 40, 50], pos: [0, -5, 0] }, { shape: "cyl", size: [80, 50, 80], pos: [0, 0, 0] }], material: "metal" });
    parts.push({ id: "LF", name: "Short leg", size: [50, 40, R - 40], pos: [0, legY - 5, 40 + (R - 40) / 2], material: "metal" });
    parts.push({ id: "LB", name: "Short leg", size: [50, 40, R - 40], pos: [0, legY - 5, -40 - (R - 40) / 2], material: "metal" });
  } else {
    parts.push({ id: "HUB", name: "Hub", size: [100, 70, 100], pos: [0, hubY, 0], shape: "cyl", material: "metal" });
    Array.from({ length: 5 }, (_, i) => Math.PI / 2 + (i * 2 * Math.PI) / 5).forEach((a, i) => {
      const r = (50 + R) / 2;
      parts.push({ id: `A${i}`, name: "Leg", size: [R - 50, 40, 45], pos: [Math.cos(a) * r, legY, -Math.sin(a) * r], rot: [0, a, 0], material: "metal" });
    });
    parts.push({ id: "COV", name: "Hub cover", size: [110, 40, 110], pos: [0, hubY + 55, 0], shape: "cyl", material: "metal" });
  }
  const gasY0 = hubY - 20;
  parts.push({ id: "GAS", name: "Gas lift", size: [50, plateY - gasY0, 50], pos: [0, (plateY + gasY0) / 2, 0], shape: "cyl", material: "metal" });
  parts.push({ id: "PL", name: "Seat plate", size: [180, 16, 180], pos: [0, plateY + 8, 0], material: "metal" });

  // the shell: a seat pan curving up into a round-topped back, with an opening between them
  const tilt = -0.22;
  const pan0 = seatH - st / 2;
  const backZ = -shellD / 2;
  const topH = H - seatH;
  const disc = shellW;
  const bandY = seatH + 150;
  const bandH = Math.max(60, topH - 150 - disc / 2);
  const cy = (seatH - st + H) / 2;
  const rel = (y: number): number => y - cy;
  const pivot: Vec3 = [0, rel(seatH), backZ];
  const shell: PartPiece[] = [
    { shape: "box", size: [shellW - 40, st, shellD], pos: [0, rel(pan0), 0] },
    { shape: "box", size: [shellW - 110, 14, shellD - 90], pos: [0, rel(seatH + 7), 20], material: "soft" },
    ...[-1, 1].map((sx): PartPiece => tilted({ shape: "box", size: [80, 150, st], pos: [sx * (shellW / 2 - 40), rel(seatH + 75), backZ], material: "board" }, tilt, pivot)),
    tilted({ shape: "box", size: [shellW, bandH, st], pos: [0, rel(bandY + bandH / 2), backZ], material: "board" }, tilt, pivot),
    tilted({ shape: "halfcyl", size: [disc, st, disc / 2], pos: [0, rel(bandY + bandH + disc / 4), backZ], rot: [-Math.PI / 2, 0, 0], material: "board" }, tilt, pivot),
  ];
  parts.push({ id: "SH", name: "Seat shell", size: [shellW, H - seatH + st, shellD + 60], pos: [0, cy, 0], pieces: shell, material: "board" });

  if (junior) {
    steps.push(
      { title: "Push the short legs into the hub", detail: "Lay the long leg upside down on a rug and slide a short leg into each side of its hub.", add: ["LX", "LF", "LB"], pose: "-y", warnings: ["floor"] },
      {
        title: "Screw the short legs in",
        detail: "Two screws in each, up through the underside of the hub, tight with the Allen key.",
        fix: [at("screw", [[-15, legY - 25, 60], [15, legY - 25, 60], [-15, legY - 25, -60], [15, legY - 25, -60]], [0, 1, 0], "LX", undefined, SCREW)],
        tools: ["allen"],
      },
      { title: "Turn the base over and push in the gas lift", detail: "It stands on its feet. Take the cap off the lift and drop it into the hub, thick end down.", add: ["GAS"], from: { GAS: [0, 380, 0] }, pose: "+y" },
    );
  } else {
    const legs = [0, 1, 2, 3, 4].map((i) => `A${i}`);
    const angles = [0, 1, 2, 3, 4].map((i) => Math.PI / 2 + (i * 2 * Math.PI) / 5);
    const screws = angles.flatMap((a) => [62, 92].map((r) => [Math.cos(a) * r, legY + 20, -Math.sin(a) * r] as Vec3));
    const tips = angles.map((a) => [Math.cos(a) * (R - 25), legY - 20, -Math.sin(a) * (R - 25)] as Vec3);
    steps.push(
      { title: "Push the five legs into the hub", detail: "On a rug, each leg straight into its socket until it stops.", add: ["HUB", ...legs], warnings: ["floor"] },
      { title: "Screw the legs to the hub", detail: "Two screws in each leg, tight with the Allen key.", fix: [at("screw", screws, [0, -1, 0], "HUB", undefined, SCREW)], tools: ["allen"] },
      { title: "Turn the base over and push in the castors", detail: "Press each castor's pin into the end of a leg until it clicks, then stand the base up.", fix: [at("castor", tips, [0, 1, 0], undefined, undefined, { len: 58, dia: 50 })], pose: "-y" },
      { title: "Press the cover over the hub", detail: "It snaps down over the screws.", add: ["COV"], pose: "+y" },
      { title: "Pull the cap off the gas lift", detail: "The plastic cap only protects it in the box, so throw it away." },
      { title: "Push the gas lift into the hub", detail: "Thick end down, straight in. Don't take it apart: it is under pressure.", add: ["GAS"], from: { GAS: [0, 380, 0] } },
    );
  }
  const plate: Vec3[] = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * 65, plateY, sz * 65] as Vec3));
  steps.push(
    {
      title: "Screw the seat plate under the shell",
      detail: "Lay the shell upside down on the rug. The plate's lever points to the right. Four screws, tight.",
      add: ["SH", "PL"],
      fix: [at("screw", plate, [0, 1, 0], "PL", "SH", SCREW)],
      tools: ["allen"],
      from: { SH: [0, 520, 0], PL: [0, 640, 0] },
    },
    { title: "Press the shell down onto the gas lift", detail: "Straight down over the lift, then sit on it once: your weight locks the taper." },
  );
  return { parts, steps };
}

const family: Family = { names: ["LOBERGET"], recipe };
export default family;
