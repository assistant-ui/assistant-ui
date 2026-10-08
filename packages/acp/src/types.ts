import type {
  AgentCapabilities,
  AvailableCommand,
  ContentBlock,
  Implementation,
  InitializeResponse,
  McpServer,
  PermissionOption,
  PermissionOptionKind,
  PlanEntry,
  PromptCapabilities,
  RequestPermissionOutcome,
  RequestPermissionRequest,
  SessionConfigOption,
  SessionModeState,
  SessionUpdate,
  StopReason,
  ToolCallContent,
  ToolCallLocation,
  ToolCallStatus,
  ToolCallUpdate,
  ToolKind,
  UsageUpdate,
} from "@agentclientprotocol/sdk";

export const ACP_PROTOCOL_VERSION = 1;

export type AcpAgentCapabilities = AgentCapabilities;
export type AcpAvailableCommand = AvailableCommand;
export type AcpContentBlock = ContentBlock;
export type AcpEmbeddedResourceContentBlock = Extract<
  ContentBlock,
  { type: "resource" }
>;
export type AcpResourceLinkContentBlock = Extract<
  ContentBlock,
  { type: "resource_link" }
>;
export type AcpImplementation = Implementation;
export type AcpInitializeResponse = InitializeResponse;
export type AcpMcpServer = McpServer;
export type AcpPermissionOption = PermissionOption;
export type AcpPermissionOptionKind = PermissionOptionKind;
export type AcpPermissionOutcome = RequestPermissionOutcome;
export type AcpPermissionRequest = RequestPermissionRequest;
export type AcpPlanEntry = PlanEntry;
export type AcpPromptCapabilities = PromptCapabilities;
export type AcpSessionConfigOption = SessionConfigOption;
export type AcpSessionModeState = SessionModeState;
export type AcpSessionUpdate = SessionUpdate;
export type AcpStopReason = StopReason;
export type AcpToolCallContent = ToolCallContent;
export type AcpToolCallLocation = ToolCallLocation;
export type AcpToolCallStatus = ToolCallStatus;
export type AcpToolCallUpdate = ToolCallUpdate;
export type AcpToolKind = ToolKind;
export type AcpUsage = Pick<UsageUpdate, "used" | "size" | "cost">;

export type AcpConnectionState = "disconnected" | "connecting" | "connected";

export type AcpExtras = {
  readonly connectionState: AcpConnectionState;
  readonly sessionId: string | undefined;
  readonly agentInfo: AcpImplementation | undefined;
  readonly agentCapabilities: AcpAgentCapabilities | undefined;
  readonly plan: readonly AcpPlanEntry[] | undefined;
  readonly sessionTitle: string | undefined;
  readonly currentModeId: string | undefined;
  readonly availableCommands: readonly AcpAvailableCommand[] | undefined;
  readonly configOptions: readonly AcpSessionConfigOption[] | undefined;
  readonly usage: AcpUsage | undefined;
};
