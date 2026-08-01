import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudProjectThreadMessages } from "./AssistantCloudProjectThreadMessages";
import { decodeCloudThread, type CloudThread } from "./AssistantCloudThreads";
import { readCloudArray, readCloudRecord } from "./cloudResponse";

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

  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
    this.messages = new AssistantCloudProjectThreadMessages(cloud);
  }

  public async list(
    query?: AssistantCloudProjectThreadsListQuery,
  ): Promise<AssistantCloudProjectThreadsListResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest("/projects/threads", {
        query: {
          ...query,
          // The shared query serializer drops `false`; the wire accepts the
          // string form, so the archive filter survives explicitly.
          ...(query?.is_archived !== undefined
            ? { is_archived: String(query.is_archived) }
            : {}),
        },
      }),
      "project thread list response",
    );
    const threads = readCloudArray(response.threads, "threads");

    return {
      threads: threads.map((thread, index) =>
        decodeCloudThread(thread, `threads[${index}]`),
      ),
    };
  }
}
