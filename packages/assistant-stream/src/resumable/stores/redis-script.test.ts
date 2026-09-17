import { describe, expect, it, vi } from "vitest";
import { redisScriptSha, runCachedRedisScript } from "./redis-script";

describe("redis script execution", () => {
  it("computes the Redis script SHA-1", () => {
    expect(redisScriptSha("return 1")).toBe(
      "e0e1f9fabfc9d4800c877a703b823ac0578ff8db",
    );
  });

  it("falls back to the script source after a cache miss", async () => {
    const runSource = vi.fn(async () => 1);

    await expect(
      runCachedRedisScript(async () => {
        throw new Error("NOSCRIPT missing");
      }, runSource),
    ).resolves.toBe(1);
    expect(runSource).toHaveBeenCalledOnce();
  });

  it("preserves unrelated failures", async () => {
    const error = new Error("connection lost");
    const runSource = vi.fn(async () => 1);

    await expect(
      runCachedRedisScript(async () => {
        throw error;
      }, runSource),
    ).rejects.toBe(error);
    expect(runSource).not.toHaveBeenCalled();
  });
});
