import { describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import { HarnessManager } from "../HarnessManager";
import type { HarnessTransport } from "../transport/HarnessTransport";

const NullTransport = resource((): HarnessTransport => ({ async *run() {} }));
const transport = NullTransport();

describe("HarnessManager", () => {
  it("returns the same instance per id and disposes on remove", () => {
    const manager = new HarnessManager(() => ({ transport }));
    const listener = vi.fn();
    manager.subscribe(listener);

    const a = manager.getOrCreate("a");
    expect(a.id).toBe("a");
    expect(manager.getOrCreate("a")).toBe(a);
    expect(manager.getOrCreate("b")).not.toBe(a);
    expect(listener).toHaveBeenCalledTimes(2);
    expect([...manager.harnesses.keys()]).toEqual(["a", "b"]);

    manager.remove("a");
    expect(manager.harnesses.has("a")).toBe(false);
    expect(listener).toHaveBeenCalledTimes(3);
    expect(manager.getOrCreate("a")).not.toBe(a);

    manager.dispose();
    expect(manager.harnesses.size).toBe(0);
  });
});
