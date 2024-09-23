"use client";
import { useThreadRuntime } from "@assistant-ui/react";
import { PlaygroundThreadRuntimeCore } from "./playground-runtime";

export const usePlaygroundRuntime = () => {
  return useThreadRuntime().unstable_getCore() as PlaygroundThreadRuntimeCore;
};
