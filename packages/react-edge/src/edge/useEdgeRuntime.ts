"use client";

import { EdgeModelAdapterOptions, EdgeModelAdapter } from "./EdgeModelAdapter";
import {
  INTERNAL,
  LocalRuntimeOptions,
  useLocalRuntime,
} from "@assistant-ui/react";

const { splitLocalRuntimeOptions } = INTERNAL;

export type EdgeRuntimeOptions = EdgeModelAdapterOptions & LocalRuntimeOptions;

export const useEdgeRuntime = (options: EdgeRuntimeOptions) => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);

  return useLocalRuntime(
    new EdgeModelAdapter(otherOptions),
    localRuntimeOptions,
  );
};
