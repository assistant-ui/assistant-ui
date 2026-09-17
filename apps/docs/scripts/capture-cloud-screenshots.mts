import { spawn, execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Captures the dashboard screenshots the cloud docs embed, from the public
 * demo project, so every image can be regenerated with one command after a
 * dashboard release: `pnpm capture:cloud-screenshots [name ...]`.
 */

const DEMO_ORIGIN = "https://cloud.assistant-ui.com/demo";
const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../content/docs/cloud/images",
);
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2 };
const SETTLE_TIMEOUT_MS = 30_000;
const SETTLE_QUIET_MS = 1_500;

type Shot = {
  name: string;
  path: string;
  /**
   * Selectors tried in order before capturing; the first match is followed as
   * a link or clicked as a row, so a detail page needs no id from the demo data.
   */
  follow?: readonly string[];
  selector?: string;
};

/**
 * The dashboard's content rail is `main`, which scrolls on its own and opens
 * with the demo banner; the page itself is the banner's sibling.
 */
const CONTENT_RAIL = "main > div > :last-child";
const MAX_PAGE_HEIGHT = 8_000;

const SHOTS: readonly Shot[] = [
  { name: "overview", path: "/" },
  { name: "threads", path: "/threads" },
  { name: "thread", path: "/threads", follow: ["main table tbody tr"] },
  { name: "runs", path: "/runs" },
  { name: "runs-analysis", path: "/runs?view=analysis" },
  { name: "run", path: "/runs", follow: ["main table tbody tr"] },
  { name: "models", path: "/models" },
  {
    name: "model",
    path: "/models",
    follow: ['main a[href*="/models/"]', "main table tbody tr"],
  },
  { name: "users", path: "/users" },
  {
    name: "user",
    path: "/users",
    follow: ['main a[href*="/users/usr_"]', "main table tbody tr"],
  },
  { name: "engagement", path: "/engagement" },
  { name: "intelligence", path: "/intelligence" },
  {
    name: "topic",
    path: "/intelligence",
    follow: ['main a[href*="/intelligence/topics/"]', "main table tbody tr"],
  },
  {
    name: "task",
    path: "/intelligence/tasks",
    follow: ['main a[href*="/intelligence/tasks/"]', "main table tbody tr"],
  },
  { name: "harnesses", path: "/harnesses" },
  { name: "assistants", path: "/assistants" },
  { name: "llm-providers", path: "/llm-providers" },
  { name: "billing", path: "/billing" },
  { name: "billing-usage", path: "/billing/usage" },
  { name: "settings-general", path: "/settings" },
  { name: "settings-access", path: "/settings/access" },
  { name: "settings-api-keys", path: "/settings/api-keys" },
  { name: "settings-telemetry", path: "/settings/telemetry" },
  { name: "settings-model-prices", path: "/settings/model-prices" },
  { name: "settings-thread-titles", path: "/settings/thread-titles" },
  { name: "settings-intelligence", path: "/settings/intelligence" },
  { name: "settings-evaluators", path: "/settings/evaluators" },
  { name: "settings-alerts", path: "/settings/alerts" },
  { name: "settings-audit-log", path: "/settings/audit-log" },
];

