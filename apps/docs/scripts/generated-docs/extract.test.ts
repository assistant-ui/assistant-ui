import { Project } from "ts-morph";
import {
  cleanSignatureText,
  cleanTypeText,
  exportSpecifierDeprecated,
  extractSignature,
  processClassDeclaration,
  processComponentDeclaration,
  processTypeOrInterface,
} from "./extract.mts";

// The default lib adds 2 MB of DOM declarations that no fixture uses, and the first test to request a type parses them inside its timeout.
const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: { lib: ["lib.es2023.d.ts"] },
});

afterEach(() => {
  for (const sourceFile of project.getSourceFiles()) {
    project.removeSourceFile(sourceFile);
  }
});

describe("signature text cleanup", () => {
  it("preserves undefined in callable return types", () => {
    const sourceFile = project.createSourceFile(
      "hooks.ts",
      "export const useEveError = (): Error | undefined => undefined;",
    );
    const declaration = sourceFile.getVariableDeclarationOrThrow("useEveError");

    expect(extractSignature(declaration, "useEveError")).toBe(
      "const useEveError: () => Error | undefined;",
    );
    expect(cleanSignatureText("() => Error | undefined")).toBe(
      "() => Error | undefined",
    );
  });

  it("keeps property type cleanup separate from signature cleanup", () => {
    expect(cleanTypeText("Error | undefined")).toBe("Error");
  });

  it("deduplicates imported and re-exported local types", () => {
    project.createSourceFile(
      "/dedupe/adapters.ts",
      "export type WidgetAdapters = { foo?: string };",
    );
    const sourceFile = project.createSourceFile(
      "/dedupe/hook.ts",
      [
        'import type { WidgetAdapters } from "./adapters";',
        'export { WidgetAdapters } from "./adapters";',
        "export const useWidget = (): WidgetAdapters => ({});",
      ].join("\n"),
    );

    expect(
      extractSignature(
        sourceFile.getVariableDeclarationOrThrow("useWidget"),
        "useWidget",
      ),
    ).toBe(
      [
        "type WidgetAdapters = { foo?: string };",
        "const useWidget: () => WidgetAdapters;",
      ].join("\n\n"),
    );
  });
});

describe("class member descriptions", () => {
  it("keeps constructor, property and method prose without changing their shape", () => {
    const source = project.createSourceFile(
      "client.ts",
      `
      export class Client {
        /** Creates a client. */
        constructor() {}
        /** The optional **label**. */
        label?: string;
        /** Loads the next page. */
        load(): void {}
      }
    `,
    );
    expect(
      processClassDeclaration(source.getClassOrThrow("Client"), "Client"),
    ).toEqual([
      {
        name: "constructor",
        rawType: "() => Client",
        declaredType: "() => Client",
        description: "Creates a client.",
      },
      {
        name: "label",
        rawType: "string",
        declaredType: "string",
        description: "The optional **label**.",
      },
      {
        name: "load",
        rawType: "() => void",
        declaredType: "() => void",
        description: "Loads the next page.",
      },
    ]);
  });

  it("uses the configured JSDoc link renderer for each member kind", () => {
    const source = project.createSourceFile(
      "links.ts",
      `
      export class Client {
        /** Creates a {@link Client}. */
        constructor() {}
        /** See {@link Client | the client}. */
        label: string;
        /** Loads from {@link https://example.com | the service}. */
        load(): void {}
      }
    `,
    );
    const members = processClassDeclaration(
      source.getClassOrThrow("Client"),
      "Client",
      {
        linkResolver: (name) =>
          name === "Client" ? "/docs/client" : undefined,
      },
    );
    expect(members?.map((member) => member.description)).toEqual([
      "Creates a [Client](/docs/client).",
      "See [the client](/docs/client).",
      "Loads from [the service](https://example.com).",
    ]);
  });

  it("keeps undocumented members blank and excludes non-public members", () => {
    const source = project.createSourceFile(
      "visibility.ts",
      `
      export class Client {
        constructor() {}
        label: string;
        load(): void {}
        /** Shared default. */
        static shared: string;
        /** Private data. */
        private secret: string;
        /** Protected method. */
        protected internal(): void {}
      }
    `,
    );
    const members = processClassDeclaration(
      source.getClassOrThrow("Client"),
      "Client",
    );
    expect(
      members?.map(({ name, description }) => ({ name, description })),
    ).toEqual([
      { name: "constructor", description: "" },
      { name: "label", description: "" },
      { name: "static shared", description: "Shared default." },
      { name: "load", description: "" },
    ]);
  });
});

