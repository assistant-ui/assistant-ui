import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { checkSource, runCheck } from "./check-experimental.mjs";
import { experimentalTag } from "./lib/experimental-annotations.mjs";

const TAG = `@deprecated ${experimentalTag("2026-06-23")}`;

const check = (source, today = "2026-10-09") =>
  checkSource({ file: "src/index.ts", source, today });

test("accepts the tag on every kind of experimental declaration", () => {
  assert.deepEqual(
    check(
      [
        `/** ${TAG} */`,
        "export const unstable_value = 1;",
        `/** ${TAG} */`,
        "export function unstable_run() {}",
        `/** ${TAG} */`,
        "export type Unstable_Options = {",
        `  /** ${TAG} */`,
        "  unstable_flag?: boolean;",
        `  /** ${TAG} */`,
        "  unstable_on(event: string): void;",
        "};",
        "export class Runtime {",
        `  /** ${TAG} */`,
        "  unstable_reset(): void {}",
        `  /** ${TAG} */`,
        "  get unstable_copy() { return 1; }",
        "}",
        "/**",
        " * Renders one message by id.",
        " *",
        ` * ${TAG}`,
        " */",
        "export const ThreadPrimitiveUnstable_MessageById = () => null;",
      ].join("\n"),
    ),
    [],
  );
});

test("reports an experimental declaration without the tag", () => {
  assert.deepEqual(
    check(
      [
        "export const unstable_value = 1;",
        "type Wire = { unstable_state?: unknown };",
        "export class Runtime { unstable_reset(): void {} }",
        "const helpers = { unstable_local() {} };",
      ].join("\n"),
    ),
    [
      'src/index.ts:1 (unstable_value): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
      'src/index.ts:2 (unstable_state): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
      'src/index.ts:3 (unstable_reset): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
    ],
  );
});

test("requires the tag on the specifier that renames into an experimental name", () => {
  assert.deepEqual(
    check(
      [
        "export {",
        `  /** ${TAG} */`,
        "  convert as unstable_convert,",
        "  memoize as unstable_memoize,",
        "} from './convert';",
        "export type { Cache as Unstable_Cache } from './convert';",
        "export { ThreadPrimitiveUnstable_MessageById as Unstable_MessageById } from './thread';",
      ].join("\n"),
    ),
    [
      'src/index.ts:4 (unstable_memoize): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
      'src/index.ts:6 (Unstable_Cache): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
    ],
  );
});

test("rejects a tag that TypeScript never applies to the export", () => {
  assert.deepEqual(
    check(
      [
        `/** ${TAG} */`,
        "export { convert as unstable_convert } from './convert';",
        "/** @deprecated Use `TriggerPopover` instead. */",
        "export { TriggerPopover as Unstable_TriggerPopover } from './trigger';",
      ].join("\n"),
    ),
    [
      "src/index.ts:2 (export): TypeScript ignores @deprecated above an export statement; move it onto the specifier inside the braces.",
      'src/index.ts:2 (unstable_convert): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
      "src/index.ts:4 (export): TypeScript ignores @deprecated above an export statement; move it onto the specifier inside the braces.",
      'src/index.ts:4 (Unstable_TriggerPopover): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
    ],
  );
});

test("parses a .ts file as TypeScript, so a generic arrow cannot hide later declarations", () => {
  assert.deepEqual(
    checkSource({
      file: "src/state.ts",
      source: [
        "const read = <TState>(value: TState) => value;",
        "export const unstable_useState = read;",
      ].join("\n"),
      today: "2026-10-09",
    }),
    [
      'src/state.ts:2 (unstable_useState): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
    ],
  );
});

test("rejects a copy of the tag on a plain re-export", () => {
  assert.deepEqual(
    check(
      [
        "export {",
        `  /** ${TAG} */`,
        "  unstable_useThing,",
        "  /** @deprecated Unstable / Experimental, may change in any release. */",
        "  unstable_useOther,",
        "  /** @deprecated Import from `@assistant-ui/core` instead. */",
        "  unstable_moved,",
        "} from './things';",
      ].join("\n"),
    ),
    [
      "src/index.ts:3 (unstable_useThing): inherits the annotation of the declaration it re-exports; remove this copy.",
      "src/index.ts:5 (unstable_useOther): inherits the annotation of the declaration it re-exports; remove this copy.",
    ],
  );
});

