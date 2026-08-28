"use client";

import { useEffect, useRef, useState } from "react";
import { useAui } from "@assistant-ui/store";
import type { Tool } from "assistant-stream";
import { getDefaultWebMcpAdapter } from "./webmcp-adapter";
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
  approval?: "always" | "never";
};

export type WebMcpBridgeResult = {
  status: "unsupported" | "active";
  registeredToolNames: string[];
};

const EMPTY_NAMES: string[] = [];

const toRegistrationEntry = (
  tool: Tool<any, any>,
): WebMcpRegistrationEntry => ({
  description: tool.description ?? "",
  inputSchemaJson: JSON.stringify(toWebMcpInputSchema(tool)) ?? "",
});

const signatureOf = (entry: WebMcpRegistrationEntry) =>
  `${entry.description}\u0000${entry.inputSchemaJson}`;

export const useWebMcpBridge = (
  options: WebMcpBridgeOptions = {},
): WebMcpBridgeResult => {
  const aui = useAui();
  const [registeredToolNames, setRegisteredToolNames] =
    useState<string[]>(EMPTY_NAMES);

  const optionsRef = useRef(options);
  const syncRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const filterChanged = optionsRef.current.filter !== options.filter;
    optionsRef.current = options;
    if (filterChanged) syncRef.current?.();
  });

  const [bridged, setBridged] = useState(false);

  useEffect(() => {
    const adapter = getDefaultWebMcpAdapter();
    if (!adapter.available) return undefined;
    setBridged(true);

    const requestUserInteraction =
      adapter.requestUserInteraction?.bind(adapter);
    const allowAlwaysMemory = new Set<string>();
    const grantedSignatures = new Map<string, string>();
    const approvalGate: WebMcpApprovalGate = (request) =>
      createWebMcpApprovalGate({
        approval: optionsRef.current.approval,
        requestUserInteraction,
        allowAlwaysMemory,
      })(request);

    type Registration = {
      entry: WebMcpRegistrationEntry;
      box: { tool: Tool<any, any> };
      lifecycle: AbortController;
      dispose: () => void;
    };
    const registered = new Map<string, Registration>();

    const disposeRegistration = (name: string) => {
      const registration = registered.get(name);
      if (!registration) return;
      registered.delete(name);
      registration.lifecycle.abort();
      try {
        registration.dispose();
      } catch (error) {
        console.warn(
          `[assistant-ui] Unregistering WebMCP tool "${name}" failed.`,
          error,
        );
      }
    };

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
        new Map([...registered].map(([name, { entry }]) => [name, entry])),
        new Map([...desired].map(([name, { entry }]) => [name, entry])),
      );

      for (const name of [...removed, ...updated]) {
        disposeRegistration(name);
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
            lifecycle: new AbortController(),
            dispose: () => {},
          };
          registration.dispose = adapter.registerTool(
            toWebMcpTool(
              name,
              () => registration.box.tool,
              approvalGate,
              registration.lifecycle.signal,
            ),
            (error) => {
              if (registered.get(name) !== registration) return;
              disposeRegistration(name);
              console.warn(
                `[assistant-ui] WebMCP registration for tool "${name}" failed (name may already be registered).`,
                error,
              );
              publishNames();
            },
          );
          registered.set(name, registration);
          const signature = signatureOf(target.entry);
          if (grantedSignatures.get(name) !== signature) {
            allowAlwaysMemory.delete(name);
            grantedSignatures.set(name, signature);
          }
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
      for (const name of [...registered.keys()]) disposeRegistration(name);
      setRegisteredToolNames(EMPTY_NAMES);
      setBridged(false);
    };
  }, [aui]);

  return {
    status: bridged ? "active" : "unsupported",
    registeredToolNames,
  };
};
