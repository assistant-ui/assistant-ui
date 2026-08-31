import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const which = (name) => {
  try {
    return execFileSync("which", [name], { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
};

const CHROME_CANDIDATES = [
  process.env.AUI_PERF_CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  which("google-chrome"),
  which("google-chrome-stable"),
  which("chromium"),
  which("chromium-browser"),
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

const TRACE_CATEGORIES = [
  "devtools.timeline",
  "disabled-by-default-devtools.timeline",
  "disabled-by-default-devtools.timeline.frame",
  "toplevel",
  "blink.user_timing",
  "benchmark",
  "rail",
  "__metadata",
].join(",");

const PID_MARKER = "aui-perf-target";

const findChrome = () => {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    console.error(
      "no Chrome binary found; set AUI_PERF_CHROME to a Chrome/Chromium executable",
    );
    process.exit(1);
  }
  return found;
};

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    const failAll = (reason) => {
      for (const { reject } of this.pending.values()) {
        reject(new Error(`CDP connection ${reason}`));
      }
      this.pending.clear();
    };
    ws.addEventListener("close", () => failAll("closed"));
    ws.addEventListener("error", () => failAll("errored"));
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners) fn(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  on(fn) {
    this.listeners.push(fn);
  }
}

const withTimeout = (promise, ms, what) => {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`timed out waiting for ${what}`)),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
};

const connect = (url) =>
  withTimeout(
    new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.addEventListener("open", () => resolve(ws));
      ws.addEventListener("error", (e) => reject(e));
    }),
    10_000,
    "the CDP websocket",
  );

export const captureTrace = async (target, seconds, settleMs = 1500) => {
  const chrome = findChrome();
  const profile = mkdtempSync(join(tmpdir(), "aui-perf-chrome-"));
  let cdp;
  const proc = spawn(
    chrome,
    [
      "--headless=new",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    const portFile = join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
    if (!existsSync(portFile)) {
      throw new Error(`Chrome failed to start within 10s (${chrome})`);
    }
    const port = readFileSync(portFile, "utf8").split("\n")[0];
    const version = await fetch(`http://127.0.0.1:${port}/json/version`).then(
      (r) => r.json(),
    );
    cdp = new Cdp(await connect(version.webSocketDebuggerUrl));

    const url = /^https?:/.test(target) ? target : pathToFileURL(target).href;
    const { targetId } = await cdp.send("Target.createTarget", { url });
    const { sessionId } = await cdp.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    await sleep(settleMs);

    const chunks = [];
    let done;
    const complete = new Promise((resolve) => (done = resolve));
    cdp.on((msg) => {
      if (msg.method === "Tracing.dataCollected")
        chunks.push(...msg.params.value);
      if (msg.method === "Tracing.tracingComplete") done();
    });
    await cdp.send("Tracing.start", {
      categories: TRACE_CATEGORIES,
      transferMode: "ReportEvents",
    });
    await cdp.send(
      "Runtime.evaluate",
      { expression: `performance.mark("${PID_MARKER}")` },
      sessionId,
    );
    await sleep(seconds * 1000);
    await cdp.send("Tracing.end");
    await withTimeout(complete, 30_000, "trace collection");
    return chunks;
  } finally {
    cdp?.ws.close();
    proc.kill();
    await sleep(200);
    rmSync(profile, { recursive: true, force: true });
  }
};

export const analyzeTrace = (events, urlHint, captureUs = 0) => {
  let pid;
  for (const e of events) {
    if (e.name === PID_MARKER) pid = e.pid;
  }
  if (pid == null) {
    for (const e of events) {
      if (e.name === "TracingStartedInBrowser") {
        for (const f of e.args?.data?.frames ?? []) {
          if (f.url.includes(urlHint)) pid = f.processId;
        }
      }
    }
  }
  if (pid == null) throw new Error(`could not locate a process for ${urlHint}`);

  const tids = {};
  for (const e of events) {
    if (e.name === "thread_name" && e.pid === pid) tids[e.args.name] = e.tid;
  }
  const mainTid = tids["CrRendererMain"];
  const compTid = tids["Compositor"];
  if (mainTid === undefined) {
    throw new Error(
      `trace has no CrRendererMain thread metadata for pid ${pid}; refusing to report 0ms as if it were measured`,
    );
  }

  const counts = {};
  let mainBusy = 0;
  let compBusy = 0;
  let tmin;
  let tmax = 0;
  const countedComplete = new Set([
    "PaintImage",
    "UpdateLayer",
    "Layout",
    "PrePaint",
    "Commit",
    "AnimationFrame",
  ]);
  for (const e of events) {
    if (e.ts) {
      tmin = tmin === undefined || e.ts < tmin ? e.ts : tmin;
      tmax = Math.max(tmax, e.ts + (e.dur ?? 0));
    }
    if (e.pid !== pid) continue;
    if (countedComplete.has(e.name) && e.ph === "X")
      counts[e.name] = (counts[e.name] ?? 0) + 1;
    if (e.name === "PipelineReporter" && e.ph === "b")
      counts[e.name] = (counts[e.name] ?? 0) + 1;
    if (e.name === "RunTask" && e.ph === "X") {
      if (e.tid === mainTid) mainBusy += e.dur ?? 0;
      else if (e.tid === compTid) compBusy += e.dur ?? 0;
    }
  }
  const wall = Math.max(tmax - tmin, captureUs);
  return {
    wallSeconds: wall / 1e6,
    mainBusyMs: mainBusy / 1e3,
    mainBusyPct: (mainBusy / wall) * 100,
    compositorBusyMs: compBusy / 1e3,
    compositorBusyPct: (compBusy / wall) * 100,
    counts,
  };
};
