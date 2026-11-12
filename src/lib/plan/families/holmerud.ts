import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, HwKind, Vec3 } from "../../types";

/**
 * HOLMERUD, read from IKEA's manuals for the coffee table (19 steps) and the side table (26 steps).
 *
 * Both are panel tables: a full-height left side, a long shelf that runs out past the box as a low step on a short
 * leg, a rail under the shelf, an upright in the middle and a top. The shelf lies upside down on a rug, the short
 * leg (feet, a cam bolt and dowels) is locked on its far end and the rail slides in on dowels, a cam lock and a
 * connector screw. Lying on its back, the left side (feet, cam bolts, dowels) goes on, then the middle upright, held by
 * dowels and two connector screws through the shelf. The side table adds an upper shelf before the upright and a
 * narrow post beside it once it stands. Upright, the top drops onto the dowels and is held by cam locks.
 */

const pt = (x: number, y: number, z: number): Vec3 => [x, y, z];
const fx = (kind: HwKind, at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });
const T = 18;
const FOOT = { name: "Plastic foot", len: 8, dia: 20 };
const SCREW = { name: "Connector screw", len: 50, dia: 7 };

interface Dims {
  W: number;
  H: number;
  D: number;
  yS: number; // underside of the long shelf
  yR: number; // underside of the rail
  topLen: number; // the top, from the left end
  xM: number; // left face of the middle upright
  yU?: number; // underside of the upper shelf (side table)
  postW?: number; // the post beside the upright (side table)
}

