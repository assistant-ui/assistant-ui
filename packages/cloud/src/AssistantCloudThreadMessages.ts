import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import {
  readCloudArray,
  readCloudEnum,
  readCloudInteger,
  readCloudJSONObject,
  readCloudNullableString,
  readCloudNumber,
  readCloudRecord,
  readCloudString,
  readCloudTimestamp,
} from "./cloudResponse";

export type CloudMessage = {
  id: string;
  parent_id: string | null;
  height: number;
  created_at: Date;
  updated_at: Date;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
  external_id?: string | null | undefined;
  /** Present while a run lease on the message is open: `running` while its holder heartbeats, `stale` once it lapsed or was resumed. */
  run?: CloudMessageRun | undefined;
};

export type CloudMessageRun = {
  status: "running" | "stale";
  /** Server-measured time until a running lease lapses. */
  expires_in_ms?: number | undefined;
  /** The message that resumed this one. */
  superseded_by?: string | undefined;
};

export type CloudRunLease = {
  id: string;
  expires_at: Date;
  ttl_ms: number;
  heartbeat_interval_ms: number;
};

/** Opens a run lease on a new message, or writes as the holder of an open one. */
export type CloudMessageRunWrite =
  | { status: "running"; lease_id?: undefined }
  | { status: "running" | "ended"; lease_id: string };

export type AssistantCloudMessageHeartbeatResponse = {
  expires_at: Date;
  ttl_ms: number;
  heartbeat_interval_ms: number;
};

type AssistantCloudThreadMessageListQuery = {
  format?: string;
  limit?: number;
  after?: string;
};

type AssistantCloudThreadMessageListResponse = {
  messages: CloudMessage[];
};

type AssistantCloudThreadMessageCreateBody = {
  parent_id: string | null;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
  external_id?: string | undefined;
  parent_external_id?: string | undefined;
  run?: CloudMessageRunWrite | undefined;
};

type AssistantCloudMessageCreateResponse = {
  message_id: string;
  lease?: CloudRunLease | undefined;
  /** Set when a superseded lease's write was stored as a sibling of this message. */
  forked_from?: string | undefined;
};

type AssistantCloudThreadMessageUpdateBody = {
  content: ReadonlyJSONObject;
  run?: CloudMessageRunWrite | undefined;
};

type AssistantCloudThreadMessageUpdateResponse = {
  /** Set when a superseded lease's write was stored as a sibling message. */
  message_id?: string | undefined;
  forked_from?: string | undefined;
};

const RUN_STATUSES = ["running", "stale"] as const;

const decodeCloudMessageRun = (
  value: unknown,
  field: string,
): CloudMessageRun | undefined => {
  if (value === undefined || value === null) return undefined;
  const run = readCloudRecord(value, field);
  return {
    status: readCloudEnum(run.status, `${field}.status`, RUN_STATUSES),
    ...(typeof run.expires_in_ms === "number"
      ? { expires_in_ms: run.expires_in_ms }
      : undefined),
    ...(typeof run.superseded_by === "string"
      ? { superseded_by: run.superseded_by }
      : undefined),
  };
};

const decodeCloudRunLease = (value: unknown, field: string): CloudRunLease => {
  const lease = readCloudRecord(value, field);
  return {
    id: readCloudString(lease.id, `${field}.id`),
    expires_at: readCloudTimestamp(lease.expires_at, `${field}.expires_at`),
    ttl_ms: readCloudNumber(lease.ttl_ms, `${field}.ttl_ms`),
    heartbeat_interval_ms: readCloudNumber(
      lease.heartbeat_interval_ms,
      `${field}.heartbeat_interval_ms`,
    ),
  };
};

const MESSAGE_FEEDBACK_TYPES = ["positive", "negative"] as const;

export type AssistantCloudThreadMessageFeedbackBody = {
  type: "positive" | "negative";
  comment?: string;
};

export type AssistantCloudThreadMessageFeedbackResponse = {
  feedback_id: string;
  type: "positive" | "negative";
  comment?: string | null;
};

