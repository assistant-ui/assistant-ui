import { describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "../AssistantCloud";
import { CloudRunReporter } from "../CloudRunReporter";

const createCloud = (telemetry: AssistantCloud["telemetry"]) => {
  const report = vi.fn().mockResolvedValue({ run_id: "run_1" });
  const cloud = { telemetry, runs: { report } } as unknown as AssistantCloud;
  return { cloud, report };
};

describe("CloudRunReporter", () => {
  it("sends nothing while telemetry is disabled", async () => {
    const { cloud, report } = createCloud({ enabled: false });
    await new CloudRunReporter(cloud).report({
      threadId: "thread_1",
      status: "completed",
    });
    expect(report).not.toHaveBeenCalled();
  });

  it("stamps the cloud's environment, release and tags and applies beforeReport last", async () => {
    const beforeReport = vi.fn((report) => ({ ...report, model_id: "gpt" }));
    const { cloud, report } = createCloud({
      enabled: true,
      environment: "production",
      release: "1.2.3",
      tags: ["web"],
      beforeReport,
    });
    await new CloudRunReporter(cloud).report({
      threadId: "thread_1",
      status: "completed",
      outputText: "hi",
    });
    expect(beforeReport).toHaveBeenCalledWith(
      expect.objectContaining({
        thread_id: "thread_1",
        environment: "production",
        release: "1.2.3",
        tags: ["web"],
      }),
    );
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ thread_id: "thread_1", model_id: "gpt" }),
    );
  });

  it("skips a report the hook vetoes without consuming its key", async () => {
    const { cloud, report } = createCloud({
      enabled: true,
      beforeReport: vi
        .fn()
        .mockReturnValueOnce(null)
        .mockImplementation((r) => r),
    });
    const reporter = new CloudRunReporter(cloud);
    await reporter.report({ threadId: "t", status: "completed" }, "t:m");
    await reporter.report({ threadId: "t", status: "completed" }, "t:m");
    expect(report).toHaveBeenCalledOnce();
  });

  it("reports a keyed run once and an unkeyed run every time", async () => {
    const { cloud, report } = createCloud({ enabled: true });
    const reporter = new CloudRunReporter(cloud);
    await reporter.report({ threadId: "t", status: "completed" }, "t:m");
    await reporter.report({ threadId: "t", status: "completed" }, "t:m");
    await reporter.report({ threadId: "t", status: "completed" });
    await reporter.report({ threadId: "t", status: "completed" });
    expect(report).toHaveBeenCalledTimes(3);
  });

  it("swallows a failed send and reads the cloud through a getter", async () => {
    const { cloud } = createCloud({ enabled: true });
    (cloud.runs.report as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("offline"),
    );
    await expect(
      new CloudRunReporter(() => cloud).report({
        threadId: "t",
        status: "error",
      }),
    ).resolves.toBeUndefined();
  });

  it("resolves when the hook throws and reports nothing", async () => {
    const { cloud, report } = createCloud({
      enabled: true,
      beforeReport: () => {
        throw new Error("hook");
      },
    });
    await expect(
      new CloudRunReporter(cloud).report({
        threadId: "t",
        status: "completed",
      }),
    ).resolves.toBeUndefined();
    expect(report).not.toHaveBeenCalled();
  });
});
