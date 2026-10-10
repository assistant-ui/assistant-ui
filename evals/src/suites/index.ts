import type { Suite, SuiteCandidate, SuiteCase } from "../types.ts";
import { commentHygiene } from "./comment-hygiene/index.ts";

export const suites: Suite<SuiteCase, SuiteCandidate, unknown>[] = [
  commentHygiene,
];
