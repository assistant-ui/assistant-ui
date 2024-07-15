"use client";
import { useThreadContext } from "@assistant-ui/react";
import { PlaygroundThreadRuntime } from "./playground-runtime";

export const useGetPlaygroundRuntime = () => {
  const { useThreadRuntime } = useThreadContext();
  return useThreadRuntime.getState as () => PlaygroundThreadRuntime;
};

export const usePlaygroundRuntime = () => {
  const { useThreadRuntime } = useThreadContext();
  return useThreadRuntime() as PlaygroundThreadRuntime;
};
