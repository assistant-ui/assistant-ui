import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudProjectThreads } from "./AssistantCloudProjectThreads";

export class AssistantCloudProjects {
  public readonly threads: AssistantCloudProjectThreads;

  constructor(cloud: AssistantCloudAPI) {
    this.threads = new AssistantCloudProjectThreads(cloud);
  }
}
