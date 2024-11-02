"use client";
import { useThreadRuntime } from "@assistant-ui/react";
import { PlaygroundThreadRuntime } from "./playground-runtime";

export const usePlaygroundRuntime = () => {
  return useThreadRuntime() as PlaygroundThreadRuntime;
};
