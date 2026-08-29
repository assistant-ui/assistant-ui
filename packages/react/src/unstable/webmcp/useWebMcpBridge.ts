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

export type Unstable_WebMcpBridgeOptions = {
  filter?: (name: string, tool: Tool<any, any>) => boolean;
};

export type Unstable_WebMcpBridgeResult = {
  status: "unsupported" | "active";
  registeredToolNames: string[];
};

const EMPTY_NAMES: string[] = [];

const signatureOf = (tool: Tool<any, any>) =>
  `${tool.description ?? ""}\u0000${JSON.stringify(toWebMcpInputSchema(tool))}`;

/**
 * Publishes the frontend tools in the model context to a WebMCP-capable
 * browser, so the user's own browser agent can call them.
 *
 * Returns `status: "unsupported"` when the page exposes no
 * `document.modelContext` (or `navigator.modelContext`), and the sorted names
 * of the tools currently registered with the host.
 */
export const unstable_useWebMcpBridge = (
  options: Unstable_WebMcpBridgeOptions = {},
): Unstable_WebMcpBridgeResult => {
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

    type Registration = {
      signature: string;
      tool: Tool<any, any>;
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
        { tool: Tool<any, any>; signature: string }
      >();
      for (const [name, tool] of Object.entries(tools)) {
        try {
          if (!filter(name, tool)) continue;
          desired.set(name, { tool, signature: signatureOf(tool) });
        } catch (error) {
          console.warn(
            `[assistant-ui] Skipping WebMCP registration for tool "${name}": filter or schema conversion failed.`,
            error,
          );
        }
      }

      for (const name of [...registered.keys()]) {
        if (!desired.has(name)) disposeRegistration(name);
      }

      for (const [name, target] of desired) {
        const existing = registered.get(name);
        if (existing?.signature === target.signature) {
          existing.tool = target.tool;
          continue;
        }
        disposeRegistration(name);
        try {
          const registration: Registration = {
            signature: target.signature,
            tool: target.tool,
            lifecycle: new AbortController(),
            dispose: () => {},
          };
          registration.dispose = adapter.registerTool(
            toWebMcpTool(
              name,
              () => registration.tool,
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
        } catch (error) {
          console.warn(
            `[assistant-ui] Skipping WebMCP registration for tool "${name}": registerTool failed (name may already be registered).`,
            error,
          );
        }
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
