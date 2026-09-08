import { describe, expect, it } from "vitest";
import {
  cleanupImports,
  extractFunctionCode,
  filterRelevantImports,
} from "./preview-code-extract";

const source = `
import type { FC, ReactNode } from "react";

export function PlainSpecimen() {
  return <div>{"}"}</div>;
}

export function AnnotatedSpecimen(): ReactNode {
  return (
    <div>
      <span>ok</span>
    </div>
  );
}

export function TrailingSpecimen() {
  return <div>trailing</div>;
}

export const TypedSpecimen: FC = () => {
  return <div>typed</div>;
};

export const ExpressionSpecimen = () => (
  <div>
    <span>expression</span>
  </div>
);

export const BareExpressionSpecimen = () => <div>bare expression</div>;

export const EntitySpecimen = () => <div>bare&nbsp;entity; text</div>;

export const JsxCommentSpecimen = () => <div>text; // note</div>;

export const TrailingCommentSpecimen = () => <div>commented</div>; // note

export const UnbalancedSpecimen = () => <div>close with }</div>;

export function GuardSpecimen() {
  return <div>guard</div>;
}

export const CompoundSpecimen = () => (compose)();
`;

describe("extractFunctionCode", () => {
  it("extracts a plain function", () => {
    const code = extractFunctionCode(source, "PlainSpecimen");
    expect(code).toContain("export function PlainSpecimen()");
    expect(code.endsWith("}")).toBe(true);
    expect(code).toContain('{"}"}');
    expect(code).not.toContain("AnnotatedSpecimen");
  });

  it("extracts a function with a return type annotation", () => {
    const code = extractFunctionCode(source, "AnnotatedSpecimen");
    expect(code).toContain("export function AnnotatedSpecimen(): ReactNode {");
    expect(code).toContain("<span>ok</span>");
    expect(code.endsWith("}")).toBe(true);
    expect(code).not.toContain("TrailingSpecimen");
  });

  it("extracts a const arrow with a type annotation", () => {
    const code = extractFunctionCode(source, "TypedSpecimen");
    expect(code).toContain("export const TypedSpecimen: FC = () => {");
    expect(code).toContain("<div>typed</div>");
    expect(code.endsWith("}")).toBe(true);
    expect(code).not.toContain("ExpressionSpecimen");
  });

  it("extracts a const arrow with a parenthesized expression body", () => {
    const code = extractFunctionCode(source, "ExpressionSpecimen");
    expect(code).toContain("export const ExpressionSpecimen = () => (");
    expect(code).toContain("<span>expression</span>");
    expect(code.endsWith(");")).toBe(true);
    expect(code).not.toContain("GuardSpecimen");
  });

  it("extracts a const arrow with a bare expression body", () => {
    const code = extractFunctionCode(source, "BareExpressionSpecimen");
    expect(code).toBe(
      "export const BareExpressionSpecimen = () => <div>bare expression</div>;",
    );
    expect(code).not.toContain("GuardSpecimen");
  });

  it("extracts a bare expression body past semicolons in its JSX text", () => {
    const code = extractFunctionCode(source, "EntitySpecimen");
    expect(code).toBe(
      "export const EntitySpecimen = () => <div>bare&nbsp;entity; text</div>;",
    );
    expect(code).not.toContain("GuardSpecimen");
  });

  it("extracts past a comment marker inside JSX text", () => {
    const code = extractFunctionCode(source, "JsxCommentSpecimen");
    expect(code).toBe(
      "export const JsxCommentSpecimen = () => <div>text; // note</div>;",
    );
    expect(code).not.toContain("GuardSpecimen");
  });

  it("reports a bare expression body trailed by a line comment", () => {
    expect(extractFunctionCode(source, "TrailingCommentSpecimen")).toBe(
      "// Could not parse function: TrailingCommentSpecimen",
    );
  });

  it("reports a bare expression body whose delimiters lost sync", () => {
    expect(extractFunctionCode(source, "UnbalancedSpecimen")).toBe(
      "// Could not parse function: UnbalancedSpecimen",
    );
  });

  it("reports an arrow whose parens cover only part of the body", () => {
    expect(extractFunctionCode(source, "CompoundSpecimen")).toBe(
      "// Could not parse function: CompoundSpecimen",
    );
  });

  it("keeps imports only for identifiers the code uses as words", () => {
    const imports = [
      'import { Button } from "@/components/ui/button";',
      'import { Table } from "@/components/ui/table";',
    ];
    const code = "<Table>Buttons, inputs, menu items</Table>";
    expect(filterRelevantImports(imports, code)).toEqual([
      'import { Table } from "@/components/ui/table";',
    ]);
  });

  it("keeps an import bound under an alias or an inline type specifier", () => {
    const imports = [
      'import { Button as Action } from "@/components/ui/button";',
      'import { useState, type ReactNode } from "react";',
      'import { Table } from "@/components/ui/table";',
    ];
    const code = "const node: ReactNode = <Action />;";
    expect(filterRelevantImports(imports, code)).toEqual([
      'import { Button as Action } from "@/components/ui/button";',
      'import { useState, type ReactNode } from "react";',
    ]);
  });

  it("reports a missing function", () => {
    expect(extractFunctionCode(source, "Missing")).toBe(
      "// Could not find function: Missing",
    );
  });
});

