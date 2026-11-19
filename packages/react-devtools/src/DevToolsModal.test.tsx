import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DevToolsModal } from "./DevToolsModal";

describe("DevToolsModal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders nothing in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(renderToString(<DevToolsModal />)).toBe("");
  });
});
