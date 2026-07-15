import { describe, expect, it } from "vitest";
import { InMemoryThreadListAdapter } from "./in-memory";

describe("InMemoryThreadListAdapter", () => {
  it("closes its title stream when title generation is unsupported", async () => {
    const adapter = new InMemoryThreadListAdapter();
    const stream = await adapter.generateTitle();

    await expect(stream.getReader().read()).resolves.toEqual({
      done: true,
      value: undefined,
    });
  });
});
