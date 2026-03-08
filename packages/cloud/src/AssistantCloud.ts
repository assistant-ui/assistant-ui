import {
  AssistantCloudAPI,
  AssistantCloudConfig,
  AssistantCloudTelemetryConfig,
} from "./AssistantCloudAPI";
import { AssistantCloudAuthTokens } from "./AssistantCloudAuthTokens";
import { AssistantCloudRuns } from "./AssistantCloudRuns";
import { AssistantCloudThreads } from "./AssistantCloudThreads";
import { AssistantCloudFiles } from "./AssistantCloudFiles";

export class AssistantCloud {
  public readonly threads;
  public readonly auth;
  public readonly runs;
  public readonly files;
  public readonly telemetry: AssistantCloudTelemetryConfig;

  constructor(config: AssistantCloudConfig) {
    const api = new AssistantCloudAPI(config);
    this.threads = new AssistantCloudThreads(api);
    this.auth = {
      tokens: new AssistantCloudAuthTokens(api),
    };
    this.runs = new AssistantCloudRuns(api);
    this.files = new AssistantCloudFiles(api);

    const t = config.telemetry;
    this.telemetry =
      t === false
        ? { enabled: false }
        : t === true || t === undefined
          ? { enabled: true }
          : { enabled: t.enabled !== false, ...t };
  }
}
