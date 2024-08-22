import { LocalRuntimeOptions, useLocalRuntime } from "..";
import { useState } from "react";
import {
  DangerousInBrowserAdapter,
  DangerousInBrowserAdapterOptions,
} from "./DangerousInBrowserAdapter";

export type DangerousInBrowserRuntimeOptions =
  DangerousInBrowserAdapterOptions & LocalRuntimeOptions;

export const useDangerousInBrowserRuntime = ({
  initialMessages,
  ...options
}: DangerousInBrowserRuntimeOptions) => {
  const [adapter] = useState(() => new DangerousInBrowserAdapter(options));
  return useLocalRuntime(adapter, { initialMessages });
};
