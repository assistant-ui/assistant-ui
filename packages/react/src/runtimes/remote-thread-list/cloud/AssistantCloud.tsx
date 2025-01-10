import { AssistantCloudAPI, AssistantCloudConfig } from "./AssistantCloudAPI";
import { AssistantCloudAuthTokens } from "./AssistantCloudAuthTokens";
import { AssistantCloudThreads } from "./AssistantCloudThreads";

export class AssistantCloud {
  public readonly threads;
  public readonly auth;

  constructor(config: AssistantCloudConfig) {
    const api = new AssistantCloudAPI(config);
    this.threads = new AssistantCloudThreads(api);
    this.auth = {
      tokens: new AssistantCloudAuthTokens(api),
    };
  }
}
