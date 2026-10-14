import { describe, expect, it } from "vitest";
import jscodeshift, { type API } from "jscodeshift";
import transform from "./edge-package-split";

const j = jscodeshift.withParser("tsx");
const api: API = { jscodeshift: j, j, stats: () => {}, report: () => {} };
const apply = (source: string) =>
  transform({ path: "app.tsx", source }, api, {});

describe.each(["@assistant-ui/react", "@assistant-ui/react-edge"])(
  "edge migration from %s",
  (source) => {
    it.each([
      'import { useChatRuntime as existingRuntime } from "@assistant-ui/react-ai-sdk";',
      'import * as sdk from "@assistant-ui/react-ai-sdk";',
      'import { useChatRuntime as first } from "@assistant-ui/react-ai-sdk";\nimport { useChatRuntime as second } from "@assistant-ui/react-ai-sdk";',
      'import type { CoreMessage } from "@assistant-ui/react-ai-sdk";',
    ])("preserves the moved local binding beside %s", (existing) => {
      const output = apply(`import { useChatRuntime } from "${source}";
${existing}
const runtime = useChatRuntime;`)!;

      expect(output).toContain(existing);
      const imports = j(output)
        .find(j.ImportDeclaration, {
          source: { value: "@assistant-ui/react-ai-sdk" },
        })
        .nodes();
      const binding = imports.filter((declaration) =>
        declaration.specifiers?.some(
          (specifier) => specifier.local?.name === "useChatRuntime",
        ),
      );
      expect(binding).toHaveLength(1);
      expect(binding[0]!.importKind).not.toBe("type");
      expect(output).toContain("const runtime = useChatRuntime;");
      expect(apply(output)).toBeNull();
    });

    it("keeps declaration-level type imports type-only", () => {
      const output = apply(`import type { CoreMessage } from "${source}";
type Message = CoreMessage;`)!;
      const declaration = j(output).find(j.ImportDeclaration).nodes()[0]!;
      expect(declaration.source.value).toBe("@assistant-ui/react-ai-sdk");
      expect(declaration.importKind).toBe("type");
      expect(output).toContain("type Message = CoreMessage;");
    });
  },
);

it("keeps unrelated bindings and specifier-level type imports", () => {
  const output =
    apply(`import { AssistantRuntimeProvider, type CoreMessage, useChatRuntime as useRuntime } from "@assistant-ui/react";
export { AssistantRuntimeProvider, useRuntime };
export type { CoreMessage };`)!;
  const root = j(output);
  const declarations = root.find(j.ImportDeclaration).nodes();
  const retained = declarations.find(
    (declaration) => declaration.source.value === "@assistant-ui/react",
  )!;
  expect(
    retained.specifiers?.map((specifier) => specifier.local?.name),
  ).toEqual(["AssistantRuntimeProvider"]);
  const moved = root.find(j.ImportSpecifier).nodes();
  expect(
    moved.find((specifier) => specifier.local?.name === "CoreMessage"),
  ).toMatchObject({ importKind: "type" });
  expect(
    moved.find((specifier) => specifier.local?.name === "useRuntime")?.imported
      .name,
  ).toBe("useChatRuntime");
  expect(apply(output)).toBeNull();
});

it("keeps both halves of a split type declaration type-only", () => {
  const output = apply(
    'import type { AssistantRuntime, CoreMessage } from "@assistant-ui/react";',
  )!;
  const declarations = j(output).find(j.ImportDeclaration).nodes();
  expect(declarations).toHaveLength(2);
  expect(declarations.map((declaration) => declaration.importKind)).toEqual([
    "type",
    "type",
  ]);
  expect(declarations.map((declaration) => declaration.source.value)).toEqual([
    "@assistant-ui/react",
    "@assistant-ui/react-ai-sdk",
  ]);
});

it.each(["edge/converters", "dangerous-in-browser/converters"])(
  "continues migrating the %s subpath",
  (subpath) => {
    expect(
      apply(
        `export { toCoreMessages } from "@assistant-ui/react/${subpath}";\nimport { fromCoreMessages } from "@assistant-ui/react/${subpath}";`,
      ),
    ).toContain(`from "@assistant-ui/react-ai-sdk/${subpath}"`);
  },
);
