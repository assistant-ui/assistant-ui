"use client";

import {
  formatToolCall,
  ToolErrorCard,
  ToolStatusCard,
  ToolTraceCard,
} from "@/lib/tool-trace";
import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import {
  BookOpenIcon,
  ExternalLinkIcon,
  FileCodeIcon,
  FileTextIcon,
  FolderTreeIcon,
  InfoIcon,
  LayoutTemplateIcon,
  TerminalIcon,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode } from "react";

function getToolIcon(toolName: string): ReactNode {
  const Icon = getToolIconComponent(toolName);
  return <Icon className="size-3.5" />;
}

function getToolIconComponent(toolName: string): LucideIcon {
  switch (toolName) {
    case "listDocs":
      return FolderTreeIcon;
    case "readDoc":
      return FileTextIcon;
    case "bash":
    case "inspectSourceMap":
      return TerminalIcon;
    case "readFile":
    case "readSourceMapFile":
      return FileCodeIcon;
    case "getTemplateList":
      return LayoutTemplateIcon;
    case "getTemplateDetails":
      return InfoIcon;
    case "openTemplatePreview":
      return ExternalLinkIcon;
    default:
      return BookOpenIcon;
  }
}

function getRunningMessage(toolName: string): string {
  switch (toolName) {
    case "listDocs":
      return "Listing docs...";
    case "readDoc":
      return "Reading page...";
    case "bash":
    case "inspectSourceMap":
      return "Running command...";
    case "readFile":
    case "readSourceMapFile":
      return "Reading file...";
    case "getTemplateList":
      return "Loading templates...";
    case "getTemplateDetails":
      return "Reading template...";
    case "openTemplatePreview":
      return "Opening preview...";
    default:
      return "Running...";
  }
}

function extractToolError(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const record = result as Record<string, unknown>;
  if (record.success === false) {
    if (typeof record.error === "string") return record.error;
    return "Tool failed";
  }
  if (typeof record.error === "string") return record.error;
  return null;
}

function summarizeXuluxResult(toolName: string, result: unknown): string {
  if (result === undefined || result === null) return "Done";

  const error = extractToolError(result);
  if (error) return error;

  if (typeof result !== "object") return String(result);

  const record = result as Record<string, unknown>;

  switch (toolName) {
    case "listDocs": {
      const children = record.children;
      if (Array.isArray(children)) {
        return `${children.length} item${children.length === 1 ? "" : "s"}`;
      }
      return "Listed";
    }
    case "readDoc":
      return typeof record.title === "string" ? record.title : "Read page";
    case "bash":
    case "inspectSourceMap": {
      const stdout = record.stdout;
      if (typeof stdout === "string" && stdout.trim()) {
        const line = stdout.trim().split("\n")[0] ?? "";
        return line.length > 48 ? `${line.slice(0, 45)}...` : line;
      }
      return "Completed";
    }
    case "readFile":
    case "readSourceMapFile": {
      const path = typeof record.path === "string" ? record.path : "";
      return path ? path.split("/").slice(-2).join("/") : "Read file";
    }
    case "getTemplateList": {
      const templates = record.templates;
      if (Array.isArray(templates)) {
        return `${templates.length} template${templates.length === 1 ? "" : "s"}`;
      }
      return "Templates loaded";
    }
    case "getTemplateDetails": {
      const name =
        typeof record.name === "string"
          ? record.name
          : typeof record.id === "string"
            ? record.id
            : "Template details";
      return name;
    }
    case "openTemplatePreview": {
      if (typeof record.title === "string") return record.title;
      const templateId =
        typeof record.templateId === "string" ? record.templateId : "";
      const versionId =
        typeof record.versionId === "string" ? record.versionId : "";
      if (templateId && versionId) return `${templateId} · ${versionId}`;
      return templateId || "Preview opened";
    }
    default:
      return "Completed";
  }
}

export function XuluxToolCall({
  toolName,
  args,
  result,
  status,
}: ToolCallMessagePartProps): ReactNode {
  const signature = formatToolCall(toolName, args);
  const icon = getToolIcon(toolName);
  const isRunning = status?.type === "running";
  const error = !isRunning ? extractToolError(result) : null;

  if (isRunning) {
    return (
      <ToolStatusCard
        icon={icon}
        signature={signature}
        message={getRunningMessage(toolName)}
        loading
      />
    );
  }

  if (error) {
    return <ToolErrorCard signature={signature} error={error} />;
  }

  return (
    <ToolTraceCard
      icon={icon}
      signature={signature}
      description={summarizeXuluxResult(toolName, result)}
      result={result}
    />
  );
}
