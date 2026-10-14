import { describe, expect, it } from "vitest";
import jscodeshift, { type API } from "jscodeshift";
import transform from "./ui-package-split";

const j = jscodeshift.withParser("tsx");
const api: API = { jscodeshift: j, j, stats: () => {}, report: () => {} };
const apply = (source: string) =>
  transform({ path: "app.tsx", source }, api, {});

describe("v0.8 UI package split", () => {
  it.each([
    'import { Composer as ExistingComposer } from "@assistant-ui/react-ui";',
    'import * as ui from "@assistant-ui/react-ui";',
  ])("preserves the moved local binding beside %s", (existing) => {
    const output = apply(
      `import { Composer } from "@assistant-ui/react";\n${existing}\nconst composer = Composer;`,
    )!;

    expect(output).toContain(existing);
    const binding = j(output)
      .find(j.ImportDeclaration, {
        source: { value: "@assistant-ui/react-ui" },
      })
      .find(j.ImportSpecifier)
      .nodes()
      .filter((specifier) => specifier.local?.name === "Composer");

    expect(binding).toHaveLength(1);
    expect(binding[0]!.imported).toMatchObject({ name: "Composer" });
    expect(output).toContain("const composer = Composer;");
    expect(apply(output)).toBeNull();
  });

  it("preserves both local bindings when imports are aliased", () => {
    const output = apply(
      'import { Composer as MovedComposer } from "@assistant-ui/react";\nimport { Composer as ExistingComposer } from "@assistant-ui/react-ui";\nconst composer = MovedComposer;',
    )!;
    const bindings = j(output)
      .find(j.ImportDeclaration, {
        source: { value: "@assistant-ui/react-ui" },
      })
      .find(j.ImportSpecifier)
      .nodes()
      .filter((specifier) => specifier.imported.name === "Composer")
      .map((specifier) => specifier.local?.name)
      .sort();

    expect(bindings).toEqual(["ExistingComposer", "MovedComposer"]);
    expect(output).toContain("const composer = MovedComposer;");
    expect(apply(output)).toBeNull();
  });

  it("keeps declaration-level type imports type-only when splitting", () => {
    const output = apply(
      'import type { AssistantRuntimeProvider, Composer } from "@assistant-ui/react";',
    )!;
    const declarations = j(output).find(j.ImportDeclaration).nodes();

    expect(declarations).toHaveLength(2);
    expect(declarations.map((declaration) => declaration.importKind)).toEqual([
      "type",
      "type",
    ]);
    expect(declarations.map((declaration) => declaration.source.value)).toEqual(
      ["@assistant-ui/react", "@assistant-ui/react-ui"],
    );
    expect(apply(output)).toBeNull();
  });

  it("preserves specifier-level type imports when splitting", () => {
    const output = apply(
      'import { AssistantRuntimeProvider, type MakeMarkdownTextProps } from "@assistant-ui/react";',
    )!;
    const movedSpecifier = j(output)
      .find(j.ImportDeclaration, {
        source: { value: "@assistant-ui/react-ui" },
      })
      .find(j.ImportSpecifier)
      .nodes()[0]!;

    expect(movedSpecifier.local?.name).toBe("MakeMarkdownTextProps");
    expect(movedSpecifier).toMatchObject({ importKind: "type" });
  });
});
