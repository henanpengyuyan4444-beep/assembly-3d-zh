import type { Family } from "./family";
import type { CustomFix, CustomPart, CustomStep, PartPiece, ProductSpec, Vec3 } from "../../types";

/**
 * HAVSTEN, read from the armchair's and the 2-seat sofa's manuals. A steel frame of four long rails held between
 * two side frames (their fabric already on) by one Allen bolt at each rail end. The sofa has a middle frame too:
 * four rails get a threaded stud, go through the middle frame and the other half of each rail screws on by hand.
 * The mesh seat slides onto the seat front rail and the top back rail, a short rail threads through the loops
 * under it, and buckle straps from the bottom back rail pull it tight. Cushions come only with the beige/beige sofa.
 */

const PI = Math.PI;
const T = 22; // frame tube
const H = 760, D = 920;
const ZF = D / 2 - T / 2, ZB = -ZF; // front and back tube lines
const Y_FLOOR = T / 2, Y_SEAT = 340, Y_TOP = H - T / 2;
const Y_CREASE = 290, Z_CREASE = -320; // where the mesh seat meets its back, with the short rail under it

// the four rails across, from the floor up, in the order the manual fits them
const LINES: { id: string; y: number; z: number }[] = [
  { id: "BF", y: Y_FLOOR, z: ZF },
  { id: "BB", y: Y_FLOOR, z: ZB },
  { id: "SF", y: Y_SEAT, z: ZF },
  { id: "TB", y: Y_TOP, z: ZB },
];

const tubeZ = (len: number, y: number, z = 0): PartPiece => ({ shape: "cyl", size: [T, len, T], pos: [0, y, z], rot: [PI / 2, 0, 0], material: "metal" });
const post = (y0: number, y1: number, z: number, cy: number): PartPiece => ({ shape: "cyl", size: [T, y1 - y0, T], pos: [0, (y0 + y1) / 2 - cy, z], material: "metal" });

/** A side frame seen from the side: floor runner, front and back posts, seat and top rails, the fabric panel over the arm. */
function sideFrame(id: string, x: number, out: number): CustomPart {
  const cy = H / 2;
  return {
    id,
    name: "Side frame",
    size: [T, H, D],
    pos: [x, cy, 0],
    material: "metal",
    pieces: [
      tubeZ(D, Y_FLOOR - cy),
      tubeZ(D, Y_SEAT - cy),
      tubeZ(D, Y_TOP - cy),
      post(0, H, ZB, cy),
      post(0, Y_SEAT, ZF, cy),
      { shape: "cyl", size: [T, Y_TOP - Y_SEAT, T], pos: [0, (Y_SEAT + Y_TOP) / 2 - cy, ZF - 40], rot: [-0.1, 0, 0], material: "metal" },
      { shape: "box", size: [3, Y_TOP - Y_SEAT - T, D - 70], pos: [out * (T / 2 - 2), (Y_SEAT + Y_TOP) / 2 - cy, -15], material: "soft" },
    ],
  };
}

function middleFrame(): CustomPart {
  const cy = H / 2;
  return {
    id: "M",
    name: "Middle frame",
    size: [T, H, D],
    pos: [0, cy, 0],
    material: "metal",
    pieces: [tubeZ(D, Y_FLOOR - cy), tubeZ(D, Y_SEAT - cy), post(0, H, ZB, cy), post(0, Y_SEAT, ZF, cy)],
  };
}

/** One mesh seat: the seat itself from the front rail back to the crease, and its back up to the top rail. */
function sling(id: string, x: number, w: number): CustomPart {
  const seatLen = Math.hypot(ZF - Z_CREASE, Y_SEAT - Y_CREASE);
  const backLen = Math.hypot(Y_TOP - Y_CREASE, Z_CREASE - ZB);
  const cy = (Y_CREASE + H) / 2;
  return {
    id,
    name: "Mesh seat",
    size: [w, H - Y_CREASE, D - 20],
    pos: [x, cy, 0],
    material: "soft",
    pieces: [
      { shape: "box", size: [w, 5, seatLen], pos: [0, (Y_SEAT + Y_CREASE) / 2 + T / 2 - cy, (ZF + Z_CREASE) / 2], rot: [-Math.atan2(Y_SEAT - Y_CREASE, ZF - Z_CREASE), 0, 0] },
      { shape: "box", size: [w, backLen, 5], pos: [0, (Y_TOP + Y_CREASE) / 2 + 6 - cy, (ZB + Z_CREASE) / 2 + T / 2], rot: [Math.atan2(ZB - Z_CREASE, Y_TOP - Y_CREASE), 0, 0] },
    ],
  };
}

