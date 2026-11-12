// Builds the landing page's step-1 component with the remote-components CLI,
// so the Result under the steps is that exact file, built.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "@assistant-ui/remote-components-cli";

const docs = fileURLToPath(new URL("..", import.meta.url));

// Styling only; the landing page shows the component without it.
const STARS_CSS = `<style>
      .stars { display: flex; gap: 2px; }
      button { font: inherit; font-size: 20px; line-height: 1; width: 32px; height: 32px; padding: 0; border: 0; border-radius: var(--radius-sm); background: none; color: var(--color-text); cursor: pointer; }
      button:hover { background: var(--color-surface-muted); }
      button:focus-visible { outline: 2px solid var(--focus-ring, var(--color-accent)); outline-offset: 0; }
    </style>`;

const { out } = await build({
  cwd: docs,
  entry: "components/pages/docs/samples/remote-components/rating.tsx",
  out: "public/rc/rating.html",
});
const html = await readFile(out, "utf8");
await writeFile(out, html.replace("</head>", `  ${STARS_CSS}\n  </head>`));
console.log(`built ${out}`);
