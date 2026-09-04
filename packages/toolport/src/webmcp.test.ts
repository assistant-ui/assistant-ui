import { describe, expect, it, vi } from "vitest";
import { weather } from "./__tests__/weather";
import { registerWebMcp, toWebMcpTools } from "./webmcp";

describe("registerWebMcp", () => {
  it("registers each tool and unregisters on cleanup", async () => {
    const registerTool = vi.fn();
    const unregisterTool = vi.fn();
    const cleanup = registerWebMcp(weather, { registerTool, unregisterTool });
    expect(registerTool).toHaveBeenCalledTimes(2);
    const registered = registerTool.mock.calls[0]![0];
    expect(registered).toMatchObject({
      name: "getWeather",
      inputSchema: { type: "object" },
    });
    await expect(
      registered.execute({ location: "Berlin" }),
    ).resolves.toMatchObject({ location: "Berlin" });
    cleanup();
    expect(unregisterTool).toHaveBeenCalledWith("getWeather");
    expect(unregisterTool).toHaveBeenCalledWith("fail");
  });

  it("falls back to provideContext", () => {
    const provideContext = vi.fn();
    const cleanup = registerWebMcp(weather, { provideContext });
    expect(
      provideContext.mock.calls[0]![0].tools.map(
        (t: { name: string }) => t.name,
      ),
    ).toEqual(toWebMcpTools(weather).map((t) => t.name));
    cleanup();
    expect(provideContext).toHaveBeenLastCalledWith({ tools: [] });
  });

  it("is a no-op without a model context", () => {
    expect(() => registerWebMcp(weather, undefined)()).not.toThrow();
  });
});
