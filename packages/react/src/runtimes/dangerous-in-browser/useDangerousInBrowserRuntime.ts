"use client";

import { LocalRuntimeOptions, useLocalRuntime } from "..";
import { useState } from "react";
import {
  DangerousInBrowserAdapter,
  DangerousInBrowserAdapterOptions,
} from "./DangerousInBrowserAdapter";
import { splitLocalRuntimeOptions } from "../local/LocalRuntimeOptions";

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
