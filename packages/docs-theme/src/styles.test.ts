import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json" with { type: "json" };

const resolve = (path: string) =>
  fileURLToPath(new URL(`../${path}`, import.meta.url));

const themeMarker = '[data-fd-theme="assistant-ui"]';

const splitSelectorList = (prelude: string) => {
  const members: string[] = [];
  let depth = 0;
  let member = "";
  for (const char of prelude) {
    if (char === "," && depth === 0) {
      members.push(member);
      member = "";
      continue;
    }
    if ("([".includes(char)) depth += 1;
    if (")]".includes(char)) depth -= 1;
    member += char;
  }
  return [...members, member].map((selector) => selector.trim());
};

const selectors = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{};]+)\{/g)]
    .map(([, prelude]) => prelude!.trim().replace(/\s+/g, " "))
    .filter((prelude) => !prelude.startsWith("@"))
    .flatMap(splitSelectorList);

const themeCss = () =>
  readFileSync(resolve(packageJson.exports["./styles.css"]), {
    encoding: "utf8",
  });

const themeSelectors = () =>
  selectors(
    readFileSync(resolve(packageJson.exports["./styles.css"]), {
      encoding: "utf8",
    }),
  );

describe("published stylesheets", () => {
  it.each(["./styles.css", "./site.css"] as const)(
    "resolves %s to a file in the package",
    (entry) => {
      expect(existsSync(resolve(packageJson.exports[entry]))).toBe(true);
    },
  );

  it("scopes every shared-layout rule to the theme or the Next.js layout", () => {
    const unscoped = themeSelectors().filter(
      (selector) =>
        /#nd-|\.fd-|\[data-/.test(selector) &&
        !selector.includes(themeMarker) &&
        !selector.includes(".aui-docs"),
    );
    expect(unscoped).toEqual([]);
  });

  it("keeps document-level theme rules to portaled content", () => {
    const portal =
      /\.fd-page-actions-menu|\.omni-(overlay|content)|\[data-radix-popper-content-wrapper\]/;
    const documentLevel = themeSelectors().filter((selector) =>
      /^(html\.dark )?body:has\([^)]*\[data-fd-theme/.test(selector),
    );
    expect(documentLevel.length).toBeGreaterThan(0);
    expect(documentLevel.filter((selector) => !portal.test(selector))).toEqual(
      [],
    );
  });

  it("leaves the shared layout's sidebar width to ui.layout.sidebarWidth", () => {
    expect(themeCss()).not.toMatch(
      /\[data-fd-theme="assistant-ui"\][^{}]*\{[^{}]*--fd-sidebar-width/,
    );
  });

  it("turns off shared-layout transitions under reduced motion", () => {
    const reduced = themeCss().split("prefers-reduced-motion: reduce")[1];
    expect(reduced).toContain('[data-fd-theme="assistant-ui"] *');
    expect(reduced).toContain("transition: none !important");
  });

  it("hides only the footer's duplicate edit link beside a filled rail", () => {
    expect(themeSelectors()).toContain(
      '[data-fd-theme="assistant-ui"]:has(#nd-toc a[href^="#"]) .fd-page-footer > a[href*="/edit/"]',
    );
    expect(themeCss()).not.toContain(
      ".fd-page-footer:not(:has(.fd-last-updated-footer))",
    );
  });

  it("keeps the fixed sidebar width on the Next layout only", () => {
    expect(themeCss()).toMatch(
      /\.aui-docs #nd-docs-layout \{\s*--fd-sidebar-width: 260px !important;/,
    );
  });

  it.each([
    "#nd-page h2",
    "#nd-toc a",
    "#nd-sidebar [data-radix-scroll-area-viewport]",
    ".fd-top-header",
    ".fd-page-title-row",
    ".fd-title-pager-link",
    ".fd-page-actions-menu",
    ".fd-page-actions-rail",
    ".fd-page-nav",
    ".fd-page-content-footer",
  ])("styles %s under the theme marker", (hook) => {
    expect(
      themeSelectors().some(
        (selector) => selector.includes(hook) && selector.includes(themeMarker),
      ),
    ).toBe(true);
  });
});
