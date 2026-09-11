import { Project } from "ts-morph";
import {
  cleanSignatureText,
  cleanTypeText,
  extractSignature,
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
