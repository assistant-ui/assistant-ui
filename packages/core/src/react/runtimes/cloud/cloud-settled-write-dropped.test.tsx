// @vitest-environment jsdom
// The run tracker (#10424) stores a running reply as soon as its run starts. When that create is
// still in flight as the run settles, the runtime's settled write waits on it inside
// CloudMessagePersistence.append. If that create fails, the settled write must create the row
// with the settled content itself, or cloud history keeps only the running placeholder (#10524).
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import type { AssistantCloud } from "assistant-cloud";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import { useLocalRuntime } from "../useLocalRuntime";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";

const flush = async () => {
  for (let i = 0; i < 10; i++)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
};

const setup = () => {
  const creates: {
    body: any;
    resolve: (v: any) => void;
    reject: (e: unknown) => void;
  }[] = [];
  let n = 0;
  const cloud = {
    threads: {
      list: vi.fn().mockResolvedValue({ threads: [] }),
      create: vi.fn(async () => ({ thread_id: "remote-1" })),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      messages: {
        list: vi.fn().mockResolvedValue({ messages: [] }),
        create: vi.fn(
          (_t: string, body: any) =>
            new Promise((resolve, reject) =>
              creates.push({ body, resolve, reject }),
            ),
        ),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      runs: {
        heartbeat: vi.fn().mockResolvedValue({ heartbeat_interval_ms: 20_000 }),
        end: vi.fn().mockResolvedValue(undefined),
      },
    },
    events: { track: vi.fn() },
    telemetry: { enabled: false },
    runs: { report: vi.fn().mockResolvedValue(undefined) },
    registerSdk: vi.fn(),
  } as unknown as AssistantCloud;
  const ok = (i: number, lease = false) =>
    creates[i]!.resolve({
      message_id: `msg_${++n}`,
      ...(lease
        ? { run: { lease_id: `lease_${n}`, heartbeat_interval_ms: 20_000 } }
        : {}),
    });
  let finish!: () => void;
  let aui!: AssistantClient;
  const Capture = () => {
    aui = useAui();
    return null;
  };
  const Harness = () => {
    const adapter = useCloudThreadListAdapter({ cloud });
    const runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function RuntimeHook() {
        return useLocalRuntime({
          run: () =>
            new Promise((resolve) => {
              finish = () =>
                resolve({ content: [{ type: "text", text: "the answer" }] });
            }),
        });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>
    );
  };
  render(<Harness />);
  return { cloud, creates, ok, finish: () => finish(), aui: () => aui };
};

afterEach(() => vi.restoreAllMocks());

// The settled write is a plain create with the answer, not another open_run create.
const settledCreates = (creates: { body: any }[]) =>
  creates
    .slice(2)
    .filter((c) => textOf(c.body) === "the answer" && !c.body.open_run);

const textOf = (body: any) =>
  ((body?.content?.content ?? []) as any[]).map((p) => p.text ?? "").join("");

describe("cloud run tracker: the settled reply after a failed early store", () => {
  it("stores the settled reply when the tracker's create fails while the run settles", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup();
    await flush();
    await act(async () => {
      t.aui().thread.append("hello");
    });
    await flush();
    t.ok(0); // the user message
    await flush();
    expect(t.creates[1]?.body.open_run).toBe(true); // the tracker's store of the running reply
    await act(async () => t.finish()); // the run settles while that create is in flight
    await flush();
    t.creates[1]!.reject(new Error("network")); // a transient failure
    await flush();
    // the reply must still reach the cloud with what the user saw
    expect(settledCreates(t.creates)).toHaveLength(1);
  });

  // Comparable across #10424: one transient failure of the reply's first create, made while the
  // run settles, then a follow-up message. Before #10424 that create is the settled write itself,
  // so the follow-up re-creates the reply with its answer (failedAppends); on main it is the
  // tracker's running placeholder.
  it("re-creates the reply with its answer under the next message after a failed first create", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup();
    await flush();
    await act(async () => {
      t.aui().thread.append("hello");
    });
    await flush();
    t.ok(0);
    await flush();
    await act(async () => t.finish());
    await flush();
    t.creates[1]!.reject(new Error("network"));
    await flush();
    await act(async () => {
      t.aui().thread.append("and then");
    });
    await flush();
    const reply = t.creates
      .slice(2)
      .find((c) => c.body.content?.role === "assistant");
    expect(reply).toBeDefined();
    expect(textOf(reply!.body)).toBe("the answer");
  });

  it("control: the settled reply is stored when the tracker's create succeeds", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const t = setup();
    await flush();
    await act(async () => {
      t.aui().thread.append("hello");
    });
    await flush();
    t.ok(0);
    await flush();
    await act(async () => t.finish());
    await flush();
    t.ok(1, true);
    await flush();
    const updates = vi
      .mocked(t.cloud.threads.messages.update)
      .mock.calls.map(([, , b]) => textOf(b));
    expect(updates).toContain("the answer");
  });

  it("control: the settled reply is stored when the run settles after the tracker's create failed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const t = setup();
    await flush();
    await act(async () => {
      t.aui().thread.append("hello");
    });
    await flush();
    t.ok(0);
    await flush();
    t.creates[1]!.reject(new Error("network"));
    await flush();
    await act(async () => t.finish());
    await flush();
    expect(settledCreates(t.creates)).toHaveLength(1);
  });
});
