import { AssistantCloudAPI, AssistantCloudConfig } from "./AssistantCloudAPI";
import { AssistantCloudAuthTokens } from "./AssistantCloudAuthTokens";
import { AssistantCloudRuns } from "./AssistantCloudRuns";
import { AssistantCloudThreads } from "./AssistantCloudThreads";
import { AssistantCloudFiles } from "./AssistantCloudFiles";
import { AssistantCloudStreams } from "./AssistantCloudStreams";

export class AssistantCloud {
  public readonly api: AssistantCloudAPI;
  public readonly threads;
  public readonly auth;
  public readonly runs;
  public readonly files;
  public readonly streams;

  constructor(config: AssistantCloudConfig) {
    const api = new AssistantCloudAPI(config);
    this.api = api;
    this.threads = new AssistantCloudThreads(api);
    this.auth = {
      tokens: new AssistantCloudAuthTokens(api),
    };
    this.runs = new AssistantCloudRuns(api);
    this.files = new AssistantCloudFiles(api);
    this.streams = new AssistantCloudStreams(api);
  }
}
