import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreadMessages } from "./AssistantCloudThreadMessages";
import {
  readCloudArray,
  readCloudBoolean,
  readCloudNullableString,
  readCloudRecord,
  readCloudString,
  readCloudTimestamp,
} from "./cloudResponse";

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

type AssistantCloudThreadsListResponse = {
  threads: CloudThread[];
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

const decodeCloudThread = (value: unknown, field: string): CloudThread => {
  const thread = readCloudRecord(value, field);
  return {
    title: readCloudNullableString(thread.title, `${field}.title`) ?? "",
    last_message_at: readCloudTimestamp(
      thread.last_message_at,
      `${field}.last_message_at`,
    ),
    metadata: thread.metadata,
    external_id: readCloudNullableString(
      thread.external_id,
      `${field}.external_id`,
    ),
    id: readCloudString(thread.id, `${field}.id`),
    project_id: readCloudString(thread.project_id, `${field}.project_id`),
    created_at: readCloudTimestamp(thread.created_at, `${field}.created_at`),
    updated_at: readCloudTimestamp(thread.updated_at, `${field}.updated_at`),
    workspace_id: readCloudString(thread.workspace_id, `${field}.workspace_id`),
    is_archived: readCloudBoolean(thread.is_archived, `${field}.is_archived`),
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
    const response = readCloudRecord(
      await this.cloud.makeRequest("/threads", { query }),
      "thread list response",
    );
    const threads = readCloudArray(response.threads, "threads");

    return {
      threads: threads.map((thread, index) =>
        decodeCloudThread(thread, `threads[${index}]`),
      ),
    };
  }

  public async get(threadId: string): Promise<CloudThread> {
    const response = readCloudRecord(
      await this.cloud.makeRequest(`/threads/${encodeURIComponent(threadId)}`),
      "thread response",
    );

    return decodeCloudThread(response.thread, "thread");
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
