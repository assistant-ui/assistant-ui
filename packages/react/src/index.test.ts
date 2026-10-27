import { expect, it, vi } from "vitest";

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    Component: undefined,
    version: undefined,
  };
});

it("loads the public entry when Component and version are only on React's default export", async () => {
  await expect(import("./index")).resolves.toHaveProperty(
    "ComposerPrimitive.Root",
  );
});
