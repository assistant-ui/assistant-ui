import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { diffApiSurface, diffExportsMap } from "./diff-api-surface.mjs";

const base = `
type Shared = string;

interface Widget {
  value: Shared;
}

declare namespace entry_root_exports {
  export { Widget };
}

export { entry_root_exports as entry_root };
`;

const empty = {
  entriesAdded: [],
  entriesRemoved: [],
  exportsAdded: {},
  exportsRemoved: {},
  declarationsChanged: [],
  changed: false,
};

test("new entry namespace reports its entry and public exports", () => {
  const head = base.replace(
    "export { entry_root_exports as entry_root };",
    `declare function preprocess(input: string): string;

declare namespace entry_preprocess_exports {
  export { preprocess as run };
}

export { entry_preprocess_exports as entry_preprocess, entry_root_exports as entry_root };`,
  );
  assert.deepEqual(diffApiSurface(base, head), {
    ...empty,
    entriesAdded: ["entry_preprocess"],
    exportsAdded: { entry_preprocess: ["run"] },
    changed: true,
  });
});

test("appending an export does not change existing declarations", () => {
  const head = base
    .replace(
      "type Shared = string;",
      "type Shared = string;\ndeclare const extra: number;",
    )
    .replace("export { Widget };", "export { Widget, extra };");
  assert.deepEqual(diffApiSurface(base, head), {
    ...empty,
    exportsAdded: { entry_root: ["extra"] },
    changed: true,
  });
});

test("a changed interface member changes its public export", () => {
  const head = base.replace(
    "value: Shared;",
    "value: Shared;\n  count: number;",
  );
  assert.deepEqual(diffApiSurface(base, head), {
    ...empty,
    declarationsChanged: [{ entry: "entry_root", name: "Widget" }],
    changed: true,
  });
});

test("a changed non-exported dependency changes the public export", () => {
  const head = base.replace("type Shared = string;", "type Shared = number;");
  assert.deepEqual(diffApiSurface(base, head), {
    ...empty,
    declarationsChanged: [{ entry: "entry_root", name: "Widget" }],
    changed: true,
  });
});

test("a transitive non-exported dependency changes the public export", () => {
  const before = base.replace(
    "type Shared = string;",
    "type Inner = string;\ntype Shared = Inner;",
  );
  const head = before.replace("type Inner = string;", "type Inner = number;");
  assert.deepEqual(diffApiSurface(before, head), {
    ...empty,
    declarationsChanged: [{ entry: "entry_root", name: "Widget" }],
    changed: true,
  });
});

test("a type parameter does not reference a same-named top-level type", () => {
  const before = `type T = string;
interface Widget<T> { value: T; }
declare namespace entry_root_exports { export { Widget }; }
export { entry_root_exports as entry_root };`;
  assert.deepEqual(
    diffApiSurface(
      before,
      before.replace("type T = string;", "type T = number;"),
    ),
    empty,
  );
});

test("a referenced import changing modules changes the public export", () => {
  const before = `import { External } from "old-module";
interface Widget { value: External; }
declare namespace entry_root_exports { export { Widget }; }
export { entry_root_exports as entry_root };`;
  const head = before.replace('"old-module"', '"new-module"');
  assert.deepEqual(diffApiSurface(before, head), {
    ...empty,
    declarationsChanged: [{ entry: "entry_root", name: "Widget" }],
    changed: true,
  });
});

test("a referenced import changing its source name changes the public export", () => {
  const before = `import { External as Value } from "module";
interface Widget { value: Value; }
declare namespace entry_root_exports { export { Widget }; }
export { entry_root_exports as entry_root };`;
  const head = before.replace("External as Value", "Other as Value");
  assert.deepEqual(diffApiSurface(before, head), {
    ...empty,
    declarationsChanged: [{ entry: "entry_root", name: "Widget" }],
    changed: true,
  });
});

test("a removed public export is reported without a declaration change", () => {
  const before = base
    .replace(
      "type Shared = string;",
      "type Shared = string;\ndeclare const extra: number;",
    )
    .replace("export { Widget };", "export { Widget, extra };");
  assert.deepEqual(diffApiSurface(before, base), {
    ...empty,
    exportsRemoved: { entry_root: ["extra"] },
    changed: true,
  });
});

test("a removed entry reports both the entry and its exports", () => {
  assert.deepEqual(diffApiSurface(base, ""), {
    ...empty,
    entriesRemoved: ["entry_root"],
    exportsRemoved: { entry_root: ["Widget"] },
    changed: true,
  });
});

test("identical snapshots have no changes", () => {
  assert.deepEqual(diffApiSurface(base, base), empty);
});

test("null base reports all entries and exports as added", () => {
  assert.deepEqual(diffApiSurface(null, base), {
    ...empty,
    entriesAdded: ["entry_root"],
    exportsAdded: { entry_root: ["Widget"] },
    changed: true,
  });
});

test("null head reports all entries and exports as removed", () => {
  assert.deepEqual(diffApiSurface(base, null), {
    ...empty,
    entriesRemoved: ["entry_root"],
    exportsRemoved: { entry_root: ["Widget"] },
    changed: true,
  });
});

test("exports map supports shorthand and reports added, removed, and changed keys", () => {
  assert.deepEqual(
    diffExportsMap("./dist/index.js", { ".": "./dist/index.js" }),
    {
      added: [],
      removed: [],
      changed: [],
    },
  );
  assert.deepEqual(
    diffExportsMap(
      {
        ".": { types: null, default: "./dist/index.js" },
        "./old": "./dist/old.js",
      },
      {
        ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
        "./new": "./dist/new.js",
      },
    ),
    { added: ["./new"], removed: ["./old"], changed: ["."] },
  );
  assert.deepEqual(diffExportsMap(undefined, null), {
    added: [],
    removed: [],
    changed: [],
  });
});

const markdown = readFileSync(
  new URL("../api-surface/assistant-ui__react-markdown.ts", import.meta.url),
  "utf8",
);

test("real markdown snapshot is unchanged against itself", () => {
  assert.deepEqual(diffApiSurface(markdown, markdown), empty);
});

test("real markdown snapshot reports a removed preprocess entry", () => {
  const withoutPreprocess = markdown
    .replace(
      /\ndeclare namespace entry_preprocess_exports \{[\s\S]*?\n\}\n/,
      "\n",
    )
    .replace("entry_preprocess_exports as entry_preprocess, ", "");
  assert.notEqual(withoutPreprocess, markdown);
  const diff = diffApiSurface(markdown, withoutPreprocess);
  assert.deepEqual(diff.entriesRemoved, ["entry_preprocess"]);
  assert.deepEqual(diff.exportsRemoved.entry_preprocess, [
    "escapeCurrencyDollars",
    "normalizeMathDelimiters",
    "rewriteCustomMathTags",
    "rewriteLatexBracketDelimiters",
  ]);
  assert.equal(diff.changed, true);
});
