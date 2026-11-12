import type { Family } from "./family";
import type { CustomFix, CustomParams, CustomPart, CustomStep, PartItem, ProductSpec, Vec3 } from "../../types";
import type { PlanBuilder } from "../builder";
import { buildCustom } from "../custom";

/**
 * HELMER, read from the drawer unit's manual. Everything is steel and hooks together: both sides lie on a rug and
 * five runners click into each, the top hooks onto one side and the other side hooks onto the top, then (lying on
 * its back) the back slides in, the two front rails hook in and four screws hold them. Two braked castors go on
 * the front corners, two plain ones on the back. Each drawer folds up from its bottom: front hooked on, two stops
 * pressed in, back clicked in and the handle screwed on; then the drawers slide in, two tabs are bent with a
 * screwdriver so they can't come out, and the labels go in the handles. There is no wall fixing.
 */

const T = 15; // the sides and top, folded steel
const Y0 = 45; // the castors

function fx(kind: CustomFix["kind"], at: Vec3[], dir: Vec3, on: string, o: Partial<CustomFix> = {}): CustomFix {
  return { kind, count: at.length, at, dir, ...(on ? { on } : {}), ...o };
}

function unit(s: ProductSpec): CustomParams {
  // IKEA: 28 wide, 44 deep, 65 high on its castors, five drawers 22 x 37 inside
  const W = 280, D = 440, H = Math.round(s.size.h * 10) === 690 ? 650 : Math.round(s.size.h * 10) || 650;
  const xi = W / 2 - T, hs = H - T - Y0, ys = Y0 + hs / 2, zf = D / 2 - T / 2;
  const n = 5, zone0 = Y0 + 25, zone1 = H - T - 25, pitch = (zone1 - zone0) / n;
  const yc = (i: number) => zone1 - pitch / 2 - i * pitch; // drawer centres, top first
  const fh = pitch - 4, ty = (i: number) => yc(i) - 4, th = 80, tl = 370, tz = zf - T / 2 - tl / 2;
  const parts: CustomPart[] = [
    { id: "SL", name: "Side panel", size: [T, hs, D], pos: [-W / 2 + T / 2, ys, 0], material: "metal" },
    { id: "SR", name: "Side panel", size: [T, hs, D], pos: [W / 2 - T / 2, ys, 0], material: "metal" },
    { id: "TOP", name: "Top", size: [W, T, D], pos: [0, H - T / 2, 0], material: "metal" },
    { id: "BACK", name: "Back panel", size: [2 * xi, hs, 6], pos: [0, ys, -D / 2 + 3], material: "metal" },
    { id: "RT", name: "Front rail", size: [2 * xi, 25, T], pos: [0, zone1 + 12.5, zf], material: "metal" },
    { id: "RB", name: "Front rail", size: [2 * xi, 25, T], pos: [0, zone0 - 12.5, zf], material: "metal" },
  ];
  for (let i = 0; i < n; i++) {
    const w = 2 * xi - 18;
    parts.push(
      {
        id: `TR${i}`,
        name: "Drawer bottom",
        size: [w, th, tl],
        pos: [0, ty(i), tz],
        pieces: [
          { shape: "box", size: [w, 3, tl], pos: [0, -th / 2 + 1.5, 0] },
          { shape: "box", size: [3, th, tl], pos: [-w / 2 + 1.5, 0, 0] },
          { shape: "box", size: [3, th, tl], pos: [w / 2 - 1.5, 0, 0] },
        ],
        material: "metal",
      },
      { id: `FR${i}`, name: "Drawer front", size: [2 * xi - 4, fh, T], pos: [0, yc(i), zf], material: "metal" },
      { id: `BK${i}`, name: "Drawer back", size: [w - 6, th - 4, 3], pos: [0, ty(i) + 2, tz - tl / 2 + 4], material: "metal" },
    );
  }

  const runners = (sx: number) =>
    fx("runner", Array.from({ length: n }, (_, i): Vec3 => [sx * (xi - 5), ty(i) - th / 2 + 6, tz]), [0, 1, 0], sx < 0 ? "SL" : "SR", { len: tl + 10, name: "Drawer runner" });
  const railScrews = [-1, 1].flatMap((sx) => [zone0 - 12.5, zone1 + 12.5].map((y): Vec3 => [sx * (W / 2), y, zf]));
  const castor = (sz: number, name: string) => [-1, 1].map((sx) => fx("castor", [[sx * (xi - 25), Y0, sz * (D / 2 - 45)]], [0, 1, 0], sx < 0 ? "SL" : "SR", { name, len: Y0 }));
  const castorScrew = (sz: number) => [-1, 1].map((sx) => fx("screw", [[sx * xi, Y0 + 18, sz * (D / 2 - 45)]], [sx, 0, 0], sx < 0 ? "SL" : "SR", { len: 10, dia: 4 }));
  // each drawer's stops, handle and handle screws; with no part named, each goes into the drawer it sits on
  const drawerFits = (ds: number[]) => ({
    stops: fx("clip", ds.flatMap((i) => [-1, 1].map((sx): Vec3 => [sx * (xi - 10.5), ty(i) + th / 2, zf - T / 2 - 12])), [0, -1, 0], "", { name: "Drawer stop" }),
    handle: fx("handle", ds.map((i): Vec3 => [0, yc(i) + 8, zf + T / 2]), [0, 0, -1], "", { len: 100, dia: 10 }),
    screws: fx("screw", ds.flatMap((i) => [-1, 1].map((sx): Vec3 => [sx * 45, yc(i) + 8, zf - T / 2 + 1])), [0, 0, 1], "", { len: 10, dia: 4, name: "Machine screw" }),
  });
  const first = drawerFits([0]);
  const rest = drawerFits([1, 2, 3, 4]);
  const steps: CustomStep[] = [
    { title: "Lay both sides on a rug", detail: "Inside faces up, so the folded edges point at you.", add: ["SL", "SR"], pose: "+x", warnings: ["floor"], tools: [] },
    { title: "Hook five runners into one side", detail: "Tilt each runner and hook its back end into the slots first.", fix: [runners(-1)], tools: [] },
    { title: "Press the runners down until they click", detail: "Push the front end of each one into its catch.", tools: [] },
    { title: "Hook five runners into the other side", detail: "The same way, back ends first.", fix: [runners(1)], tools: [] },
    { title: "Click those runners down too", detail: "Press each front end until it clicks.", tools: [] },
    { title: "Hook the top onto the first side", detail: "Stand it on its edge and push its tabs into the slots at the top of the side.", add: ["TOP"], tools: [] },
    { title: "Slide the top along until it stops", detail: "Push it towards the front so the hooks lock.", tools: [] },
    { title: "Hook the other side onto the top", detail: "Runners facing in. Lower it towards the first side, hooks into the top's slots.", tools: [] },
    { title: "Slide the side home", detail: "Push it the same way as the top, until the hooks lock.", tools: [] },
    { title: "Slide the back in between the sides", detail: "Lay it on its back. The back runs in along the folded edges from the open end.", add: ["BACK"], pose: "+z", from: { BACK: [0, -500, 0] }, tools: [] },
    { title: "Press the sides in against the back", detail: "Squeeze them at the bottom so the back is held all along.", tools: [] },
    { title: "Hook in the two front rails", detail: "One at the top and one at the bottom, two hooks at each end.", add: ["RT", "RB"], tools: [] },
    { title: "Screw the rails to the sides", detail: "Four of the pointed screws, one through each side into each rail end.", fix: [-1, 1].map((sx) => fx("screw", railScrews.filter((p) => p[0] * sx > 0), [-sx, 0, 0], sx < 0 ? "SL" : "SR", { len: 10, dia: 4 })), tools: ["screwdriver"] },
    { title: "Fit the castors with brakes at the front", detail: "Hook each one into the corner, then one pointed screw through the side.", fix: [...castor(1, "Castor with brake"), ...castorScrew(1)], tools: ["screwdriver"] },
    { title: "Turn it over and fit the plain castors", detail: "The two castors without brakes go on the back corners, one screw each.", fix: [...castor(-1, "Castor"), ...castorScrew(-1)], pose: "-z", tools: ["screwdriver"] },
    { title: "Fold up the sides of a drawer", detail: "Lay the drawer bottom on the rug and lift both sides until they stand up.", add: ["TR0"], pose: "+y", tools: [] },
    { title: "Hook the front onto the drawer", detail: "Its two tabs go into the slots at the front of the sides, then push it down.", add: ["FR0"], tools: [] },
    { title: "Press in the two drawer stops", detail: "One into the square hole at the front of each side, flat face to the front.", fix: [first.stops], tools: [] },
    { title: "Click the back into the drawer", detail: "Lower it between the sides at the back, then press until both ends click.", add: ["BK0"], tools: [] },
    { title: "Screw on the handle", detail: "Two screws from inside the drawer into the handle.", fix: [first.handle, first.screws], tools: ["screwdriver"] },
    {
      title: "Build the other drawers and slide them in",
      detail: "Each one on its runners until it stops. Then bend up the two tabs at the back of the runners with a flat screwdriver, so the drawers can't be pulled out.",
      add: [1, 2, 3, 4].flatMap((k) => [`TR${k}`, `FR${k}`, `BK${k}`]),
      fix: [rest.stops, rest.handle, rest.screws],
      from: Object.fromEntries([1, 2, 3, 4].flatMap((k) => [`TR${k}`, `FR${k}`, `BK${k}`].map((id): [string, Vec3] => [id, [0, 0, 450]]))),
      tools: ["screwdriver", "flathead"],
    },
    { title: "Slip the labels into the handles", detail: "One card into the holder behind each handle.", fix: [fx("cap", Array.from({ length: n }, (_, i): Vec3 => [0, yc(i) + 22, zf + T / 2]), [0, -1, 0], "", { name: "Label card", len: 1, dia: 30 })], tools: [] },
  ];
  return { parts, steps };
}