describe("deprecation tags", () => {
  const TAG =
    "@deprecated Experimental since 2026-06-23. Not scheduled for removal; the API may change in any release.";

  it("reads the tag on an export specifier and ignores one above the statement", () => {
    const source = project.createSourceFile(
      "barrel.ts",
      [
        "export {",
        `  /** ${TAG} */`,
        "  convert as unstable_convert,",
        "  /**",
        "   * @deprecated Use `TriggerPopover` instead.",
        "   * Removed in the next minor.",
        "   */",
        "  Popover as Unstable_TriggerPopover,",
        "  plain,",
        '} from "./convert";',
        `/** ${TAG} */`,
        'export { memoize as unstable_memoize } from "./memoize";',
      ].join("\n"),
    );
    const specifiers = source
      .getExportDeclarations()
      .flatMap((declaration) => declaration.getNamedExports());

    expect(specifiers.map(exportSpecifierDeprecated)).toEqual([
      TAG.slice("@deprecated ".length),
      "Use `TriggerPopover` instead.\nRemoved in the next minor.",
      undefined,
      undefined,
    ]);
  });

  it("follows re-exports to the specifier that carries the tag", () => {
    project.createSourceFile("/chain/base.ts", "export function convert() {}");
    project.createSourceFile(
      "/chain/middle.ts",
      [
        "export {",
        `  /** ${TAG} */`,
        "  convert as unstable_convert,",
        '} from "./base";',
      ].join("\n"),
    );
    const barrel = project.createSourceFile(
      "/chain/index.ts",
      [
        'export { unstable_convert } from "./middle";',
        'export { convert } from "./base";',
      ].join("\n"),
    );
    const specifiers = barrel
      .getExportDeclarations()
      .flatMap((declaration) => declaration.getNamedExports());

    expect(specifiers.map(exportSpecifierDeprecated)).toEqual([
      TAG.slice("@deprecated ".length),
      undefined,
    ]);
  });

  it("reads the tag on a specifier that exports a local declaration", () => {
    const source = project.createSourceFile(
      "/local/index.ts",
      [
        "function convert() {}",
        "export {",
        `  /** ${TAG} */`,
        "  convert as unstable_convert,",
        "};",
      ].join("\n"),
    );
    const [specifier] = source
      .getExportDeclarations()
      .flatMap((declaration) => declaration.getNamedExports());

    expect(specifier && exportSpecifierDeprecated(specifier)).toBe(
      TAG.slice("@deprecated ".length),
    );
  });

  it("marks an experimental property instead of reporting it deprecated", () => {
    const source = project.createSourceFile(
      "options.ts",
      [
        "export type Options = {",
        `  /** ${TAG} */`,
        "  unstable_flag?: boolean;",
        "  /** @deprecated Use `flag` instead. */",
        "  legacyFlag?: boolean;",
        "};",
      ].join("\n"),
    );
    const props = processTypeOrInterface(
      source.getTypeAliasOrThrow("Options"),
      "Options",
    );

    expect(
      props?.map(({ name, deprecated, experimental }) => ({
        name,
        deprecated,
        experimental,
      })),
    ).toEqual([
      { name: "unstable_flag", deprecated: undefined, experimental: true },
      {
        name: "legacyFlag",
        deprecated: "Use `flag` instead.",
        experimental: undefined,
      },
    ]);
  });
});

