import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, ProductSpec, Vec3 } from "../../types";

/**
 * EKOLSUND, read from the recliner frame's manual. The seat frame with its mechanism stands on its back while the
 * four legs are bolted on (one carriage bolt and nut each, done up with the box spanner), then stands up and the
 * back frame clicks down onto its two brackets. The cushions go into their covers, the footrest cover is fastened
 * round the footrest, the seat cushion goes on, each armrest slides down onto two brackets, and the back cushion is
 * pulled over the back frame and zipped. Last, tipped on its back, two wing screws lock the armrests to the frame.
 */

const fx = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, on, ...o });

/** A straight leg from its top (under the frame) to its foot on the floor. */
function leg(id: string, top: Vec3, foot: Vec3, t: number): CustomPart {
  const d: Vec3 = [top[0] - foot[0], top[1] - foot[1], top[2] - foot[2]];
  const L = Math.hypot(...d);
  const n = d.map((x) => x / L);
  return { id, name: "Leg", size: [t, L, t], pos: [(top[0] + foot[0]) / 2, (top[1] + foot[1]) / 2, (top[2] + foot[2]) / 2], rot: [Math.atan2(n[2], n[1]), 0, -Math.asin(n[0])], shape: "cyl", material: "metal" };
}

function recipe(s: ProductSpec): CustomParams {
  const W = s.size.w * 10, H = s.size.h * 10, D = s.size.d * 10;
  const SW = 610, SH = 450; // IKEA's seat width and height
  const AW = (W - SW) / 2 - 5; // each armrest
  const yF = 115; // the frame's underside
  const zF0 = -D / 2 + 110, zF1 = D / 2 - 70; // frame, back to front
  const yArm = 640;
  const tilt = -0.22;
  const parts: CustomPart[] = [
    { id: "FR", name: "Seat frame", size: [SW, 260, zF1 - zF0], pos: [0, yF + 130, (zF0 + zF1) / 2], material: "board" },
  ];
  const lx = SW / 2 - 40;
  const legs: [string, Vec3, Vec3][] = [-1, 1].flatMap((sx) => [
    [`LF${sx > 0 ? 1 : 0}`, [sx * lx, yF, zF1 - 60], [sx * (lx + 15), 0, zF1 - 10]] as [string, Vec3, Vec3],
    [`LB${sx > 0 ? 1 : 0}`, [sx * lx, yF, zF0 + 60], [sx * (lx + 15), 0, zF0 + 10]] as [string, Vec3, Vec3],
  ]);
  for (const [id, a, b] of legs) parts.push(leg(id, a, b, 28));
  parts.push(
    { id: "BF", name: "Back frame", size: [SW - 40, 560, 50], pos: [0, 700, -D / 2 + 150], rot: [tilt, 0, 0], material: "board" },
    { id: "FT", name: "Footrest cushion", size: [SW - 10, 270, 60], pos: [0, yF + 145, zF1 + 30], material: "soft" },
    { id: "SC", name: "Seat cushion", size: [SW - 10, 90, SH < 400 ? 500 : zF1 - zF0 - 110], pos: [0, SH - 35, (zF0 + 110 + zF1) / 2], material: "soft" },
    { id: "BC", name: "Back cushion", size: [SW + 10, H - 400, 210], pos: [0, (H + 400) / 2 - 20, -D / 2 + 150], rot: [tilt, 0, 0], material: "soft" },
  );
  for (const [i, sx] of [-1, 1].entries()) parts.push({ id: `A${i}`, name: "Armrest", size: [AW, yArm - 70, D - 200], pos: [sx * (SW / 2 + AW / 2 + 3), (yArm + 70) / 2, 40], material: "soft" });

  const legFix = (ids: string[]) =>
    ids.flatMap((id) => {
      const p = legs.find((l) => l[0] === id)![1];
      const sx = Math.sign(p[0]);
      return [
        fx("bolt", [[sx * (SW / 2 - 4), yF + 40, p[2]]], [sx, 0, 0], "FR", { len: 60, dia: 8, name: "Carriage bolt", mate: id }),
        fx("nut", [[sx * (SW / 2 + 22), yF + 40, p[2]]], [-sx, 0, 0], id, { dia: 8 }),
      ];
    });
  const steps: CustomStep[] = [
    {
      title: "Bolt on the front legs",
      detail: "Stand the frame on its back on a rug, front up. One bolt through each leg's bracket and the frame, nut done up with the box spanner.",
      add: ["FR", "LF0", "LF1"],
      fix: legFix(["LF0", "LF1"]),
      tools: ["wrench"],
      pose: "+z",
      warnings: ["floor"],
    },
    { title: "Bolt on the back legs", detail: "The same at the other end of the frame. The back legs are the ones that splay backwards.", add: ["LB0", "LB1"], fix: legFix(["LB0", "LB1"]), tools: ["wrench"] },
    {
      title: "Click the back frame onto its brackets",
      detail: "Stand the chair up. Lower the back frame onto the two brackets at the back until both sides click, then turn the levers to lock them.",
      add: ["BF"],
      pose: "+y",
      from: { BF: [0, 380, 0] },
    },
    { title: "Fill the cushion covers", detail: "Fold each cushion and push it into its cover, corners first, then zip the covers closed." },
    {
      title: "Fit the footrest cover",
      detail: "Pull the footrest out, lay its cover over it and fasten the two hook and loop strips underneath. Then fold it back in.",
      add: ["FT"],
      from: { FT: [0, 260, 200] },
    },
    { title: "Lay the seat cushion on the frame", detail: "Tuck its front flaps down behind the footrest and press both strips on.", add: ["SC"], from: { SC: [0, 250, 0] } },
    { title: "Slide on the left armrest", detail: "Its two slots go straight down over the two brackets on the side of the frame.", add: ["A0"], from: { A0: [-80, 350, 0] } },
    { title: "Slide on the right armrest", detail: "The same on the other side.", add: ["A1"], from: { A1: [80, 350, 0] } },
    { title: "Pull the back cushion over the back frame", detail: "From the top, all the way down between the armrests.", add: ["BC"], from: { BC: [0, 400, 0] } },
    { title: "Close the back cushion", detail: "Zip it closed at the bottom of the back, then press the flap over the zip." },
    { title: "Tuck in the seat cover", detail: "Push the loose edge at the front of the seat down into the gap above the footrest." },
    {
      title: "Lock the armrests with the wing screws",
      detail: "Tip the chair onto its back. One wing screw through each side of the frame into the armrest, turned by hand. Then stand it up.",
      fix: [-1, 1].map((sx, i) => fx("stud", [[sx * (SW / 2 - 10), yF + 150, -60]], [sx, 0, 0], "FR", { len: 40, dia: 6, name: "Wing screw", mate: `A${i}` })),
      pose: "+z",
    },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["EKOLSUND"],
  recipe(s) {
    if (!/recliner/i.test(`${s.slug ?? ""} ${s.variant}`)) return null;
    return recipe(s);
  },
};
export default family;
