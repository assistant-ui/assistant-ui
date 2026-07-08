import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import type { CloudMessage } from "./AssistantCloudThreadMessages";

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
    return this.cloud.makeRequest(
      `/projects/threads/${encodeURIComponent(threadId)}/messages`,
      { query },
    );
  }
}
