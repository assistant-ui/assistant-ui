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

const normalizeUseAuiProps = (
  clients: useAui.Props | undefined,
): StoreUseAuiProps | undefined => {
  const tools = clients?.tools;
  if (!tools || isResourceElement(tools)) return clients as StoreUseAuiProps;

  return {
    ...clients,
    tools: Tools({ toolkit: tools }),
  } as StoreUseAuiProps;
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
  const normalizedClients = useMemo(
    () => normalizeUseAuiProps(clients),
    [clients],
  );

  return useStoreAuiOptional(normalizedClients, config);
}
