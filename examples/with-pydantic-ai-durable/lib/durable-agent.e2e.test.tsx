// @vitest-environment jsdom

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ThreadMessage } from "@assistant-ui/react";
import { useAgUiRuntime } from "@assistant-ui/react-ag-ui";
import { DurableHttpAgent, durableThreadHistory } from "./durable-agent";

// Same text as DEMO_ANSWER in server/main.py.
const ANSWER =
  "This answer streams slowly on purpose. Close the tab or reload the page " +
  "while it is still writing. The run keeps going on the server, and when " +
  "you come back the thread picks up where the stream is now and finishes. " +
  "Every word you see was written once, in order, by the same run.";

const hasUv = spawnSync("uv", ["--version"]).status === 0;

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() =>
        typeof address === "object" && address
          ? resolve(address.port)
          : reject(new Error("no port")),
      );
    });
  });

type Browser = {
  fetches: string[];
  /** Full URLs, with query strings. */
  urls: string[];
  crash: () => void;
  fetch: typeof fetch;
};

/** A fetch whose open requests can all be killed at once, like a closed tab. */
const browser = (): Browser => {
  const fetches: string[] = [];
  const urls: string[] = [];
  const crashed = new AbortController();
  return {
    fetches,
    urls,
    crash: () => crashed.abort(),
    fetch: (input, init) => {
      const url = String(input);
      fetches.push(`${init?.method ?? "GET"} ${new URL(url).pathname}`);
      urls.push(url);
      const signal = init?.signal
        ? AbortSignal.any([init.signal, crashed.signal])
        : crashed.signal;
      return fetch(url, { ...init, signal });
    },
  };
};

const textOf = (message: ThreadMessage | undefined) =>
  (message?.content ?? [])
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("");

const openThread = (baseUrl: string, threadId: string, tab: Browser) => {
  const agent = new DurableHttpAgent({
    baseUrl,
    threadId,
    fetch: (url, init) => tab.fetch(url, init),
  });
  const history = durableThreadHistory(agent);
  return renderHook(() => useAgUiRuntime({ agent, adapters: { history } }));
};

