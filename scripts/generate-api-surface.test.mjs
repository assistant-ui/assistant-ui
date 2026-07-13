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

test("top-level statements are grouped and sorted by name", () => {
  const output = normalizeBundledDeclaration(
    [
      `type Zebra = string;`,
      `import { Second } from "second";`,
      `declare function alpha(a: string): void;`,
      `import { First } from "first";`,
      `interface Middle { a: 1; }`,
      `export { Middle, Zebra, alpha };`,
      `declare function alpha(a: number): void;`,
    ].join("\n"),
  );

  const order = [
    `import { First } from "first";`,
    `import { Second } from "second";`,
    "interface Middle",
    "type Zebra",
    "alpha(a: string)",
    "alpha(a: number)",
    "export { Middle, Zebra, alpha };",
  ].map((snippet) => output.indexOf(snippet));

  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  );
});

test("removing an unused React default import leaves no blank gap", () => {
  const output = normalizeBundledDeclaration(
    `import { A } from "a";\nimport React from "react";\ntype B = string;\nexport { B };\n`,
  );
  assert.ok(!output.includes(`import React`));
  assert.ok(!output.includes("\n\n\n"));
});

test("statement sorting is idempotent", () => {
  const once = normalizeBundledDeclaration(
    `type Beta = 1;\n\ntype Alpha = 2;\n\nexport { Alpha, Beta };\n`,
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
