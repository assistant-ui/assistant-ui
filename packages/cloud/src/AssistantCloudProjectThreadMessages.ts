import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import {
  decodeCloudMessage,
  decodeCloudMessagePaging,
  type CloudMessage,
} from "./AssistantCloudThreadMessages";
import { readCloudArray, readCloudRecord } from "./cloudResponse";

type AssistantCloudProjectThreadMessageListQuery = {
  format?: string;
  limit?: number;
  after?: string;
};

type AssistantCloudProjectThreadMessageListResponse = {
  messages: CloudMessage[];
  /**
   * Whether the thread holds messages past this page. A page can end early,
   * before its `limit`, so page on while this is true. Absent from servers
   * that predate it.
   */
  has_more?: boolean;
  /** The `after` cursor for the next page while `has_more`. */
  next_cursor?: string | null;
};

export class AssistantCloudProjectThreadMessages {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  public async list(
    threadId: string,
    query?: AssistantCloudProjectThreadMessageListQuery,
  ): Promise<AssistantCloudProjectThreadMessageListResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest(
        `/projects/threads/${encodeURIComponent(threadId)}/messages`,
        { query },
      ),
      "project thread message list response",
    );
    const messages = readCloudArray(response.messages, "messages");

    return {
      messages: messages.map((message, index) =>
        decodeCloudMessage(message, `messages[${index}]`),
      ),
      ...decodeCloudMessagePaging(response),
    };
  }
}
