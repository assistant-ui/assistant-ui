import type { AssistantClient } from "@assistant-ui/react";
import {
  NOT_IMPLEMENTED,
  PROBES,
  type ProbeId,
  type ProbeResult,
} from "../src/readiness/probes";
import { vscodeFetch } from "@assistant-ui/vscode/webview";
import {
  CHAT_ROUTE,
  COLOR_THEME_ROUTE,
  isTestbedMessage,
  OPEN_EXTERNAL_ROUTE,
  SERVED_REQUESTS_ROUTE,
  TESTBED_CHANNEL,
  type ColorThemeState,
  type ColorThemeUpdate,
  type HostToWebviewMessage,
  type OpenExternalState,
  type SeededThread,
  type ServedRequest,
  type TaskResult,
  type WebviewBootConfig,
  type WebviewTaskId,
  type WebviewToHostMessage,
} from "../src/protocol";
import {
  APPROVAL_TOOL_NAME,
  fixtureConflicts,
  RICH_FIXTURES,
  selectFixture,
  type Fixture,
  type FixtureStep,
} from "../src/fixtures/fixtures";
import { fixtureUIConflicts } from "./fixture-uis";
import { storedThreadValues } from "./thread-storage";
import { getVSCodeApi } from "./vscode-api";

type CspViolation = { directive: string; blocked: string; sample: string };

const cspViolations: CspViolation[] = [];
document.addEventListener("securitypolicyviolation", (event) => {
  cspViolations.push({
    directive: event.effectiveDirective,
    blocked: event.blockedURI,
    sample: event.sample,
  });
});

const consoleErrors: string[] = [];
const recordConsoleError = (message: string) =>
  consoleErrors.push(message.slice(0, 300));
const consoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  recordConsoleError(
    args
      .map((a) => (a instanceof Error ? `${a.name}: ${a.message}` : String(a)))
      .join(" "),
  );
  consoleError(...args);
};
// Browsers report a ResizeObserver whose callback changed layout as a window
// error with no Error object; the spec treats it as benign and delivers the
// notifications on the next frame.
const isResizeObserverLoop = (event: ErrorEvent) =>
  event.error == null && event.message.startsWith("ResizeObserver loop");

window.addEventListener("error", (event) => {
  if (isResizeObserverLoop(event)) return;
  recordConsoleError(String(event.error ?? event.message));
});
window.addEventListener("unhandledrejection", (event) =>
  recordConsoleError(`Unhandled rejection: ${String(event.reason)}`),
);

export type WebviewProbeContext = {
  boot: WebviewBootConfig;
  aui: AssistantClient | undefined;
  cspViolations: readonly CspViolation[];
};

