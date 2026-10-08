import assert from "node:assert/strict";
import test from "node:test";
import { advise } from "./review-tier-advice.mjs";

const issue = (number, ...pullRequests) => ({ number, pullRequests });
const pr = (number, state = "OPEN") => ({ number, state });

test("another open or merged pull request for the same issue is named", () => {
  assert.deepEqual(
    advise({
      number: 12,
      closingIssues: [issue(42, pr(12), pr(15), pr(9, "MERGED"))],
    }),
    ["#15 is also open for #42", "#9 already merged for #42"],
  );
});

test("the pull request itself and closed attempts are not parallel work", () => {
  assert.deepEqual(
    advise({
      number: 12,
      closingIssues: [issue(42, pr(12), pr(7, "CLOSED")), issue(43)],
    }),
    [],
  );
});
