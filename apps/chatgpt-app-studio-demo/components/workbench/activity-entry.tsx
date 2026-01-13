"use client";

import type { ConsoleEntry, ConsoleEntryType } from "@/lib/workbench/types";
import {
  Wrench,
  CornerDownRight,
  Database,
  PanelTop,
  ExternalLink,
  MessageSquare,
  FileIcon,
  Activity,
  Circle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Entry } from "./activity-primitives/entry-layout";
import { ArgsPreview, ResultPreview } from "./activity-primitives";

const ENTRY_CONFIG: Record<
  ConsoleEntryType,
  { icon: LucideIcon; color: string }
> = {
  callTool: {
    icon: Wrench,
    color: "text-blue-600 dark:text-blue-400",
  },
  setWidgetState: {
    icon: Database,
    color: "text-green-600 dark:text-green-400",
  },
  requestDisplayMode: {
    icon: PanelTop,
    color: "text-purple-600 dark:text-purple-400",
  },
  sendFollowUpMessage: {
    icon: MessageSquare,
    color: "text-orange-600 dark:text-orange-400",
  },
  requestClose: {
    icon: ExternalLink,
    color: "text-neutral-500 dark:text-neutral-400",
  },
  openExternal: {
    icon: ExternalLink,
    color: "text-neutral-500 dark:text-neutral-400",
  },
  notifyIntrinsicHeight: {
    icon: PanelTop,
    color: "text-teal-600 dark:text-teal-400",
  },
  requestModal: {
    icon: PanelTop,
    color: "text-pink-600 dark:text-pink-400",
  },
  uploadFile: {
    icon: FileIcon,
    color: "text-amber-600 dark:text-amber-400",
  },
  getFileDownloadUrl: {
    icon: FileIcon,
    color: "text-amber-600 dark:text-amber-400",
  },
  event: {
    icon: Activity,
    color: "text-cyan-600 dark:text-cyan-400",
  },
};