test("accepts a removal notice in place of the experimental tag", () => {
  assert.deepEqual(
    check(
      [
        "/** @deprecated Use `TriggerMatcher` instead. */",
        "export type Unstable_TriggerMatcher = TriggerMatcher;",
        "export {",
        "  /** @deprecated Use `ComposerPrimitive.TriggerPopover` instead. */",
        "  ComposerPrimitiveTriggerPopover as Unstable_TriggerPopover,",
        "} from './trigger';",
      ].join("\n"),
    ),
    [],
  );
});

test("rejects the free-prose wordings the tag replaced", () => {
  assert.deepEqual(
    check(
      [
        "/** @deprecated Unstable / Experimental (not actually removed). */",
        "export const unstable_a = 1;",
        "/** @deprecated This API is still under active development and might change without notice. */",
        "export const unstable_b = 1;",
        "/** @deprecated Under active development and may change without notice. */",
        "export const unstable_c = 1;",
        "/** @deprecated Experimental, API may change. */",
        "export function streamCall() {}",
        "/** @deprecated This API is experimental and may change without notice. */",
        "export const fromThreadMessageLike = () => null;",
      ].join("\n"),
    ),
    [
      'src/index.ts:2 (unstable_a): describes an experimental API in free prose; use "Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
      'src/index.ts:4 (unstable_b): describes an experimental API in free prose; use "Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
      'src/index.ts:6 (unstable_c): describes an experimental API in free prose; use "Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
      'src/index.ts:8 (streamCall): must read "Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release."',
      'src/index.ts:10 (fromThreadMessageLike): describes an experimental API in free prose; use "Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
    ],
  );
});

test("accepts the tag on an experimental API that never took the prefix", () => {
  assert.deepEqual(
    check(`/** ${TAG} */\nexport function useAuiToolOverrides() {}`),
    [],
  );
});

test("rejects a block whose description restates the tag", () => {
  assert.deepEqual(
    check(
      [
        "/**",
        " * Unstable / Experimental, the interactables API may change in any release.",
        ` * ${TAG}`,
        " */",
        "export type Unstable_InteractableConfig = {};",
      ].join("\n"),
    ),
    [
      "src/index.ts:5 (Unstable_InteractableConfig): the description restates the stability the tag already states.",
    ],
  );
});

test("rejects a tag that opens with the description it should follow", () => {
  assert.deepEqual(
    check(
      [
        "/**",
        ` * ${TAG}`,
        " *",
        " * Headless bridge to the composer's text value.",
        " */",
        "export function unstable_useComposerInput() {}",
      ].join("\n"),
    ),
    [
      'src/index.ts:6 (unstable_useComposerInput): must read "Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release."',
    ],
  );
});

test("rejects merged declarations that disagree on their lifecycle", () => {
  assert.deepEqual(
    check(
      [
        `/** ${TAG} */`,
        "export namespace MessagePrimitiveUnstable_PartsGrouped {",
        "  export type Props = {};",
        "}",
        "/** @deprecated Prefer `MessagePrimitive.GroupedParts`. */",
        "export const MessagePrimitiveUnstable_PartsGrouped = () => null;",
        `/** ${TAG} */`,
        "export namespace ThreadPrimitiveUnstable_MessageById {}",
        `/** ${TAG} */`,
        "export const ThreadPrimitiveUnstable_MessageById = () => null;",
      ].join("\n"),
    ),
    [
      "src/index.ts:6 (MessagePrimitiveUnstable_PartsGrouped): carries a different @deprecated than another declaration merged under this name.",
    ],
  );
});

test("reads the tag TypeScript applies to one declarator of a statement", () => {
  assert.deepEqual(
    check(
      [
        `export const stable = 1, /** ${TAG} */ unstable_value = 2;`,
        "export const other = 1, unstable_other = 2;",
      ].join("\n"),
    ),
    [
      'src/index.ts:2 (unstable_other): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
    ],
  );
});

