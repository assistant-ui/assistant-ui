import { expect, it, vi } from "vitest";

vi.mock("react", () => {
  throw new Error("react was loaded");
});
vi.mock("zod", () => {
  throw new Error("zod was loaded");
});

it("loads without React or zod", async () => {
  await expect(import("./tree")).resolves.toHaveProperty("specToUISpec");
});
