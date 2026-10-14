import { describe, expect, it } from "vitest";
import jscodeshift, { type API } from "jscodeshift";
import transform from "../ui-package-split";

const j = jscodeshift.withParser("tsx");
const api: API = { jscodeshift: j, j, stats: () => {}, report: () => {} };
const apply = (source: string) =>
  transform({ path: "app.tsx", source }, api, {});

describe("ui package split", () => {
  it("preserves an aliased moved binding beside the same exported name", () => {
    const output =
      apply(`import { Thread as MigratedThread } from "@assistant-ui/react";
import { Thread as ExistingThread } from "@assistant-ui/react-ui";
const thread = MigratedThread;`)!;
    const imports = j(output)
      .find(j.ImportDeclaration, {
        source: { value: "@assistant-ui/react-ui" },
      })
      .nodes();

    expect(
      imports.flatMap((declaration) =>
        declaration.specifiers?.map((specifier) => specifier.local?.name),
      ),
    ).toEqual(expect.arrayContaining(["MigratedThread", "ExistingThread"]));
    expect(output).toContain("const thread = MigratedThread;");
  });

  it("preserves a moved binding beside a namespace import", () => {
    const output = apply(`import { Thread } from "@assistant-ui/react";
import * as ui from "@assistant-ui/react-ui";
const thread = Thread;`)!;
    const imports = j(output)
      .find(j.ImportDeclaration, {
        source: { value: "@assistant-ui/react-ui" },
      })
      .nodes();

    expect(
      imports.flatMap((declaration) =>
        declaration.specifiers?.map((specifier) => specifier.local?.name),
      ),
    ).toEqual(expect.arrayContaining(["Thread", "ui"]));
    expect(output).toContain("const thread = Thread;");
  });

  it("keeps a moved value import out of an existing type declaration", () => {
    const output = apply(`import { Composer } from "@assistant-ui/react";
import type { ThreadConfig } from "@assistant-ui/react-ui";
const composer = Composer;`)!;
    const imports = j(output)
      .find(j.ImportDeclaration, {
        source: { value: "@assistant-ui/react-ui" },
      })
      .nodes();
    const valueImport = imports.find((declaration) =>
      declaration.specifiers?.some(
        (specifier) => specifier.local?.name === "Composer",
      ),
    );

    expect(valueImport).toBeDefined();
    expect(valueImport?.importKind).not.toBe("type");
    expect(output).toContain("const composer = Composer;");
  });

  it("keeps the declaration-level type kind when splitting an import", () => {
    const output = apply(
      'import type { ThreadConfig, AssistantRuntime } from "@assistant-ui/react";',
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
  });
});
