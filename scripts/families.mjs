// Writes src/lib/plan/families/index.ts from the family files next to it: npm run families
import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const dir = path.resolve(import.meta.dirname, "../src/lib/plan/families");
const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "index.ts" && f !== "family.ts" && !f.startsWith("_")).sort();
const id = (f) => "f_" + f.replace(/\.ts$/, "").replace(/[^a-zA-Z0-9]/g, "_");
const src = `// Written by scripts/families.mjs from the files in this folder; don't edit by hand.
import type { Family } from "./family";
${files.map((f) => `import ${id(f)} from "./${f.replace(/\.ts$/, "")}";`).join("\n")}

export const FAMILIES: Family[] = [${files.map(id).join(", ")}];
`;
writeFileSync(path.join(dir, "index.ts"), src);
console.log(`${files.length} family files`);