function recipe(d: Dims): CustomParams {
  const { W, H, D, yS, yR, topLen, xM } = d;
  const side = d.yU !== undefined;
  const xL = -W / 2 + T; // inner face of the left side
  const xR = W / 2 - T; // inner face of the short leg
  const yT = H - T; // underside of the top
  const ySt = yS + T; // top of the shelf
  const xMc = xM + T / 2;
  const zd = D / 2 - 70; // dowels and cams this far either side of the middle
  const zc = D / 2 - 40;
  const yRm = (yR + yS) / 2;
  const parts: CustomPart[] = [
    { id: "SH", name: "Shelf", size: [W - T, T, D], pos: [T / 2, yS + T / 2, 0], material: "board" },
    { id: "RL", name: "Short leg", size: [T, yS, D], pos: [W / 2 - T / 2, yS / 2, 0], material: "board" },
    { id: "RA", name: "Rail", size: [xR - xL, yS - yR, T], pos: [0, (yR + yS) / 2, 0], material: "board" },
    { id: "LS", name: "Left side", size: [T, yT, D], pos: [-W / 2 + T / 2, yT / 2, 0], material: "board" },
    { id: "MP", name: "Middle panel", size: [T, yT - ySt, D], pos: [xMc, (ySt + yT) / 2, 0], material: "board" },
    { id: "TP", name: "Top", size: [topLen, T, D], pos: [-W / 2 + topLen / 2, H - T / 2, 0], material: "board" },
  ];
  const yU = d.yU ?? 0;
  const postW = d.postW ?? 0;
  if (side) {
    parts.push(
      { id: "US", name: "Upper shelf", size: [xM - xL, T, D], pos: [(xL + xM) / 2, yU + T / 2, 0], material: "board" },
      { id: "PO", name: "Post", size: [postW, yT - ySt, T], pos: [xM + T + postW / 2, (ySt + yT) / 2, 0], material: "board" },
    );
  }

  const feet = (x: number, on: string) => fx("glide", [-1, 1].map((k) => pt(x, 0, k * (D / 2 - 40))), [0, 1, 0], { on, ...FOOT });
  // the rail end: a dowel high up, the cam bolt in the middle, the connector screw low down
  const yRd = yS - 14, yRs = yR + 14;
  // cam bolts in the face of one panel go into the edge of the other, where a cam lock in its face holds them
  const steps: CustomStep[] = [
    {
      title: "Screw two cam bolts into the shelf",
      detail: "Lay the long shelf upside down on a rug. The bolts go in near the end without the dowel holes in its edge.",
      add: ["SH"],
      fix: [fx("camScrew", [-1, 1].map((k) => pt(W / 2 - T / 2, yS, k * zc)), [0, 1, 0], { on: "SH" })],
      tools: ["screwdriver"],
      pose: "-y",
      warnings: ["floor"],
    },
    {
      title: "Tap two dowels into the other end",
      detail: "Into the end edge, halfway in.",
      fix: [fx("dowel", [-1, 1].map((k) => pt(xL, yS + T / 2, k * zd)), [1, 0, 0], { on: "SH", mate: "LS" })],
      tools: ["hammer"],
    },
    {
      title: "Push two feet into the short leg",
      detail: "Into the holes at both ends of its bottom edge.",
      fix: [feet(W / 2 - T / 2, "RL")],
      wait: ["RL"],
    },
    {
      title: "Screw a cam bolt into the leg",
      detail: "In the middle of its inside face, for the rail.",
      fix: [fx("camScrew", [pt(xR, yRm, 0)], [1, 0, 0], { on: "RL", mate: "RA" })],
      tools: ["screwdriver"],
    },
    {
      title: "Tap two dowels into the top edge of the leg",
      fix: [fx("dowel", [-1, 1].map((k) => pt(W / 2 - T / 2, yS, k * zd)), [0, -1, 0], { on: "RL", mate: "SH" })],
      tools: ["hammer"],
    },
    {
      title: "Lock the leg onto the shelf",
      detail: "Feet up, onto the dowels and the cam bolts at the end of the shelf. Two cam locks, arrow towards the bolt, then turn clockwise.",
      add: ["RL"],
      fix: [fx("cam", [-1, 1].map((k) => pt(xR, yS - 34, k * zc)), [1, 0, 0], { on: "RL" })],
      tools: ["screwdriver"],
    },
    {
      title: "Tap a dowel into each end of the rail",
      fix: [
        fx("dowel", [pt(xL, yRd, 0)], [1, 0, 0], { on: "RA", mate: "LS" }),
        fx("dowel", [pt(xR, yRd, 0)], [-1, 0, 0], { on: "RA", mate: "RL" }),
      ],
      tools: ["hammer"],
      wait: ["RA"],
    },
    {
      title: "Slide the rail along the shelf into the leg",
      detail: "Standing on its edge down the middle of the shelf, its dowel into the leg.",
      add: ["RA"],
      from: { RA: [-450, 0, 0] },
    },
    {
      title: "Lock the rail to the leg",
      detail: "One cam lock in the rail, onto the bolt in the leg.",
      fix: [fx("cam", [pt(xR - 34, yRm, T / 2)], [0, 0, -1], { on: "RA" })],
      tools: ["screwdriver"],
    },
    {
      title: "Screw the leg to the rail",
      detail: "Lay it on its back. Hold the rail and turn a connector screw through the leg into its end with the Allen key.",
      fix: [fx("bolt", [pt(W / 2, yRs, 0)], [-1, 0, 0], { on: "RL", mate: "RA", ...SCREW })],
      tools: ["allen"],
      pose: "+z",
    },
    {
      title: "Push two feet into the left side",
      detail: "Into the bottom edge, one at each end.",
      fix: [feet(-W / 2 + T / 2, "LS")],
      wait: ["LS"],
    },
    {
      title: `Screw ${side ? "five" : "three"} cam bolts into the left side`,
      detail: side ? "Into its inside face: two for the long shelf, one for the rail and two for the upper shelf." : "Into its inside face: two for the shelf and one for the rail.",
      fix: [
        fx(
          "camScrew",
          [...[-1, 1].map((k) => pt(xL, yS + T / 2, k * (zd - 40))), pt(xL, yRm, 0), ...(side ? [-1, 1].map((k) => pt(xL, yU + T / 2, k * (zd - 40))) : [])],
          [-1, 0, 0],
          { on: "LS" },
        ),
      ],
      tools: ["screwdriver"],
    },
    {
      title: "Tap two dowels into the top edge",
      fix: [fx("dowel", [-1, 1].map((k) => pt(-W / 2 + T / 2, yT, k * zd)), [0, -1, 0], { on: "LS", mate: "TP" })],
      tools: ["hammer"],
    },
    {
      title: "Push the left side onto the shelf and the rail",
      detail: "Feet towards the floor end of the leg, onto all the dowels and bolts at once.",
      add: ["LS"],
      from: { LS: [-400, 0, 0] },
    },
    {
      title: "Lock the left side",
      detail: "Two cam locks in the shelf and one in the rail.",
      fix: [
        fx("cam", [-1, 1].map((k) => pt(xL + 34, yS, k * (zd - 40))), [0, 1, 0], { on: "SH" }),
        fx("cam", [pt(xL + 34, yRm, T / 2)], [0, 0, -1], { on: "RA" }),
      ],
      tools: ["screwdriver"],
    },
  ];

  const mpScrews = fx("bolt", [-1, 1].map((k) => pt(xMc, yS, k * zc)), [0, 1, 0], { on: "SH", mate: "MP", ...SCREW });
  if (!side) {
    steps.push(
      {
        title: "Tap four dowels into the middle panel",
        detail: "Two into each long edge.",
        fix: [
          fx("dowel", [-1, 1].map((k) => pt(xMc, ySt, k * zd)), [0, 1, 0], { on: "MP", mate: "SH" }),
          fx("dowel", [-1, 1].map((k) => pt(xMc, yT, k * zd)), [0, -1, 0], { on: "MP", mate: "TP" }),
        ],
        tools: ["hammer"],
        wait: ["MP"],
      },
      {
        title: "Fit the middle panel and screw it on",
        detail: "Onto the dowels on the top side of the shelf, then two connector screws through the shelf into its edge.",
        add: ["MP"],
        fix: [mpScrews],
        tools: ["allen"],
      },
    );
  } else {
    steps.push(
      {
        title: "Tap four dowels into the upper shelf",
        detail: "Two into each end.",
        fix: [
          fx("dowel", [-1, 1].map((k) => pt(xL, yU + T / 2, k * zd)), [-1, 0, 0], { on: "US", mate: "LS" }),
          fx("dowel", [-1, 1].map((k) => pt(xM, yU + T / 2, k * zd)), [1, 0, 0], { on: "US", mate: "MP" }),
        ],
        tools: ["hammer"],
        wait: ["US"],
      },
      {
        title: "Slide the upper shelf onto the left side",
        detail: "Above the long shelf, onto the dowels and the two top bolts.",
        add: ["US"],
        from: { US: [450, 0, 0] },
      },
      {
        title: "Screw two cam bolts into the middle panel",
        detail: "Into one face, for the upper shelf.",
        fix: [fx("camScrew", [-1, 1].map((k) => pt(xM, yU + T / 2, k * (zd - 40))), [1, 0, 0], { on: "MP", mate: "US" })],
        tools: ["screwdriver"],
        wait: ["MP"],
      },
      {
        title: "Tap two dowels into its bottom edge",
        detail: "The edge nearest the cam bolts.",
        fix: [fx("dowel", [-1, 1].map((k) => pt(xMc, ySt, k * zd)), [0, 1, 0], { on: "MP", mate: "SH" })],
        tools: ["hammer"],
      },
      {
        title: "Push the middle panel on",
        detail: "Its dowels into the shelf and the end of the upper shelf onto its bolts.",
        add: ["MP"],
      },
      {
        title: "Screw the shelf to the middle panel",
        detail: "Two connector screws through the shelf into its edge, with the Allen key.",
        fix: [mpScrews],
        tools: ["allen"],
      },
      {
        title: "Stand it up and lock the upper shelf",
        detail: "Two cam locks at each end of the upper shelf.",
        fix: [fx("cam", [xL + 34, xM - 34].flatMap((x) => [-1, 1].map((k) => pt(x, yU + T, k * (zd - 40)))), [0, -1, 0], { on: "US" })],
        tools: ["screwdriver"],
        pose: "+y",
      },
      {
        title: "Tap four dowels into the post",
        detail: "Two into each end.",
        fix: [
          fx("dowel", [-1, 1].map((k) => pt(xM + T + postW / 2 + k * 25, ySt, 0)), [0, 1, 0], { on: "PO", mate: "SH" }),
          fx("dowel", [-1, 1].map((k) => pt(xM + T + postW / 2 + k * 25, yT, 0)), [0, -1, 0], { on: "PO", mate: "TP" }),
        ],
        tools: ["hammer"],
        wait: ["PO"],
      },
      {
        title: "Stand the post on the shelf",
        detail: "Against the middle panel on the step side, its dowels pressed into the shelf.",
        add: ["PO"],
        from: { PO: [0, 400, 0] },
      },
    );
  }

  // the top: cam bolts in its underside over the left side and the middle panel, cam locks in their inside faces
  const nT = side ? [-1, 1] : [-1, 0, 1];
  const zT = (k: number) => k * (zd + 20);
  steps.push(
    {
      title: `Screw ${side ? "four" : "six"} cam bolts into the top`,
      detail: side ? "Lay it face down. Two over the left side and two over the middle panel." : "Lay it face down. Three over the left side and three over the middle panel.",
      fix: [fx("camScrew", [-W / 2 + T / 2, xMc].flatMap((x) => nT.map((k) => pt(x, yT, zT(k)))), [0, 1, 0], { on: "TP" })],
      tools: ["screwdriver"],
      wait: ["TP"],
    },
    {
      title: side ? "Put the top on and lock it" : "Stand it up, put the top on and lock it",
      detail: `Lower it onto the dowels and bolts, then ${side ? "four" : "six"} cam locks inside the left side and the middle panel.`,
      add: ["TP"],
      fix: [
        fx("cam", nT.map((k) => pt(xL, yT - 34, zT(k))), [-1, 0, 0], { on: "LS" }),
        fx("cam", nT.map((k) => pt(xM, yT - 34, zT(k))), [1, 0, 0], { on: "MP" }),
      ],
      tools: ["screwdriver"],
      pose: "+y",
    },
  );
  return { parts, steps };
}

const family: Family = {
  names: ["HOLMERUD"],
  recipe(s) {
    const slug = s.slug ?? "";
    // shelf height read off IKEA's photo; the rail stops 7 cm off the floor ("free height under furniture")
    if (slug === "holmerud-coffee-table-90-x-55") return recipe({ W: 900, H: 400, D: 550, yS: 142, yR: 70, topLen: 620, xM: 152 });
    if (slug === "holmerud-side-table-80-x-31") return recipe({ W: 800, H: 520, D: 310, yS: 157, yR: 70, topLen: 800, xM: 65, yU: 375, postW: 100 });
    return null;
  },
};
export default family;