/** A buckle strap from the bottom back rail up to the short rail under the seat. */
function strap(id: string, x: number): CustomPart {
  const yb = Y_FLOOR, zb = ZB, yt = Y_CREASE - 12, zt = Z_CREASE;
  return {
    id,
    name: "Strap",
    size: [30, Math.hypot(yt - yb, zt - zb), 3],
    pos: [x, (yt + yb) / 2, (zt + zb) / 2],
    rot: [Math.atan2(zb - zt, yt - yb), 0, 0],
    material: "soft",
  };
}

function recipe(s: ProductSpec) {
  const chair = /armchair/i.test(`${s.variant} ${s.slug ?? ""}`);
  const cushions = !chair && /^havsten-2-seat-sofa-outdoor$/.test(s.slug ?? "");
  const W = chair ? 980 : 1790;
  const xs = W / 2 - T / 2;
  const inner = xs - T / 2; // where the rails end at a side frame
  const parts: CustomPart[] = [sideFrame("L", -xs, -1), sideFrame("R", xs, 1)];

  // rails: one per line on the armchair, a left and a right half on the sofa, meeting at the middle frame
  const halves = chair ? [{ k: "", x0: -inner, x1: inner }] : [{ k: "l", x0: -inner, x1: -T / 2 }, { k: "r", x0: T / 2, x1: inner }];
  for (const ln of LINES)
    for (const h of halves) parts.push({ id: `${ln.id}${h.k}`, name: "Rail", size: [h.x1 - h.x0, T, T], pos: [(h.x0 + h.x1) / 2, ln.y, ln.z], shape: "cyl", material: "metal" });
  if (!chair) parts.push(middleFrame());

  // seats: one on the armchair, two on the sofa, each with its short rail, two straps and (beige/beige) its cushions
  const seats = chair ? [{ x: 0, w: 2 * inner - 20 }] : [-1, 1].map((sx) => ({ x: (sx * (inner + T / 2)) / 2, w: inner - T / 2 - 20 }));
  seats.forEach((st, i) => {
    parts.push(sling(`S${i}`, st.x, st.w));
    parts.push({ id: `K${i}`, name: "Short rail", size: [st.w - 40, 16, 16], pos: [st.x, Y_CREASE - 10, Z_CREASE], shape: "cyl", material: "metal" });
    for (const [j, dx] of [-1, 1].entries()) parts.push(strap(`B${i}${j}`, st.x + (dx * st.w) / 4));
    if (cushions) {
      parts.push({ id: `C${i}`, name: "Seat cushion", size: [st.w, 140, 640], pos: [st.x, Y_SEAT + 50, 90], material: "soft", rot: [-0.06, 0, 0] });
      parts.push({ id: `P${i}`, name: "Back cushion", size: [st.w, 440, 170], pos: [st.x, 560, -300], material: "soft", rot: [-0.27, 0, 0] });
    }
  });

  const bolts = (side: "L" | "R", lines: typeof LINES): CustomFix => {
    const sx = side === "L" ? -1 : 1;
    const k = chair ? "" : side === "L" ? "l" : "r";
    return { kind: "bolt", count: lines.length, len: 20, dia: 8, at: lines.map((ln) => [sx * (W / 2), ln.y, ln.z] as Vec3), dir: [-sx, 0, 0], on: side, mate: `${lines[0].id}${k}` };
  };
  // a threaded stud screwed into the middle end of a left-hand rail; the right half screws onto it through the middle frame
  const stud = (ln: (typeof LINES)[number]): CustomFix => ({ kind: "stud", name: "Threaded stud", count: 1, len: 30, dia: 8, at: [[-T / 2, ln.y, ln.z]], dir: [-1, 0, 0], on: `${ln.id}l` });
  const ids = (pre: string) => parts.filter((p) => p.id.startsWith(pre)).map((p) => p.id);
  const slings = ids("S"), shorts = ids("K"), straps = ids("B");
  const lower = LINES.slice(0, 2), upper = LINES.slice(2);
  const seatSteps: CustomStep[] = [
    {
      title: chair ? "Hook the two straps onto the bottom back rail" : "Hook the four straps onto the bottom back rail",
      detail: "Thread each strap round the rail and back through its buckle, the buckle's smooth side facing out.",
      add: straps,
    },
    {
      title: chair ? "Slide the mesh seat onto the rails" : "Slide the mesh seats onto the rails",
      detail: "The square loops go underneath, near the fold. Push the sleeves along the seat front rail and the top back rail.",
      add: slings,
      from: Object.fromEntries(slings.map((id, i) => [id, [(i ? 1 : -1) * (chair ? 0 : 500), chair ? 400 : 0, chair ? 300 : 0] as Vec3])),
    },
    {
      title: chair ? "Thread the short rail through the loops" : "Thread a short rail through the loops under each seat",
      detail: "Through both loops under the fold, until it sits centred.",
      add: shorts,
      from: Object.fromEntries(shorts.map((id, i) => [id, [(i ? 1 : -1) * 500, 0, 0] as Vec3])),
    },
  ];
  const finish: CustomStep[] = [
    {
      title: "Pull the straps tight",
      detail: "Buckle each strap round the short rail and pull until the seat feels firm. Tighten them again after a while in use.",
      fix: [],
    },
    ...(cushions
      ? [{ title: "Put the cushions in", detail: "Seat cushions first, then the back cushions against the mesh.", add: [...ids("C"), ...ids("P")] }]
      : []),
  ];

  const steps: CustomStep[] = chair
    ? [
        {
          title: "Bolt the two bottom rails to a side frame",
          detail: "Stand the side frame on a rug, fabric outwards. One bolt into each rail end, snug but not tight yet.",
          add: ["L", "BF", "BB"],
          fix: [bolts("L", lower)],
          warnings: ["floor"],
        },
        { title: "Bolt on the seat rail and the top back rail", detail: "Again one bolt each, not fully tight.", add: ["SF", "TB"], fix: [bolts("L", upper)] },
        ...seatSteps,
        {
          title: "Bolt on the other side frame",
          detail: "Fabric outwards, the narrow end at the bottom. Four bolts, then tighten all eight.",
          add: ["R"],
          fix: [bolts("R", LINES)],
          from: { R: [400, 0, 0] },
        },
        ...finish,
      ]
    : [
        {
          title: "Screw a threaded stud into four rails",
          detail: "By hand, into one end of each, until only the thread sticks out.",
          add: LINES.map((ln) => `${ln.id}l`),
          fix: LINES.map(stud),
          warnings: ["floor"],
        },
        {
          title: "Push two of them through the middle frame",
          detail: "The bottom front and bottom back holes, studs first.",
          add: ["M"],
          from: { M: [0, 0, 400] },
        },
        {
          title: "Screw the other halves onto the studs",
          detail: "Turn each rail by hand until it sits tight against the middle frame.",
          add: ["BFr", "BBr"],
          from: { BFr: [450, 0, 0], BBr: [450, 0, 0] },
        },
        {
          title: "Do the same with the seat rail and the top rail",
          detail: "Studs through the seat front hole and the top of the back post, then screw the other halves on.",
          add: ["SFr", "TBr"],
          from: { SFr: [450, 0, 0], TBr: [450, 0, 0] },
        },
        ...seatSteps,
        {
          title: "Bolt on the side frames",
          detail: "Fabric outwards, the narrow end at the bottom. Four bolts into the rail ends on each side, then tighten them all.",
          add: ["L", "R"],
          fix: [bolts("L", LINES), bolts("R", LINES)],
          from: { L: [-400, 0, 0], R: [400, 0, 0] },
        },
        ...finish,
      ];
  return { parts, steps };
}

const family: Family = {
  names: ["HAVSTEN"],
  recipe(s) {
    if (s.archetype !== "sofa") return null;
    return recipe(s);
  },
};
export default family;
