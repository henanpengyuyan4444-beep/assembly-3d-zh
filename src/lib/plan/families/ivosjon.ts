import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * IVÖSJÖN, read from the cabinet's and the wash-basin base's manuals. Everything is plastic and clicks together, no
 * screws: a bottom frame on four feet (or short legs), four corner posts clicked into it, the side panels dropped in
 * and pressed onto the posts, the next frame clicked on top, and so on up, with four caps on the top posts.
 * Cabinet: three levels, each with two sides and a back panel; each level's door hangs in the frame above it and
 * lifts up and slides in. It is clipped to two wall brackets at the top. Wash-basin base: two levels with a cut-out
 * at the back of each frame for the pipes, round panels on the sides below and plain ones above, no back, two
 * sliding doors that lift into the top track and drop into the bottom one; it stands on the floor, no wall fixing.
 */

const at = (kind: CustomFix["kind"], pts: Vec3[], dir: Vec3, on?: string, mate?: string, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: pts.length, at: pts, dir, on, mate, ...o });
const FT = 25; // frame
const PT = 30; // corner post
const ST = 8; // panel

/** A frame with a raised rim, and a notch at the back for the pipes when `notch` is set. */
function frame(W: number, D: number, notch?: [number, number]): PartPiece[] {
  if (!notch) return [{ shape: "box", size: [W, FT, D], pos: [0, 0, 0] }];
  const [nw, nd] = notch;
  const side = (W - nw) / 2;
  return [
    { shape: "box", size: [W, FT, D - nd], pos: [0, 0, nd / 2] },
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [side, FT, nd], pos: [sx * (W / 2 - side / 2), 0, -D / 2 + nd / 2] })),
  ];
}

/** A flat panel, with the big round boss of IVÖSJÖN's sides when `round`. */
function panel(w: number, h: number, face: "x" | "z", round: boolean): PartPiece[] {
  const box: PartPiece = face === "x" ? { shape: "box", size: [ST, h, w], pos: [0, 0, 0] } : { shape: "box", size: [w, h, ST], pos: [0, 0, 0] };
  if (!round) return [box];
  const dia = Math.min(w, h) * 0.78;
  const rot: [number, number, number] = face === "x" ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
  return [box, { shape: "cyl", size: [dia, ST + 4, dia], pos: [0, 0, 0], rot }];
}

interface Level {
  y0: number;
  h: number;
}

/** Corner posts, as parts, for one level. */
function posts(parts: CustomPart[], W: number, D: number, lv: Level, k: number, name = "Corner post"): string[] {
  const xp = W / 2 - PT / 2, zp = D / 2 - PT / 2;
  return [-1, 1].flatMap((sz) =>
    [-1, 1].map((sx) => {
      const id = `P${k}_${sx < 0 ? "L" : "R"}${sz < 0 ? "B" : "F"}`;
      parts.push({ id, name, size: [PT, lv.h, PT], pos: [sx * xp, lv.y0 + lv.h / 2, sz * zp], material: "board" });
      return id;
    }),
  );
}

