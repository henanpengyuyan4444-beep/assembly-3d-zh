import type { CustomParams, ProductSpec } from "../../types";
import type { PlanBuilder } from "../builder";

/**
 * How one IKEA family really goes together, read from its assembly manuals: the same steps in the same order,
 * with the same parts, fittings and counts. A family either describes its parts and steps as a recipe, which the
 * custom builder turns into a guide (it works out where each fitting goes), or draws the guide itself.
 * Either one returns null or false for a product it doesn't cover, and the guide falls back to its kind's builder.
 */
export interface Family {
  names: string[]; // IKEA family names, in capitals, as the product name starts
  recipe?: (s: ProductSpec) => CustomParams | null;
  build?: (b: PlanBuilder, s: ProductSpec) => boolean;
  /** A set of several frames (`s.row` set) drawn by the family itself, when the row code's repeat-and-join isn't how its manual does it. */
  row?: (b: PlanBuilder, s: ProductSpec) => boolean;
}

/** The family a product belongs to: the first word of its name, in capitals ("BILLY / OXBERG" is BILLY). */
export const familyOf = (s: ProductSpec) => s.name.trim().split(/[\s/]+/)[0].toUpperCase();