export const decodeCloudMessage = (
  value: unknown,
  field: string,
): CloudMessage => {
  const message = readCloudRecord(value, field);
  return {
    id: readCloudString(message.id, `${field}.id`),
    parent_id: readCloudNullableString(message.parent_id, `${field}.parent_id`),
    height: readCloudInteger(message.height, `${field}.height`),
    created_at: readCloudTimestamp(message.created_at, `${field}.created_at`),
    updated_at: readCloudTimestamp(message.updated_at, `${field}.updated_at`),
    format: readCloudString(message.format, `${field}.format`),
    content: readCloudJSONObject(message.content, `${field}.content`),
    external_id: readCloudNullableString(
      message.external_id ?? null,
      `${field}.external_id`,
    ),
    ...(message.run !== undefined && message.run !== null
      ? { run: decodeCloudMessageRun(message.run, `${field}.run`) }
      : undefined),
  };
};

export class AssistantCloudThreadMessages {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  public async list(
    threadId: string,
    query?: AssistantCloudThreadMessageListQuery,
  ): Promise<AssistantCloudThreadMessageListResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest(
        `/threads/${encodeURIComponent(threadId)}/messages`,
        { query },
      ),
      "thread message list response",
    );
    const messages = readCloudArray(response.messages, "messages");

    return {
      messages: messages.map((message, index) =>
        decodeCloudMessage(message, `messages[${index}]`),
      ),
    };
  }

  public async create(
    threadId: string,
    body: AssistantCloudThreadMessageCreateBody,
  ): Promise<AssistantCloudMessageCreateResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest(
        `/threads/${encodeURIComponent(threadId)}/messages`,
        {
          method: "POST",
          body: {
            parent_id: body.parent_id,
            format: body.format,
            content: body.content,
            ...(body.external_id !== undefined
              ? { external_id: body.external_id }
              : undefined),
            ...(body.parent_external_id !== undefined
              ? { parent_external_id: body.parent_external_id }
              : undefined),
            ...(body.run !== undefined ? { run: body.run } : undefined),
          },
        },
      ),
      "thread message create response",
    );

    return {
      message_id: readCloudString(response.message_id, "message_id"),
      ...(response.lease !== undefined
        ? { lease: decodeCloudRunLease(response.lease, "lease") }
        : undefined),
      ...(typeof response.forked_from === "string"
        ? { forked_from: response.forked_from }
        : undefined),
    };
  }

  public async update(
    threadId: string,
    messageId: string,
    body: AssistantCloudThreadMessageUpdateBody,
  ): Promise<AssistantCloudThreadMessageUpdateResponse> {
    const response: unknown = await this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
      { method: "PUT", body },
    );
    if (typeof response !== "object" || response === null) return {};
    const record = response as Record<string, unknown>;
    return {
      ...(typeof record.message_id === "string"
        ? { message_id: record.message_id }
        : undefined),
      ...(typeof record.forked_from === "string"
        ? { forked_from: record.forked_from }
        : undefined),
    };
  }

  /** Keeps a run lease open; a lapsed lease that nobody resumed is revived. */
  public async heartbeat(
    threadId: string,
    messageId: string,
    body: { lease_id: string },
  ): Promise<AssistantCloudMessageHeartbeatResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest(
        `/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/heartbeat`,
        { method: "POST", body },
      ),
      "thread message heartbeat response",
    );
    return {
      expires_at: readCloudTimestamp(response.expires_at, "expires_at"),
      ttl_ms: readCloudNumber(response.ttl_ms, "ttl_ms"),
      heartbeat_interval_ms: readCloudNumber(
        response.heartbeat_interval_ms,
        "heartbeat_interval_ms",
      ),
    };
  }

  public async delete(threadId: string, messageIds: string[]): Promise<void> {
    return this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}/messages`,
      { method: "DELETE", body: { message_ids: messageIds } },
    );
  }

  public async feedback(
    threadId: string,
    messageId: string,
    body: AssistantCloudThreadMessageFeedbackBody,
  ): Promise<AssistantCloudThreadMessageFeedbackResponse> {
    const comment = body.comment?.trim();
    const response = readCloudRecord(
      await this.cloud.makeRequest(
        `/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}/feedback`,
        {
          method: "POST",
          body: {
            type: body.type,
            ...(comment ? { comment } : undefined),
          },
        },
      ),
      "thread message feedback response",
    );

    return {
      feedback_id: readCloudString(response.feedback_id, "feedback_id"),
      type: readCloudEnum(response.type, "type", MESSAGE_FEEDBACK_TYPES),
      ...("comment" in response
        ? { comment: readCloudNullableString(response.comment, "comment") }
        : undefined),
    };
  }
}
