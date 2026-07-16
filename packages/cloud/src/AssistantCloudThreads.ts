import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreadMessages } from "./AssistantCloudThreadMessages";
import { normalizeCloudTimestamp } from "./normalizeCloudTimestamp";

type AssistantCloudThreadsListQuery = {
  is_archived?: boolean;
  limit?: number;
  after?: string;
};

type CloudThread = {
  title: string;
  last_message_at: Date;
  metadata: unknown;
  external_id: string | null;
  id: string;
  project_id: string;
  created_at: Date;
  updated_at: Date;
  workspace_id: string;
  is_archived: boolean;
};

type CloudThreadResponse = Omit<
  CloudThread,
  "last_message_at" | "created_at" | "updated_at"
> & {
  last_message_at?: string | null;
  created_at: string;
  updated_at: string;
};

type AssistantCloudThreadsListResponse = {
  threads: CloudThread[];
};

type AssistantCloudThreadsListAPIResponse = {
  threads: CloudThreadResponse[];
};

type AssistantCloudThreadsCreateBody = {
  title?: string | undefined;
  last_message_at: Date;
  metadata?: unknown | undefined;
  external_id?: string | undefined;
};

type AssistantCloudThreadsCreateResponse = {
  thread_id: string;
};

type AssistantCloudThreadsUpdateBody = {
  title?: string | undefined;
  last_message_at?: Date | undefined;
  metadata?: unknown | undefined;
  is_archived?: boolean | undefined;
};

const normalizeCloudThread = (thread: CloudThreadResponse): CloudThread => {
  const createdAt = normalizeCloudTimestamp(
    thread.created_at,
    "thread.created_at",
  );

  return {
    ...thread,
    last_message_at:
      thread.last_message_at == null
        ? createdAt
        : normalizeCloudTimestamp(
            thread.last_message_at,
            "thread.last_message_at",
          ),
    created_at: createdAt,
    updated_at: normalizeCloudTimestamp(thread.updated_at, "thread.updated_at"),
  };
};

export class AssistantCloudThreads {
  public readonly messages: AssistantCloudThreadMessages;

  constructor(private cloud: AssistantCloudAPI) {
    this.messages = new AssistantCloudThreadMessages(cloud);
  }

  public async list(
    query?: AssistantCloudThreadsListQuery,
  ): Promise<AssistantCloudThreadsListResponse> {
    const response = (await this.cloud.makeRequest("/threads", {
      query,
    })) as AssistantCloudThreadsListAPIResponse;

    return {
      ...response,
      threads: response.threads.map(normalizeCloudThread),
    };
  }

  public async get(threadId: string): Promise<CloudThread> {
    const thread = (await this.cloud.makeRequest(
      `/threads/${encodeURIComponent(threadId)}`,
    )) as CloudThreadResponse;

    return normalizeCloudThread(thread);
  }

  public async create(
    body: AssistantCloudThreadsCreateBody,
  ): Promise<AssistantCloudThreadsCreateResponse> {
    return this.cloud.makeRequest("/threads", { method: "POST", body });
  }

  public async update(
    threadId: string,
    body: AssistantCloudThreadsUpdateBody,
  ): Promise<void> {
    return this.cloud.makeRequest(`/threads/${encodeURIComponent(threadId)}`, {
      method: "PUT",
      body,
    });
  }

  public async delete(threadId: string): Promise<void> {
    return this.cloud.makeRequest(`/threads/${encodeURIComponent(threadId)}`, {
      method: "DELETE",
    });
  }
}
