// @vitest-environment jsdom
// The real AssistantCloud SDK and useCloudThreadListRuntime, with one rejected fetch: the run
// tracker's early create of the running reply fails while the run settles. The settled answer
// must still reach cloud history, so a reload shows it (#10524). One case each for a completed
// reply, a model error and Stop.
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import { AssistantCloud } from "assistant-cloud";
import { AssistantRuntimeProvider } from "../../AssistantRuntimeProvider";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import { useLocalRuntime } from "../useLocalRuntime";
import { useCloudThreadListRuntime } from "./useCloudThreadListRuntime";

const flush = async () => {
  for (let i = 0; i < 10; i++)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
};
const textOf = (message: any) =>
  (message?.content ?? []).map((p: any) => p.text ?? "").join("");
afterEach(() => vi.unstubAllGlobals());

describe("cloud history after a failed early store of a running reply", () => {
  it.each(["success", "error", "stop"])(
    "preserves a %s reply after one failed create",
    async (ending) => {
      const rows: any[] = [];
      let rejectCreate: ((error: unknown) => void) | undefined;
      let failFirstAssistant = true;
      const timestamp = "2026-11-12T00:00:00.000Z";
      const thread = {
        id: "remote-1",
        title: "test",
        last_message_at: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        metadata: {},
        external_id: null,
        project_id: "p",
        workspace_id: "w",
        is_archived: false,
      };
      const json = (value: unknown) =>
        new Response(JSON.stringify(value), {
          headers: { "content-type": "application/json" },
        });
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: URL | string, init?: RequestInit) => {
          const path = new URL(String(url)).pathname;
          const method = init?.method ?? "GET";
          const body = init?.body ? JSON.parse(String(init.body)) : undefined;
          if (path === "/v1/runs/stream")
            return new Response("test title", {
              headers: { "content-type": "text/plain" },
            });
          if (path.endsWith("/messages") && method === "POST") {
            if (body.content.role === "assistant" && failFirstAssistant) {
              failFirstAssistant = false;
              return new Promise<Response>((_, reject) => {
                rejectCreate = reject;
              });
            }
            const id = `msg_${rows.length + 1}`;
            rows.push({
              id,
              parent_id: body.parent_id,
              external_id: body.external_id,
              height: rows.length,
              format: body.format,
              content: body.content,
              created_at: timestamp,
              updated_at: timestamp,
            });
            return json({ message_id: id });
          }
          if (path.endsWith("/messages") && method === "GET")
            return json({ messages: [...rows].reverse() });
          if (path.includes("/messages/") && method === "PUT") {
            const row = rows.find((row) => path.endsWith(`/${row.id}`));
            if (!row) throw new Error("update of missing row");
            row.content = body.content;
            return new Response(null, { status: 204 });
          }
          if (path === "/v1/threads" && method === "GET")
            return json({ threads: rows.length ? [thread] : [] });
          if (path === "/v1/threads" && method === "POST")
            return json({ thread_id: thread.id });
          if (path === "/v1/threads/remote-1" && method === "GET")
            return json({ thread });
          if (path === "/v1/threads/remote-1" && method === "PUT")
            return new Response(null, { status: 204 });
          throw new Error(`unexpected request ${method} ${path}`);
        }),
      );
      const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
      const errors = vi.spyOn(console, "error").mockImplementation(() => {});
      const cloud = new AssistantCloud({
        baseUrl: "https://rtd.invalid",
        authToken: async () =>
          `fixture.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.fixture`,
        telemetry: false,
      });
      let aui!: AssistantClient;
      let runtime!: AssistantRuntime;
      let finish!: () => void;
      const Capture = () => {
        aui = useAui();
        return null;
      };
      const Harness = () => {
        runtime = useCloudThreadListRuntime({
          cloud,
          runtimeHook: function RuntimeHook() {
            return useLocalRuntime({
              run: async function* ({ abortSignal }) {
                const done = new Promise<void>((resolve, reject) => {
                  finish =
                    ending === "error"
                      ? () => reject(new Error("model error"))
                      : resolve;
                  abortSignal.addEventListener(
                    "abort",
                    () =>
                      reject(
                        Object.assign(new Error("Stopped"), {
                          name: "AbortError",
                        }),
                      ),
                    { once: true },
                  );
                });
                yield { content: [{ type: "text", text: "the answer" }] };
                await done;
              },
            });
          },
        });
        return (
          <AssistantRuntimeProvider runtime={runtime}>
            <Capture />
          </AssistantRuntimeProvider>
        );
      };
      const mounted = render(<Harness />);
      await flush();
      await act(async () => {
        aui.thread.append("hello");
      });
      await flush();
      await waitFor(() => expect(rejectCreate).toBeDefined());
      await waitFor(() =>
        expect(textOf(runtime.thread.getState().messages.at(-1))).toBe(
          "the answer",
        ),
      );
      await act(async () => {
        if (ending === "stop") runtime.thread.cancelRun();
        else finish();
      });
      await flush();
      expect(runtime.thread.getState().isRunning).toBe(false);
      await act(async () => {
        rejectCreate!(new TypeError("Failed to fetch"));
      });
      await flush();
      await act(async () => {
        await new Promise((r) => setTimeout(r, 3100));
      });
      await act(async () => {
        aui.thread.append({
          role: "user",
          content: [{ type: "text", text: "and then" }],
          startRun: false,
        });
      });
      await flush();
      expect(
        textOf(rows.find((row) => row.content.role === "assistant")?.content),
      ).toBe("the answer");
      mounted.unmount();
      const fresh = render(<Harness />);
      await flush();
      await act(async () => {
        await runtime.threads.switchToThread("remote-1");
      });
      await flush();
      const loadedReply = runtime.thread
        .getState()
        .messages.find((message) => message.role === "assistant");
      fresh.unmount();
      warnings.mockRestore();
      errors.mockRestore();
      expect(textOf(loadedReply)).toBe("the answer");
    },
  );
});
