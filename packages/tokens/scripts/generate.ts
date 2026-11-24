// Writes tokens.css from src/tokens.ts. Run: pnpm --filter @frontend-lab/tokens generate
import { writeFile } from "node:fs/promises";
import { renderCss } from "../src/css.ts";

const out = new URL("../tokens.css", import.meta.url);
await writeFile(out, renderCss());
console.log(`wrote ${out.pathname.split("/").slice(-2).join("/")}`);
