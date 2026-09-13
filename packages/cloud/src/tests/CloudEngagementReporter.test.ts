import { describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "../AssistantCloud";
import {
  CloudEngagementReporter,
  type EngagementIdResolver,
} from "../CloudEngagementReporter";

const createCloud = () => {
  const track = vi.fn();
  const cloud = { events: { track } } as unknown as AssistantCloud;
  return { cloud, track };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("CloudEngagementReporter", () => {
  it("resolves ids through the resolver and awaits the thread only for a send", async () => {
    const { cloud, track } = createCloud();
    const resolveIds = vi.fn<EngagementIdResolver>(
      async (threadId, messageId) => ({
        thread_id: `remote-${threadId}`,
        ...(messageId ? { message_id: `remote-${messageId}` } : undefined),
      }),
    );
    const reporter = new CloudEngagementReporter(cloud, resolveIds);

    reporter.messageSent("t1", { messageId: "m1", chars: 12, attachments: 1 });
    reporter.messageCopied("t1", "m2");
    await flush();

    expect(resolveIds).toHaveBeenNthCalledWith(1, "t1", "m1", {
      awaitThread: true,
    });
    expect(resolveIds).toHaveBeenNthCalledWith(2, "t1", "m2", {
      awaitThread: false,
    });
    expect(track).toHaveBeenCalledWith({
      kind: "message_sent",
      thread_id: "remote-t1",
      message_id: "remote-m1",
      props: { chars: 12, attachments: 1 },
    });
    expect(track).toHaveBeenCalledWith({
      kind: "message_copied",
      thread_id: "remote-t1",
      message_id: "remote-m2",
    });
  });

  it("reports tool approval decisions with their resolved message IDs", async () => {
    const { cloud, track } = createCloud();
    const reporter = new CloudEngagementReporter(
      cloud,
      (threadId, messageId) => ({
        thread_id: `remote-${threadId}`,
        ...(messageId !== undefined
          ? { message_id: `remote-${messageId}` }
          : {}),
      }),
    );

    reporter.toolApproved("t1", "m1", "tool-1");
    reporter.toolRejected("t1", "m2", "tool-2");
    await flush();

    expect(track).toHaveBeenNthCalledWith(1, {
      kind: "tool_approved",
      thread_id: "remote-t1",
      message_id: "remote-m1",
      props: { toolCallId: "tool-1" },
    });
    expect(track).toHaveBeenNthCalledWith(2, {
      kind: "tool_rejected",
      thread_id: "remote-t1",
      message_id: "remote-m2",
      props: { toolCallId: "tool-2" },
    });
  });

  it("measures a stop against the run start and reports it once per run", async () => {
    const { cloud, track } = createCloud();
    const reporter = new CloudEngagementReporter(cloud);

    vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
    reporter.runStopped("t1");
    reporter.runStarted("t1");
    vi.setSystemTime(new Date("2023-01-01T00:00:01.500Z"));
    reporter.runStopped("t1");
    reporter.runStopped("t1");
    await flush();

    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith({
      kind: "run_stopped",
      thread_id: "t1",
      value: 1500,
    });
  });

  it("carries the time since the previous run ended on the next send", async () => {
    const { cloud, track } = createCloud();
    const reporter = new CloudEngagementReporter(cloud);

    vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));
    reporter.runStarted("t1");
    reporter.runEnded("t1");
    vi.setSystemTime(new Date("2023-01-01T00:00:04.000Z"));
    reporter.messageSent("t1", { chars: 3, attachments: 0 });
    await flush();

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "message_sent", value: 4000 }),
    );
  });

  it("shows one error per run and one suggestion list per thread", async () => {
    const { cloud, track } = createCloud();
    const reporter = new CloudEngagementReporter(cloud);

    reporter.runStarted("t1");
    reporter.errorShown("t1", { messageId: "m1", reason: "error" });
    reporter.errorShown("t1", { messageId: "m1", reason: "error" });
    reporter.runStarted("t1");
    reporter.errorShown("t1", { reason: "timeout" });
    reporter.suggestionsShown("t1", 3);
    reporter.suggestionsShown("t1", 3);
    await flush();

    const kinds = track.mock.calls.map(([event]) => event.kind);
    expect(kinds).toEqual(["error_shown", "error_shown", "suggestions_shown"]);
    expect(track).toHaveBeenCalledWith({
      kind: "suggestions_shown",
      thread_id: "t1",
      value: 3,
    });
  });

  it("drops a thread switch the cloud cannot attribute and survives a failing resolver", async () => {
    const { cloud, track } = createCloud();
    const reporter = new CloudEngagementReporter(cloud, (threadId) =>
      threadId === "known" ? { thread_id: "remote" } : {},
    );
    reporter.threadSwitched("unknown");
    reporter.threadSwitched("known");
    const failing = new CloudEngagementReporter(cloud, () => {
      throw new Error("no ids");
    });
    failing.messageCopied("t1");
    await flush();

    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith({
      kind: "thread_switched",
      thread_id: "remote",
    });
  });

  it("keeps the state of the most recently touched threads only", async () => {
    const { cloud, track } = createCloud();
    const reporter = new CloudEngagementReporter(cloud);
    for (let index = 0; index < 300; index++) {
      reporter.suggestionsShown(`t${index}`, 1);
    }
    reporter.suggestionsShown("t0", 1);
    reporter.suggestionsShown("t299", 1);
    await flush();

    expect(track).toHaveBeenCalledTimes(301);
  });

  it("keeps a started run until it stops, however many threads ran since", async () => {
    const { cloud, track } = createCloud();
    const reporter = new CloudEngagementReporter(cloud);
    for (let index = 0; index < 300; index++) {
      reporter.runStarted(`t${index}`);
    }
    reporter.runStopped("t0");
    await flush();

    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "run_stopped", thread_id: "t0" }),
    );
  });
});
