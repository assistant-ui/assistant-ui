"use client";

import {
  makeAssistantToolUI,
  useAssistantToolUI,
  type AssistantToolUI,
  type ToolCallMessagePartComponent,
} from "@assistant-ui/core/react";
import { MCPAppRenderer } from "./app-renderer";
import { useMCPAppContext } from "./context";
import { getMCPAppFromToolPart } from "./utils";

export const MCPAppToolUI: ToolCallMessagePartComponent = (part) => {
  const ctx = useMCPAppContext();
  if (!getMCPAppFromToolPart(part)) return null;
  return (
    <MCPAppRenderer
      part={part}
      sandbox={ctx.sandbox}
      loadResource={ctx.loadResource}
      handlers={ctx.handlers}
      hostInfo={ctx.hostInfo}
      hostContext={ctx.hostContext}
      fallback={ctx.fallback}
      loadingFallback={ctx.loadingFallback}
      errorFallback={ctx.errorFallback}
    />
  );
};

export function makeMCPAppToolUI(toolName: string): AssistantToolUI {
  return makeAssistantToolUI({
    toolName,
    render: MCPAppToolUI,
  });
}

function MCPAppToolRegistrarItem({ toolName }: { toolName: string }): null {
  useAssistantToolUI({ toolName, render: MCPAppToolUI });
  return null;
}

export function MCPAppToolRegistrar({
  toolNames,
}: {
  toolNames: readonly string[];
}) {
  return (
    <>
      {toolNames.map((name) => (
        <MCPAppToolRegistrarItem key={name} toolName={name} />
      ))}
    </>
  );
}
