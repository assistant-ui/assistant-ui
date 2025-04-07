"use client";

import { LocalRuntimeOptions, useLocalRuntime } from "..";
import { EdgeModelAdapterOptions, EdgeModelAdapter } from "./EdgeModelAdapter";
import { splitLocalRuntimeOptions } from "../local/LocalRuntimeOptions";

export type EdgeRuntimeOptions = EdgeModelAdapterOptions & LocalRuntimeOptions;

export const useEdgeRuntime = (options: EdgeRuntimeOptions) => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);

  return useLocalRuntime(
    new EdgeModelAdapter(otherOptions),
    localRuntimeOptions,
  );
};
