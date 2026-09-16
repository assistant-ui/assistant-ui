import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import {
  readCloudEnum,
  readCloudNullableNumber,
  readCloudNullableString,
  readCloudRecord,
  readCloudString,
} from "./cloudResponse";

const SCORE_DATA_TYPES = ["numeric", "categorical", "boolean"] as const;

export type AssistantCloudScoreBody = {
  name: string;
  data_type: "numeric" | "categorical" | "boolean";
  value?: number | boolean;
  string_value?: string;
  comment?: string;
  thread_id?: string;
  message_id?: string;
  run_id?: string;
};

export type AssistantCloudScoreResponse = {
  score_id: string;
  name: string;
  data_type: "numeric" | "categorical" | "boolean";
  value: number | null;
  string_value: string | null;
};

export class AssistantCloudScores {
  private cloud: AssistantCloudAPI;

  constructor(cloud: AssistantCloudAPI) {
    this.cloud = cloud;
  }

  public async create(
    body: AssistantCloudScoreBody,
  ): Promise<AssistantCloudScoreResponse> {
    const response = readCloudRecord(
      await this.cloud.makeRequest("/scores", { method: "POST", body }),
      "score response",
    );

    return {
      score_id: readCloudString(response.score_id, "score response.score_id"),
      name: readCloudString(response.name, "score response.name"),
      data_type: readCloudEnum(
        response.data_type,
        "score response.data_type",
        SCORE_DATA_TYPES,
      ),
      value: readCloudNullableNumber(response.value, "score response.value"),
      string_value: readCloudNullableString(
        response.string_value,
        "score response.string_value",
      ),
    };
  }
}
