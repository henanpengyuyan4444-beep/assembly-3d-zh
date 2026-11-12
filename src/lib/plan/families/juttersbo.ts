import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, PartPiece, ProductSpec, Vec3 } from "../../types";

/*
 * JUTTERSBO trolley, read from IKEA's manual. Three round trays with four lugs each, eight posts and an arched
 * handle, all put together by hand with the trolley lying on its side. Two sleeves go into the top tray, two posts
 * are screwed into it, the handle goes in on the other side, then the other two posts. The middle tray slides on,
 * four lower posts screw into the upper ones, the bottom tray slides on and four screws through its lugs hold it.
 * The four castors click into the screws' sockets. IKEA's sizes: 36 cm across, 86 high.
 */

const fix = (kind: CustomFix["kind"], at: Vec3[], dir: Vec3, o: Partial<CustomFix> = {}): CustomFix => ({ kind, count: at.length, at, dir, ...o });

function trolley(s: ProductSpec): CustomParams {
  const D = Math.round(s.size.w * 10) || 360, H = Math.round(s.size.h * 10) || 860;
  const rl = D / 2 - 5; // the lugs sit on the rim
  const lug = (a: number): [number, number] => [Math.round(rl * Math.sin(a)), Math.round(rl * Math.cos(a))];
  // lugs at the corners; the handle stands on the two at the back
  const angles = [Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4];
  const lugs = angles.map(lug);
  const back = [2, 3], front = [0, 1];
  const bot = [90, 220], botLug = 70, mid = [450, 500], top = [640, 680], topLug = 690;
  const tray = (id: string, name: string, y0: number, y1: number, l0: number, l1: number): CustomPart => {
    const cy = (Math.min(y0, l0) + Math.max(y1, l1)) / 2;
    const pieces: PartPiece[] = [
      { shape: "cyl", size: [D - 20, y1 - y0, D - 20], pos: [0, (y0 + y1) / 2 - cy, 0] },
      ...lugs.map(([x, z]): PartPiece => ({ shape: "box", size: [32, l1 - l0, 32], pos: [x, (l0 + l1) / 2 - cy, z] })),
    ];
    return { id, name, material: "board", shape: "cyl", size: [D, Math.max(y1, l1) - Math.min(y0, l0), D], pos: [0, cy, 0], pieces };
  };
  const post = (id: string, name: string, i: number, y0: number, y1: number): CustomPart => ({
    id,
    name,
    shape: "cyl",
    material: "metal",
    size: [22, y1 - y0, 22],
    pos: [lugs[i][0], (y0 + y1) / 2, lugs[i][1]],
  });
  // the handle: an arch over the two back lugs
  const hx = Math.abs(lugs[2][0]), hz = lugs[2][1];
  const yArc = H - hx; // centre of the arc
  const arc: PartPiece[] = [];
  for (const g of [-1, 1]) arc.push({ shape: "cyl", size: [22, yArc - topLug, 22], pos: [g * hx, (topLug + yArc) / 2 - (topLug + H) / 2, 0] });
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a = Math.PI * ((k + 0.5) / n); // from the right, over the top
    const len = 2 * hx * Math.sin(Math.PI / (2 * n)) + 6;
    arc.push({ shape: "cyl", size: [22, len, 22], pos: [Math.round(hx * Math.cos(a)), Math.round(yArc + hx * Math.sin(a) - (topLug + H) / 2), 0], rot: [0, 0, a] });
  }
  const parts: CustomPart[] = [
    tray("T", "Top tray", top[0], top[1], top[0], topLug),
    { id: "H", name: "Handle", material: "metal", size: [2 * hx + 22, H - topLug, 22], pos: [0, (topLug + H) / 2, hz], pieces: arc },
    ...lugs.map((_, i) => post(`U${i}`, "Upper post", i, mid[1], top[0])),
    tray("M", "Middle tray", mid[0], mid[1], mid[0], mid[1]),
    ...lugs.map((_, i) => post(`L${i}`, "Lower post", i, bot[1], mid[0])),
    tray("B", "Bottom tray", bot[0], bot[1], botLug, bot[1]),
  ];
  const ids = (p: string, list: number[]) => list.map((i) => `${p}${i}`);
  return {
    parts,
    steps: [
      {
        title: "Push two sleeves into the top tray",
        detail: "The top tray is the shallow one. The sleeves go into the two lugs at the back, from above.",
        add: ["T"],
        fix: [fix("connector", back.map((i): Vec3 => [lugs[i][0], topLug, lugs[i][1]]), [0, -1, 0], { name: "Plastic sleeve", len: 15, dia: 12, on: "T" })],
      },
      {
        title: "Screw two posts into the top tray",
        detail: "Lay the tray on its edge on a rug. Turn each post in by hand into the back lugs, until it stops.",
        add: ids("U", back),
        pose: "+x",
        warnings: ["floor"],
      },
      { title: "Push the handle in", detail: "Its two ends go into the sleeves, on the other side of the tray from the posts.", add: ["H"] },
      { title: "Screw in the other two posts", detail: "Into the front lugs, by hand. Check you have the posts for the top, not the bottom.", add: ids("U", front) },
      { title: "Slide the middle tray onto the posts", detail: "Its lugs line up with the posts. Push it all the way on.", add: ["M"] },
      { title: "Screw the lower posts on", detail: "One through each lug of the middle tray into the post on the other side, by hand.", add: ids("L", [0, 1, 2, 3]) },
      { title: "Slide the bottom tray on", detail: "The deep tray, with its lugs reaching past the bottom for the castors.", add: ["B"] },
      {
        title: "Screw the bottom tray to the posts",
        detail: "One screw through each lug into the end of its post. Its hollow head takes a castor.",
        fix: [fix("screw", lugs.map(([x, z]): Vec3 => [x, botLug, z]), [0, 1, 0], { len: 40, dia: 6, on: "B" })],
        tools: ["screwdriver"],
      },
      {
        title: "Click the castors in",
        detail: "Push each one into the socket under a lug until it clicks.",
        fix: [fix("castor", lugs.map(([x, z]): Vec3 => [x, botLug, z]), [0, 1, 0], { len: 60, dia: 45, mate: "B" })],
      },
      { title: "Stand the trolley up", detail: "Roll it a little to check all four castors turn freely.", pose: "+y" },
    ],
  };
}

const family: Family = {
  names: ["JUTTERSBO"],
  recipe(s) {
    if (!/trolley/i.test(`${s.variant} ${s.slug ?? ""}`)) return null;
    return trolley(s);
  },
};
export default family;
