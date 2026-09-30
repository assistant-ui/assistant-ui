import type { AssistantClient } from "@assistant-ui/react";
import {
  NOT_IMPLEMENTED,
  PROBES,
  type ProbeId,
  type ProbeResult,
} from "../src/readiness/probes";
import {
  isTestbedMessage,
  TESTBED_CHANNEL,
  type HostToWebviewMessage,
  type WebviewBootConfig,
  type WebviewToHostMessage,
} from "../src/protocol";
import { APPROVAL_TOOL_NAME } from "../src/fixtures/fixtures";
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

export const WEBVIEW_PROBES: Partial<Record<ProbeId, WebviewProbe>> = {
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

  "frontend-tool-hitl": async (ctx) => {
    const aui = requireThread(ctx);
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
    return { state: "pass", detail: `runtime=${ctx.boot.switchboard.runtime}` };
  },
};

const post = (message: WebviewToHostMessage) =>
  getVSCodeApi().postMessage(message);

export const startProbeListener = (
  getContext: () => Omit<WebviewProbeContext, "cspViolations">,
) => {
  const onMessage = async (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (!isTestbedMessage(data) || data.type !== "run-probe") return;
    const { requestId, probeId } = data as HostToWebviewMessage;
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
