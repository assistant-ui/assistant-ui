import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { checkTsBlocks, type TsBlockResult } from "./ts-blocks";

const ROOT = path.resolve(__dirname, "../../..");
const BASELINE = path.join(__dirname, "docs-ts-blocks.baseline.json");

const UNCHECKED = [
  // being rewritten; they join the check once that lands
  /^apps\/docs\/content\/docs\/tools\//,
  /^apps\/docs\/content\/docs\/\(reference\)\/api-reference\/tools\//,
  // written for older `ai` majors than the workspace installs
  /^apps\/docs\/content\/docs\/runtimes\/ai-sdk\/v\d-legacy\.mdx$/,
];

const PAGES = ["docs", "elements", "examples"]
  .flatMap((section) =>
    readdirSync(path.join(ROOT, "apps/docs/content", section), {
      recursive: true,
    }).map((file) => `apps/docs/content/${section}/${file}`),
  )
  .filter((file) => /\.mdx?$/.test(file))
  .filter((file) => !UNCHECKED.some((pattern) => pattern.test(file)))
  .filter((file) =>
    /^\s*(`{3,}|~{3,})(ts|tsx|typescript)(\s|$)/m.test(
      readFileSync(path.join(ROOT, file), "utf8"),
    ),
  )
  .sort();

/** An error named by its code and the page line it sits on, so the list
 *  survives edits elsewhere on the page and changes in type text. */
function signatures(results: TsBlockResult[]) {
  const byPage: Record<string, string[]> = {};
  const messages = new Map<string, string>();
  const lines = new Map<string, string[]>();
  for (const result of results) {
    if (!result.errors.length) continue;
    if (!lines.has(result.page))
      lines.set(
        result.page,
        readFileSync(path.join(ROOT, result.page), "utf8").split("\n"),
      );
    for (const error of result.errors) {
      const [, line, code] = /^(\d+):\d+ (TS\d+)/.exec(error)!;
      const text = lines.get(result.page)![Number(line) - 1]!.trim();
      const signature = `${code} ${text.slice(0, 120)}`;
      (byPage[result.page] ??= []).push(signature);
      messages.set(`${result.page}\0${signature}`, `${result.page}:${error}`);
    }
  }
  for (const list of Object.values(byPage)) list.sort();
  return { byPage, messages };
}

const difference = (a: string[], b: string[]) => {
  const left = [...b];
  return a.filter((item) => {
    const index = left.indexOf(item);
    if (index === -1) return true;
    left.splice(index, 1);
    return false;
  });
};

describe("TypeScript blocks in the docs", () => {
  let checked: Awaited<ReturnType<typeof checkTsBlocks>>;
  beforeAll(async () => {
    checked = await checkTsBlocks(PAGES);
  }, 180_000);

  it("finds the blocks", () => {
    expect(checked.results.length).toBeGreaterThan(1500);
  });

  it("compiles the checker's own files", () => {
    expect(checked.checkerErrors).toEqual([]);
  });

  // Every block must type-check against the workspace's packages. Blocks
  // that failed when this check landed are listed in the baseline, by page;
  // the list may only shrink. Run with UPDATE_DOCS_TS_BASELINE=1 to rewrite
  // it after fixing a block.
  it("fail only where the baseline says", () => {
    const { byPage: current, messages } = signatures(checked.results);
    if (process.env.UPDATE_DOCS_TS_BASELINE) {
      writeFileSync(BASELINE, `${JSON.stringify(current, null, 2)}\n`);
      return;
    }
    const baseline: Record<string, string[]> = JSON.parse(
      readFileSync(BASELINE, "utf8"),
    );
    const added: string[] = [];
    const fixed: string[] = [];
    for (const page of new Set([
      ...Object.keys(current),
      ...Object.keys(baseline),
    ])) {
      const now = current[page] ?? [];
      const before = baseline[page] ?? [];
      added.push(
        ...difference(now, before).map((signature) =>
          messages.get(`${page}\0${signature}`)!,
        ),
      );
      fixed.push(...difference(before, now).map((sig) => `${page}: ${sig}`));
    }
    expect(added, "new type errors in docs code blocks").toEqual([]);
    expect(
      fixed,
      "fixed: remove these from docs-ts-blocks.baseline.json (UPDATE_DOCS_TS_BASELINE=1)",
    ).toEqual([]);
  });
});
