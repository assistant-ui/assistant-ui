import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBundledDeclaration } from "./generate-api-surface.mjs";

const attachmentUnion = (first, second) =>
  `type X = (${first}) | (${second});\n`;

const completeMember = (source) =>
  `{ status: CompleteAttachmentStatus; content: ThreadUserMessagePart[] } & { source: "${source}" }`;

const pendingMember = (source) =>
  `{ status: PendingAttachmentStatus; file: File } & { source: "${source}" }`;

const statusOrder = (output) => [
  output.indexOf("CompleteAttachmentStatus"),
  output.indexOf("PendingAttachmentStatus"),
];

test("attachment union normalizes thread-composer members to Complete-first", () => {
  const pendingFirst = normalizeBundledDeclaration(
    attachmentUnion(
      pendingMember("thread-composer"),
      completeMember("thread-composer"),
    ),
  );
  const completeFirst = normalizeBundledDeclaration(
    attachmentUnion(
      completeMember("thread-composer"),
      pendingMember("thread-composer"),
    ),
  );

  const [complete, pending] = statusOrder(pendingFirst);
  assert.ok(complete >= 0 && pending >= 0);
  assert.ok(complete < pending);
  assert.equal(pendingFirst, completeFirst);
});

test("attachment union normalizes edit-composer members to Complete-first", () => {
  const [complete, pending] = statusOrder(
    normalizeBundledDeclaration(
      attachmentUnion(
        pendingMember("edit-composer"),
        completeMember("edit-composer"),
      ),
    ),
  );
  assert.ok(complete < pending);
});

test("string literal unions are sorted into a canonical order", () => {
  const output = normalizeBundledDeclaration(
    `type Role = "user" | "system" | "assistant";\n`,
  );
  assert.match(output, /"assistant"\s*\|\s*"system"\s*\|\s*"user"/);
});

test("normalization is idempotent", () => {
  const once = normalizeBundledDeclaration(
    attachmentUnion(
      pendingMember("thread-composer"),
      completeMember("thread-composer"),
    ),
  );
  assert.equal(normalizeBundledDeclaration(once), once);
});

test("an unrecognized composer attachment union shape throws", () => {
  const bad = attachmentUnion(
    `{ status: CompleteAttachmentStatus } & { source: "thread-composer" }`,
    `{ status: PendingAttachmentStatus } & { source: "thread-composer" }`,
  );
  assert.throws(() => normalizeBundledDeclaration(bad), /unsupported shape/);
});
