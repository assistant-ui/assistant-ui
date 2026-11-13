// @vitest-environment jsdom

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_ONLY_STATE_SLUGS, ELEMENT_STATES } from "./index";
import { GENERATIVE_ELEMENTS } from "@/lib/generative-elements";
import { GENERATIVE_STATES } from "./generative";
import { DEFAULT_STATE_KEY, type ElementStates } from "./types";

const registrySource = readFileSync(
  join(process.cwd(), "components/pages/elements/registry.tsx"),
  "utf8",
);
const handwrittenSlugs = [
  ...registrySource
    .slice(registrySource.indexOf("export const ELEMENT_SECTIONS"))
    .matchAll(/^\s+slug: "([^"]+)",$/gm),
].map((match) => match[1]!);
const catalogSlugs = [
  ...handwrittenSlugs,
  ...GENERATIVE_ELEMENTS.map((entry) => entry.slug),
];

// jsdom lacks the layout APIs the elements observe; fixtures only need them to exist.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.assign(globalThis, {
  ResizeObserver: NoopObserver,
  IntersectionObserver: NoopObserver,
});
window.matchMedia ??= (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }) as MediaQueryList;
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.scrollTo ??= () => {};

const dir = join(process.cwd(), "components/demo/elements/states");
const NOT_STATE_FILES = new Set(["types.ts", "index.ts", "generative.tsx"]);
const stateFiles = readdirSync(dir)
  .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."))
  .filter((file) => !NOT_STATE_FILES.has(file));
const loaded = (await Promise.all(
  stateFiles.map((file) => import(`./${file.replace(/\.tsx?$/, "")}.tsx`)),
)) as { states: ElementStates }[];

describe("element states", () => {
  it("defines states for every catalog element", () => {
    expect(handwrittenSlugs.length).toBeGreaterThan(100);
    const missing = catalogSlugs.filter((slug) => !ELEMENT_STATES[slug]);
    expect(missing).toEqual([]);
  });

  it("keys states by real catalog slugs", () => {
    const slugs = new Set(catalogSlugs);
    const unknown = Object.keys(ELEMENT_STATES).filter((s) => !slugs.has(s));
    expect(unknown).toEqual([]);
  });

  it("keys every states file by its own slug", async () => {
    for (const [i, file] of stateFiles.entries()) {
      const slug = file.replace(/\.tsx?$/, "");
      expect(await ELEMENT_STATES[slug]?.(), slug).toBe(loaded[i]!.states);
    }
  });

  it("lists exactly the elements whose states hold only default", async () => {
    const defaultOnly: string[] = [];
    for (const slug of catalogSlugs) {
      const source = await ELEMENT_STATES[slug]?.();
      const states = Array.isArray(source)
        ? (source as ElementStates)
        : (source as Record<string, ElementStates> | undefined)?.[slug];
      if (states && states.length === 1) defaultOnly.push(slug);
    }
    expect(defaultOnly.sort()).toEqual([...DEFAULT_ONLY_STATE_SLUGS].sort());
  });

  it("loads the shared generative states for every generative slug", async () => {
    for (const { slug } of GENERATIVE_ELEMENTS) {
      expect(await ELEMENT_STATES[slug]?.(), slug).toBe(GENERATIVE_STATES);
      expect(GENERATIVE_STATES[slug], slug).toBeDefined();
    }
  });

  it("registers every states file in the index", () => {
    const index = readFileSync(join(dir, "index.ts"), "utf8");
    const unregistered = stateFiles.filter(
      (file) => !index.includes(`"./${file.replace(/\.tsx?$/, "")}"`),
    );
    expect(unregistered).toEqual([]);
  });

  const fromFiles = Object.entries(
    Object.fromEntries(
      stateFiles.map((file, i) => [
        file.replace(/\.tsx?$/, ""),
        loaded[i]!.states,
      ]),
    ),
  );
  for (const [slug, states] of [
    ...fromFiles,
    ...Object.entries(GENERATIVE_STATES),
  ]) {
    describe(slug, () => {
      it("starts with the default state and has well-formed entries", () => {
        expect(states[0].key).toBe(DEFAULT_STATE_KEY);
        const keys = states.map((state) => state.key);
        expect(new Set(keys).size, "duplicate state key").toBe(keys.length);
        for (const state of states) {
          expect(state.key, state.key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
          expect(state.label.length, state.label).toBeLessThanOrEqual(16);
          expect(
            state.label.split(" ").length,
            state.label,
          ).toBeLessThanOrEqual(2);
          expect(state.label[0], state.label).toBe(
            state.label[0]!.toUpperCase(),
          );
          if (state.key === DEFAULT_STATE_KEY) continue;
          expect(state.Component, `${state.key} has no fixture`).toBeTypeOf(
            "function",
          );
          expect(state.note, `${state.key} has no note`).toBeTruthy();
          expect(state.note, state.key).not.toMatch(/—/);
        }
      });

      it("renders every fixture", async () => {
        for (const state of states) {
          const Fixture = state.Component;
          if (!Fixture) continue;
          expect(() => renderToString(<Fixture />), state.key).not.toThrow();
          // Stands in for the state switcher: a fixture must not take focus on
          // mount, or arrowing onto its state leaves the radiogroup.
          const switcher = document.createElement("button");
          document.body.append(switcher);
          switcher.focus();
          const view = render(<Fixture />);
          await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
          const html = view.container.innerHTML;
          const focused = document.activeElement;
          view.unmount();
          switcher.remove();
          expect(
            focused === switcher,
            `${state.key} moves focus to ${focused?.outerHTML.slice(0, 80)}`,
          ).toBe(true);
          expect(
            />[^<\s]/.test(html) ||
              /<(svg|img|canvas|video|audio|iframe|input|textarea)\b/.test(
                html,
              ),
            `${state.key} renders no text or media`,
          ).toBe(true);
        }
      });
    });
  }
});
