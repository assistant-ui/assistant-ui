"use client";
import { useThreadRuntime, useThreadRuntimeStore } from "@assistant-ui/react";
import { PlaygroundThreadRuntime } from "./playground-runtime";

export const useGetPlaygroundRuntime = () => {
  return useThreadRuntimeStore().getState as () => PlaygroundThreadRuntime;
};

export const usePlaygroundRuntime = () => {
  return useThreadRuntime() as PlaygroundThreadRuntime;
};
