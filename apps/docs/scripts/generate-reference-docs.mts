// Single-process orchestrator: runs the api-reference and primitive-docs
// generators back-to-back so they share one ts-morph Project instance and
// the `_partsCache` in primitive-extract.mts. Cuts a full project bootstrap
// and a re-extraction of every primitive part out of `pnpm generate:docs`.
import "./generate-api-reference.mts";
import "./generate-primitive-docs.mts";
