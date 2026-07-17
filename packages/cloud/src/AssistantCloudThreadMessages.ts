import type { ReadonlyJSONObject } from "assistant-stream/utils";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
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

type CloudMessageResponse = Omit<CloudMessage, "created_at" | "updated_at"> & {
  created_at: string;
  updated_at: string;
};

type AssistantCloudThreadMessageListQuery = {
  format?: string;
};

type AssistantCloudThreadMessageListResponse = {
  messages: CloudMessage[];
};

type AssistantCloudThreadMessageListAPIResponse = {
  messages: CloudMessageResponse[];
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

const normalizeCloudMessage = (
  message: CloudMessageResponse,
): CloudMessage => ({
  ...message,
  created_at: normalizeCloudTimestamp(message.created_at, "message.created_at"),
  updated_at: normalizeCloudTimestamp(message.updated_at, "message.updated_at"),
});

export class AssistantCloudThreadMessages {
  constructor(private cloud: AssistantCloudAPI) {}

  public async list(
    threadId: string,
    query?: AssistantCloudThreadMessageListQuery,
  ): Promise<AssistantCloudThreadMessageListResponse> {
    const response = (await this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}/messages`,
      { query },
    )) as AssistantCloudThreadMessageListAPIResponse;

    return {
      ...response,
      messages: response.messages.map(normalizeCloudMessage),
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
