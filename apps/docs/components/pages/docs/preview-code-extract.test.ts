import { describe, expect, it } from "vitest";
import {
  extractFunctionCode,
  filterRelevantImports,
} from "./preview-code-extract";

const source = `
import type { ReactNode } from "react";

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

export const ArrowSpecimen = (): ReactNode => (
  <div>arrow</div>
);
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
    expect(code).not.toContain("ArrowSpecimen");
  });

  it("extracts an annotated arrow function without a body brace", () => {
    const code = extractFunctionCode(source, "ArrowSpecimen");
    expect(code).toContain("export const ArrowSpecimen = (): ReactNode => (");
    expect(code).toContain("<div>arrow</div>");
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

  it("reports a missing function", () => {
    expect(extractFunctionCode(source, "Missing")).toBe(
      "// Could not find function: Missing",
    );
  });
});
