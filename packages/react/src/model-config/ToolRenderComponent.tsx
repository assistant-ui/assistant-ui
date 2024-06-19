"use client";
import type { ComponentType } from "react";
import type { ToolCallContentPart } from "../experimental";

export type ToolRenderComponent<TArgs, TResult> = ComponentType<{
  part: ToolCallContentPart<TArgs, TResult>;
  status: "done" | "in_progress" | "error";
}>;
