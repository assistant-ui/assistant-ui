import * as vscode from "vscode";
import { isImplemented, SWITCHBOARD } from "../switchboard";
import type { ProbeId, ProbeResult } from "./probes";
import {
  PROBE_TIMEOUT_MS,
  WEBVIEW_READY_TIMEOUT_MS,
  type HostProbe,
} from "./runner";

/** The most specific scope that sets `key`, and its value there. */
const settingScope = (config: vscode.WorkspaceConfiguration, key: string) => {
  const inspected = config.inspect<string>(key);
  if (inspected?.workspaceFolderValue !== undefined) {
    return {
      target: vscode.ConfigurationTarget.WorkspaceFolder,
      value: inspected.workspaceFolderValue,
    };
  }
  if (inspected?.workspaceValue !== undefined) {
    return {
      target: vscode.ConfigurationTarget.Workspace,
      value: inspected.workspaceValue,
    };
  }
  return {
    target: vscode.ConfigurationTarget.Global,
    value: inspected?.globalValue,
  };
};

/**
 * Runs bridge-roundtrip under every implemented `auiTest.runtime`, then
 * restores the setting. A runtime that is not implemented yet leaves the probe
 * not implemented rather than failed, so a regression in an implemented
 * runtime still fails it.
 */
const everyRuntime: HostProbe = async (ctx) => {
  const config = vscode.workspace.getConfiguration("auiTest");
  const { target, value: original } = settingScope(config, "runtime");

  const results: { runtime: string; result: ProbeResult }[] = [];
  try {
    for (const runtime of SWITCHBOARD.runtime.values) {
      if (!isImplemented("runtime", runtime)) {
        results.push({ runtime, result: { state: "not-implemented" } });
        continue;
      }
      await config.update("runtime", runtime, target);
      await ctx.showAssistant();
      const webview = await ctx.webviews.waitForReady(WEBVIEW_READY_TIMEOUT_MS);
      results.push({
        runtime,
        result: webview
          ? await ctx.webviews.runProbe(
              webview,
              "bridge-roundtrip",
              PROBE_TIMEOUT_MS,
            )
          : { state: "fail", detail: "webview was not ready" },
      });
    }
  } finally {
    await config.update("runtime", original, target);
  }

  const detail = results
    .map(({ runtime, result }) =>
      result.state === "fail"
        ? `${runtime} fail (${result.detail})`
        : `${runtime} ${result.state}`,
    )
    .join(", ");
  const states = new Set(results.map(({ result }) => result.state));
  if (states.has("fail")) return { state: "fail", detail };
  if (states.has("not-implemented")) {
    return { state: "not-implemented", detail };
  }
  return { state: "pass", detail };
};

export const HOST_PROBES: Partial<Record<ProbeId, HostProbe>> = {
  "every-runtime": everyRuntime,
};
