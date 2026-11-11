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
  /** Present on a message that had a run lease: its running lease, or else its latest ended one. */
  run?: CloudMessageRun | undefined;
};

export type CloudMessageRun = {
  /** A lease runs until its holder ends it; the server never expires one. */
  status: "running" | "ended";
  /** Time since the lease's last heartbeat, measured by the server when it listed the message. */
  last_heartbeat_ms_ago: number;
};

/** A thread's running lease, as a message list reports it. */
export type CloudThreadRun = {
  status: "running";
  /** The reply the run has stored, or null before its first write. */
  message_id: string | null;
  /** The message the run answers. */
  parent_id: string | null;
  /** Time since the lease's last heartbeat or write, measured by the server when it listed the thread. */
  last_heartbeat_ms_ago: number;
};

/** A run lease the server granted. */
export type CloudRunLease = {
  lease_id: string;
  heartbeat_interval_ms: number;
};

type AssistantCloudThreadMessageListQuery = {
  format?: string;
  limit?: number;
  after?: string;
};

type AssistantCloudThreadMessageListResponse = {
  messages: CloudMessage[];
  /**
   * The thread's running lease, or null when it has none. Undefined from a
   * server before v0.2.11, which reports runs only on messages.
   */
  run?: CloudThreadRun | null | undefined;
};

type AssistantCloudThreadMessageCreateBody = {
  parent_id: string | null;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
  external_id?: string | undefined;
  parent_external_id?: string | undefined;
  /** Opens a run lease on the stored message in the same request. */
  open_run?: true | undefined;
  /** Writes the message with `external_id` as the holder of this lease. */
  lease_id?: string | undefined;
};

type AssistantCloudMessageCreateResponse = {
  message_id: string;
  /** Set when `open_run` opened a lease. */
  run?: CloudRunLease | undefined;
};

type AssistantCloudThreadMessageUpdateBody = {
  content: ReadonlyJSONObject;
  /** Writes as the holder of this run lease, which renews it. */
  lease_id?: string | undefined;
};

const RUN_STATUSES = ["running", "ended"] as const;

const decodeCloudMessageRun = (
  value: unknown,
  field: string,
): CloudMessageRun | undefined => {
  if (value === undefined || value === null) return undefined;
  const run = readCloudRecord(value, field);
  return {
    status: readCloudEnum(run.status, `${field}.status`, RUN_STATUSES),
    last_heartbeat_ms_ago: readCloudNumber(
      run.last_heartbeat_ms_ago,
      `${field}.last_heartbeat_ms_ago`,
    ),
  };
};

const decodeCloudThreadRun = (value: unknown): CloudThreadRun | null => {
  if (value === null) return null;
  const run = readCloudRecord(value, "run");
  return {
    status: readCloudEnum(run.status, "run.status", ["running"] as const),
    message_id: readCloudNullableString(
      run.message_id ?? null,
      "run.message_id",
    ),
    parent_id: readCloudNullableString(run.parent_id ?? null, "run.parent_id"),
    last_heartbeat_ms_ago: readCloudNumber(
      run.last_heartbeat_ms_ago,
      "run.last_heartbeat_ms_ago",
    ),
  };
};

/** Reads the lease fields of a response that granted or renewed one. */
const decodeCloudRunLease = (
  response: Record<string, unknown>,
): CloudRunLease => ({
  lease_id: readCloudString(response.lease_id, "lease_id"),
  heartbeat_interval_ms: readCloudNumber(
    response.heartbeat_interval_ms,
    "heartbeat_interval_ms",
  ),
});

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
      ...(response.run !== undefined
        ? { run: decodeCloudThreadRun(response.run) }
        : undefined),
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
            ...(body.open_run ? { open_run: true } : undefined),
            ...(body.lease_id !== undefined
              ? { lease_id: body.lease_id }
              : undefined),
          },
        },
      ),
      "thread message create response",
    );

    return {
      message_id: readCloudString(response.message_id, "message_id"),
      ...(response.lease_id !== undefined
        ? { run: decodeCloudRunLease(response) }
        : undefined),
    };
  }

  public async update(
    threadId: string,
    messageId: string,
    body: AssistantCloudThreadMessageUpdateBody,
  ): Promise<void> {
    return this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}/messages/${encodeURIComponent(messageId)}`,
      { method: "PUT", body },
    );
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