export type WebviewProbe = (ctx: WebviewProbeContext) => Promise<ProbeResult>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const waitFor = async (
  condition: () => boolean,
  timeoutMs: number,
  what: () => string,
) => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what()}`);
    }
    await sleep(50);
  }
};

const requireThread = (ctx: WebviewProbeContext) => {
  if (ctx.aui) return ctx.aui;
  const reasons = ctx.boot.unimplemented
    .map(({ key, value }) => `auiTest.${key}=${value}`)
    .join(", ");
  throw new Error(`Thread is not mounted (not implemented: ${reasons})`);
};

const textOf = (
  message: { content: readonly { type: string; text?: string }[] } | undefined,
) =>
  message?.content
    .map((p) => (p.type === "text" ? (p.text ?? "") : ""))
    .join("") ?? "";

const sendAndSettle = async (aui: AssistantClient, prompt: string) => {
  const before = aui.thread().getState().messages.length;
  aui.thread().append(prompt);
  await waitFor(
    () => {
      const { messages, isRunning } = aui.thread().getState();
      return messages.length >= before + 2 && !isRunning;
    },
    45_000,
    () => {
      const { messages, isRunning } = aui.thread().getState();
      const last = messages.at(-1);
      return `the "${prompt}" run to settle (${messages.length - before} new messages, isRunning=${isRunning}, last status=${last?.status?.type}, ${textOf(last).length} chars)`;
    },
  );
  const last = aui.thread().getState().messages.at(-1);
  if (!last) throw new Error(`No reply to "${prompt}"`);
  return last;
};

const ROUTES: Partial<
  Record<WebviewBootConfig["switchboard"]["runtime"], string>
> = {
  "ai-sdk": CHAT_ROUTE,
};

const routeOf = (ctx: WebviewProbeContext) => {
  const { runtime } = ctx.boot.switchboard;
  const route = ROUTES[runtime];
  if (!route) throw new Error(`No bridge route for auiTest.runtime=${runtime}`);
  return route;
};

const fetchServedRequests = async () => {
  const response = await vscodeFetch(SERVED_REQUESTS_ROUTE);
  if (!response.ok) {
    throw new Error(`${SERVED_REQUESTS_ROUTE} answered ${response.status}`);
  }
  return (await response.json()) as ServedRequest[];
};

/** Returns the requests to `route` for `fixture` the host served after `since`. */
const servedSince = async (since: number, route: string, fixture: string) =>
  (await fetchServedRequests()).filter(
    (r) =>
      r.seq > since &&
      r.path === route &&
      selectFixture(r.prompt).name === fixture,
  );

const lastServedSeq = async () =>
  (await fetchServedRequests()).at(-1)?.seq ?? 0;

const waitForServed = async (
  since: number,
  route: string,
  fixture: string,
  condition: (requests: ServedRequest[]) => boolean,
  what: string,
) => {
  let requests: ServedRequest[] = [];
  const deadline = Date.now() + 5_000;
  while (true) {
    requests = await servedSince(since, route, fixture);
    if (condition(requests)) return requests;
    if (Date.now() > deadline) {
      throw new Error(
        `Host ${route} never ${what} (served: ${JSON.stringify(requests)})`,
      );
    }
    await sleep(50);
  }
};

const fixtureText = (steps: readonly FixtureStep[]) =>
  steps.map((s) => (s.type === "text" ? s.text : "")).join("");

type Surface = WebviewBootConfig["switchboard"]["location"];

/** Each token and the `--vscode-*` variables theme.css resolves it to, in fallback order. */
const THEME_TOKENS = (surface: Surface): Record<string, readonly string[]> => ({
  "--background": {
    sidebar: ["--vscode-sideBar-background", "--vscode-editor-background"],
    panel: ["--vscode-panel-background", "--vscode-editor-background"],
    editor: ["--vscode-editor-background"],
  }[surface],
  "--primary": ["--vscode-button-background"],
  "--border": ["--vscode-panel-border", "--vscode-widget-border"],
  "--ring": ["--vscode-focusBorder"],
  "--foreground": ["--vscode-foreground"],
});

const isDarkTheme = () =>
  document.body.classList.contains("vscode-dark") ||
  (document.body.classList.contains("vscode-high-contrast") &&
    !document.body.classList.contains("vscode-high-contrast-light"));

type ThemeSample = {
  dark: boolean;
  colorScheme: string;
  bodyBackground: string;
  utilityBackground: string;
  darkVariantDisplay: string;
  mutedForeground: string;
  /** Elements that still carry a background from VS Code's default webview styles. */
  defaultStyleLeaks: string[];
  tokens: Record<string, { token: string; vscode: string; from: string }>;
};

/** Resolves colours through elements, so `var()` chains compare as rgb values. */
const sampleTheme = (surface: Surface): ThemeSample => {
  const rootStyle = getComputedStyle(document.documentElement);
  const probe = document.createElement("div");
  probe.hidden = true;
  const swatch = document.createElement("span");
  const utility = document.createElement("span");
  utility.className = "bg-background";
  const darkVariant = document.createElement("span");
  darkVariant.className = "block dark:hidden";
  const unstyled = ["code", "kbd", "blockquote"].map((tag) =>
    document.createElement(tag),
  );
  probe.append(swatch, utility, darkVariant, ...unstyled);
  document.body.append(probe);
  try {
    const resolve = (value: string) => {
      swatch.style.backgroundColor = value;
      return getComputedStyle(swatch).backgroundColor;
    };
    const tokens: ThemeSample["tokens"] = {};
    for (const [token, chain] of Object.entries(THEME_TOKENS(surface))) {
      const from = chain.find(
        (name) => rootStyle.getPropertyValue(name).trim() !== "",
      );
      if (!from) throw new Error(`None of ${chain.join(", ")} is set`);
      tokens[token] = {
        token: resolve(`var(${token})`),
        vscode: resolve(`var(${from})`),
        from,
      };
    }
    return {
      dark: isDarkTheme(),
      colorScheme: getComputedStyle(document.body).colorScheme,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      utilityBackground: getComputedStyle(utility).backgroundColor,
      darkVariantDisplay: getComputedStyle(darkVariant).display,
      mutedForeground: resolve("var(--muted-foreground)"),
      defaultStyleLeaks: unstyled
        .map((el) => [el.localName, getComputedStyle(el).backgroundColor])
        .filter(([, background]) => background !== "rgba(0, 0, 0, 0)")
        .map(([tag, background]) => `${tag} ${background}`),
      tokens,
    };
  } finally {
    probe.remove();
  }
};

/** Returns why `sample` does not follow the VS Code theme, or `undefined`. */
const themeMismatch = (sample: ThemeSample) => {
  for (const [token, { token: value, vscode, from }] of Object.entries(
    sample.tokens,
  )) {
    if (value !== vscode) return `${token} is ${value}, ${from} is ${vscode}`;
  }
  const background = sample.tokens["--background"]?.vscode;
  if (sample.bodyBackground !== background) {
    return `body background is ${sample.bodyBackground}, expected ${background}`;
  }
  if (sample.utilityBackground !== background) {
    return `bg-background is ${sample.utilityBackground}, expected ${background}`;
  }
  if (sample.mutedForeground === sample.tokens["--foreground"]?.token) {
    return `--muted-foreground is the same colour as --foreground (${sample.mutedForeground})`;
  }
  const scheme = sample.dark ? "dark" : "light";
  if (sample.colorScheme !== scheme) {
    return `color-scheme is ${sample.colorScheme} under a ${scheme} theme`;
  }
  if (sample.defaultStyleLeaks.length > 0) {
    return `VS Code default styles leak: ${sample.defaultStyleLeaks.join(", ")}`;
  }
  const display = sample.dark ? "none" : "block";
  if (sample.darkVariantDisplay !== display) {
    return `"block dark:hidden" displays ${sample.darkVariantDisplay} under a ${scheme} theme`;
  }
  return undefined;
};

const setColorTheme = async (theme: string | null) => {
  const update: ColorThemeUpdate = { theme };
  const response = await vscodeFetch(COLOR_THEME_ROUTE, {
    method: "PUT",
    body: JSON.stringify(update),
  });
  if (!response.ok) {
    throw new Error(`${COLOR_THEME_ROUTE} answered ${response.status}`);
  }
};

const LIGHT_THEME = "Default Light Modern";
const DARK_THEME = "Default Dark Modern";

const openExternalState = async (stub?: boolean) => {
  if (stub !== undefined) {
    const response = await vscodeFetch(OPEN_EXTERNAL_ROUTE, {
      method: "PUT",
      body: JSON.stringify({ stub }),
    });
    if (!response.ok) {
      throw new Error(`${OPEN_EXTERNAL_ROUTE} answered ${response.status}`);
    }
  }
  const response = await vscodeFetch(OPEN_EXTERNAL_ROUTE);
  return (await response.json()) as OpenExternalState;
};

/** The first absolute link in the markdown fixture. */
const MARKDOWN_LINK = (() => {
  const fixture = selectFixture("markdown");
  const text = fixtureText(
    fixture.script({ prompt: fixture.prompt, toolResults: new Map() }),
  );
  const href = /\]\((https:[^)\s]+)\)/.exec(text)?.[1];
  if (!href) throw new Error("The markdown fixture has no https link");
  return href;
})();

/** Switches to a new thread, sends the fixture prompt and waits for the run to settle. */
const runFixtureInNewThread = async (aui: AssistantClient, prompt: string) => {
  await waitForThreadList(aui);
  aui.threads().switchToNewThread();
  await waitFor(
    () => aui.thread().getState().messages.length === 0,
    5_000,
    () => "a new empty thread",
  );
  return sendAndSettle(aui, prompt);
};

type ReplyPart = {
  type: string;
  toolName?: string;
  result?: unknown;
  name?: string;
  url?: string;
};

/** Why the reply lacks a part that `step` should have produced, or `undefined`. */
const missingPart = (parts: readonly ReplyPart[], step: FixtureStep) => {
  switch (step.type) {
    case "text":
    case "reasoning":
      return parts.some((p) => p.type === step.type)
        ? undefined
        : `no ${step.type} part`;
    case "tool-call": {
      const call = parts.find(
        (p) => p.type === "tool-call" && p.toolName === step.toolName,
      );
      if (!call) return `no ${step.toolName} call`;
      if (step.result !== undefined && call.result === undefined) {
        return `${step.toolName} has no result`;
      }
      return undefined;
    }
    case "source":
      return parts.some((p) => p.type === "source" && p.url === step.url)
        ? undefined
        : `no source ${step.url}`;
    case "file":
      return parts.some((p) => p.type === "file" || p.type === "image")
        ? undefined
        : `no ${step.mediaType} file part`;
    case "data":
      return parts.some((p) => p.type === "data" && p.name === step.name)
        ? undefined
        : `no ${step.name} data part`;
    case "error":
      return undefined;
  }
};

const checkFixture = async (aui: AssistantClient, fixture: Fixture) => {
  const csp = cspViolations.length;
  const errors = consoleErrors.length;
  const reply = await runFixtureInNewThread(aui, fixture.prompt);
  await sleep(250);
  const problems: string[] = [];
  const status = reply.status;
  if (status?.type === "incomplete") {
    problems.push(`status incomplete (${status.reason})`);
  }
  const steps = fixture.script({
    prompt: fixture.prompt,
    toolResults: new Map(),
  });
  for (const step of steps) {
    const missing = missingPart(reply.content as readonly ReplyPart[], step);
    if (missing) problems.push(missing);
  }
  if (!document.querySelector("[data-slot=aui_thread-viewport]")) {
    problems.push("the thread unmounted");
  }
  const newCsp = cspViolations.slice(csp);
  if (newCsp.length > 0) {
    problems.push(
      `CSP: ${[...new Set(newCsp.map((v) => `${v.directive} ${v.blocked || v.sample}`))].join(", ")}`,
    );
  }
  const newErrors = consoleErrors.slice(errors);
  if (newErrors.length > 0) {
    problems.push(
      `console: ${[...new Set(newErrors)].slice(0, 2).join(" | ")}`,
    );
  }
  return problems;
};

export const WEBVIEW_PROBES: Partial<Record<ProbeId, WebviewProbe>> = {
  "chat-fixtures": async (ctx) => {
    const aui = requireThread(ctx);
    const conflicts = [...fixtureConflicts(), ...fixtureUIConflicts()];
    const failures: string[] = [...conflicts];
    for (const fixture of RICH_FIXTURES) {
      const problems = await checkFixture(aui, fixture).catch(
        (error: unknown) => [
          error instanceof Error ? error.message : String(error),
        ],
      );
      if (problems.length > 0) {
        failures.push(`${fixture.name} (${problems.join("; ")})`);
      }
    }
    const runtime = ctx.boot.switchboard.runtime;
    if (failures.length > 0) {
      return {
        state: "fail",
        detail: `runtime=${runtime}: ${failures.join("; ")}`,
      };
    }
    return {
      state: "pass",
      detail: `runtime=${runtime}: ${RICH_FIXTURES.map((f) => f.name).join(", ")}`,
    };
  },

  "bridge-roundtrip": async (ctx) => {
    const aui = requireThread(ctx);
    const route = routeOf(ctx);
    const fixture = selectFixture("text");
    const expected = fixtureText(
      fixture.script({ prompt: fixture.prompt, toolResults: new Map() }),
    );
    const since = await lastServedSeq();
    const index = aui.thread().getState().messages.length + 1;

    const snapshots: string[] = [];
    const unsubscribe = aui.subscribe(() => {
      const reply = aui.thread().getState().messages[index];
      const text = reply?.role === "assistant" ? textOf(reply) : "";
      if (text && text !== snapshots.at(-1)) snapshots.push(text);
    });
    try {
      await sendAndSettle(aui, fixture.prompt);
    } finally {
      unsubscribe();
    }

    const final = textOf(aui.thread().getState().messages[index]);
    if (final !== expected) {
      return {
        state: "fail",
        detail: `Reply ${JSON.stringify(final)} does not match the fixture`,
      };
    }
    const outOfOrder = snapshots.find((text) => !expected.startsWith(text));
    if (outOfOrder !== undefined) {
      return {
        state: "fail",
        detail: `Streamed text ${JSON.stringify(outOfOrder)} is not a prefix of the fixture`,
      };
    }
    if (snapshots.length < 2) {
      return {
        state: "fail",
        detail: `Reply arrived in ${snapshots.length} update(s), not streamed`,
      };
    }
    const [served] = await waitForServed(
      since,
      route,
      fixture.name,
      (requests) => requests.some((r) => r.completed),
      "completed the request",
    );
    if (served?.aborted) {
      return { state: "fail", detail: `Host ${route} saw an abort` };
    }
    return {
      state: "pass",
      detail: `runtime=${ctx.boot.switchboard.runtime} via ${route}: ${snapshots.length} updates, ${served?.bytes} bytes`,
    };
  },

  abort: async (ctx) => {
    const aui = requireThread(ctx);
    const route = routeOf(ctx);
    const fixture = selectFixture("markdown");
    const since = await lastServedSeq();
    const index = aui.thread().getState().messages.length + 1;

    aui.thread().append(fixture.prompt);
    await waitFor(
      () => textOf(aui.thread().getState().messages[index]).length > 0,
      15_000,
      () => "the markdown reply to start streaming",
    );
    aui.thread().cancelRun();
    await waitFor(
      () => !aui.thread().getState().isRunning,
      15_000,
      () => "the cancelled run to settle",
    );

    const reply = aui.thread().getState().messages[index];
    const status = reply?.status;
    if (status?.type !== "incomplete" || status.reason !== "cancelled") {
      return {
        state: "fail",
        detail: `Cancelled reply has status ${JSON.stringify(status)}`,
      };
    }
    const [served] = await waitForServed(
      since,
      route,
      fixture.name,
      (requests) => requests.some((r) => r.aborted),
      "saw req.signal abort",
    );
    if (served?.completed) {
      return {
        state: "fail",
        detail: `Host ${route} finished streaming despite the abort`,
      };
    }
    return {
      state: "pass",
      detail: `runtime=${ctx.boot.switchboard.runtime}: req.signal fired after ${served?.bytes} bytes`,
    };
  },

  "csp-zero": async (ctx) => {
    if (ctx.boot.switchboard.csp !== "strict") {
      return { state: "fail", detail: "Requires auiTest.csp=strict" };
    }
    if (ctx.aui) await sendAndSettle(ctx.aui, "markdown");
    await sleep(250);
    if (ctx.cspViolations.length === 0) {
      return { state: "pass", detail: "0 violations" };
    }
    const kinds = [
      ...new Set(
        ctx.cspViolations.map((v) =>
          `${v.directive} ${v.blocked || v.sample}`.trim(),
        ),
      ),
    ];
    return {
      state: "fail",
      detail: `${ctx.cspViolations.length} violations: ${kinds.join("; ")}`,
    };
  },

  "theme-follows": async (ctx) => {
    const { location } = ctx.boot.switchboard;
    const before = sampleTheme(location);
    const initialMismatch = themeMismatch(before);
    if (initialMismatch) {
      return { state: "fail", detail: `Before the switch: ${initialMismatch}` };
    }

    const response = await vscodeFetch(COLOR_THEME_ROUTE);
    const original = (await response.json()) as ColorThemeState;
    const target = before.dark ? LIGHT_THEME : DARK_THEME;
    let after: ThemeSample;
    try {
      await setColorTheme(target);
      await waitFor(
        () => isDarkTheme() !== before.dark,
        10_000,
        () => `the webview to switch to ${target}`,
      );
      await waitFor(
        () =>
          sampleTheme(location).tokens["--background"]?.vscode !==
          before.tokens["--background"]?.vscode,
        5_000,
        () => `the --vscode-* variables of ${target}`,
      );
      after = sampleTheme(location);
    } finally {
      await setColorTheme(original.userValue);
      await waitFor(
        () => isDarkTheme() === before.dark,
        10_000,
        () => `the webview to switch back to ${original.current}`,
      );
    }

    const restoredMismatch = themeMismatch(sampleTheme(location));
    if (restoredMismatch) {
      return {
        state: "fail",
        detail: `After restoring ${original.current}: ${restoredMismatch}`,
      };
    }

    const switchedMismatch = themeMismatch(after);
    if (switchedMismatch) {
      return { state: "fail", detail: `After ${target}: ${switchedMismatch}` };
    }
    const unchanged = Object.keys(before.tokens).filter(
      (token) => before.tokens[token]?.token === after.tokens[token]?.token,
    );
    if (unchanged.length > 0) {
      return {
        state: "fail",
        detail: `${unchanged.join(", ")} did not change after ${target}`,
      };
    }
    const bg = (s: ThemeSample) => s.tokens["--background"]?.token;
    return {
      state: "pass",
      detail: `surface=${location}: ${original.current} ${bg(before)} -> ${target} ${bg(after)}, ${Object.keys(before.tokens).length} tokens and dark: follow`,
    };
  },

  "external-link": async (ctx) => {
    const aui = requireThread(ctx);
    const { stub } = await openExternalState();
    let clicked: HTMLAnchorElement | undefined;
    let opened: OpenExternalState["opened"] = [];
    const locationBefore = window.location.href;
    try {
      const { opened: before } = await openExternalState(true);
      const since = before.at(-1)?.seq ?? 0;
      await sendAndSettle(aui, "markdown");
      await waitFor(
        () => {
          clicked = [
            ...document.querySelectorAll<HTMLAnchorElement>("a[href]"),
          ].findLast((a) => a.getAttribute("href") === MARKDOWN_LINK);
          return clicked !== undefined;
        },
        5_000,
        () => `a rendered link to ${MARKDOWN_LINK}`,
      );
      clicked?.click();
      const deadline = Date.now() + 5_000;
      while (opened.length === 0 && Date.now() < deadline) {
        await sleep(50);
        opened = (await openExternalState()).opened.filter(
          (o) => o.seq > since,
        );
      }
    } finally {
      await openExternalState(stub);
    }

    if (!clicked?.isConnected || window.location.href !== locationBefore) {
      return {
        state: "fail",
        detail: `The webview navigated to ${window.location.href}`,
      };
    }
    const expected = new URL(MARKDOWN_LINK).href;
    if (opened.length !== 1 || opened[0]?.url !== expected) {
      return {
        state: "fail",
        detail: `Host openExternal calls: ${JSON.stringify(opened.map((o) => o.url))}, expected [${JSON.stringify(expected)}]`,
      };
    }
    return {
      state: "pass",
      detail: `openExternal(${expected}) stubbed; webview stayed put`,
    };
  },

  "frontend-tool-hitl": async (ctx) => {
    const aui = requireThread(ctx);
    const route = routeOf(ctx);
    const since = await lastServedSeq();
    const pending = await sendAndSettle(aui, "approval");
    const index = aui.thread().getState().messages.length - 1;
    const call = pending.content.find(
      (p) => p.type === "tool-call" && p.toolName === APPROVAL_TOOL_NAME,
    );
    if (call?.type !== "tool-call" || call.result !== undefined) {
      return { state: "fail", detail: "No pending approval tool call" };
    }
    aui
      .thread()
      .message({ index })
      .part({ toolCallId: call.toolCallId })
      .addToolResult({ approved: true });
    await waitFor(
      () =>
        textOf(aui.thread().getState().messages[index]).includes("Approved"),
      45_000,
      () => "the run to continue after approval",
    );
    await waitFor(
      () => !aui.thread().getState().isRunning,
      45_000,
      () => "the continued run to finish",
    );
    await waitForServed(
      since,
      route,
      "approval",
      (requests) =>
        requests.length === 2 &&
        requests[0]?.toolResults === 0 &&
        requests[1]?.toolResults === 1 &&
        requests.every((r) => r.completed),
      "served the request and its approved continuation",
    );
    return {
      state: "pass",
      detail: `runtime=${ctx.boot.switchboard.runtime}: approval continued over ${route}`,
    };
  },
};

const waitForThreadList = (aui: AssistantClient) =>
  waitFor(
    () => !aui.threads().getState().isLoading,
    10_000,
    () => "the thread list to load",
  );

const waitForClient = async (getContext: () => { aui?: AssistantClient }) => {
  await waitFor(
    () => getContext().aui !== undefined,
    10_000,
    () => "the thread to mount",
  );
  return getContext().aui as AssistantClient;
};

/**
 * Steps of host probes, which need the webview to reload or move in between.
 * Each returns a value for the host or throws.
 */
export const WEBVIEW_TASKS: Partial<
  Record<
    WebviewTaskId,
    (aui: AssistantClient, arg: unknown) => Promise<unknown>
  >
> = {
  "seed-thread": async (aui) => {
    await waitForThreadList(aui);
    aui.threads().switchToNewThread();
    await waitFor(
      () => aui.thread().getState().messages.length === 0,
      5_000,
      () => "a new empty thread",
    );
    const prompt = `text threads-persist ${Date.now().toString(36)}`;
    await sendAndSettle(aui, prompt);
    const main = () => aui.threads().item("main").getState();
    await waitFor(
      () => main().remoteId !== undefined,
      5_000,
      () => "the new thread to get a remote id",
    );
    const remoteId = main().remoteId ?? "";
    await waitFor(
      () =>
        [...storedThreadValues].some(
          ([key, value]) => key.includes(remoteId) && value.includes(prompt),
        ),
      5_000,
      () => `the messages of ${remoteId} to reach the host's globalState`,
    );
    const seeded: SeededThread = { remoteId, prompt };
    return seeded;
  },

  "run-fixture": async (aui, arg) => {
    await runFixtureInNewThread(aui, arg as string);
    await sleep(300);
    return { width: window.innerWidth, height: window.innerHeight };
  },

  "find-thread": async (aui, arg) => {
    const { remoteId, prompt } = arg as SeededThread;
    await waitForThreadList(aui);
    const { threadIds, threadItems } = aui.threads().getState();
    const item = threadItems.find((t) => t.remoteId === remoteId);
    if (!item || !threadIds.includes(item.id)) {
      throw new Error(
        `Thread ${remoteId} is not listed (listed: ${JSON.stringify(threadItems.map((t) => t.remoteId ?? t.status))})`,
      );
    }
    aui.threads().switchToThread(item.id);
    await waitFor(
      () => {
        const [user, reply] = aui.thread().getState().messages;
        return textOf(user) === prompt && textOf(reply).length > 0;
      },
      10_000,
      () => {
        const { messages } = aui.thread().getState();
        return `thread ${remoteId} to load its messages (has ${messages.length})`;
      },
    );
    return aui.thread().getState().messages.length;
  },
};

