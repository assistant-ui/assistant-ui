import { describe, expect, it } from "vitest";
import jscodeshift, { type API } from "jscodeshift";
import transform from "./event-names-to-camelcase";

const j = jscodeshift.withParser("tsx");
const api: API = { jscodeshift: j, j, stats: () => {}, report: () => {} };
const apply = (source: string) =>
  transform({ path: "app.tsx", source }, api, {});

describe("event-name migration preserves unrelated strings", () => {
  const cases = [
    "constructor",
    "toString",
    "__proto__",
    "hasOwnProperty",
  ].flatMap((name) => [JSON.stringify(name), `\`${name}\``]);

  it.each(cases)("leaves %s unchanged without event renames", (literal) => {
    const source = `const key = ${literal};`;
    expect(apply(source)).toBeNull();
  });

  it.each(cases)("preserves %s beside an event rename", (literal) => {
    const source = `import { useAuiEvent } from "@assistant-ui/react";
const key = ${literal};
useAuiEvent("thread.run-start", () => {});`;
    const output = apply(source);
    expect(output).toBe(source.replace("thread.run-start", "thread.runStart"));
    expect(() => j(output!)).not.toThrow();
    expect(apply(output!)).toBeNull();
  });
});
