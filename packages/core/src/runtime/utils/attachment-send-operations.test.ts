import { describe, expect, it, vi } from "vitest";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type {
  CompleteAttachment,
  PendingAttachment,
} from "../../types/attachment";
import { AttachmentSendOperations } from "./attachment-send-operations";

const pending = (id: string): PendingAttachment => ({
  id,
  type: "file",
  name: id,
  file: new File([], id),
  status: { type: "running", reason: "uploading", progress: 0 },
});

describe("AttachmentSendOperations.reconcileFailures", () => {
  it("matches failures by id while preserving complete, removed, and unaffected attachments", () => {
    const operations = new AttachmentSendOperations();
    const failed = pending("failed");
    const complete: CompleteAttachment = {
      id: "complete",
      type: "file",
      name: "complete",
      content: [],
      status: { type: "complete" },
    };
    const removed = pending("removed");
    const unaffected = pending("unaffected");
    operations.beginRemoval(removed);
    const result = operations.reconcileFailures(
      [failed, complete, removed, unaffected],
      [removed, complete, failed],
      [
        { status: "rejected", reason: "removed failure" },
        { status: "rejected", reason: "complete failure" },
        { status: "rejected", reason: new Error("upload failed") },
      ],
    );
    expect(result[0]).toEqual({
      ...failed,
      status: {
        type: "incomplete",
        reason: "error",
        message: "upload failed",
      },
    });
    expect(result[0]).not.toBe(failed);
    expect(result[1]).toBe(complete);
    expect(result[2]).toBe(removed);
    expect(result[3]).toBe(unaffected);
  });

  it("transfers a cached send result to the failed draft attachment", async () => {
    const operations = new AttachmentSendOperations();
    const attachment = pending("retry");
    const complete: CompleteAttachment = {
      ...attachment,
      content: [],
      status: { type: "complete" },
    };
    const send = vi.fn().mockResolvedValue(complete);
    const adapter = { send } as unknown as AttachmentAdapter;
    await operations.send(attachment, adapter);
    const [failed] = operations.reconcileFailures(
      [attachment],
      [attachment],
      [{ status: "rejected", reason: null }],
    );
    expect(failed?.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "null",
    });
    await expect(operations.send(failed!, adapter)).resolves.toBe(complete);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
