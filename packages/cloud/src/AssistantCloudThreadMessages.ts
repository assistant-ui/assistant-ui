import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import {
  readCloudArray,
  readCloudInteger,
  readCloudJSONObject,
  readCloudNullableString,
  readCloudRecord,
  readCloudString,
} from "./cloudResponse";
import { normalizeCloudTimestamp } from "./normalizeCloudTimestamp";

export type CloudMessage = {
  id: string;
  parent_id: string | null;
  height: number;
  created_at: Date;
  updated_at: Date;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type CloudMessageResponse = {
  id: string;
  parent_id: string | null;
  height: number;
  created_at: string;
  updated_at: string;
  format: string;
  content: ReadonlyJSONObject;
};

type AssistantCloudThreadMessageListQuery = {
  format?: string;
};

type AssistantCloudThreadMessageListResponse = {
  messages: CloudMessage[];
};

type AssistantCloudThreadMessageCreateBody = {
  parent_id: string | null;
  format: "aui/v0" | string;
  content: ReadonlyJSONObject;
};

type AssistantCloudMessageCreateResponse = {
  message_id: string;
};

type AssistantCloudThreadMessageUpdateBody = {
  content: ReadonlyJSONObject;
};

const normalizeCloudMessage = (value: unknown, field: string): CloudMessage => {
  const message = readCloudRecord(value, field);
  const response: CloudMessageResponse = {
    id: readCloudString(message.id, `${field}.id`),
    parent_id: readCloudNullableString(message.parent_id, `${field}.parent_id`),
    height: readCloudInteger(message.height, `${field}.height`),
    created_at: readCloudString(message.created_at, `${field}.created_at`),
    updated_at: readCloudString(message.updated_at, `${field}.updated_at`),
    format: readCloudString(message.format, `${field}.format`),
    content: readCloudJSONObject(message.content, `${field}.content`),
  };

  return {
    ...response,
    created_at: normalizeCloudTimestamp(
      response.created_at,
      `${field}.created_at`,
    ),
    updated_at: normalizeCloudTimestamp(
      response.updated_at,
      `${field}.updated_at`,
    ),
  };
};

export class AssistantCloudThreadMessages {
  constructor(private cloud: AssistantCloudAPI) {}

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
        normalizeCloudMessage(message, `messages[${index}]`),
      ),
    };
  }

  public async create(
    threadId: string,
    body: AssistantCloudThreadMessageCreateBody,
  ): Promise<AssistantCloudMessageCreateResponse> {
    return this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}/messages`,
      { method: "POST", body },
    );
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
}