const which = (name: string) => {
  try {
    return execFileSync("which", [name], { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
};

const CHROME_CANDIDATES = [
  process.env.AUI_DOCS_CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  which("google-chrome"),
  which("google-chrome-stable"),
  which("chromium"),
  which("chromium-browser"),
].filter((candidate): candidate is string => Boolean(candidate));

const findChrome = () => {
  const found = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      "no Chrome binary found; set AUI_DOCS_CHROME to a Chrome or Chromium executable",
    );
  }
  return found;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type CdpMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  sessionId?: string;
  result?: Record<string, unknown>;
  error?: { message: string };
};

class Cdp {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    {
      resolve: (value: Record<string, unknown>) => void;
      reject: (error: Error) => void;
    }
  >();
  private readonly listeners = new Set<(message: CdpMessage) => void>();

  readonly ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
    const fail = (reason: string) => {
      for (const entry of this.pending.values())
        entry.reject(new Error(reason));
      this.pending.clear();
    };
    ws.addEventListener("close", () => fail("CDP websocket closed"));
    ws.addEventListener("error", () => fail("CDP websocket failed"));
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;
      if (message.id !== undefined) {
        const entry = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (!entry) return;
        if (message.error) entry.reject(new Error(message.error.message));
        else entry.resolve(message.result ?? {});
        return;
      }
      for (const listener of this.listeners) listener(message);
    });
  }

  send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ) {
    const id = this.nextId++;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  on(listener: (message: CdpMessage) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

const connect = (url: string) =>
  new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws));
    ws.addEventListener("error", () =>
      reject(new Error("CDP websocket failed")),
    );
  });

const launchChrome = async () => {
  const profile = mkdtempSync(join(tmpdir(), "aui-docs-chrome-"));
  const proc = spawn(
    findChrome(),
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
    { stdio: "ignore" },
  );
  const dispose = async () => {
    proc.kill();
    await sleep(200);
    rmSync(profile, { recursive: true, force: true });
  };
  try {
    const portFile = join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
    if (!existsSync(portFile))
      throw new Error("Chrome failed to start within 10s");
    const port = readFileSync(portFile, "utf8").split("\n")[0];
    const version = (await fetch(`http://127.0.0.1:${port}/json/version`).then(
      (r) => r.json(),
    )) as { webSocketDebuggerUrl: string };
    const cdp = new Cdp(await connect(version.webSocketDebuggerUrl));
    return {
      cdp,
      close: async () => {
        cdp.ws.close();
        await dispose();
      },
    };
  } catch (error) {
    await dispose();
    throw error;
  }
};

const evaluate = async <T,>(
  cdp: Cdp,
  sessionId: string,
  expression: string,
) => {
  const { result } = (await cdp.send(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    sessionId,
  )) as { result: { value: T } };
  return result.value;
};

/**
 * The dashboard streams every section in behind a skeleton and dims pending
 * navigations, so a page is settled once neither is on screen and the DOM has
 * stopped changing for a moment.
 */
const waitForSettled = async (cdp: Cdp, sessionId: string) => {
  const started = Date.now();
  let quietSince = 0;
  let lastSize = -1;
  while (Date.now() - started < SETTLE_TIMEOUT_MS) {
    const { ready, size } = await evaluate<{ ready: boolean; size: number }>(
      cdp,
      sessionId,
      `({
        ready:
          document.readyState === "complete" &&
          !document.querySelector(".animate-pulse, [data-pending]"),
        size: document.body.innerHTML.length,
      })`,
    );
    if (ready && size === lastSize) {
      if (quietSince === 0) quietSince = Date.now();
      if (Date.now() - quietSince >= SETTLE_QUIET_MS) return;
    } else {
      quietSince = 0;
    }
    lastSize = size;
    await sleep(250);
  }
  throw new Error("the page did not settle in time");
};