describe("cleanupImports", () => {
  it("strips the .radix suffix from two-segment and nested paths", () => {
    expect(
      cleanupImports([
        'import { Button } from "@/components/ui/button.radix";',
        'import { ModelSelectorRoot } from "@/components/assistant-ui/elements/model-selector.radix";',
      ]),
    ).toEqual([
      'import { Button } from "@/components/ui/button";',
      'import { ModelSelectorRoot } from "@/components/assistant-ui/elements/model-selector";',
    ]);
  });
});

describe("every real preview extracts", () => {
  // Extraction failure is silent at authoring time: the page renders the
  // marker where the snippet should be, and nothing else notices. This sweep
  // covers every previewed source rather than a fixture so that an input the
  // scanner cannot read fails here instead of on the published page.
  it("extracts every <PreviewCode> pair referenced from content", async () => {
    const { readdirSync, readFileSync, existsSync } = await import("node:fs");
    const { join, resolve } = await import("node:path");

    const docsRoot = resolve(__dirname, "../../..");
    const mdxFiles: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".mdx")) mdxFiles.push(full);
      }
    };
    walk(join(docsRoot, "content"));

    // Every <PreviewCode occurrence must yield a parsed pair, so a call site
    // the pair regex cannot read (attribute reordering, an expression
    // attribute containing ">") fails the sweep instead of silently leaving
    // that preview unguarded.
    let occurrences = 0;
    let parsed = 0;
    const pairs = new Map<string, { file: string; name: string }>();
    for (const mdxFile of mdxFiles) {
      const mdx = readFileSync(mdxFile, "utf8");
      occurrences += mdx.match(/<PreviewCode[\s>]/g)?.length ?? 0;
      for (const match of mdx.matchAll(
        /<PreviewCode\s[^>]*?file="([^"]+)"[^>]*?name="([^"]+)"/gs,
      )) {
        parsed += 1;
        const file = match[1]!;
        const name = match[2]!;
        pairs.set(JSON.stringify([file, name]), { file, name });
      }
    }
    expect(occurrences).toBeGreaterThan(0);
    expect(parsed).toBe(occurrences);

    const failures: string[] = [];
    const checkExtraction = (sourceFile: string, name: string) => {
      const source = readFileSync(sourceFile, "utf8");
      const extracted = extractFunctionCode(source, name);
      if (extracted.startsWith("// Could not")) {
        failures.push(`${sourceFile}#${name}: ${extracted}`);
        return;
      }
      // A phantom string that never closes already produces the marker above.
      // This catches the other half: one that closes, having swallowed a lone
      // opening delimiter, ends the region early at a boundary that still
      // reads as code.
      const endIndex = source.indexOf(extracted) + extracted.length;
      const rest = source.slice(endIndex).replace(/^[\s;]*/, "");
      if (
        rest !== "" &&
        !/^(export\s|import\s|const\s|let\s|var\s|class\s|function\s|async\s|type\s|interface\s|["']use client["']|\/\/|\/\*)/.test(
          rest,
        )
      ) {
        failures.push(
          `${sourceFile}#${name}: truncated extraction (resumes at ${JSON.stringify(rest.slice(0, 40))})`,
        );
      }
    };

    for (const { file, name } of pairs.values()) {
      const base = join(docsRoot, `${file}.tsx`);
      const radix = join(docsRoot, `${file}.radix.tsx`);
      if (existsSync(radix)) checkExtraction(radix, name);
      if (existsSync(base)) checkExtraction(base, name);
      if (!existsSync(base) && !existsSync(radix)) {
        failures.push(`${file}#${name}: source file missing`);
      }
    }
    expect(failures).toEqual([]);
  });
});
