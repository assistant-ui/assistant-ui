import { expect, it, vi } from "vitest";

// esbuild's CommonJS interop leaves the shim's `export * from "react"` empty,
// so the shim sees React only through its default export.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<{ default: object }>();
  return { default: react.default };
});

it("exports every runtime export of React when only React's default export is available", async () => {
  const { default: React } = await vi.importActual<{
    default: Record<string, unknown>;
  }>("react");
  const shim: Record<string, unknown> = await import("./index");

  const missing = Object.keys(React).filter(
    (name) => shim[name] === undefined && React[name] !== undefined,
  );

  expect(missing).toEqual([]);
  expect(shim.default).toBe(React);
});
