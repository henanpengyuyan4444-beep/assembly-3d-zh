# Manual check, pilot: 20 core guides against IKEA's assembly manuals

28 October 2026. Each guide's steps, parts and fittings were compared with the drawings in IKEA's own manual for the product. Our own words throughout; nothing from the manuals is copied into the app.

**Result: 19 of 20 differ from the manual in how the product is joined, how many fittings it takes, or how it is built.** Only LINNMON / ADILS was close (5 screws per leg plate, not 4). The generators in `src/lib/plan` share one way of building per kind of furniture (sides, top and bottom on dowels and cam locks, a nailed back), and most real products don't go together that way.

| Guide | Real joining | Biggest differences in ours | Status |
| --- | --- | --- | --- |
| EKET cabinet | Panels click together on edge fittings; back slides in and clips | Had dowels, cam locks and screws | **Fixed**: click-together steps, back locked, wall fixing |
| LACK wall shelf unit | 12 allen bolts through one side into 6 shelves; 3 steel plates hang it | Had dowels, a back panel, a hammer | **Fixed** |
| KALLAX 2x2, 2x4, 4x4, 1x4 | Wooden dowels and 8 long allen bolts, built lying down from an L (1x4: cam pins and locks for the shelves) | Cam locks that don't exist, dowel counts (68 against 42 on 4x4), order, no felt pads, 1 wall bracket instead of 2 | To do |
| BILLY 40, 80 × 202, 80 × 106 | Dowels in the horizontal pieces, cam bolts in the sides, locks 4 + 2 then 6, back nailed | Nails 30 to 36 against 18 (4 on the 106), 1 wall bracket instead of 2 with washers, dowels in the wrong panels | To do |
| MALM chest of 4 | Sides, 5 front rails on L plates, top; back nailed with 27 nails; runners fitted last | No rails, runners screwed on first, cam counts 8 against 14, drawers wrongly joined | To do |
| HEMNES chest of 3 | A frame of rails and corner posts on studs and cam locks; fabric wall strap | Drawn as two side panels; 6 knobs not 3; strap not brackets | To do |
| ALEX drawer unit | Cam pins and locks; back slides in (no nails); no separate runners | Nails and runners that aren't there; drawers wrongly joined; floor pads missing | To do |
| LACK coffee table, TV bench | Legs on hanger bolts; the shelf sits on angle brackets and a metal strip | Shelf screwed through the legs; TV bench missing its wall fixing | To do |
| BRIMNES wardrobe | Has a lower compartment; 6 hinges, handles, a rail on 2 holders | Lower compartment missing; all fitting counts off | To do |
| PAX frame | A folded frame that opens out, with corner pieces and feet | Drawn as loose panels with cam locks and nails | To do |
| MARIUS stool | One-piece steel frame, a centre bolt and nut, 4 screws | Drawn with 4 wooden legs and rails | To do |
| BROR work bench with drawers | Steel frame bolted together, runners, a cross brace, steel drawers | Drawn as a wooden chest | To do |
| VIMLE 3-seat sofa | Backrest lowered onto the seat frame and held by 4 studs and 4 clamps | Allen bolts from behind | To do |

## How to check the rest

1. `npm run ikea:measure` now also keeps each product's assembly-instruction links in `scripts/ikea/measures.json`.
2. Each manual's drawing pages are put on sheets, next to a text dump of our guide (parts, fittings, each step), and compared.
3. What comes back is a list per guide: real joining, real parts and fittings with counts, real steps and pose. Families that share a construction (every BILLY, every KALLAX) get one generator change each.

The full sweep that followed this pilot is in [manual-sweep.md](manual-sweep.md).
