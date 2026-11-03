// @vitest-environment jsdom

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ELEMENT_STATES } from "./index";
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

      it("renders every fixture", () => {
        for (const state of states) {
          if (!state.Component) continue;
          const html = renderToString(<state.Component />);
          expect(html.length, state.key).toBeGreaterThan(0);
        }
      });
    });
  }
});
