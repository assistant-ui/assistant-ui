"use client";

import type { ComponentType, ReactNode } from "react";
import type { Tool } from "assistant-stream";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";

export type ToolDefinition<
  TArgs extends Record<string, unknown>,
  TResult,
> = Tool<TArgs, TResult> & {
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
};

export const FallbackSymbol = Symbol("Toolkit.Fallback");
export const LayoutSymbol = Symbol("Toolkit.Layout");

export type ToolkitFallback = {
  render: ToolCallMessagePartComponent<unknown, unknown>;
};

export type ToolkitLayout = {
  render: ComponentType<{ children: ReactNode }>;
};

export type Toolkit = Record<string, ToolDefinition<any, any>> & {
  [FallbackSymbol]?: ToolkitFallback;
  [LayoutSymbol]?: ToolkitLayout;
};

export const Toolkit = {
  Fallback: FallbackSymbol,
  Layout: LayoutSymbol,
} as const;

export type ToolsConfig = {
  toolkit: Toolkit;
};
