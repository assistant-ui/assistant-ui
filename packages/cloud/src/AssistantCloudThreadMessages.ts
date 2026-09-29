import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import {
  readCloudArray,
  readCloudEnum,
  readCloudInteger,
  readCloudJSONObject,
  readCloudNullableString,
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
};

type AssistantCloudMessageCreateResponse = {
  message_id: string;
};

type AssistantCloudThreadMessageUpdateBody = {
  content: ReadonlyJSONObject;
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
          },
        },
      ),
      "thread message create response",
    );

    return {
      message_id: readCloudString(response.message_id, "message_id"),
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