test("compares merged declarations inside namespaces and classes", () => {
  assert.deepEqual(
    check(
      [
        "export namespace Runtime {",
        `  /** ${TAG} */`,
        "  export interface Unstable_Options { a?: string }",
        "  /** @deprecated Use `Options` instead. */",
        "  export interface Unstable_Options { b?: string }",
        "}",
        "export class Client {",
        `  /** ${TAG} */`,
        "  unstable_run(a: string): void;",
        "  /** @deprecated Use `run` instead. */",
        "  unstable_run(a: number): void;",
        `  /** ${TAG} */`,
        "  unstable_run(a: unknown) {}",
        "}",
        `/** ${TAG} */`,
        "export interface Unstable_Options {}",
      ].join("\n"),
    ),
    [
      "src/index.ts:5 (Unstable_Options): carries a different @deprecated than another declaration merged under this name.",
      "src/index.ts:11 (unstable_run): carries a different @deprecated than another declaration merged under this name.",
    ],
  );
});

test("leaves declarations inside implementations out of the API", () => {
  assert.deepEqual(
    check(
      [
        "export function run() {",
        "  const unstable_local = 1;",
        `  /** ${TAG} */`,
        "  const unstable_tagged = unstable_local;",
        "  return {} as { unstable_cast?: string };",
        "}",
        "export const read = (options: { unstable_option?: boolean }) => options;",
        "export const Input = forwardRef<HTMLInputElement, { unstable_flag?: boolean }>(() => null);",
      ].join("\n"),
    ),
    [
      "src/index.ts:4 (unstable_tagged): a declaration inside an implementation is not API; remove the tag.",
      'src/index.ts:7 (unstable_option): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
      'src/index.ts:8 (unstable_flag): experimental API without "@deprecated Experimental since <YYYY-MM-DD>. Not scheduled for removal; the API may change in any release.".',
    ],
  );
});

test("rejects an @experimental tag beside the experimental @deprecated tag", () => {
  assert.deepEqual(
    check(
      [
        "/**",
        ` * ${TAG}`,
        " * @experimental This API is experimental and may change in future versions.",
        " */",
        "export const unstable_flag = true;",
      ].join("\n"),
    ),
    [
      "src/index.ts:5 (unstable_flag): @experimental duplicates the experimental @deprecated tag; use that tag instead.",
    ],
  );
});

test("rejects a second @deprecated tag and an empty one", () => {
  assert.deepEqual(
    check(
      [
        "/**",
        ` * ${TAG}`,
        " * @deprecated Use `PartsGrouped` instead.",
        " */",
        "export const unstable_a = 1;",
        "/** @deprecated */",
        "export const unstable_b = 1;",
      ].join("\n"),
    ),
    [
      "src/index.ts:5 (unstable_a): carries more than one @deprecated tag.",
      "src/index.ts:7 (unstable_b): @deprecated carries no text.",
    ],
  );
});

test("rejects a ship date later than tomorrow in UTC", () => {
  const source = (since) =>
    `/** @deprecated ${experimentalTag(since)} */\nexport const unstable_a = 1;`;
  assert.deepEqual(check(source("2026-10-10")), []);
  assert.deepEqual(check(source("2026-10-11")), [
    "src/index.ts:2 (unstable_a): ships in the future (2026-10-11).",
  ]);
});

test("checks package sources and skips tests and files outside src", () => {
  const root = mkdtempSync(path.join(tmpdir(), "aui-experimental-"));
  try {
    const write = (file, source) => {
      mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      writeFileSync(path.join(root, file), source);
    };
    write("packages/a/src/index.ts", "export const unstable_a = 1;");
    write("packages/a/src/nested/view.tsx", "export const unstable_b = 1;");
    write("packages/a/src/index.test.ts", "export const unstable_c = 1;");
    write(
      "packages/a/src/__tests__/fixture.ts",
      "export const unstable_d = 1;",
    );
    write("packages/a/scripts/build.ts", "export const unstable_e = 1;");
    write("packages/b/README.md", "unstable_f");

    const { files, errors } = runCheck({ root, today: "2026-10-09" });
    assert.deepEqual(
      files.map((file) => path.relative(root, file)),
      ["packages/a/src/index.ts", "packages/a/src/nested/view.tsx"],
    );
    assert.deepEqual(
      errors.map((error) => error.split(" ")[0]),
      ["packages/a/src/index.ts:1", "packages/a/src/nested/view.tsx:1"],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
