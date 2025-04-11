"use client";

import { useState } from "react";
import {
  DangerousInBrowserAdapter,
  DangerousInBrowserAdapterOptions,
} from "./DangerousInBrowserAdapter";
import {
  INTERNAL,
  LocalRuntimeOptions,
  useLocalRuntime,
} from "@assistant-ui/react";

const { splitLocalRuntimeOptions } = INTERNAL;

export type DangerousInBrowserRuntimeOptions =
  DangerousInBrowserAdapterOptions & LocalRuntimeOptions;

export const useDangerousInBrowserRuntime = (
  options: DangerousInBrowserRuntimeOptions,
) => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);
  const [adapter] = useState(() => new DangerousInBrowserAdapter(otherOptions));
  return useLocalRuntime(adapter, localRuntimeOptions);
};
