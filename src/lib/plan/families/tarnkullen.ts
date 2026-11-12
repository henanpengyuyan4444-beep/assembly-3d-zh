import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, HwKind, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * TÄRNKULLEN upholstered bed frame, read from its frame manuals (the single bed's, and the one for the wider beds)
 * and the cover manual. The lined frame goes together standing: dowels in the side rails' ends, each corner joined
 * by a long bolt into a barrel nut and a short connector bolt, the four legs (felt glides pressed in) bolted to
 * corner plates with nuts, then the upper headboard gets hanger bolts and dowels, is lowered onto the head end by
 * two people and tightened from behind. The wider beds also have a centre beam that drops into two brackets, two
 * wire support legs and grip strips on the beam; every size gets end caps and grip strips on the rails. The LURÖY
 * slatted base is rolled out on top, then the cover is pulled over the headboard and its skirt wrapped round.
 */

const LEG = 190; // IKEA: free height under the bed
const TOP = 410; // IKEA: footboard height
const HT = 90; // headboard thickness
const FT = 60;
const ST = 60;

const fx = (kind: HwKind, at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

interface Size {
  W: number;
  L: number;
  H: number;
  beam: boolean;
}

// IKEA's own measurements: the guide sizes in our data are a few cm off
function sizeOf(s: ProductSpec): Size | null {
  const slug = s.slug ?? "";
  if (!/^tarnkullen-upholstered-bed-frame-/.test(slug)) return null;
  if (/twin/.test(slug)) return { W: 1210, L: 2000, H: 1140, beam: false };
  if (/standard-double/.test(slug)) return { W: 1540, L: 1990, H: 1120, beam: true };
  if (/queen/.test(slug)) return { W: 1760, L: 2120, H: 1140, beam: true };
  return null;
}

function recipe(z: Size): CustomParams {
  const { W, L, H, beam } = z;
  const rh = TOP - LEG;
  const zh = -L / 2 + HT; // inner face of the head end
  const zf = L / 2 - FT; // inner face of the foot end
  const rl = zf - zh;
  const rz = (zh + zf) / 2;
  const yl = TOP - 60; // top of the slat ledges
  const hSplit = 760;
  const parts: CustomPart[] = [
    { id: "HL", name: "Head end", size: [W, hSplit - LEG, HT], pos: [0, (LEG + hSplit) / 2, -L / 2 + HT / 2], material: "board" },
    { id: "FB", name: "Foot end", size: [W, rh, FT], pos: [0, LEG + rh / 2, L / 2 - FT / 2], material: "board" },
  ];
  for (const [i, sx] of [-1, 1].entries()) {
    const pieces: PartPiece[] = [
      { shape: "box", size: [ST, rh, rl], pos: [sx * 15, 0, 0] },
      { shape: "box", size: [30, 30, rl], pos: [-sx * (ST / 2), yl - 15 - (LEG + rh / 2), 0], material: "wood" },
    ];
    parts.push({ id: `SR${i}`, name: "Side rail", size: [ST + 30, rh, rl], pos: [sx * (W / 2 - ST / 2 - 15), LEG + rh / 2, rz], material: "board", pieces });
  }
  const lx = W / 2 - ST - 40;
  const legZ = [zh + 40, zf - 40];
  const legs: string[] = [];
  for (const [i, sx] of [-1, 1].entries())
    legZ.forEach((lz, j) => {
      const id = `LG${i}${j}`;
      legs.push(id);
      parts.push({ id, name: "Leg", size: [50, LEG, 50], pos: [sx * lx, LEG / 2, lz], shape: "cyl", material: "wood" });
    });
  parts.push({ id: "HU", name: "Headboard", size: [W, H - hSplit, HT], pos: [0, (hSplit + H) / 2, -L / 2 + HT / 2], material: "board" });
  if (beam) {
    parts.push({ id: "CB", name: "Centre beam", size: [60, 50, rl], pos: [0, yl - 25, rz], material: "metal" });
    for (const [i, t] of [-1, 1].entries()) parts.push({ id: `SP${i}`, name: "Support leg", size: [14, yl - 50, 14], pos: [0, (yl - 50) / 2, rz + t * rl * 0.2], shape: "cyl", material: "metal" });
  }
  const sw = W - 2 * ST;
  const n = Math.round(rl / 75);
  const slats: PartPiece[] = Array.from({ length: n }, (_, k) => ({ shape: "box", size: [sw, 16, 55], pos: [0, 0, -rl / 2 + 28 + ((rl - 56) * k) / (n - 1)] }));
  parts.push({ id: "LB", name: "Slatted bed base", size: [sw, 16, rl], pos: [0, yl + 8, rz], material: "wood", pieces: slats });
  // the cover: a sleeve over the headboard and a skirt down to the floor round the sides and foot
  const cover: PartPiece[] = [
    { shape: "box", size: [W + 12, H - LEG + 6, HT + 12], pos: [0, LEG / 2, -L / 2 + HT / 2], material: "soft" },
    ...[-1, 1].map((sx): PartPiece => ({ shape: "box", size: [6, TOP - 15, L - HT], pos: [sx * (W / 2 + 3), (TOP + 15) / 2 - H / 2, HT / 2], material: "soft" })),
    { shape: "box", size: [W + 12, TOP - 15, 6], pos: [0, (TOP + 15) / 2 - H / 2, L / 2 + 3], material: "soft" },
  ];
  parts.push({ id: "CV", name: "Cover", size: [W + 12, H, L + 6], pos: [0, H / 2, 0], material: "soft", pieces: cover });

  /* ---------- fittings ---------- */
  const corner = (sx: number, end: "head" | "foot"): Vec3 => [sx * (W / 2 - ST / 2), LEG + rh / 2, end === "head" ? zh : zf];
  const ends = (end: "head" | "foot") => [-1, 1].map((sx) => corner(sx, end));
  const barrels = (end: "head" | "foot") => ends(end).map((p): Vec3 => [p[0] - Math.sign(p[0]) * 40, p[1] + 40, p[2] + (end === "head" ? 60 : -60)]);
  const bolts = (end: "head" | "foot") => ends(end).map((p): Vec3 => [p[0], p[1] + 40, end === "head" ? -L / 2 : L / 2]);
  const shortBolts = (end: "head" | "foot") => ends(end).map((p): Vec3 => [p[0], p[1] - 50, end === "head" ? -L / 2 : L / 2]);
  const into = (end: "head" | "foot"): Vec3 => [0, 0, end === "head" ? 1 : -1];
  const hangers = beam ? [-0.36, -0.12, 0.12, 0.36] : [-0.3, 0.3];
  const hDowels = beam ? [-0.42, -0.24, 0.24, 0.42] : [-0.4, 0, 0.4];
  const plateAt = (id: string): Vec3 => {
    const p = parts.find((q) => q.id === id)!.pos;
    return [p[0], LEG, p[2]];
  };
  const strips = [-1, 1].flatMap((sx) => [-0.33, 0, 0.33].map((t): Vec3 => [sx * (W / 2 - ST - 15), yl, rz + t * rl]));
  const capPts = [-1, 1].flatMap((sx) => [zh + 10, zf - 10].map((cz): Vec3 => [sx * (W / 2 - ST - 15), yl, cz]));

  const steps: CustomStep[] = [];
  if (beam)
    steps.push(
      {
        title: "Screw the centre beam brackets on",
        detail: "Lay the head end and the foot end on a rug. A bracket in the middle of each one's inside face, two screws each.",
        add: ["HL", "FB"],
        fix: [
          fx("bracket", [[0, yl - 25, zh], [0, yl - 25, zf]], [0, 0, -1], { name: "Beam bracket", to: ["HL", "FB"] }),
          fx("screw", [-25, 25].map((dx): Vec3 => [dx, yl - 60, zh]), [0, 0, -1], { len: 16, dia: 4, on: "HL" }),
          fx("screw", [-25, 25].map((dx): Vec3 => [dx, yl - 60, zf]), [0, 0, 1], { len: 16, dia: 4, on: "FB" }),
        ],
        tools: ["screwdriver"],
        warnings: ["floor"],
      },
      {
        title: "Lock the brackets with the inserts and pins",
        detail: "Press a threaded insert into each hole in the bracket, push a pin in and screw it down.",
        fix: [fx("nut", [-25, 25].flatMap((dx) => [zh, zf].map((cz): Vec3 => [dx, yl - 25, cz + (cz < 0 ? 4 : -4)])), [0, -1, 0], { name: "Threaded insert", len: 10, dia: 10 }), fx("clip", [-25, 25].flatMap((dx) => [zh, zf].map((cz): Vec3 => [dx, yl - 23, cz + (cz < 0 ? 4 : -4)])), [0, -1, 0], { name: "Lock pin" })],
        tools: ["screwdriver"],
      },
    );
  steps.push(
    {
      title: "Tap the dowels into the side rails",
      detail: "Two in each end of both rails.",
      fix: [0, 1].map((i) => {
        const sx = i ? 1 : -1;
        return fx("dowel", [zh, zf].flatMap((cz) => [-50, 50].map((dy): Vec3 => [sx * (W / 2 - ST / 2), LEG + rh / 2 + dy, cz])), [0, 0, 1], { on: `SR${i}`, len: 30, dia: 8 });
      }),
      tools: ["hammer"],
    },
    {
      title: "Bolt the side rails to the foot end",
      detail: "Drop a barrel nut into each rail, slot turned to the bolt, and turn the long bolt in through the foot end with the crank.",
      add: ["FB", "SR0", "SR1"],
      fix: [fx("nut", barrels("foot"), [0, -1, 0], { name: "Barrel nut", len: 14, dia: 10 }), fx("bolt", bolts("foot"), into("foot"), { len: 120, dia: 8 })],
      tools: ["allen"],
      people: 2,
      warnings: ["two"],
    },
    { title: "Add the short bolts at the foot", detail: "One more in each corner, with the crank.", fix: [fx("bolt", shortBolts("foot"), into("foot"), { len: 60, dia: 7, name: "Connector bolt" })], tools: ["allen"] },
    {
      title: "Bolt the head end on",
      detail: "Barrel nuts in the rails again, then the long bolts through the head end.",
      add: ["HL"],
      fix: [fx("nut", barrels("head"), [0, -1, 0], { name: "Barrel nut", len: 14, dia: 10 }), fx("bolt", bolts("head"), into("head"), { len: 140, dia: 8 })],
      tools: ["allen"],
      people: 2,
      warnings: ["two"],
    },
    { title: "Add the short bolts at the head", detail: "One more in each corner.", fix: [fx("bolt", shortBolts("head"), into("head"), { len: 70, dia: 7, name: "Connector bolt" })], tools: ["allen"] },
    { title: "Press a glide into each leg", detail: "Into the bottom end, until it sits flat.", add: legs, fix: legs.map((id) => fx("glide", [[plateAt(id)[0], 0, plateAt(id)[2]]], [0, 1, 0], { on: id })) },
    {
      title: "Fit the corner plates and bolt the legs on",
      detail: "A plate in each inside corner, the leg's stud through it, and a nut tightened with the spanner.",
      fix: [fx("plate", legs.map(plateAt), [0, 1, 0], { name: "Corner plate" }), fx("nut", legs.map((id): Vec3 => [plateAt(id)[0], LEG + 12, plateAt(id)[2]]), [0, -1, 0], { len: 8, dia: 10 })],
      tools: ["wrench"],
    },
    { title: "Peel off the protective strips", detail: "Four, along the top of the head end where the headboard sits." },
    {
      title: "Screw the hanger bolts into the headboard",
      detail: "Into its bottom edge, with the spanner, only as far as the mark.",
      fix: [fx("legScrew", hangers.map((t): Vec3 => [t * W, hSplit, -L / 2 + HT / 2]), [0, 1, 0], { on: "HU", name: "Hanger bolt", len: 80, dia: 8 })],
      tools: ["wrench"],
    },
    { title: "Tap the dowels into it", detail: "Into the holes between the hanger bolts.", fix: [fx("dowel", hDowels.map((t): Vec3 => [t * W, hSplit, -L / 2 + HT / 2]), [0, 1, 0], { on: "HU", len: 40, dia: 8 })], tools: ["hammer"] },
    { title: "Lower the headboard onto the head end", detail: "Together, the bolts and dowels into their holes.", add: ["HU"], people: 2, warnings: ["two"] },
    {
      title: "Tighten it from behind",
      detail: "A clamp washer and a nut on each hanger bolt, tightened with the spanner.",
      fix: [fx("washer", hangers.map((t): Vec3 => [t * W, hSplit - 40, -L / 2]), [0, 0, 1], { name: "Clamp washer" }), fx("nut", hangers.map((t): Vec3 => [t * W, hSplit - 40, -L / 2 - 3]), [0, 0, 1], { len: 8, dia: 10 })],
      tools: ["wrench"],
    },
  );
  if (beam)
    steps.push(
      { title: "Drop the centre beam into its brackets", detail: "Press each end down until it sits in the bracket.", add: ["CB"] },
      { title: "Clip the caps onto the beam", detail: "One at each end, over the bracket.", fix: [fx("clip", [[0, yl, zh + 10], [0, yl, zf - 10]], [0, -1, 0], { name: "Beam cap" })] },
    );
  steps.push(
    { title: "Clip the caps onto the rail ends", detail: "Four, one at each end of the slat ledges.", fix: [fx("clip", capPts, [0, -1, 0], { name: "End cap" })] },
    { title: "Stick the grip strips on the ledges", detail: "Six, three along each side. Peel off the backing and press them down: cut them to length, never stretch them.", fix: [fx("glide", strips, [0, -1, 0], { name: "Grip strip" })], tools: ["knife"] },
  );
  if (beam)
    steps.push(
      { title: "Stick three grip strips on the beam", fix: [fx("glide", [-0.33, 0, 0.33].map((t): Vec3 => [0, yl, rz + t * rl]), [0, -1, 0], { name: "Grip strip" })] },
      { title: "Hook the two support legs under the beam", detail: "Hook each one into its slot and swing it down until it stands on the floor.", add: ["SP0", "SP1"] },
    );
  steps.push(
    { title: "Roll out the slatted base", detail: "From the head end, the slats resting on the grip strips.", add: ["LB"] },
    { title: "Pull the cover over the headboard", detail: "Together, from the top, smoothing it down over both sides.", add: ["CV"], people: 2, warnings: ["two"] },
    { title: "Wrap the skirt round the frame", detail: "Tuck the edges in under the rails, fasten the two tabs at the head end and hook the four corners down.", fix: [fx("clip", [-1, 1].map((sx): Vec3 => [sx * (W / 2), 300, zh + 20]), [0, 0, 1], { name: "Tab" }), fx("hook", [-1, 1].flatMap((sx) => [zh + 30, zf - 30].map((cz): Vec3 => [sx * (W / 2 - ST), TOP, cz])), [0, -1, 0], { name: "Cover hook" })] },
  );
  return { parts, steps };
}

const family: Family = {
  names: ["TÄRNKULLEN"],
  recipe(s) {
    const z = sizeOf(s);
    return z ? recipe(z) : null;
  },
};
export default family;
