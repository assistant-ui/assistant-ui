"use client";

import { useEffect, useState } from "react";
import { useAui } from "@assistant-ui/store";
import type { Tool } from "assistant-stream";
import { getDefaultWebMcpAdapter, type WebMcpAdapter } from "./webmcp-adapter";
import {
  defaultWebMcpFilter,
  toWebMcpInputSchema,
  toWebMcpTool,
} from "./convertTools";
import {
  diffRegistrations,
  type WebMcpRegistrationEntry,
} from "./diffRegistrations";
import { createWebMcpApprovalGate } from "./approval-gate";

export type WebMcpBridgeOptions = {
  filter?: (name: string, tool: Tool<any, any>) => boolean;
  approval?:
    | "always"
    | "never"
    | ((
        name: string,
        tool: Tool<any, any>,
        args: Record<string, unknown>,
      ) => boolean);
  approvalTimeoutMs?: number;
  adapter?: WebMcpAdapter;
};

export type WebMcpBridgeStatus = "unsupported" | "active";

export type WebMcpBridgeResult = {
  status: WebMcpBridgeStatus;
  registeredToolNames: string[];
};

const EMPTY_NAMES: string[] = [];

const toRegistrationEntry = (
  tool: Tool<any, any>,
): WebMcpRegistrationEntry => ({
  description: tool.description ?? "",
  inputSchemaJson: JSON.stringify(toWebMcpInputSchema(tool)) ?? "",
});

export const useWebMcpBridge = (
  options: WebMcpBridgeOptions = {},
): WebMcpBridgeResult => {
  const aui = useAui();
  const [status, setStatus] = useState<WebMcpBridgeStatus>("unsupported");
  const [registeredToolNames, setRegisteredToolNames] =
    useState<string[]>(EMPTY_NAMES);

  const {
    adapter: adapterOption,
    filter,
    approval,
    approvalTimeoutMs,
  } = options;

  useEffect(() => {
    const adapter = adapterOption ?? getDefaultWebMcpAdapter();
    if (!adapter.available) {
      setStatus("unsupported");
      return undefined;
    }
    setStatus("active");

    const approvalGate = createWebMcpApprovalGate({
      approval,
      approvalTimeoutMs,
      requestUserInteraction: adapter.requestUserInteraction?.bind(adapter),
    });

    const registered = new Map<
      string,
      { entry: WebMcpRegistrationEntry; dispose: () => void }
    >();
    const effectiveFilter = filter ?? defaultWebMcpFilter;

    const sync = () => {
      const tools = aui.modelContext.getModelContext().tools ?? {};
      const desired = new Map<
        string,
        { tool: Tool<any, any>; entry: WebMcpRegistrationEntry }
      >();
      for (const [name, tool] of Object.entries(tools)) {
        if (!effectiveFilter(name, tool)) continue;
        try {
          desired.set(name, { tool, entry: toRegistrationEntry(tool) });
        } catch (error) {
          console.warn(
            `[assistant-ui] Skipping WebMCP registration for tool "${name}": schema conversion failed.`,
            error,
          );
        }
      }

      const { added, updated, removed } = diffRegistrations(
        Object.fromEntries(
          [...registered].map(([name, { entry }]) => [name, entry]),
        ),
        Object.fromEntries(
          [...desired].map(([name, { entry }]) => [name, entry]),
        ),
      );

      for (const name of [...removed, ...updated]) {
        registered.get(name)?.dispose();
        registered.delete(name);
      }
      for (const name of [...updated, ...added]) {
        const target = desired.get(name);
        if (!target) continue;
        try {
          const dispose = adapter.registerTool(
            toWebMcpTool(name, target.tool, approvalGate),
          );
          registered.set(name, { entry: target.entry, dispose });
        } catch (error) {
          console.warn(
            `[assistant-ui] Skipping WebMCP registration for tool "${name}": registerTool failed (name may already be registered).`,
            error,
          );
        }
      }

      const names = [...registered.keys()].sort();
      setRegisteredToolNames((prev) =>
        prev.length === names.length && prev.every((v, i) => v === names[i])
          ? prev
          : names,
      );
    };

    sync();
    const unsubscribe = aui.modelContext.subscribe?.(sync);

    return () => {
      unsubscribe?.();
      for (const { dispose } of registered.values()) dispose();
      registered.clear();
      setRegisteredToolNames(EMPTY_NAMES);
    };
  }, [aui, adapterOption, filter, approval, approvalTimeoutMs]);

  return { status, registeredToolNames };
};
