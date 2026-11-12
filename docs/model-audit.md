# Model audit, 28 October 2026

Every catalog guide (2,073 with an IKEA product page) was checked two ways:

1. **Sizes:** `npm run ikea:measure` read the measurements on each product's own IKEA page (seat height, armrest height and width, backrest height, room under the frame, and so on). `npm run ikea:build` now uses them wherever the listing gave no size or only two numbers.
2. **Shapes:** every drawing was rendered and put next to IKEA's main photo, 10 pairs per sheet, and all 208 sheets were reviewed for structural differences (counts of drawers, doors, shelves and seats, open frames against solid panels, the wrong object).

In all, 839 of the 2,000 generated guides changed: 801 in size and 19 in the kind of shape they draw. No guide's link changed.

## Fixed

| What | Examples |
| --- | --- |
| Sofas and armchairs use their real seat height and depth, armrest height and width, backrest height and leg height. The backrest frame now stops under the back cushions, which stand above it | VIMLE, KIVIK, EKTORP, KLIPPAN, SÖDERHAMN, FINNALA, MORABO: about 410 seat guides |
| Sizes IKEA's listing left out now come from the product page: sofas and armchairs that were drawn at a default 75 × 90 × 80 or 230 × 85 × 92, corner sofas, bedside tables drawn 55 cm tall, chairs | EKTORP armchair, BJÖRKSNÄS bedside table (55 → 69 cm), SUNNERSTA (38 → 97 cm), GLOSTAD (145 → 121 cm wide) |
| Corner sofas "with chaise longue" are an L with the chaise at the far end, not a plain L | VIMLE, KIVIK, FINNALA, MORABO, SMEDSTORP |
| "4-seat sofas" IKEA measures as deep as a chaise longue are drawn with the chaise | KIVIK 4-seat, SÖDERHAMN 4-seat sofa-bed, UPPÅKRA 4,5-seat |
| LACK wall shelf unit: 6 shelves bolted through one side panel with the Allen key, open at the back, hung by 3 steel plates, 28 cm deep (was a 22 cm deep bookcase on dowels) | LACK 30 × 190 |
| BROR work bench with drawers: a chest of 4 drawers under the top (was a desk with 2) | BROR 85 × 40 × 89 |
| Trolleys stand three tiers high | RÅSKOG, NISSAFORS, KUNGSFORS, BROR trolley, VESKEN |
| Frames sold empty are drawn empty: no shelves, no rail | PAX frames, PLATSA, UPPFÖRA, LÄSTARE, BESTÅ and TROFAST frames |
| Benches with shoe storage have their shoe shelf | KALLSÖ, NIPASEN, HEMNES, TJUSIG |
| Round pouffes are round; ALSEDA is a pouffe, not a three-legged stool | ÅTERLÖGA, EMMISLÖV, FÖRLUNDA, SIDSJÖ, ALSEDA |
| Open TV benches have no doors | LACK and BESTÅ TV benches |
| A dressing table measured 135 cm tall has its mirror | GRÅFJÄLLET |
| An article number that pointed at the wrong guide: JANINGE's only article is a bar stool, and now opens a bar stool guide | JANINGE |
| Hand made rows corrected from their pages | LISTERBY and HOLMERUD coffee tables, HAUGA, KYRRE, LANDSKRONA, IDÅSEN |

## Still drawn approximately

These need new shapes in `src/lib/plan`, not new numbers. Counts are guides the review flagged.

| Pattern | About | Examples |
| --- | --- | --- |
| Open steel, wire or pine frames drawn with solid side panels | 70 | BROR and IVAR shelving, OMAR, ENHET, HYLLIS, KOLBJÖRN, JONAXEL, VITTSJÖ, BROR work bench with drawers |
| Beds with storage boxes drawn without their drawers; metal beds drawn with solid ends | 45 | MALM, BRIMNES, HEMNES storage beds; STJÄRNÖ, VEVELSTAD, MINNEN |
| Sideboards and TV benches that mix doors, drawers and open cubbies drawn as two doors | 35 | HEMNES, BRIMNES, IDANÄS, VIHALS, BESTÅ with drawers |
| Bedside tables with one drawer over an open shelf or on legs drawn as a closed box | 25 | HEMNES, TONSTAD, KRONÖREN, VIKHAMMER |
| Desks that stand on drawer units or cabinets drawn on four legs | 20 | LAGKAPTEN / ALEX, HEMNES, GULLABERG, MICKE, ALEX desk |
| Wash-stands with 2 × 2 drawers or open bays drawn as two full-width drawers | 20 | ÄNGSJÖN, HAVBÄCK, TÄNNFORSEN, HEMNES |
| Kitchen and tall cabinets with doors stacked, drawn side by side, or the other way round | 15 | METOD, SEKTION, KNOXHULT |
| Wardrobes with 3 doors or drawers drawn with 2 doors | 12 | BRIMNES, KLEPPSTAD, RAKKESTAD, SUNDVIK, VIHALS |
| Easy chairs that are armless, cantilevered or rocking drawn as club chairs | 15 | POÄNG, VEINGE, LINNEBÄCK, SUNDVIK rocking chair |
| Chaise on the other side, and armless sofa-beds drawn with arms | 20 | APPLARYD, BÅRSLÖV, LYCKSELE, NYHAMN, BALKARP |
| Pedestal tables drawn on four legs; step stools drawn as round stools | 12 | DOCKSTA, ROSENTORP, BEKVÄM and BOLMEN step stools |
| Not the object the guide draws (candidates to take out of the catalog) | 6 | INVALLNING roller platform, VUKU fabric wardrobe, HOL side table, NÄMMARÖ table, BATSKÄR add-on unit |

Some guides group article numbers IKEA sells under one type name for two different products (VIMLE's "3-seat sofa" articles include its chaise longue version; POÄNG's armchair articles include the rocking chair). Typing such a number opens the straight version. The fetcher would have to keep IKEA's variant text to split them.

## Re-running

```bash
npm run ikea:measure && npm run ikea:build && npm run ikea:check
```

`scripts/ikea/measures.json` and the page cache stay out of git, like the listings.
