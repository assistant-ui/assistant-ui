import { expect, it } from "vitest";
import { AttachmentAddOperations } from "./attachment-add-operations";

it("only narrows retained attachment ids across repeated clears", async () => {
  const operations = new AttachmentAddOperations();
  const operation = operations.start();
  const running = {
    type: "running",
    reason: "uploading",
    progress: 0,
  } as const;
  operations.accept(operation, { id: "submitted", status: running });
  operations.accept(operation, { id: "discarded", status: running });
  const submitted = operations.whenSendable("submitted");
  const discarded = operations.whenSendable("discarded");

  operations.cancelAll(new Set(["submitted"]));
  await discarded;
  operations.cancelAll(new Set(["submitted", "discarded", "later"]));
  expect(
    operations.accept(operation, { id: "discarded", status: running }),
  ).toBe(false);
  expect(operations.accept(operation, { id: "later", status: running })).toBe(
    false,
  );
  expect(
    operations.accept(operation, {
      id: "submitted",
      status: { type: "requires-action", reason: "composer-send" },
    }),
  ).toBe(true);
  await submitted;
  expect(operations.isCancelled(operation)).toBe(false);

  operations.cancelAll();
  expect(operations.isCancelled(operation)).toBe(true);
  expect(
    operations.accept(operation, { id: "submitted", status: running }),
  ).toBe(false);
});
