import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json" with { type: "json" };

const resolve = (path: string) =>
  fileURLToPath(new URL(`../${path}`, import.meta.url));

const themeMarker = '[data-fd-theme="assistant-ui"]';

const selectors = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{};]+)\{/g)]
    .map(([, prelude]) => prelude!.trim().replace(/\s+/g, " "))
    .filter((prelude) => !prelude.startsWith("@"));

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
