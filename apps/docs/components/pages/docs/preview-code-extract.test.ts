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
