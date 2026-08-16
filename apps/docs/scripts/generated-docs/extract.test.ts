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
});
