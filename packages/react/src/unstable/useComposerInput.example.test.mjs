import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/unstable/useComposerInput.ts", "utf8");

describe("unstable_useComposerInput example", () => {
  it("guards Enter sends against IME confirmation", () => {
    const hookDeclaration = source.indexOf(
      "export type Unstable_ComposerInput",
    );
    const exampleStart = source.indexOf(" * @example", hookDeclaration);
    const exampleEnd = source.indexOf("\n */", exampleStart);
    const example = source.slice(exampleStart, exampleEnd);
    const compositionGuard =
      "if (e.nativeEvent.isComposing || e.keyCode === 229) return;";
    const sendCondition = 'if (e.key === "Enter" && !e.shiftKey && canSend) {';

    expect(exampleStart).toBeGreaterThanOrEqual(0);
    expect(exampleEnd).toBeGreaterThan(exampleStart);
    expect(example.indexOf(compositionGuard)).toBeGreaterThanOrEqual(0);
    expect(example.indexOf(compositionGuard)).toBeLessThan(
      example.indexOf(sendCondition),
    );
  });
});
