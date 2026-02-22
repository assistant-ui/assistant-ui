"use client";

import { useState } from "react";
import {
  Terminal,
  FileText,
  Edit3,
  FolderSearch,
  Search,
  Globe,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BashTerminal } from "./BashTerminal";
import { CodeViewer } from "./CodeViewer";
import { DiffViewer } from "./DiffViewer";
import { Badge } from "@/components/ui/badge";

export interface ToolWidgetProps {
  toolName: string;
  input: unknown;
  output?: unknown;
  isError?: boolean;
  isRunning?: boolean;
  timestamp: Date;
  className?: string;
}

const extensionToLanguage: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  json: "json",
  md: "markdown",
  css: "css",
  html: "html",
};

const toolIcons: Record<string, React.ReactNode> = {
  Bash: <Terminal className="h-4 w-4" />,
  Read: <FileText className="h-4 w-4" />,
  Write: <Edit3 className="h-4 w-4" />,
  Edit: <Edit3 className="h-4 w-4" />,
  Glob: <FolderSearch className="h-4 w-4" />,
  Grep: <Search className="h-4 w-4" />,
  WebSearch: <Globe className="h-4 w-4" />,
  WebFetch: <Globe className="h-4 w-4" />,
};

export function ToolWidget({
  toolName,
  input,
  output,
  isError,
  isRunning,
  timestamp,
  className,
}: ToolWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const typedInput = input as Record<string, unknown>;
  const icon = toolIcons[toolName] || <Terminal className="h-4 w-4" />;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  // Render tool-specific widget
  const renderToolWidget = () => {
    switch (toolName) {
      case "Bash":
        return (
          <BashTerminal
            command={String(typedInput["command"] ?? "")}
            output={output ? String(output) : ""}
            isError={isError ?? false}
            isRunning={isRunning ?? false}
          />
        );

      case "Read":
        if (output && !isError) {
          const content =
            typeof output === "string"
              ? output
              : JSON.stringify(output, null, 2);
          const path = String(
            typedInput["file_path"] ?? typedInput["path"] ?? "",
          );
          const extension = path.split(".").pop() ?? "";
          return (
            <CodeViewer
              code={content}
              filename={path}
              language={extensionToLanguage[extension] ?? "text"}
            />
          );
        }
        break;

      case "Edit":
        if (
          typeof typedInput["old_string"] === "string" &&
          typeof typedInput["new_string"] === "string"
        ) {
          return (
            <DiffViewer
              oldContent={String(typedInput["old_string"])}
              newContent={String(typedInput["new_string"])}
              filename={String(typedInput["file_path"] ?? "")}
            />
          );
        }
        break;

      case "Write":
        if (typedInput["content"]) {
          const path = String(
            typedInput["file_path"] ?? typedInput["path"] ?? "",
          );
          const extension = path.split(".").pop() ?? "";
          return (
            <CodeViewer
              code={String(typedInput["content"])}
              filename={path}
              language={extensionToLanguage[extension] ?? "text"}
            />
          );
        }
        break;
    }

    // Default: show raw input/output
    return null;
  };

  const customWidget = renderToolWidget();

  // If we have a custom widget, show it
  if (customWidget) {
    return (
      <div className={cn("group", className)}>
        {/* Compact header */}
        <div className="flex items-center gap-3 p-3">
          <span className="shrink-0 pt-0.5 font-mono text-muted-foreground text-xs">
            {formatTime(timestamp)}
          </span>
          <span className="shrink-0 text-blue-500">{icon}</span>
          <div className="flex items-center gap-2">
            <code className="font-medium font-mono text-sm">{toolName}</code>
            {isRunning && (
              <Badge variant="secondary" className="animate-pulse gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running
              </Badge>
            )}
            {!isRunning && isError && (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Error
              </Badge>
            )}
            {!isRunning && !isError && output !== undefined && (
              <Badge variant="success" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Done
              </Badge>
            )}
          </div>
        </div>
        <div className="px-3 pb-3">{customWidget}</div>
      </div>
    );
  }

  // Fallback: expandable raw view
  return (
    <div className={cn("group transition-colors hover:bg-muted/50", className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span className="shrink-0 pt-0.5 font-mono text-muted-foreground text-xs">
          {formatTime(timestamp)}
        </span>
        <span className="shrink-0 text-blue-500">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="font-medium font-mono text-sm">{toolName}</code>
            {isRunning && (
              <Badge variant="secondary" className="animate-pulse gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-muted-foreground text-xs">
            {JSON.stringify(input).slice(0, 60)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isRunning &&
            (isError ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : output !== undefined ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : null)}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="border-border border-t bg-muted/30">
          {/* Input */}
          <div className="border-border border-b p-3">
            <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
              Input
            </h4>
            <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-background p-2 font-mono text-xs">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>

          {/* Output */}
          {output !== undefined && (
            <div className="p-3">
              <h4 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                Output
              </h4>
              <pre
                className={cn(
                  "max-h-48 overflow-auto whitespace-pre-wrap rounded p-2 font-mono text-xs",
                  isError
                    ? "bg-destructive/10 text-destructive"
                    : "bg-background",
                )}
              >
                {typeof output === "string"
                  ? output
                  : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
