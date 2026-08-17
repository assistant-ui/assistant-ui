import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { readCloudRecord, readCloudString } from "./cloudResponse";

type AssistantCloudAuthTokensCreateResponse = {
  token: string;
};

export class AssistantCloudAuthTokens {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  public async create(): Promise<AssistantCloudAuthTokensCreateResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest("/auth/tokens", { method: "POST" }),
      "auth token response",
    );

    return { token: readCloudString(response.token, "token") };
  }
}
