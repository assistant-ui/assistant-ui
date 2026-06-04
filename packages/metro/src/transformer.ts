import { createRequire } from "node:module";
import {
  compileGenerative,
  isGenerativeModule,
} from "@assistant-ui/x-generative-compiler";
import { UPSTREAM_TRANSFORMER_ENV } from "./index";

const require = createRequire(import.meta.url);

/** Source modules a `"use generative"` directive can appear in. */
const SOURCE_RE = /\.[cm]?[jt]sx?$/;

/** Minimal shape of a Metro babel transformer. */
type BabelTransformer = {
  transform: (props: {
    filename: string;
    src: string;
    options?:
      | { customTransformOptions?: { environment?: string } | undefined }
      | undefined;
    [key: string]: unknown;
  }) => unknown;
  getCacheKey?: (() => string) | undefined;
  [key: string]: unknown;
};

/**
 * The project's upstream babel transformer — what Metro would have used without
 * this wrapper. Taken from {@link UPSTREAM_TRANSFORMER_ENV} (set by `withAui`),
 * else auto-detected: Expo's transformer, then React Native's.
 */
function resolveUpstream(): BabelTransformer {
  const fromEnv = process.env[UPSTREAM_TRANSFORMER_ENV];
  if (fromEnv) return require(fromEnv) as BabelTransformer;

  for (const id of [
    "@expo/metro-config/babel-transformer",
    "@react-native/metro-babel-transformer",
  ]) {
    try {
      return require(id) as BabelTransformer;
    } catch {
      // try the next candidate
    }
  }

  throw new Error(
    "[@assistant-ui/metro] Could not resolve an upstream Metro babel " +
      "transformer. Make sure `transformer.babelTransformerPath` is set before " +
      "`withAui(...)` (Expo's `getDefaultConfig` sets it), or install " +
      "`@expo/metro-config` or `@react-native/metro-babel-transformer`.",
  );
}

// Resolved lazily on first use — by then Metro has loaded `metro.config` and
// `withAui` has populated the env var, and forked workers have inherited it.
let cachedUpstream: BabelTransformer | undefined;
function upstreamTransformer(): BabelTransformer {
  return (cachedUpstream ??= resolveUpstream());
}

/** Expo bundles `+api` routes / RSC for a server environment; the app is client. */
function isServerEnvironment(environment: string | undefined): boolean {
  return environment === "node" || environment === "react-server";
}

export function transform(
  props: Parameters<BabelTransformer["transform"]>[0],
): unknown {
  const upstream = upstreamTransformer();
  const { filename, src, options } = props;

  if (SOURCE_RE.test(filename) && isGenerativeModule(src)) {
    const target = isServerEnvironment(
      options?.customTransformOptions?.environment,
    )
      ? "server"
      : "client";

    const { code } = compileGenerative(src, {
      target,
      filename,
      // Metro has no `react-server` layer, so `import "server-only"` would not
      // resolve; the environment split already keeps a server `execute` out of
      // the client bundle.
      injectServerOnly: false,
    });

    return upstream.transform({ ...props, src: code });
  }

  return upstream.transform(props);
}

export function getCacheKey(): string {
  const upstream = upstreamTransformer();
  const base = upstream.getCacheKey ? upstream.getCacheKey() : "";
  // Bust Metro's transform cache when this integration changes.
  return `${base}$aui-metro-1`;
}