function cabinet(s: ProductSpec): CustomParams {
  // IKEA's measures: 33 wide, 34 deep, 99 high
  const W = 330, D = 340, H = 990, foot = 40;
  const Lh = (H - foot - 4 * FT) / 3;
  const parts: CustomPart[] = [];
  const steps: CustomStep[] = [];
  const frameAt = (id: string, name: string, y0: number) => parts.push({ id, name, size: [W, FT, D], pos: [0, y0 + FT / 2, 0], pieces: frame(W, D), material: "board" });
  frameAt("A", "Bottom frame", foot);
  const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz): [number, number] => [sx * (W / 2 - PT / 2), sz * (D / 2 - PT / 2)]));
  steps.push({
    title: "Push the feet into the bottom frame",
    detail: "One into each corner from underneath, until it clicks.",
    add: ["A"],
    fix: [at("foot", corners.map(([x, z]): Vec3 => [x, 0, z]), [0, 1, 0], "A", undefined, { len: foot, dia: 28, name: "Foot" })],
  });
  const frameNames = ["B1", "B2", "C"];
  for (let k = 0; k < 3; k++) {
    const y0 = foot + FT + k * (Lh + FT);
    const lv = { y0, h: Lh };
    const ids = posts(parts, W, D, lv, k);
    const cy = y0 + Lh / 2;
    const sideW = D - 2 * PT, backW = W - 2 * PT;
    parts.push({ id: `SL${k}`, name: "Side panel", size: [ST, Lh, sideW], pos: [-W / 2 + ST / 2, cy, 0], pieces: panel(sideW, Lh, "x", true), material: "board" });
    parts.push({ id: `SR${k}`, name: "Side panel", size: [ST, Lh, sideW], pos: [W / 2 - ST / 2, cy, 0], pieces: panel(sideW, Lh, "x", true), material: "board" });
    parts.push({ id: `SB${k}`, name: "Side panel", size: [backW, Lh, ST], pos: [0, cy, -D / 2 + ST / 2], pieces: panel(backW, Lh, "z", true), material: "board" });
    const doorW = W - 2 * PT + 10, doorH = Lh - 6;
    parts.push({
      id: `DR${k}`,
      name: "Door",
      size: [doorW, doorH, ST + 10],
      pos: [0, cy, D / 2 - ST / 2 - 5],
      pieces: [...panel(doorW, doorH, "z", true), { shape: "box", size: [80, 10, 18], pos: [0, -doorH / 2 + 30, 5] }],
      material: "board",
    });
    const fid = frameNames[k];
    frameAt(fid, k < 2 ? "Middle frame" : "Top frame", y0 + Lh);
    const level = k === 0 ? "" : k === 1 ? " for the second level" : " for the top level";
    steps.push({ title: `Click four corner posts into the frame${level}`, detail: "Each one straight down into its corner until it clicks.", add: ids });
    steps.push({
      title: "Click in the two sides and the back",
      detail: "Drop each panel into the grooves, then press along its edges until it clicks onto the posts.",
      add: [`SL${k}`, `SB${k}`, `SR${k}`],
    });
    steps.push({
      title: k < 2 ? "Hang a door in a middle frame" : "Hang the last door in the top frame",
      detail: "Clip the door's two pins into the frame's underside, then push it in along the track until it clicks.",
      add: [`DR${k}`],
      from: { [`DR${k}`]: [0, 0, 300] },
    });
    steps.push({
      title: k < 2 ? "Click the frame on top" : "Click the top frame on",
      detail: "With its door hanging at the front, press it down on all four posts until each one clicks.",
      add: [fid],
    });
  }
  const topY = H;
  steps.push({
    title: "Press the caps onto the top posts",
    detail: "Four caps, one in each corner of the top frame, until they click.",
    fix: [at("cap", corners.map(([x, z]): Vec3 => [x, topY, z]), [0, -1, 0], "C", undefined, { len: 6, dia: 26 })],
  });
  steps.push({ title: "Try each door", detail: "Lift it up at the handle and slide it into the cabinet, then pull it out and let it drop." });
  const bx = [-87.5, 87.5]; // 175 mm apart
  const backZ = -D / 2;
  steps.push({
    title: "Clip the wall brackets onto the back",
    detail: "Two brackets on the back edge of the top frame. Stand the cabinet against the wall and mark through them.",
    fix: [at("bracket", bx.map((x): Vec3 => [x, topY - 10, backZ]), [0, 0, 1], "C", undefined, { len: 40, dia: 30, name: "Wall bracket" })],
    tools: ["pencil"],
    wall: true,
    warnings: ["wall", "tip"],
  });
  steps.push({
    title: "Screw the brackets to the wall",
    detail: "Unclip them, then one screw in each on your marks, 175 mm apart. Screws and plugs aren't included: pick ones made for your wall.",
    fix: [
      at("plug", bx.map((x): Vec3 => [x, topY - 10, backZ - 40]), [0, 0, -1]),
      at("screw", bx.map((x): Vec3 => [x, topY - 10, backZ - 2]), [0, 0, -1], undefined, undefined, { len: 50, dia: 5 }),
    ],
    tools: ["drill", "screwdriver"],
    wall: true,
    warnings: ["wall"],
  });
  steps.push({ title: "Push the cabinet back onto the brackets", detail: "Lower the top frame's back edge into both brackets until it clicks in.", wall: true, warnings: ["tip"] });
  return { parts, steps };
}

