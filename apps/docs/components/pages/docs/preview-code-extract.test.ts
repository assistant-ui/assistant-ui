import { describe, expect, it } from "vitest";
import {
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

describe("apostrophes in JSX text", () => {
  const apostropheSource = `
export function BraceApostrophe() {
  return <p>it's fine</p>;
}

export const WrappedApostrophe = () => (
  <p>it's fine</p>
);

export const BareApostrophe = () => <p>it's fine</p>;

export function AfterApostrophe() {
  return <div>after</div>;
}
`;

  it("extracts a brace-bodied function whose JSX text contains an apostrophe", () => {
    expect(extractFunctionCode(apostropheSource, "BraceApostrophe")).toBe(
      `export function BraceApostrophe() {
  return <p>it's fine</p>;
}`,
    );
  });

  it("extracts a paren-wrapped arrow whose JSX text contains an apostrophe", () => {
    expect(extractFunctionCode(apostropheSource, "WrappedApostrophe")).toBe(
      `export const WrappedApostrophe = () => (
  <p>it's fine</p>
);`,
    );
  });

  it("extracts a bare arrow whose JSX text contains an apostrophe", () => {
    expect(extractFunctionCode(apostropheSource, "BareApostrophe")).toBe(
      `export const BareApostrophe = () => <p>it's fine</p>;`,
    );
  });

  it("still treats a quote after an operator or keyword as a string open", () => {
    const stringSource = `
export function StringSpecimen() {
  const label = "What's the weather";
  return <div>{label + 'x;y'}</div>;
}
`;
    expect(extractFunctionCode(stringSource, "StringSpecimen")).toBe(
      `export function StringSpecimen() {
  const label = "What's the weather";
  return <div>{label + 'x;y'}</div>;
}`,
    );
  });

  it("extracts prose with a contraction after a non-ascii word", () => {
    const source = `
export const CafeSpecimen = () => <p>café's fine</p>;
`;
    expect(extractFunctionCode(source, "CafeSpecimen")).toBe(
      `export const CafeSpecimen = () => <p>café's fine</p>;`,
    );
  });

  it("tracks a keyword-adjacent literal as a string", () => {
    const source = `
export function CompactSpecimen() {
  return'foo}';
}
`;
    expect(extractFunctionCode(source, "CompactSpecimen")).toBe(
      `export function CompactSpecimen() {
  return'foo}';
}`,
    );
  });

  it("still tracks a tagged template literal as a string", () => {
    const taggedSource = `
export const TaggedSpecimen = () => css\`content: ")";\`;
`;
    expect(extractFunctionCode(taggedSource, "TaggedSpecimen")).toBe(
      'export const TaggedSpecimen = () => css`content: ")";`;',
    );
  });
});

describe("every real sample extracts", () => {
  // #6544's bite is that a prose quote breaks extraction silently at
  // authoring time. The heuristic in updateStringState only has to be right
  // for the samples we actually ship — this sweep turns that from a hope
  // into an enforced invariant: every exported component in every sample
  // file must extract to code, never to a "Could not" marker.
  it("extracts every exported component of every sample file", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");

    const samplesDir = join(__dirname, "samples");
    const files = readdirSync(samplesDir).filter((file) =>
      file.endsWith(".tsx"),
    );
    expect(files.length).toBeGreaterThan(0);

    const failures: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(samplesDir, file), "utf8");
      const names = [
        ...source.matchAll(/export\s+(?:function|const)\s+([A-Z]\w*)/g),
      ].map((match) => match[1]!);
      for (const name of names) {
        const extracted = extractFunctionCode(source, name);
        if (extracted.startsWith("// Could not")) {
          failures.push(`${file}#${name}: ${extracted}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
