"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useResources, useTapRoot, withKey } from "@assistant-ui/tap";
import { useAui, type AssistantClient } from "@assistant-ui/store";
import type { Tool } from "assistant-stream";
import { getDefaultWebMcpHost, type WebMcpHost } from "./webmcp-host";
import { defaultWebMcpFilter, toWebMcpInputSchema } from "./convertTools";
import { WebMcpRegistrationResource } from "./WebMcpRegistrationResource";

export type Unstable_WebMcpProviderOptions = {
  filter?: (name: string, tool: Tool<any, any>) => boolean;
};

export type Unstable_WebMcpProviderResult = {
  status: "unsupported" | "active";
  registeredToolNames: readonly string[];
};

const EMPTY_NAMES: readonly string[] = Object.freeze([]);
const EMPTY_TOOLS: Record<string, Tool<any, any>> = Object.freeze({});

// The description is re-read on every sync so mutating it in place is
// observed; the schema is converted only when the tool object itself changes.
// Keyed on the tool so a schema or filter that throws warns once instead of
// on every model-context notify.
const warned = new WeakSet<Tool<any, any>>();

const signatures = new WeakMap<
  Tool<any, any>,
  { description: string | undefined; signature: string }
>();

const signatureOf = (tool: Tool<any, any>) => {
  const cached = signatures.get(tool);
  if (cached && cached.description === tool.description)
    return cached.signature;
  const signature = `${tool.description ?? ""}\u0000${JSON.stringify(
    toWebMcpInputSchema(tool),
  )}`;
  signatures.set(tool, { description: tool.description, signature });
  return signature;
};

// getModelContext() rebuilds its result on every call, so it is read into
// state on notify rather than served as a render snapshot.
const useModelContextTools = (aui: AssistantClient, enabled: boolean) => {
  const [tools, setTools] = useState(EMPTY_TOOLS);

  useEffect(() => {
    if (!enabled) return undefined;
    const read = () =>
      setTools(aui.modelContext.getModelContext().tools ?? EMPTY_TOOLS);
    read();
    return aui.modelContext.subscribe?.(read);
  }, [aui, enabled]);

  return tools;
};

const useStableNames = (names: readonly (string | null)[]) => {
  const [cell] = useState(() => ({ names: EMPTY_NAMES }));
  const next = names.filter((name): name is string => name !== null).sort();
  const previous = cell.names;
  if (
    previous.length === next.length &&
    previous.every((name, index) => name === next[index])
  ) {
    return previous;
  }
  cell.names = next;
  return next;
};

const useWebMcpRegistry = ({
  aui,
  host,
  filter,
}: {
  aui: AssistantClient;
  host: WebMcpHost;
  filter: (name: string, tool: Tool<any, any>) => boolean;
}) => {
  const tools = useModelContextTools(aui, host.available);

  const elements = [];
  for (const [name, tool] of Object.entries(tools)) {
    try {
      if (!filter(name, tool)) continue;
      const signature = signatureOf(tool);
      elements.push(
        withKey(
          name,
          WebMcpRegistrationResource({ host, name, signature, tool }),
          [host, name, signature, tool],
        ),
      );
    } catch (error) {
      if (warned.has(tool)) continue;
      warned.add(tool);
      console.warn(
        `[assistant-ui] Skipping WebMCP registration for tool "${name}": filter or schema conversion failed.`,
        error,
      );
    }
  }

  return useStableNames(useResources(elements));
};

/**
 * Publishes the frontend tools in the model context to a WebMCP-capable
 * browser, so the user's own browser agent can call them.
 *
 * Returns `status: "unsupported"` when the page exposes no
 * `document.modelContext` (or `navigator.modelContext`), and the sorted names
 * of the tools currently registered with the host.
 */
export const unstable_useWebMcpProvider = (
  options: Unstable_WebMcpProviderOptions = {},
): Unstable_WebMcpProviderResult => {
  const aui = useAui();
  const [host] = useState(getDefaultWebMcpHost);
  const filter = options.filter ?? defaultWebMcpFilter;

  const root = useTapRoot(function WebMcpProviderRoot() {
    return useWebMcpRegistry({ aui, host, filter });
  });
  const registeredToolNames = useSyncExternalStore(
    root.subscribe,
    root.getValue,
    () => EMPTY_NAMES,
  );

  const [published, setPublished] = useState(false);
  useEffect(() => {
    if (host.available) setPublished(true);
  }, [host]);

  return {
    status: published ? "active" : "unsupported",
    registeredToolNames,
  };
};