function washstand(s: ProductSpec): CustomParams {
  // IKEA's measures: 50 wide, 33 deep, 57 high
  const W = 500, D = 330, H = 570, leg = 70;
  const lowH = 270, upH = H - leg - 3 * FT - lowH;
  const notch: [number, number] = [170, 90];
  const parts: CustomPart[] = [];
  const frameAt = (id: string, name: string, y0: number) => parts.push({ id, name, size: [W, FT, D], pos: [0, y0 + FT / 2, 0], pieces: frame(W, D, notch), material: "board" });
  const legIds = posts(parts, W, D, { y0: 0, h: leg }, 0, "Leg");
  frameAt("A", "Bottom frame", leg);
  const low = { y0: leg + FT, h: lowH };
  const lowIds = posts(parts, W, D, low, 1, "Long post");
  const sideW = D - 2 * PT;
  for (const sx of [-1, 1])
    parts.push({ id: `RS${sx}`, name: "Round side panel", size: [ST, lowH, sideW], pos: [sx * (W / 2 - ST / 2), low.y0 + lowH / 2, 0], pieces: panel(sideW, lowH, "x", true), material: "board" });
  frameAt("B", "Middle frame", low.y0 + lowH);
  const up = { y0: low.y0 + lowH + FT, h: upH };
  const upIds = posts(parts, W, D, up, 2, "Short post");
  for (const sx of [-1, 1])
    parts.push({ id: `PS${sx}`, name: "Side panel", size: [ST, upH, sideW], pos: [sx * (W / 2 - ST / 2), up.y0 + upH / 2, 0], pieces: panel(sideW, upH, "x", false), material: "board" });
  frameAt("C", "Top frame", up.y0 + upH);
  const doorW = (W - 2 * PT) / 2 + 15, doorH = lowH - 6;
  [-1, 1].forEach((sx, i) =>
    parts.push({
      id: `D${i}`,
      name: "Sliding door",
      size: [doorW, doorH, ST],
      pos: [sx * (doorW / 2 - 15), low.y0 + lowH / 2, D / 2 - ST / 2 - (i === 0 ? 4 : 14)],
      pieces: [{ shape: "box", size: [doorW, doorH, ST], pos: [0, 0, 0] }, { shape: "box", size: [12, doorH * 0.7, 4], pos: [sx * (doorW / 2 - 25), 0, ST / 2 + 2] }],
      material: "board",
    }),
  );
  const corners = [-1, 1].flatMap((sx) => [-1, 1].map((sz): Vec3 => [sx * (W / 2 - PT / 2), H, sz * (D / 2 - PT / 2)]));
  const steps: CustomStep[] = [
    { title: "Click the legs into the bottom frame", detail: "Stand the four short legs on a rug and press the frame down onto them until each one clicks.", add: [...legIds, "A"], warnings: ["floor"] },
    { title: "Click the long posts into the corners", detail: "Four of them, straight down until they click.", add: lowIds },
    { title: "Drop in the round side panels", detail: "One on each side, round boss facing out, down into the grooves of the frame.", add: ["RS-1", "RS1"] },
    { title: "Press the side panels onto the posts", detail: "Press along both edges of each panel until all four clips click." },
    { title: "Click the middle frame on", detail: "Cut-out at the back, then press it down on all four posts.", add: ["B"] },
    { title: "Click the short posts into the corners", detail: "Four more, straight down into the middle frame.", add: upIds },
    { title: "Drop in the plain side panels", detail: "One on each side of the open shelf, down into the grooves.", add: ["PS-1", "PS1"] },
    { title: "Press them onto the posts", detail: "Along both edges, until every clip clicks." },
    { title: "Click the top frame on", detail: "Cut-out at the back, over the pipes' space. Press down on every corner.", add: ["C"] },
    { title: "Press the caps onto the top posts", detail: "Four caps, one in each corner.", fix: [at("cap", corners, [0, -1, 0], "C", undefined, { len: 6, dia: 26 })] },
    {
      title: "Lift in the back sliding door",
      detail: "Push its top up into the inner track under the middle frame, then let it drop into the bottom track.",
      add: ["D1"],
      from: { D1: [0, 0, 300] },
    },
    { title: "Lift in the front sliding door", detail: "The same way in the outer track. Check that both slide freely.", add: ["D0"], from: { D0: [0, 0, 300] } },
  ];
  return { parts, steps };
}

const family: Family = {
  names: ["IVÖSJÖN", "IVOSJON", "IVÖSJON"],
  recipe(s) {
    const t = s.slug ?? "";
    if (/^ivosjon-cabinet-doors/.test(t)) return cabinet(s);
    if (/^ivosjon-wash-basin-base/.test(t)) return washstand(s);
    return null;
  },
};
export default family;
