import type { Family } from "./family";
import mittzon from "./mittzon";

/**
 * UTMANING gaming desks: an UTMANING top on a MITTZON underframe (the plain one, or the electric sit/stand one).
 * The top's own manual starts by sending you to the MITTZON manual for the frame, then lays the top on with its
 * cable cover strip at the back, screws it on from below, folds the joining strap over and screws it on, and hangs
 * the cable tray and baskets; the sit/stand desk gets its control panel under the front edge. That is the same
 * build the MITTZON desks follow, so this hands the guide to the MITTZON family with the matching frame.
 */

const family: Family = {
  names: ["UTMANING"],
  build(b, s) {
    if (!/gaming desk/i.test(s.variant) || !mittzon.build) return false;
    const electric = /sit\/stand/i.test(s.variant);
    const size = s.variant.match(/\d+\s*×\s*\d+(\s*cm)?/)?.[0] ?? `${s.size.w} × ${s.size.d} cm`;
    return mittzon.build(b, { ...s, variant: `${electric ? "Desk sit/stand" : "Desk"}, ${size}` });
  },
};
export default family;
