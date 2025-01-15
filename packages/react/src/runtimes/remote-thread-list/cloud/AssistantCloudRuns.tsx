import { CoreMessage } from "../../../types";
import { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantStream, PlainTextDecoder } from "assistant-stream";

type AssistantCloudRunsStreamBody = {
  thread_id: string;
  assistant_id: "system/thread_title";
  messages: CoreMessage[];
};

export class AssistantCloudRuns {
  constructor(private cloud: AssistantCloudAPI) {}

  public async stream(
    body: AssistantCloudRunsStreamBody,
  ): Promise<AssistantStream> {
    const response = await this.cloud.makeRawRequest("/runs/stream", {
      method: "POST",
      headers: {
        Accept: "text/plain",
      },
      body,
    });
    return AssistantStream.fromResponse(response, new PlainTextDecoder());
  }
}
