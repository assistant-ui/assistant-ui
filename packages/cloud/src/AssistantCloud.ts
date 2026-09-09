import {
  AssistantCloudAPI,
  type AssistantCloudConfig,
  type AssistantCloudTelemetryConfig,
} from "./AssistantCloudAPI";
import { AssistantCloudAuthTokens } from "./AssistantCloudAuthTokens";
import { AssistantCloudProjects } from "./AssistantCloudProjects";
import { AssistantCloudRuns } from "./AssistantCloudRuns";
import { AssistantCloudThreads } from "./AssistantCloudThreads";
import { AssistantCloudFiles } from "./AssistantCloudFiles";
import { AssistantCloudEvents } from "./AssistantCloudEvents";
import { AssistantCloudScores } from "./AssistantCloudScores";

export class AssistantCloud {
  public readonly threads;
  public readonly projects;
  public readonly auth;
  public readonly runs;
  public readonly files;
  public readonly events;
  public readonly scores;
  public readonly telemetry: AssistantCloudTelemetryConfig;

  constructor(config: AssistantCloudConfig) {
    const api = new AssistantCloudAPI(config);
    const t = config.telemetry;
    this.telemetry =
      t === false
        ? { enabled: false }
        : t === true || t === undefined
          ? { enabled: true }
          : {
              ...t,
              enabled: t.enabled !== false,
            };

    this.threads = new AssistantCloudThreads(api);
    this.projects = new AssistantCloudProjects(api);
    this.auth = {
      tokens: new AssistantCloudAuthTokens(api),
    };
    this.runs = new AssistantCloudRuns(api);
    this.files = new AssistantCloudFiles(api);
    this.events = new AssistantCloudEvents(
      api,
      () => this.telemetry.enabled !== false && this.telemetry.events !== false,
    );
    this.scores = new AssistantCloudScores(api);
  }
}
