import { writeFileSync } from "node:fs";
import path from "node:path";
import { codeTokenCss } from "../lib/code-token-classes.ts";

// Writes styles/code-tokens.css, the classes behind the docs' code token
// colors. Run it after changing the code themes in lib/docs-code.tsx.
writeFileSync(
  path.join(import.meta.dirname, "..", "styles", "code-tokens.css"),
  codeTokenCss(),
);
