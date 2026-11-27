import { describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import { completeExternalMessageConversion } from "../../runtime/utils/external-message-conversion";
import { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ThreadMessage } from "../../types/message";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const contextProvider: ModelContextProvider = { getModelContext: () => ({}) };

const msgs = ExportedMessageRepository.fromArray([
  { id: "u1", role: "user", content: "first" },
  { id: "a1", role: "assistant", content: "first reply" },
  { id: "u2", role: "user", content: "second" },
  { id: "a2", role: "assistant", content: "second reply" },
  { id: "edit", role: "user", content: "revised" },
  { id: "ae", role: "assistant", content: "revised reply" },
  { id: "u3", role: "user", content: "third" },
  { id: "x1", role: "user", content: "other" },
  { id: "y1", role: "assistant", content: "other reply" },
  { id: "x2", role: "user", content: "other second" },
  { id: "z", role: "user", content: "root edit" },
]).messages.map(({ message }) => message);
const m = Object.fromEntries(msgs.map((x) => [x.id, x])) as Record<
  string,
  ThreadMessage
>;
const { u1, a1, u2, a2, edit, ae, u3, x1, y1, x2, z } = m as Record<
  string,
  ThreadMessage
>;

const make = () => {
  const setMessages = vi.fn<(messages: readonly ThreadMessage[]) => void>();
  const onImport = vi.fn<(messages: readonly ThreadMessage[]) => void>();
  const store = (
    messages: readonly ThreadMessage[],
    o: { error?: string; isRunning?: boolean } = {},
  ): ExternalStoreAdapter =>
    ({
      messages: completeExternalMessageConversion([...messages], o.error),
      isRunning: o.isRunning ?? false,
      onNew: async () => {},
      onEdit: async () => {},
      onReload: async () => {},
      onCancel: async () => {},
      onImport,
      setMessages,
    }) as ExternalStoreAdapter;
  return { store, setMessages };
};
const ids = (r: ExternalStoreThreadRuntimeCore) =>
  r.messages.filter((x) => !x.metadata.isOptimistic).map((x) => x.id);
const written = (s: ReturnType<typeof make>["setMessages"]) =>
  s.mock.calls.map(([ms]) => ms.map((x) => x.id));
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("Stop rollback after a branch switch or import", () => {
  it("switchToBranch then failed reload then send then Stop", async () => {
    const { store, setMessages } = make();
    const r = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      store([u1, a1, u2, a2]),
    );
    r.__internal_setAdapter(store([u1, a1, edit], { isRunning: true }));
    r.__internal_setAdapter(store([u1, a1, edit, ae]));
    r.switchToBranch("u2");
    r.__internal_setAdapter(store([u1, a1, u2, a2]));
    r.__internal_setAdapter(store([u1, a1, u2], { isRunning: true }));
    r.__internal_setAdapter(store([u1, a1, u2], { error: "502" }));
    setMessages.mockClear();
    r.__internal_setAdapter(store([u1, a1, u2, u3], { isRunning: true }));
    r.cancelRun();
    await tick();
    expect(ids(r)).toEqual(["u1", "a1", "u2"]);
    expect(written(setMessages)).toEqual([["u1", "a1", "u2"]]);
  });

  it("switchToBranch without echo then root edit then Stop", async () => {
    const { store, setMessages } = make();
    const r = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      store([u1, a1, u2, a2]),
    );
    r.__internal_setAdapter(store([u1, a1, edit], { isRunning: true }));
    r.__internal_setAdapter(store([u1, a1, edit, ae]));
    r.switchToBranch("u2");
    setMessages.mockClear();
    r.__internal_setAdapter(store([z], { isRunning: true }));
    r.cancelRun();
    await tick();
    expect(ids(r)).toEqual(["u1", "a1", "u2", "a2"]);
    expect(written(setMessages)).toEqual([["u1", "a1", "u2", "a2"]]);
  });

  it("switchToBranch with echo then root edit then Stop", async () => {
    const { store } = make();
    const r = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      store([u1, a1, u2, a2]),
    );
    r.__internal_setAdapter(store([u1, a1, edit], { isRunning: true }));
    r.__internal_setAdapter(store([u1, a1, edit, ae]));
    r.switchToBranch("u2");
    r.__internal_setAdapter(store([u1, a1, u2, a2]));
    r.__internal_setAdapter(store([z], { isRunning: true }));
    r.cancelRun();
    await tick();
    expect(ids(r)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  it("import() without echo then send then Stop", async () => {
    const { store, setMessages } = make();
    const r = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      store([u1, a1]),
    );
    r.import(ExportedMessageRepository.fromArray([x1, y1]));
    setMessages.mockClear();
    r.__internal_setAdapter(store([x1, y1, x2], { isRunning: true }));
    r.cancelRun();
    await tick();
    expect(ids(r)).toEqual(["x1", "y1"]);
    expect(written(setMessages).flat()).not.toContain("a1");
  });

  it("import() with echo then root edit then Stop", async () => {
    const { store, setMessages } = make();
    const r = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      store([u1, a1]),
    );
    r.import(ExportedMessageRepository.fromArray([x1, y1]));
    r.__internal_setAdapter(store([x1, y1]));
    setMessages.mockClear();
    r.__internal_setAdapter(store([z], { isRunning: true }));
    r.cancelRun();
    await tick();
    expect(ids(r)).toEqual(["x1", "y1"]);
    expect(written(setMessages).flat()).not.toContain("a1");
  });
});
