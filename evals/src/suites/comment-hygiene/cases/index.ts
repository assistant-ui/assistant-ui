import type { EvalCase } from "../types.ts";
import { prReviewComments } from "./pr-review-comments.ts";
import { bugfixComments } from "./bugfix-comments.ts";
import { optionalHostSdkDependency } from "./optional-host-sdk-dependency.ts";
import { registrySourceOfTruth } from "./registry-source-of-truth.ts";
import { verboseNewCode } from "./verbose-new-code.ts";

export const cases: EvalCase[] = [
  prReviewComments,
  bugfixComments,
  registrySourceOfTruth,
  optionalHostSdkDependency,
  verboseNewCode,
];