const recipe = (s: ProductSpec) => (/helmer-drawer-unit-on-castors/.test(s.slug ?? "") ? unit(s) : null);

/** Move a part out of its place from one step until another: the side waiting on the rug, the drawer built in front. */
function restage(b: PlanBuilder, p: CustomPart, from: number, until: number, pos: Vec3, rot: Vec3) {
  const it = b.items.find((x): x is PartItem => x.kind === "part" && x.final.pos.every((v, k) => Math.abs(v - p.pos[k]) < 0.5));
  const st = it?.states.find((x) => x.step === from);
  if (!it || !st) return;
  it.states.splice(it.states.indexOf(st), 1, { ...st, pos, rot }, { ...st, step: until, from: [pos[0] - p.pos[0], pos[1] - p.pos[1], pos[2] - p.pos[2]] });
  it.states.sort((a, c) => a.step - c.step);
}

function build(b: PlanBuilder, s: ProductSpec): boolean {
  const r = recipe(s);
  if (!r) return false;
  const start = b.steps.length;
  buildCustom(b, { ...s, custom: r });
  r.steps.forEach((st, i) => {
    const bs = b.steps[start + i];
    if (bs && st.tools && bs.title === st.title) bs.tools = [...st.tools];
  });
  const at = (t: RegExp) => start + r.steps.findIndex((x) => t.test(x.title));
  const part = (id: string) => r.parts.find((p) => p.id === id)!;
  // the second side lies on the rug beside the first, inside up, until it hooks onto the top
  const sr = part("SR");
  restage(b, sr, at(/both sides/), at(/other side onto/), [part("SL").pos[0], sr.pos[1], sr.pos[2] + 560], [0, Math.PI, 0]);
  // the first drawer is put together in front of the unit and slides in with the others
  const lift = part("TR0").pos[1] - 45;
  ["TR0", "FR0", "BK0"].forEach((id) => {
    const p = part(id);
    restage(b, p, at(id === "TR0" ? /Fold up/ : id === "FR0" ? /front onto/ : /back into/), at(/slide them in/), [p.pos[0], p.pos[1] - lift, p.pos[2] + 520], [0, 0, 0]);
  });
  return true;
}

const family: Family = { names: ["HELMER"], recipe, build };
export default family;
