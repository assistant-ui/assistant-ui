import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const which = (name: string) => {
  try {
    return execFileSync("which", [name], { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
};

/** The Chrome to drive: `CHROME_PATH`, else the usual install locations. */
export function findChrome(): string | undefined {
  return [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    which("google-chrome"),
    which("google-chrome-stable"),
    which("chromium"),
    which("chromium-browser"),
  ].find((path): path is string => !!path && existsSync(path));
}

const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  what: string,
): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error(`Timed out after ${ms} ms waiting for ${what}.`)),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
};

interface CdpMessage {
  id?: number;
  result?: unknown;
  error?: { message: string };
  method?: string;
}

/** One page in a headless Chrome this process launched, driven over the DevTools protocol. */
export interface ChromePage {
  /** Evaluates `expression`, awaits the promise it returns, and returns its JSON value. */
  evaluate<T>(expression: string, timeoutMs: number): Promise<T>;
  /** A PNG of the page region `width` wide and `height` tall that starts `y` pixels down, base64-encoded. */
  screenshot(y: number, width: number, height: number): Promise<string>;
  close(): Promise<void>;
}

/** Launches a fresh headless Chrome and opens `url` in a `width` pixel wide viewport. */
export async function openChromePage(
  url: string,
  width: number,
): Promise<ChromePage> {
  const chrome = findChrome();
  if (!chrome) {
    throw new Error(
      "No Chrome found; set CHROME_PATH to a Chrome or Chromium executable.",
    );
  }
  const profile = mkdtempSync(join(tmpdir(), "aui-eval-chrome-"));
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let log = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    log = (log + chunk).slice(-2_000);
  });
  let spawnError: Error | undefined;
  child.once("error", (error) => {
    spawnError = error;
  });
  let socket: WebSocket | undefined;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  const closed = new Promise((resolve) => child.once("close", resolve));
  const close = async () => {
    socket?.close();
    child.kill();
    // Chrome writes to its profile while it shuts down, so the directory goes once the process is gone.
    await withTimeout(exited, 10_000, "Chrome to exit").catch(() => {});
    rmSync(profile, { recursive: true, force: true, maxRetries: 3 });
  };

  try {
    const portFile = join(profile, "DevToolsActivePort");
    const stopped = () =>
      spawnError !== undefined ||
      child.exitCode !== null ||
      child.signalCode !== null;
    const deadline = Date.now() + 30_000;
    let port: string | undefined;
    while (!stopped() && Date.now() < deadline) {
      if (existsSync(portFile)) {
        port = /^(\d+)\r?\n/.exec(readFileSync(portFile, "utf8"))?.[1];
        if (port) break;
      }
      await sleep(100);
    }
    if (!port) {
      if (stopped()) {
        await withTimeout(closed, 1_000, "Chrome's log").catch(() => {});
      }
      const why = spawnError
        ? `could not be launched (${spawnError.message})`
        : stopped()
          ? `exited with ${child.exitCode ?? child.signalCode} before it started`
          : "did not start within 30 s";
      throw new Error(
        `Chrome ${why} (${chrome})${log.trim() ? `:\n${log.trim()}` : "."}`,
      );
    }
    const { webSocketDebuggerUrl } = (await withTimeout(
      fetch(`http://127.0.0.1:${port}/json/version`).then((response) =>
        response.json(),
      ),
      10_000,
      "Chrome's DevTools endpoint",
    )) as { webSocketDebuggerUrl: string };
    const ws = new WebSocket(webSocketDebuggerUrl);
    socket = ws;
    await withTimeout(
      new Promise((resolve, reject) => {
        ws.addEventListener("open", resolve);
        ws.addEventListener("error", reject);
      }),
      10_000,
      "the DevTools socket",
    );

    let nextId = 0;
    const pending = new Map<
      number,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
    >();
    const listeners = new Set<(method: string) => void>();
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      const entry =
        message.id === undefined ? undefined : pending.get(message.id);
      if (entry) {
        pending.delete(message.id!);
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result);
      } else if (message.method) {
        for (const listener of listeners) listener(message.method);
      }
    });
    ws.addEventListener("close", () => {
      for (const entry of pending.values()) {
        entry.reject(new Error("Chrome closed the DevTools socket."));
      }
      pending.clear();
    });
    const send = <T>(
      method: string,
      params: object = {},
      sessionId?: string,
      timeoutMs = 30_000,
    ): Promise<T> => {
      const id = ++nextId;
      const result = new Promise<T>((resolve, reject) =>
        pending.set(id, {
          resolve: resolve as (value: unknown) => void,
          reject,
        }),
      );
      ws.send(JSON.stringify({ id, method, params, sessionId }));
      return withTimeout(result, timeoutMs, method);
    };

    const { targetId } = await send<{ targetId: string }>(
      "Target.createTarget",
      { url: "about:blank" },
    );
    const { sessionId } = await send<{ sessionId: string }>(
      "Target.attachToTarget",
      { targetId, flatten: true },
    );
    const page = <T>(method: string, params?: object, timeoutMs?: number) =>
      send<T>(method, params, sessionId, timeoutMs);
    await page("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await page("Page.enable");
    const loaded = new Promise<void>((resolve) =>
      listeners.add((method) => {
        if (method === "Page.loadEventFired") resolve();
      }),
    );
    await page("Page.navigate", { url });
    await withTimeout(loaded, 30_000, `${url} to load`);

    return {
      async evaluate<T>(expression: string, timeoutMs: number) {
        const { result, exceptionDetails } = await page<{
          result: { value?: unknown };
          exceptionDetails?: {
            text: string;
            exception?: { description?: string };
          };
        }>(
          "Runtime.evaluate",
          { expression, awaitPromise: true, returnByValue: true },
          timeoutMs,
        );
        if (exceptionDetails) {
          throw new Error(
            exceptionDetails.exception?.description ?? exceptionDetails.text,
          );
        }
        return result.value as T;
      },
      async screenshot(y: number, width: number, height: number) {
        const { data } = await page<{ data: string }>(
          "Page.captureScreenshot",
          {
            format: "png",
            clip: { x: 0, y, width, height, scale: 1 },
            captureBeyondViewport: true,
          },
        );
        return data;
      },
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}