describe("resource props", () => {
  const resourceSource = (hook: string, tail: string) =>
    project.createSourceFile(
      "/resource/index.ts",
      `
      type Resource<V, A extends readonly unknown[] = any[]> = (...args: A) => { hook: unknown; value?: V };
      const resource = <R, A extends readonly unknown[]>(hook: (...args: A) => R): Resource<R, A> => (() => ({ hook })) as never;
      ${hook}
      ${tail}
    `,
    );

  it("documents the first hook argument of a resource as its props", () => {
    const source = resourceSource(
      `const useThing = (props: {
        /** Where to look. */
        toolkit?: string;
        count: number;
      }) => 1;`,
      "export const Thing = resource(useThing);",
    );

    expect(
      processComponentDeclaration(
        source.getVariableDeclarationOrThrow("Thing"),
        "Thing",
      )?.map(({ name, required, description }) => ({
        name,
        required,
        description,
      })),
    ).toEqual([
      { name: "toolkit", required: false, description: "Where to look." },
      { name: "count", required: true, description: undefined },
    ]);
  });

  it("has no props for a resource without arguments or with a list argument", () => {
    const source = resourceSource(
      `const useNone = () => 1;
      const useList = (items?: string[]) => 1;`,
      `export const None = resource(useNone);
      export const List = resource(useList);`,
    );

    for (const name of ["None", "List"]) {
      expect(
        processComponentDeclaration(
          source.getVariableDeclarationOrThrow(name),
          name,
        ),
      ).toBeUndefined();
    }
  });

  it("does not expand a resource element prop into its plumbing fields", () => {
    const source = project.createSourceFile(
      "/resource/element.ts",
      `
      type ResourceElement<V> = { readonly hook: (...args: any[]) => V; readonly args: readonly unknown[] };
      type ClientElement<K extends string> = ResourceElement<{ name: K }>;
      type DerivedElement<K extends string> = ResourceElement<{ derived: K }>;
      type ScopeElement = ClientElement<"thread">;
      export type Options = {
        direct?: ResourceElement<number> | undefined;
        aliased?: ClientElement<"thread"> | DerivedElement<"thread">;
        twiceAliased: ScopeElement;
        plain?: { depth: number };
      };
    `,
    );

    const props = processTypeOrInterface(
      source.getTypeAliasOrThrow("Options"),
      "Options",
    );

    expect(
      props?.map(({ name, children }) => ({ name, expanded: !!children })),
    ).toEqual([
      { name: "direct", expanded: false },
      { name: "aliased", expanded: false },
      { name: "twiceAliased", expanded: false },
      { name: "plain", expanded: true },
    ]);
  });
});

describe("non-object types", () => {
  it("does not document built-in members of primitive, list or tuple types", () => {
    const source = project.createSourceFile(
      "/non-object/types.ts",
      `
      export type Align = "start" | "end";
      export type Node = string | { component: string };
      export type Entry = [name: string, value: number];
      interface Template { template: { componentId: string } }
      export type Options<TEvent extends "a.b" | "c.d"> = {
        selector: TEvent | { scope: string; event: TEvent };
        children: readonly string[] | { componentId: string } | Template;
        plain: { depth: number };
      };
    `,
    );

    for (const name of ["Align", "Node", "Entry"]) {
      expect(
        processTypeOrInterface(source.getTypeAliasOrThrow(name), name),
      ).toBeUndefined();
    }
    expect(
      processTypeOrInterface(
        source.getTypeAliasOrThrow("Options"),
        "Options",
      )?.map(({ name, children }) => ({ name, expanded: !!children })),
    ).toEqual([
      { name: "selector", expanded: false },
      { name: "children", expanded: false },
      { name: "plain", expanded: true },
    ]);
  });
});
