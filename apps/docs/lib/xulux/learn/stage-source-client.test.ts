import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLearnStageFiles } from "./stage-source-client";

describe("fetchLearnStageFiles", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads stage files from the Learn source endpoint", async () => {
    const files = { "app/page.tsx": "export default function Page() {}" };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ files })));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(
      fetchLearnStageFiles("course id", "P1", controller.signal),
    ).resolves.toEqual(files);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/xulux/learn/source?courseId=course+id&stageId=P1",
      { signal: controller.signal },
    );
  });

  it("rejects failed and invalid source responses", async () => {
    const controller = new AbortController();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: null })));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchLearnStageFiles("course", "P1", controller.signal),
    ).rejects.toThrow("Source request failed (500)");
    await expect(
      fetchLearnStageFiles("course", "P1", controller.signal),
    ).rejects.toThrow("Source response was invalid.");
  });
});
