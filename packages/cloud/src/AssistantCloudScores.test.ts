import { describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudScores } from "./AssistantCloudScores";

const createCloudScores = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return { scores: new AssistantCloudScores(api), makeRequest };
};

describe("AssistantCloudScores", () => {
  it("posts the score body as given and decodes the response", async () => {
    const { scores, makeRequest } = createCloudScores();
    makeRequest.mockResolvedValue({
      score_id: "score_1",
      name: "helpfulness",
      data_type: "numeric",
      value: 0.8,
      string_value: null,
    });

    await expect(
      scores.create({
        name: "helpfulness",
        data_type: "numeric",
        value: 0.8,
        thread_id: "thread_1",
        message_id: "msg_1",
      }),
    ).resolves.toEqual({
      score_id: "score_1",
      name: "helpfulness",
      data_type: "numeric",
      value: 0.8,
      string_value: null,
    });
    expect(makeRequest).toHaveBeenCalledWith("/scores", {
      method: "POST",
      body: {
        name: "helpfulness",
        data_type: "numeric",
        value: 0.8,
        thread_id: "thread_1",
        message_id: "msg_1",
      },
    });
  });

  it("decodes a categorical score", async () => {
    const { scores, makeRequest } = createCloudScores();
    makeRequest.mockResolvedValue({
      score_id: "score_2",
      name: "tone",
      data_type: "categorical",
      value: null,
      string_value: "friendly",
    });

    await expect(
      scores.create({
        name: "tone",
        data_type: "categorical",
        string_value: "friendly",
        run_id: "run_1",
      }),
    ).resolves.toMatchObject({
      data_type: "categorical",
      string_value: "friendly",
    });
  });

  it("rejects a malformed score response", async () => {
    const { scores, makeRequest } = createCloudScores();
    makeRequest.mockResolvedValue({
      score_id: 42,
      name: "helpfulness",
      data_type: "numeric",
      value: 1,
      string_value: null,
    });

    await expect(
      scores.create({
        name: "helpfulness",
        data_type: "numeric",
        value: 1,
        run_id: "run_1",
      }),
    ).rejects.toThrow(
      'Invalid Assistant Cloud response for "score response.score_id": expected a string',
    );
  });
});