const post = (message: WebviewToHostMessage) =>
  getVSCodeApi().postMessage(message);

export const startProbeListener = (
  getContext: () => Omit<WebviewProbeContext, "cspViolations">,
) => {
  const onMessage = async (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (!isTestbedMessage(data)) return;
    const message = data as HostToWebviewMessage;
    if (message.type === "run-task") {
      let result: TaskResult;
      try {
        const task = WEBVIEW_TASKS[message.task];
        if (!task) throw new Error(`The Assistant view has no ${message.task}`);
        const aui = await waitForClient(getContext);
        const value = await task(aui, message.arg);
        result = { ok: true, value };
      } catch (error) {
        result = {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
      post({
        channel: TESTBED_CHANNEL,
        type: "task-result",
        requestId: message.requestId,
        result,
      });
      return;
    }
    if (message.type !== "run-probe") return;
    const { requestId, probeId } = message;
    const probe = WEBVIEW_PROBES[probeId];
    let result: ProbeResult;
    try {
      result = probe
        ? await probe({ ...getContext(), cspViolations })
        : NOT_IMPLEMENTED;
    } catch (error) {
      result = {
        state: "fail",
        detail: error instanceof Error ? error.message : String(error),
      };
    }
    post({ channel: TESTBED_CHANNEL, type: "probe-result", requestId, result });
  };
  window.addEventListener("message", onMessage);
  post({
    channel: TESTBED_CHANNEL,
    type: "ready",
    implementedProbes: PROBES.map((p) => p.id).filter(
      (id) => WEBVIEW_PROBES[id] !== undefined,
    ),
  });
  return () => window.removeEventListener("message", onMessage);
};
