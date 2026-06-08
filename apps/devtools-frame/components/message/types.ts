export interface PartStatusPreview {
  readonly type: string;
  readonly reason?: string;
  readonly error?: unknown;
}

export interface ToolCallApprovalPreview {
  readonly id?: string;
  readonly approved?: boolean;
  readonly reason?: string;
  readonly isAutomatic?: boolean;
}

export interface ToolCallInterruptPreview {
  readonly type?: string;
  readonly payload?: unknown;
}

interface BasePartPreview {
  readonly status?: PartStatusPreview;
}

export interface TextPartPreview extends BasePartPreview {
  readonly type: "text";
  readonly text: string;
}

export interface ReasoningPartPreview extends BasePartPreview {
  readonly type: "reasoning";
  readonly text: string;
}

export interface SourcePartPreview extends BasePartPreview {
  readonly type: "source";
  readonly sourceType?: string;
  readonly title?: string;
  readonly url?: string;
}

export interface ImagePartPreview extends BasePartPreview {
  readonly type: "image";
  readonly filename?: string;
}

export interface FilePartPreview extends BasePartPreview {
  readonly type: "file";
  readonly filename?: string;
  readonly mimeType?: string;
}

export interface AudioPartPreview extends BasePartPreview {
  readonly type: "audio";
  readonly format?: string;
}

export interface DataPartPreview extends BasePartPreview {
  readonly type: "data";
  readonly name?: string;
  readonly data: unknown;
}

export interface GenerativeUiPartPreview extends BasePartPreview {
  readonly type: "generative-ui";
  readonly spec: unknown;
}

export interface ToolCallPartPreview extends BasePartPreview {
  readonly type: "tool-call";
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: unknown;
  readonly argsText?: string;
  readonly hasResult: boolean;
  readonly result?: unknown;
  readonly isError?: boolean;
  readonly artifact?: unknown;
  readonly mcp?: unknown;
  readonly modelContent?: unknown;
  readonly interrupt?: ToolCallInterruptPreview;
  readonly approval?: ToolCallApprovalPreview;
  readonly subMessageCount: number;
}

export interface UnknownPartPreview extends BasePartPreview {
  readonly type: "unknown";
  readonly rawType: string;
  readonly raw: unknown;
}

export type PartPreview =
  | TextPartPreview
  | ReasoningPartPreview
  | SourcePartPreview
  | ImagePartPreview
  | FilePartPreview
  | AudioPartPreview
  | DataPartPreview
  | GenerativeUiPartPreview
  | ToolCallPartPreview
  | UnknownPartPreview;

export interface MessageStatusPreview {
  readonly type: string;
  readonly reason?: string;
  readonly error?: unknown;
}

export interface MessageTimingPreview {
  readonly streamStartTime?: number;
  readonly firstTokenTime?: number;
  readonly totalStreamTime?: number;
  readonly tokenCount?: number;
  readonly tokensPerSecond?: number;
  readonly totalChunks?: number;
  readonly toolCallCount?: number;
}

export interface MessageUsagePreview {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly stepCount: number;
}

export interface MessagePreview {
  readonly id: string;
  readonly role: string;
  readonly createdAt?: string;
  readonly status?: MessageStatusPreview;
  readonly parts: readonly PartPreview[];
  readonly attachments: readonly string[];
  readonly timing?: MessageTimingPreview;
  readonly usage?: MessageUsagePreview;
  readonly branchNumber?: number;
  readonly branchCount?: number;
  readonly index?: number;
  readonly isLast?: boolean;
  readonly isOptimistic?: boolean;
  readonly submittedFeedback?: string;
}
