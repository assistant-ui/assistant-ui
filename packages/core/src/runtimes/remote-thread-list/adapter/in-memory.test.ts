import { describe, expect, it } from "vitest";
import { InMemoryThreadListAdapter } from "./in-memory";

describe("InMemoryThreadListAdapter", () => {
  it("preserves no-argument mutations as no-ops", async () => {
    const adapter = new InMemoryThreadListAdapter();
    await adapter.initialize("");
    await adapter.rename("", "Existing");
    await adapter.updateCustom("", { kept: true });

    await adapter.rename();
    await adapter.updateCustom();
    await adapter.archive();
    await adapter.unarchive();
    await adapter.delete();

    await expect(adapter.list()).resolves.toEqual({
      threads: [
        {
          status: "regular",
          remoteId: "",
          externalId: undefined,
          title: "Existing",
          custom: { kept: true },
        },
      ],
    });
  });

  it("lists and fetches threads initialized in the adapter instance", async () => {
    const adapter = new InMemoryThreadListAdapter();
    await adapter.initialize("thread-1");

    const metadata = {
      status: "regular",
      remoteId: "thread-1",
      externalId: undefined,
    } as const;
    await expect(adapter.list()).resolves.toEqual({ threads: [metadata] });
    await expect(adapter.fetch("thread-1")).resolves.toEqual(metadata);
  });

  it("keeps thread metadata mutations in the list and fetch results", async () => {
    const adapter = new InMemoryThreadListAdapter();
    await adapter.initialize("thread-1");

    await adapter.rename("thread-1", "Renamed");
    await adapter.updateCustom("thread-1", { source: "test" });
    await adapter.archive("thread-1");

    const archived = {
      status: "archived",
      remoteId: "thread-1",
      externalId: undefined,
      title: "Renamed",
      custom: { source: "test" },
    } as const;
    await expect(adapter.list()).resolves.toEqual({ threads: [archived] });
    await expect(adapter.fetch("thread-1")).resolves.toEqual(archived);

    await adapter.unarchive("thread-1");
    await expect(adapter.list()).resolves.toEqual({
      threads: [{ ...archived, status: "regular" }],
    });
    await adapter.delete("thread-1");
    await expect(adapter.list()).resolves.toEqual({ threads: [] });
    await expect(adapter.fetch("thread-1")).rejects.toThrow(
      'Thread "thread-1" not found in in-memory thread list.',
    );
  });

  it("preserves existing metadata when an initialized thread is initialized again", async () => {
    const adapter = new InMemoryThreadListAdapter();
    await adapter.initialize("thread-1");
    await adapter.rename("thread-1", "Renamed");

    await adapter.initialize("thread-1");

    await expect(adapter.fetch("thread-1")).resolves.toMatchObject({
      status: "regular",
      remoteId: "thread-1",
      title: "Renamed",
    });
  });

  it("moves each newly archived thread to the front", async () => {
    const adapter = new InMemoryThreadListAdapter();
    await adapter.initialize("first");
    await adapter.initialize("second");
    await adapter.initialize("third");

    await adapter.archive("first");
    await adapter.archive("third");
    await adapter.archive("second");

    const { threads } = await adapter.list();
    expect(threads.map((thread) => thread.remoteId)).toEqual([
      "second",
      "third",
      "first",
    ]);
  });

  it("moves each newly unarchived thread to the front", async () => {
    const adapter = new InMemoryThreadListAdapter();
    await adapter.initialize("first");
    await adapter.initialize("second");
    await adapter.initialize("third");
    await adapter.archive("first");
    await adapter.archive("third");
    await adapter.archive("second");

    await adapter.unarchive("first");
    await adapter.unarchive("third");
    await adapter.unarchive("second");

    const { threads } = await adapter.list();
    expect(threads.map((thread) => thread.remoteId)).toEqual([
      "second",
      "third",
      "first",
    ]);
  });

  it("closes its title stream when title generation is unsupported", async () => {
    const adapter = new InMemoryThreadListAdapter();
    const stream = await adapter.generateTitle();

    await expect(stream.getReader().read()).resolves.toEqual({
      done: true,
      value: undefined,
    });
  });
});
