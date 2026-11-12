import type { Plan, ProductSpec } from "../types";
import { PlanBuilder } from "./builder";
import { buildShelf } from "./shelf";
import { buildDrawers } from "./drawers";
import { buildTable } from "./table";
import { buildBed } from "./bed";
import { buildCabinet } from "./cabinet";
import { buildSeat } from "./seat";
import { buildSofa } from "./sofa";
import { buildCustom } from "./custom";
import { buildRow } from "./row";
import { buildUnits } from "./units";
import { FAMILIES } from "./families";
import { familyOf, type Family } from "./families/family";

const cache = new Map<string, Plan>();

export function buildPlan(spec: ProductSpec): Plan {
  const key = JSON.stringify(spec);
  const hit = cache.get(key);
  if (hit) return hit;
  const b = new PlanBuilder(spec);
  // a family that draws its own sets of frames goes first
  if (spec.row && familyRow(b, spec)) {
  } else if (spec.row?.units) buildUnits(b, spec, buildOne);
  else if (spec.row) buildRow(b, spec, buildOne);
  else buildOne(b, spec);
  const plan = b.build();
  cache.set(key, plan);
  return plan;
}

const byName = new Map<string, Family[]>();
// a family file still being written may not export its family yet; skip it rather than break every guide
for (const f of FAMILIES) if (f?.names) for (const n of f.names) byName.set(n, [...(byName.get(n) ?? []), f]);

function familyRow(b: PlanBuilder, spec: ProductSpec) {
  for (const f of byName.get(familyOf(spec)) ?? []) if (f.row?.(b, spec)) return true;
  return false;
}

/** A family that knows how its product really goes together (from IKEA's manual) builds it; otherwise its kind does. */
function buildFamily(b: PlanBuilder, spec: ProductSpec) {
  if (spec.archetype === "custom") return false;
  for (const f of byName.get(familyOf(spec)) ?? []) {
    if (f.build?.(b, spec)) return true;
    const custom = f.recipe?.(spec);
    if (custom) {
      buildCustom(b, { ...spec, custom });
      return true;
    }
  }
  return false;
}

function buildOne(b: PlanBuilder, spec: ProductSpec) {
  if (buildFamily(b, spec)) return;
  switch (spec.archetype) {
    case "shelf":
      return buildShelf(b, spec);
    case "drawers":
      return buildDrawers(b, spec);
    case "table":
      return buildTable(b, spec);
    case "bed":
      return buildBed(b, spec);
    case "cabinet":
      return buildCabinet(b, spec);
    case "seat":
      return buildSeat(b, spec);
    case "sofa":
      return buildSofa(b, spec);
    case "custom":
      return buildCustom(b, spec);
  }
}
