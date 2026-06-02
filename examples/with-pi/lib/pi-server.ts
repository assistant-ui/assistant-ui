/**
 * Server-only Pi wiring for the example.
 *
 * Owns the process-singleton `createPiNodeClient` (the in-process SDK host) and
 * the env-seeded model resolution (PI_MVP_PLAN §5). Imported only from route
 * handlers — never from a client component — so the Pi SDK and its file I/O stay
 * on the server.
 *
 * Model resolution mirrors what Pi's own `createAgentSession` does: an explicit
 * PI_PROVIDER + PI_MODEL_ID wins, otherwise we fall back to Pi's configured
 * default (`settings.json`'s `defaultProvider`/`defaultModel`, read via
 * `SettingsManager`). The resolved `Model` is handed to the supervisor as the
 * default for every new session, and powers the model-selector catalog and the
 * readiness banner. So a user who is simply authenticated with `pi` (and has a
 * default model picked) needs no env at all.
 *
 * `PI_CODING_AGENT_DIR` is Pi's own env var for the agent config dir
 * (~/.pi/agent by default); when set, every Pi config source below points at it.
 */
import {
  AuthStorage,
  ModelRegistry,
  SettingsManager,
} from "@earendil-works/pi-coding-agent";
import {
  createPiNodeClient,
  type PiRuntimeReadiness,
} from "@assistant-ui/react-pi/node";

const env = (key: string): string | undefined => {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : undefined;
};

const workspacePath = env("PI_WORKSPACE_PATH") ?? process.cwd();
const agentDir = env("PI_CODING_AGENT_DIR");

const authStorage = AuthStorage.create(
  agentDir ? `${agentDir}/auth.json` : undefined,
);
const modelRegistry = ModelRegistry.create(authStorage);
const settingsManager = SettingsManager.create(workspacePath, agentDir);

// Env wins; otherwise fall back to Pi's configured default (settings.json).
const provider = env("PI_PROVIDER") ?? settingsManager.getDefaultProvider();
const modelId = env("PI_MODEL_ID") ?? settingsManager.getDefaultModel();
const modelSource: "env" | "pi-default" =
  env("PI_PROVIDER") && env("PI_MODEL_ID") ? "env" : "pi-default";

const seededModel =
  provider && modelId ? modelRegistry.find(provider, modelId) : undefined;

/** Stable, collision-free option id — model ids repeat across providers. */
const modelKey = (m: { provider: unknown; id: string }): string =>
  `${String(m.provider)}:${m.id}`;

export const piClient = createPiNodeClient({
  workspacePath,
  ...(agentDir ? { agentDir } : {}),
  ...(seededModel ? { model: seededModel } : {}),
});

export type PiModelOption = {
  id: string;
  name: string;
  description?: string;
  provider: string;
  modelId: string;
};

export type PiHandshake = {
  workspacePath: string;
  /** Models Pi can run here (auth-configured first, else the full catalog). */
  models: PiModelOption[];
  /** The env-seeded selection, shown as the selector's default. */
  selectedModelId: string | undefined;
  readiness: PiRuntimeReadiness;
};

const computeReadiness = (): PiRuntimeReadiness => {
  if (!provider || !modelId) {
    return {
      state: "missing-model",
      message:
        "No default model configured. Pick one with `pi`, or set PI_PROVIDER and PI_MODEL_ID.",
    };
  }
  if (!seededModel) {
    return {
      state: "unavailable-model",
      selection: { provider, modelId },
      message: `${provider}/${modelId} is not in Pi's model registry.`,
    };
  }
  if (!modelRegistry.hasConfiguredAuth(seededModel)) {
    return {
      state: "missing-credentials",
      provider,
      message: `No credentials configured for ${provider}. Authenticate with \`pi\`, then restart the server.`,
    };
  }
  return {
    state: "ready",
    selection: { provider, modelId },
    source: modelSource,
  };
};

export const getHandshake = (): PiHandshake => {
  modelRegistry.refresh();
  const available = modelRegistry.getAvailable();
  const catalog = available.length > 0 ? available : modelRegistry.getAll();
  return {
    workspacePath,
    models: catalog.map((model) => ({
      id: modelKey(model),
      name: model.name,
      description: String(model.provider),
      provider: String(model.provider),
      modelId: model.id,
    })),
    selectedModelId: seededModel ? modelKey(seededModel) : undefined,
    readiness: computeReadiness(),
  };
};
