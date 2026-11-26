import { describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ThreadMessage } from "../../types/message";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const [u1] = ExportedMessageRepository.fromArray([
  { id: "u1", role: "user", content: "hello" },
]).messages.map(({ message }) => message) as [ThreadMessage];

const adapter = (
  messages: readonly ThreadMessage[],
  isRunning: boolean,
): ExternalStoreAdapter<ThreadMessage> => ({
  messages,
  isRunning,
  onNew: async () => {},
});

const recordEvents = (core: ExternalStoreThreadRuntimeCore) => {
  const events: string[] = [];
  for (const event of ["initialize", "runStart", "runEnd"] as const) {
    core.unstable_on(event, () => events.push(event));
  }
  return events;
};

describe("ExternalStoreThreadRuntimeCore held events", () => {
  it("holds lifecycle events until the returned function runs", () => {
    const core = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([], false),
    );
    const events = recordEvents(core);

    const deliver = core.__internal_setAdapterHoldingEvents(
      adapter([u1], true),
    );
    expect(core.isRunning).toBe(true);
    expect(events).toEqual([]);

    deliver();
    expect(events).toEqual(["initialize", "runStart"]);
  });

  it("delivers an event raised before the drain after the held ones", () => {
    const core = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([], false),
    );
    const events = recordEvents(core);

    const deliver = core.__internal_setAdapterHoldingEvents(
      adapter([u1], true),
    );
    core.__internal_setAdapter(adapter([u1], false));
    expect(events).toEqual([]);

    deliver();
    expect(events).toEqual(["initialize", "runStart", "runEnd"]);
  });

  it("delivers the events raised before a failed update and stops holding", () => {
    const core = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([], false),
    );
    const events = recordEvents(core);
    // The last step of an update notifies subscribers, after its events.
    const failure = new Error("subscriber failed");
    const notify = vi
      .spyOn(
        core as unknown as { _notifySubscribers(): void },
        "_notifySubscribers",
      )
      .mockImplementationOnce(() => {
        throw failure;
      });

    expect(() =>
      core.__internal_setAdapterHoldingEvents(adapter([u1], true)),
    ).toThrow(failure);
    expect(events).toEqual(["initialize", "runStart"]);

    notify.mockRestore();
    core.__internal_setAdapter(adapter([u1], false));
    expect(events).toEqual(["initialize", "runStart", "runEnd"]);
  });
});