const capture = async (cdp: Cdp, shot: Shot) => {
  const url = `${DEMO_ORIGIN}${shot.path}`;
  const { targetId } = (await cdp.send("Target.createTarget", {
    url: "about:blank",
  })) as { targetId: string };
  const { sessionId } = (await cdp.send("Target.attachToTarget", {
    targetId,
    flatten: true,
  })) as { sessionId: string };
  try {
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      { ...VIEWPORT, mobile: false },
      sessionId,
    );
    await cdp.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-color-scheme", value: "light" }] },
      sessionId,
    );
    await cdp.send(
      "Emulation.setTimezoneOverride",
      { timezoneId: "UTC" },
      sessionId,
    );
    await cdp.send(
      "Page.addScriptToEvaluateOnNewDocument",
      { source: `try { localStorage.setItem("theme", "light"); } catch {}` },
      sessionId,
    );
    const open = async (target: string) => {
      const loaded = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          off();
          reject(new Error(`load timed out for ${target}`));
        }, 30_000);
        const off = cdp.on((message) => {
          if (
            message.method === "Page.loadEventFired" &&
            message.sessionId === sessionId
          ) {
            clearTimeout(timer);
            off();
            resolve();
          }
        });
      });
      await cdp.send("Page.navigate", { url: target }, sessionId);
      await loaded;
      await waitForSettled(cdp, sessionId);
    };
    await open(url);
    if (shot.follow) {
      const followed = await evaluate<{ href: string | null; before: string }>(
        cdp,
        sessionId,
        `(() => {
          const before = location.href;
          for (const selector of ${JSON.stringify(shot.follow)}) {
            const el = document.querySelector(selector);
            if (!el) continue;
            if (el instanceof HTMLAnchorElement) return { href: el.href, before };
            el.click();
            return { href: "", before };
          }
          return { href: null, before };
        })()`,
      );
      if (followed.href === null)
        throw new Error(`nothing to follow on ${url}`);
      if (followed.href) {
        await open(followed.href);
      } else {
        const started = Date.now();
        let moved = false;
        while (Date.now() - started < 15_000) {
          moved = await evaluate<boolean>(
            cdp,
            sessionId,
            `location.href !== ${JSON.stringify(followed.before)}`,
          );
          if (moved) break;
          await sleep(250);
        }
        if (!moved) throw new Error(`the click on ${url} did not navigate`);
        await waitForSettled(cdp, sessionId);
      }
    }

    const needed = await evaluate<number>(
      cdp,
      sessionId,
      `(() => {
        const main = document.querySelector("main");
        if (!main) return 0;
        return main.scrollHeight + (window.innerHeight - main.clientHeight);
      })()`,
    );
    if (needed > VIEWPORT.height) {
      await cdp.send(
        "Emulation.setDeviceMetricsOverride",
        {
          ...VIEWPORT,
          height: Math.min(needed, MAX_PAGE_HEIGHT),
          mobile: false,
        },
        sessionId,
      );
      await waitForSettled(cdp, sessionId);
    }

    const selector = shot.selector ?? CONTENT_RAIL;
    const rect = await evaluate<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(
      cdp,
      sessionId,
      `(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
      })()`,
    );
    if (!rect) throw new Error(`${selector} not found on ${url}`);

    const { data } = (await cdp.send(
      "Page.captureScreenshot",
      {
        format: "webp",
        quality: 88,
        captureBeyondViewport: true,
        clip: { ...rect, scale: 1 },
      },
      sessionId,
    )) as { data: string };
    const file = join(OUT_DIR, `${shot.name}.webp`);
    writeFileSync(file, Buffer.from(data, "base64"));
    console.log(
      `${shot.name}: ${Math.round(rect.width)}x${Math.round(rect.height)} css px -> ${file}`,
    );
  } finally {
    await cdp.send("Target.closeTarget", { targetId });
  }
};

const main = async () => {
  const names = process.argv.slice(2);
  const shots = names.length
    ? SHOTS.filter((shot) => names.includes(shot.name))
    : SHOTS;
  const unknown = names.filter(
    (name) => !SHOTS.some((shot) => shot.name === name),
  );
  if (unknown.length)
    throw new Error(`unknown screenshots: ${unknown.join(", ")}`);
  mkdirSync(OUT_DIR, { recursive: true });
  const chrome = await launchChrome();
  const failed: string[] = [];
  try {
    for (const shot of shots) {
      try {
        await capture(chrome.cdp, shot);
      } catch (error) {
        failed.push(shot.name);
        console.error(
          `${shot.name}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }
  } finally {
    await chrome.close();
  }
  if (failed.length) throw new Error(`failed: ${failed.join(", ")}`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