function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMethodName(method: string): string {
  const match = method.match(/^(\w+)\(/);
  return match ? match[1] : method;
}

function extractToolName(method: string): string | null {
  const match = method.match(/callTool\("([^"]+)"\)/);
  return match ? match[1] : null;
}

function extractKeyArg(args: unknown): string | null {
  if (!args || typeof args !== "object") return null;
  const obj = args as Record<string, unknown>;

  const keyOrder = [
    "query",
    "prompt",
    "message",
    "name",
    "title",
    "text",
    "input",
    "search",
    "q",
  ];

  for (const key of keyOrder) {
    if (typeof obj[key] === "string" && obj[key]) {
      const val = obj[key] as string;
      return val.length > 30 ? `${val.slice(0, 29)}…` : val;
    }
  }

  for (const value of Object.values(obj)) {
    if (typeof value === "string" && value) {
      return value.length > 30 ? `${value.slice(0, 29)}…` : value;
    }
  }

  return null;
}

function extractDisplayMode(method: string): string | null {
  const match = method.match(/requestDisplayMode\("([^"]+)"\)/);
  return match ? match[1] : null;
}

function extractPrompt(args: unknown): string | null {
  if (!args || typeof args !== "object") return null;
  const obj = args as Record<string, unknown>;
  if (typeof obj.prompt === "string") {
    const val = obj.prompt;
    return val.length > 30 ? `${val.slice(0, 29)}…` : val;
  }
  return null;
}

function hasEntryDetails(entry: ConsoleEntry): boolean {
  return entry.args !== undefined || entry.result !== undefined;
}

function getMetadataPreview(entry: ConsoleEntry): string | null {
  switch (entry.type) {
    case "requestDisplayMode":
      return extractDisplayMode(entry.method);
    case "sendFollowUpMessage":
      return extractPrompt(entry.args);
    default:
      return null;
  }
}

type SimulatedMode = "SUCCESS" | "ERROR" | "hang";

function parseSimulatedResponse(response: ConsoleEntry | null): {
  isSimulated: boolean;
  mode: SimulatedMode | null;
} {
  if (!response) return { isSimulated: false, mode: null };

  const match = response.method.match(/\[SIMULATED: (\w+)\]/);
  if (!match) return { isSimulated: false, mode: null };

  return {
    isSimulated: true,
    mode: match[1] as SimulatedMode,
  };
}

function SimulatedBadge({ mode }: { mode: SimulatedMode }) {
  switch (mode) {
    case "SUCCESS":
      return (
        <Entry.Badge variant="success" icon={Circle}>
          Simulated
        </Entry.Badge>
      );
    case "ERROR":
      return (
        <Entry.Badge variant="error" icon={AlertCircle}>
          Simulated Error
        </Entry.Badge>
      );
    case "hang":
      return (
        <Entry.Badge variant="warning" icon={Loader2}>
          Hanging
        </Entry.Badge>
      );
  }
}

interface ResponseEntryProps {
  response: ConsoleEntry;
  isExpanded: boolean;
  onToggle: () => void;
  isSimulated?: boolean;
  simulatedMode?: SimulatedMode | null;
}

function ResponseEntry({
  response,
  isExpanded,
  onToggle,
  isSimulated = false,
  simulatedMode = null,
}: ResponseEntryProps) {
  const hasDetails = response.result !== undefined;

  return (
    <Entry.Root>
      <Entry.Row variant="response" onClick={onToggle} disabled={!hasDetails}>
        <Entry.Icon icon={CornerDownRight} color="text-muted-foreground" />
        <Entry.Content>
          <Entry.Label color="text-muted-foreground">Response</Entry.Label>
          {isSimulated && simulatedMode && (
            <SimulatedBadge mode={simulatedMode} />
          )}
        </Entry.Content>
      </Entry.Row>

      {isExpanded && hasDetails && (
        <Entry.Details>
          <ResultPreview value={response.result} />
        </Entry.Details>
      )}
    </Entry.Root>
  );
}

interface ActivityEntryProps {
  entry: ConsoleEntry;
  isExpanded: boolean;
  onToggle: () => void;
  recencyOpacity?: number;
}

export function ActivityEntry({
  entry,
  isExpanded,
  onToggle,
  recencyOpacity = 1,
}: ActivityEntryProps) {
  const config = ENTRY_CONFIG[entry.type];
  const timestamp = formatTimestamp(entry.timestamp);
  const methodName = formatMethodName(entry.method);
  const hasDetails = hasEntryDetails(entry);
  const metadataPreview = getMetadataPreview(entry);

  const opacityStyle = { opacity: recencyOpacity };

  return (
    <Entry.Root>
      <Entry.Row onClick={onToggle} disabled={!hasDetails}>
        <Entry.Icon
          icon={config.icon}
          color={config.color}
          style={opacityStyle}
        />
        <Entry.Content>
          <Entry.Label color={config.color} style={opacityStyle}>
            {methodName}
          </Entry.Label>
          {metadataPreview && <Entry.Meta>{metadataPreview}</Entry.Meta>}
          <Entry.Spacer />
          <Entry.Timestamp visible={isExpanded}>{timestamp}</Entry.Timestamp>
        </Entry.Content>
      </Entry.Row>

      {isExpanded && hasDetails && (
        <Entry.Details>
          <ArgsPreview value={entry.args} />
          {entry.result !== undefined && (
            <pre className="mt-1 overflow-x-auto text-[10px] text-emerald-600/80 leading-relaxed dark:text-emerald-300">
              → {JSON.stringify(entry.result, null, 2)}
            </pre>
          )}
        </Entry.Details>
      )}
    </Entry.Root>
  );
}

interface CallToolGroupEntryProps {
  request: ConsoleEntry;
  response: ConsoleEntry | null;
  requestExpanded: boolean;
  responseExpanded: boolean;
  onToggleRequest: () => void;
  onToggleResponse: () => void;
  recencyOpacity?: number;
}

export function CallToolGroupEntry({
  request,
  response,
  requestExpanded,
  responseExpanded,
  onToggleRequest,
  onToggleResponse,
  recencyOpacity = 1,
}: CallToolGroupEntryProps) {
  const config = ENTRY_CONFIG.callTool;
  const timestamp = formatTimestamp(request.timestamp);
  const toolName = extractToolName(request.method);
  const keyArg = extractKeyArg(request.args);
  const hasRequestDetails = request.args !== undefined;

  const { isSimulated, mode: simulatedMode } = parseSimulatedResponse(response);

  const opacityStyle = { opacity: recencyOpacity };

  return (
    <Entry.Root>
      <Entry.Row onClick={onToggleRequest} disabled={!hasRequestDetails}>
        <Entry.Icon
          icon={config.icon}
          color={config.color}
          style={opacityStyle}
        />
        <Entry.Content>
          <Entry.Label color={config.color} style={opacityStyle}>
            {toolName || "callTool"}
          </Entry.Label>
          {keyArg && <Entry.Meta>&quot;{keyArg}&quot;</Entry.Meta>}
          <Entry.Spacer />
          <Entry.Timestamp visible={requestExpanded || responseExpanded}>
            {timestamp}
          </Entry.Timestamp>
        </Entry.Content>
      </Entry.Row>

      {requestExpanded && (
        <Entry.Details>
          <ArgsPreview value={request.args} className="pb-2" />
        </Entry.Details>
      )}

      {response && (
        <Entry.Nested>
          <ResponseEntry
            response={response}
            isExpanded={responseExpanded}
            onToggle={onToggleResponse}
            isSimulated={isSimulated}
            simulatedMode={simulatedMode}
          />
        </Entry.Nested>
      )}
    </Entry.Root>
  );
}
