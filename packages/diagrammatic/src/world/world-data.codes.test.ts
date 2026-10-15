import { expect, it } from "vitest";
import { WORLD } from "./world-data";

it("reserves XK for Kosovo", () => {
  expect(
    WORLD.filter(({ iso }) => iso === "XK").map(({ name }) => name),
  ).toEqual(["Kosovo"]);
});

it("includes Somaliland's outline in Somalia", () => {
  const somalia = WORLD.find(({ iso }) => iso === "SO");
  expect(somalia?.name).toBe("Somalia");
  expect(somalia?.d).toContain(
    "M127.2 57.3L126.5 59.3L124.3 58.6L123.6 57.8L124.0 57.3L124.5 57.9Z",
  );
});
