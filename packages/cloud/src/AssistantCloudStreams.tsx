import { AssistantCloudAPI } from "./AssistantCloudAPI";

export class AssistantCloudStreams {
  constructor(private cloud: AssistantCloudAPI) {}

  public __internal_getAssistantOptions() {
    return {
      api: `${this.cloud._baseUrl}/v1/api/chat`,
      resumeApi: `${this.cloud._baseUrl}/v1/api/resume`,
      headers: async () => {
        const headers = await this.cloud._auth.getAuthHeaders();
        if (!headers) throw new Error("Authorization failed");
        return {
          ...headers,
          Accept: "text/event-stream",
        };
      },
    };
  }
}
