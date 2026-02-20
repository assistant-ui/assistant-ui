import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const componentLabPagePath = resolve(
  currentDir,
  "../../../../examples/with-ai-sdk-v6/app/internal/component-lab/page.tsx",
);

describe("component lab layout constraints", () => {
  it("locks the workspace to viewport height and a single non-growing grid row", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).toContain('height: "100dvh"');
    expect(source).toContain('gridTemplateColumns: "minmax(0, 1fr) 20rem"');
    expect(source).toContain('gridTemplateRows: "minmax(0, 1fr)"');
  });

  it("keeps thread and controls in bounded scroll containers", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).toContain("h-full min-h-0 overflow-hidden");
    expect(source).toContain("flex h-full min-h-0 flex-col");
    expect(source).toContain("min-h-0 flex-1 space-y-4 overflow-y-auto");
  });

  it("keeps only send and matrix actions anchored at the bottom", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).not.toContain("Save Snapshot");
    expect(source).not.toContain("Rehydrate");
    expect(source).not.toContain("Reload + Rehydrate");
    expect(source).toContain("mt-auto grid grid-cols-2 gap-2");
    expect(source).toContain("border-border border-t");
    expect(source).toContain("Send Prompt");
    expect(source).toContain("Run Matrix");
  });

  it("uses toggle controls instead of selects for runtime options", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).not.toContain("<select");
    expect(source).toContain('from "@/components/ui/switch"');
    expect(source).toContain('from "@/components/ui/toggle-group"');
    expect(source).toContain("<ToggleGroup");
    expect(source).toContain("<ToggleGroupItem");
    expect(source).toContain("<Switch");
    expect(source).toContain("INVOKE_MODE_OPTIONS.map((option) =>");
    expect(source).toContain("onValueChange={(value) => {");
    expect(source).toContain("checked={emitEnabled}");
    expect(source).toContain("onCheckedChange={setEmitEnabled}");
    expect(source).toContain("CATALOG_MODE_OPTIONS.map((option) =>");
  });

  it("does not override shadcn toggle styles and keeps emit row unboxed", () => {
    const source = readFileSync(componentLabPagePath, "utf8");

    expect(source).not.toMatch(/<ToggleGroup[^>]*className=/);
    expect(source).not.toMatch(/<ToggleGroupItem[^>]*className=/);
    expect(source).toContain(
      'className="flex items-center justify-between text-xs"',
    );
    expect(source).not.toContain(
      'className="flex items-center justify-between rounded-md border border-border bg-background px-2 py-1.5 text-xs"',
    );
  });
});
