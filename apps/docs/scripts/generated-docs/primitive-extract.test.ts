import { Project } from "ts-morph";
import { getPrimitiveComponentMeta } from "./primitive-extract.mts";

const project = new Project({
  useInMemoryFileSystem: true,
  compilerOptions: { lib: ["lib.es2023.d.ts"] },
});

afterEach(() => {
  for (const sourceFile of project.getSourceFiles()) {
    project.removeSourceFile(sourceFile);
  }
});

const DOC = [
  "/**",
  " * Renders the parts.",
  " *",
  " * @example",
  " * ```tsx",
  " * <Parts />",
  " * ```",
  " */",
].join("\n");

describe("primitive component docs", () => {
  it("reads the description and example of a component declared as a const", () => {
    const sourceFile = project.createSourceFile(
      "Parts.tsx",
      [
        "export namespace Parts { export type Props = {}; }",
        DOC,
        "export const Parts = (_props: Parts.Props) => null;",
        'Parts.displayName = "Parts";',
      ].join("\n"),
    );

    const meta = getPrimitiveComponentMeta(sourceFile, "Parts");

    expect(meta.description).toBe("Renders the parts.");
    expect(meta.examples).toEqual(["```tsx\n<Parts />\n```"]);
  });

  it("reads the description and example of a component declared as a function", () => {
    const sourceFile = project.createSourceFile(
      "Parts.tsx",
      [
        "export namespace Parts { export type Props = {}; }",
        DOC,
        "export function Parts(_props: Parts.Props) { return null; }",
        'Parts.displayName = "Parts";',
      ].join("\n"),
    );

    const meta = getPrimitiveComponentMeta(sourceFile, "Parts");

    expect(meta.description).toBe("Renders the parts.");
    expect(meta.examples).toEqual(["```tsx\n<Parts />\n```"]);
  });
});
