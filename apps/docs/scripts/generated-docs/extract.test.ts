import { Project } from "ts-morph";
import {
  cleanSignatureText,
  cleanTypeText,
  exportSpecifierDeprecated,
  extractSignature,
  processClassDeclaration,
  processTypeOrInterface,
} from "./extract.mts";

describe("signature text cleanup", () => {
  it("preserves undefined in callable return types", () => {
    const project = new Project({ useInMemoryFileSystem: true });
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
    const project = new Project({ useInMemoryFileSystem: true });
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
    const project = new Project({ useInMemoryFileSystem: true });
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
    const project = new Project({ useInMemoryFileSystem: true });
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
    const project = new Project({ useInMemoryFileSystem: true });
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
    const project = new Project({ useInMemoryFileSystem: true });
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
    const project = new Project({ useInMemoryFileSystem: true });
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
    const project = new Project({ useInMemoryFileSystem: true });
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
    const project = new Project({ useInMemoryFileSystem: true });
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
