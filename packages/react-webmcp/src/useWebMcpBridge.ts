"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import {
  createWebMcpApprovalGate,
  type WebMcpApprovalGate,
} from "./approval-gate";

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

const emptySubscribe = () => () => {};
const getServerStatus = (): WebMcpBridgeStatus => "unsupported";

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
  const [registeredToolNames, setRegisteredToolNames] =
    useState<string[]>(EMPTY_NAMES);

  const { adapter: adapterOption } = options;

  const optionsRef = useRef(options);
  const syncRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const filterChanged = optionsRef.current.filter !== options.filter;
    optionsRef.current = options;
    if (filterChanged) syncRef.current?.();
  });

  const status = useSyncExternalStore(
    emptySubscribe,
    useCallback(
      (): WebMcpBridgeStatus =>
        (adapterOption ?? getDefaultWebMcpAdapter()).available
          ? "active"
          : "unsupported",
      [adapterOption],
    ),
    getServerStatus,
  );

  useEffect(() => {
    const adapter = adapterOption ?? getDefaultWebMcpAdapter();
    if (!adapter.available) return undefined;

    const requestUserInteraction =
      adapter.requestUserInteraction?.bind(adapter);
    const approvalGate: WebMcpApprovalGate = (request) =>
      createWebMcpApprovalGate({
        approval: optionsRef.current.approval,
        approvalTimeoutMs: optionsRef.current.approvalTimeoutMs,
        requestUserInteraction,
      })(request);

    type Registration = {
      entry: WebMcpRegistrationEntry;
      box: { tool: Tool<any, any> };
      dispose: () => void;
    };
    const registered = new Map<string, Registration>();

    const publishNames = () => {
      const names = [...registered.keys()].sort();
      setRegisteredToolNames((prev) =>
        prev.length === names.length && prev.every((v, i) => v === names[i])
          ? prev
          : names,
      );
    };

    const sync = () => {
      const filter = optionsRef.current.filter ?? defaultWebMcpFilter;
      const tools = aui.modelContext.getModelContext().tools ?? {};
      const desired = new Map<
        string,
        { tool: Tool<any, any>; entry: WebMcpRegistrationEntry }
      >();
      for (const [name, tool] of Object.entries(tools)) {
        try {
          if (!filter(name, tool)) continue;
          desired.set(name, { tool, entry: toRegistrationEntry(tool) });
        } catch (error) {
          console.warn(
            `[assistant-ui] Skipping WebMCP registration for tool "${name}": filter or schema conversion failed.`,
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
        if (adapter.hasTool?.(name)) {
          console.warn(
            `[assistant-ui] Skipping WebMCP registration for tool "${name}": the name is already registered on the page's model context.`,
          );
          continue;
        }
        try {
          const registration: Registration = {
            entry: target.entry,
            box: { tool: target.tool },
            dispose: () => {},
          };
          registration.dispose = adapter.registerTool(
            toWebMcpTool(name, () => registration.box.tool, approvalGate),
            (error) => {
              if (registered.get(name) !== registration) return;
              registration.dispose();
              registered.delete(name);
              console.warn(
                `[assistant-ui] WebMCP registration for tool "${name}" failed (name may already be registered).`,
                error,
              );
              publishNames();
            },
          );
          registered.set(name, registration);
        } catch (error) {
          console.warn(
            `[assistant-ui] Skipping WebMCP registration for tool "${name}": registerTool failed (name may already be registered).`,
            error,
          );
        }
      }

      for (const [name, target] of desired) {
        const existing = registered.get(name);
        if (existing) existing.box.tool = target.tool;
      }

      publishNames();
    };

    sync();
    syncRef.current = sync;
    const unsubscribe = aui.modelContext.subscribe?.(sync);

    return () => {
      syncRef.current = null;
      unsubscribe?.();
      for (const { dispose } of registered.values()) dispose();
      registered.clear();
      setRegisteredToolNames(EMPTY_NAMES);
    };
  }, [aui, adapterOption]);

  return { status, registeredToolNames };
};
