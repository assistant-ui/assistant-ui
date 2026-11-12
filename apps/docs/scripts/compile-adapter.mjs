// The deploy adapter for the `compile` step of scripts/next-build.mjs. It
// keeps the adapter's config changes (immutable asset hashes, deployment id),
// which both steps must agree on, and drops its onBuildComplete, which needs
// the prerendered output that only the `generate` step writes.
import { pathToFileURL } from "node:url";

const adapterPath = process.env.DOCS_DEPLOY_ADAPTER_PATH;
if (!adapterPath) throw new Error("DOCS_DEPLOY_ADAPTER_PATH is not set");
const module = await import(pathToFileURL(adapterPath).href);
const adapter = module.default ?? module;

export default { ...adapter, onBuildComplete: undefined };