describe.skipIf(!hasUv)("durable thread against the Python server", () => {
  let server: ChildProcess;
  let baseUrl: string;
  let dataDir: string;

  beforeAll(async () => {
    const port = await freePort();
    baseUrl = `http://127.0.0.1:${port}`;
    dataDir = mkdtempSync(join(tmpdir(), "durable-agui-"));
    server = spawn(
      "uv",
      [
        "run",
        "uvicorn",
        "main:app",
        "--port",
        String(port),
        "--log-level",
        "warning",
      ],
      {
        cwd: join(__dirname, "..", "server"),
        env: {
          ...process.env,
          OPENAI_API_KEY: "",
          DEMO_WORD_DELAY: "0.03",
          SQLITE_PATH: join(dataDir, "threads.db"),
        },
        stdio: "inherit",
      },
    );
    await waitFor(
      async () => {
        const response = await fetch(`${baseUrl}/threads`);
        expect(response.ok).toBe(true);
      },
      { timeout: 60_000, interval: 250 },
    );
  }, 90_000);

  afterAll(() => {
    cleanup();
    server?.kill();
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
  });

  it("finishes a run after the tab dies mid-stream, with every message once", async () => {
    const threadId = crypto.randomUUID();

    const firstTab = browser();
    const first = openThread(baseUrl, threadId, firstTab);
    await waitFor(() =>
      expect(first.result.current.thread.getState().isLoading).toBe(false),
    );
    act(() => {
      first.result.current.thread.append("Hi");
    });
    await waitFor(
      () => {
        const last = first.result.current.thread.getState().messages.at(-1);
        expect(textOf(last).split(" ").length).toBeGreaterThan(5);
      },
      { timeout: 10_000 },
    );
    const seenBeforeCrash = textOf(
      first.result.current.thread.getState().messages.at(-1),
    );
    expect(ANSWER.startsWith(seenBeforeCrash)).toBe(true);
    expect(seenBeforeCrash.length).toBeLessThan(ANSWER.length);

    firstTab.crash();
    first.unmount();
    expect(firstTab.fetches.filter((call) => call.includes("/cancel"))).toEqual(
      [],
    );

    const secondTab = browser();
    const second = openThread(baseUrl, threadId, secondTab);
    await waitFor(
      () => {
        const state = second.result.current.thread.getState();
        expect(state.isLoading).toBe(false);
        expect(state.isRunning).toBe(false);
        expect(state.messages).toHaveLength(2);
        expect(textOf(state.messages[1])).toBe(`${ANSWER} `);
      },
      { timeout: 20_000 },
    );
    const [question, answer] = second.result.current.thread.getState().messages;
    expect(question).toMatchObject({ role: "user" });
    expect(textOf(question)).toBe("Hi");
    expect(answer).toMatchObject({
      role: "assistant",
      status: { type: "complete" },
    });
    expect(secondTab.fetches).toEqual([
      `GET /threads/${threadId}`,
      `GET /threads/${threadId}/stream`,
    ]);
    second.unmount();

    const stored = await (await fetch(`${baseUrl}/threads/${threadId}`)).json();
    expect(stored.running).toBe(false);
    expect(stored.messages.map((m: { role: string }) => m.role)).toEqual([
      "user",
      "assistant",
    ]);

    const thirdTab = browser();
    const third = openThread(baseUrl, threadId, thirdTab);
    await waitFor(() => {
      const state = third.result.current.thread.getState();
      expect(state.isLoading).toBe(false);
      expect(state.messages.map(textOf)).toEqual(["Hi", `${ANSWER} `]);
    });
    expect(thirdTab.fetches).toEqual([`GET /threads/${threadId}`]);
    third.unmount();
  }, 60_000);

  it("stops the run on the server when the user cancels", async () => {
    const threadId = crypto.randomUUID();
    const tab = browser();
    const view = openThread(baseUrl, threadId, tab);
    await waitFor(() =>
      expect(view.result.current.thread.getState().isLoading).toBe(false),
    );
    act(() => {
      view.result.current.thread.append("Hi");
    });
    await waitFor(() =>
      expect(
        textOf(view.result.current.thread.getState().messages.at(-1)).length,
      ).toBeGreaterThan(10),
    );

    act(() => {
      view.result.current.thread.cancelRun();
    });

    await waitFor(async () => {
      const stored = await (
        await fetch(`${baseUrl}/threads/${threadId}`)
      ).json();
      expect(stored.running).toBe(false);
      const partial = stored.messages.at(-1).content as string;
      expect(ANSWER.startsWith(partial.trimEnd())).toBe(true);
      expect(partial.length).toBeLessThan(ANSWER.length);
    });
    expect(tab.fetches.filter((call) => call.includes("/cancel"))).toHaveLength(
      1,
    );
    view.unmount();
  }, 30_000);

  it("scopes Stop after a rejoin to the rejoined run", async () => {
    const threadId = crypto.randomUUID();
    const firstTab = browser();
    const first = openThread(baseUrl, threadId, firstTab);
    await waitFor(() =>
      expect(first.result.current.thread.getState().isLoading).toBe(false),
    );
    act(() => {
      first.result.current.thread.append("Hi");
    });
    await waitFor(() =>
      expect(
        textOf(first.result.current.thread.getState().messages.at(-1)).length,
      ).toBeGreaterThan(10),
    );
    firstTab.crash();
    first.unmount();

    const { runId } = await (
      await fetch(`${baseUrl}/threads/${threadId}`)
    ).json();
    expect(runId).toEqual(expect.any(String));

    const secondTab = browser();
    const second = openThread(baseUrl, threadId, secondTab);
    await waitFor(() =>
      expect(second.result.current.thread.getState().isRunning).toBe(true),
    );
    act(() => {
      second.result.current.thread.cancelRun();
    });

    await waitFor(async () => {
      const stored = await (
        await fetch(`${baseUrl}/threads/${threadId}`)
      ).json();
      expect(stored.running).toBe(false);
    });
    const cancels = secondTab.urls.filter((url) => url.includes("/cancel"));
    expect(cancels).toEqual([
      `${baseUrl}/threads/${threadId}/cancel?run=${encodeURIComponent(runId)}`,
    ]);
    second.unmount();
  }, 30_000);
});
