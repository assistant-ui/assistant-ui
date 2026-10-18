import { expect, it } from "vitest";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { resolvePiPath } from "./paths";

it("matches Pi's home expansion with a repeated separator", () => {
  const path = "~//pi-session-path-fixture";
  expect(resolvePiPath(path)).toBe(SessionManager.inMemory(path).getCwd());
});
