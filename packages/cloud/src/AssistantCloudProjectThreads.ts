import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudProjectThreadMessages } from "./AssistantCloudProjectThreadMessages";
import type { CloudThread } from "./AssistantCloudThreads";

type AssistantCloudProjectThreadsListQuery = {
  is_archived?: boolean;
  limit?: number;
  after?: string;
};

type AssistantCloudProjectThreadsListResponse = {
  threads: CloudThread[];
};

export class AssistantCloudProjectThreads {
  public readonly messages: AssistantCloudProjectThreadMessages;

  constructor(private cloud: AssistantCloudAPI) {
    this.messages = new AssistantCloudProjectThreadMessages(cloud);
  }

  public async list(
    query?: AssistantCloudProjectThreadsListQuery,
  ): Promise<AssistantCloudProjectThreadsListResponse> {
    return this.cloud.makeRequest("/projects/threads", { query });
  }
}
