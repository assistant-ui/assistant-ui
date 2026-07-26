import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import {
  decodeCloudMessage,
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
};

export class AssistantCloudProjectThreadMessages {
  constructor(private cloud: AssistantCloudAPI) {}

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
    };
  }
}
