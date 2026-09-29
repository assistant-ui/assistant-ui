import { Project } from "ts-morph";
import {
  cleanSignatureText,
  cleanTypeText,
  extractSignature,
  processClassDeclaration,
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
