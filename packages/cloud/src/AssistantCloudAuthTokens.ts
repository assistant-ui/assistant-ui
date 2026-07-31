import type { AssistantCloudAPI } from "./AssistantCloudAPI";

type AssistantCloudAuthTokensCreateResponse = {
  token: string;
};

export class AssistantCloudAuthTokens {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  public async create(): Promise<AssistantCloudAuthTokensCreateResponse> {
    return this.cloud.makeRequest("/auth/tokens", { method: "POST" });
  }
}
