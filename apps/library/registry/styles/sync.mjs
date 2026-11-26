// Writes each style's tokens into registry.json from its stylesheets, so the
// CSS files stay the one place a style is edited. Run it after changing one:
//   node registry/styles/sync.mjs
// It only rewrites registry.json; it builds and publishes nothing.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LIBRARY = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const REGISTRY = join(LIBRARY, "registry", "registry.json");

// Tokens Tailwind turns into utilities go in `cssVars.theme`.
const THEME_TOKEN = /^(radius|font|tracking)-/;

const rules = (css) =>
  [
    ...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g),
  ].map(([, selector, body]) => [
    selector.trim(),
    [...body.matchAll(/(--[\w-]+|[\w-]+)\s*:\s*([^;]+);/g)].map(
      ([, name, value]) => [name, value.trim()],
    ),
  ]);

const styleTokens = (sources) => {
  const cssVars = { theme: {}, light: {}, dark: {} };
  const css = {};
  for (const source of sources) {
    for (const [selector, declarations] of rules(
      readFileSync(join(LIBRARY, source), "utf8"),
    )) {
      const onlyVars = declarations.every(([name]) => name.startsWith("--"));
      if (selector === ":root") {
        for (const [name, value] of declarations) {
          const token = name.slice(2);
          cssVars[THEME_TOKEN.test(token) ? "theme" : "light"][token] = value;
        }
      } else if (
        (selector === ":root.dark" || selector === ".dark") &&
        onlyVars
      ) {
        for (const [name, value] of declarations)
          cssVars.dark[name.slice(2)] = value;
      } else {
        css[selector] = {
          ...css[selector],
          ...Object.fromEntries(declarations),
        };
      }
    }
  }
  return { cssVars, css };
};

const registry = JSON.parse(readFileSync(REGISTRY, "utf8"));
registry.items = registry.items.map((item) => {
  if (item.type !== "registry:style") return item;
  const { name, type, title, description, meta } = item;
  return { name, type, title, description, ...styleTokens(meta.source), meta };
});
writeFileSync(REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);
console.log("Synced the registry styles from their stylesheets.");
