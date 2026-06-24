"use client";

import type { ResourceElement } from "@assistant-ui/tap";
import { useMemo } from "react";
import {
  useAui as useStoreAui,
  type AssistantClient,
} from "@assistant-ui/store";

import { Tools } from "./Tools";
import type { Toolkit } from "../model-context/toolbox";

type StoreUseAuiProps = useStoreAui.Props;
type StoreUseAui = (
  clients?: StoreUseAuiProps,
  config?: { parent: null | AssistantClient },
) => AssistantClient;

const useStoreAuiOptional = useStoreAui as StoreUseAui;

const isResourceElement = (
  value: unknown,
): value is ResourceElement<unknown> => {
  return (
    typeof value === "object" &&
    value !== null &&
    "hook" in value &&
    typeof value.hook === "function" &&
    "args" in value &&
    Array.isArray(value.args)
  );
};

const useShallowMemoClients = (
  clients: StoreUseAuiProps | undefined,
): StoreUseAuiProps | undefined => {
  const deps = clients ? Object.entries(clients).flat() : [clients];
  // oxlint-disable-next-line react/exhaustive-deps -- shallow memo over the flattened client entries
  return useMemo(() => clients, deps);
};

export namespace useAui {
  export type Props = Omit<StoreUseAuiProps, "tools"> & {
    tools?: StoreUseAuiProps["tools"] | Toolkit | undefined;
  };
}

export function useAui(): AssistantClient;
export function useAui(clients: useAui.Props): AssistantClient;
export function useAui(
  clients: useAui.Props,
  config: { parent: null | AssistantClient },
): AssistantClient;
export function useAui(
  clients?: useAui.Props,
  config?: { parent: null | AssistantClient },
): AssistantClient {
  const tools = clients?.tools;
  const toolsResource = useMemo(() => {
    if (!tools || isResourceElement(tools)) return tools;
    return Tools({ toolkit: tools });
  }, [tools]);

  const normalizedClients = useShallowMemoClients(
    clients && toolsResource !== tools
      ? ({
          ...clients,
          tools: toolsResource,
        } as StoreUseAuiProps)
      : (clients as StoreUseAuiProps | undefined),
  );

  return useStoreAuiOptional(normalizedClients, config);
}
