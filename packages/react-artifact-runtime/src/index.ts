import type { ArtifactSpec } from "@assistant-ui/core/react";
import {
  buildReactArtifactHtml,
  type BuildReactArtifactHtmlOptions,
} from "./buildReactArtifactHtml";

export {
  buildReactArtifactHtml,
  type BuildReactArtifactHtmlOptions,
} from "./buildReactArtifactHtml";
export {
  minimalImportMap,
  claudeParityImportMap,
} from "./defaultImportMap";

/**
 * Opt-in artifact type that renders a single-file React component (default
 * export, JSX or TSX) inside the `SafeContentFrame` iframe.
 *
 * @example
 * ```ts
 * import { Artifacts, defaultArtifactTypes } from "@assistant-ui/react";
 * import { reactArtifactType, claudeParityImportMap } from "@assistant-ui/react-artifact-runtime";
 *
 * const aui = useAui({
 *   artifacts: Artifacts({
 *     toolkit: { render_react: { ... } },
 *     types: [
 *       ...defaultArtifactTypes,
 *       reactArtifactType({ importMap: claudeParityImportMap }),
 *     ],
 *   }),
 * });
 * ```
 */
export const reactArtifactType = (
  opts: BuildReactArtifactHtmlOptions = {},
): ArtifactSpec<{ code: string; artifactId?: string }> => ({
  toolName: "render_react",
  mimeType: "application/vnd.assistant-ui.react",
  getContent: (args) => args?.code,
  // Without this, the fold falls back to `toolCallId` as the artifact id,
  // which makes update_artifact / rewrite_artifact unable to target this
  // artifact and breaks the side-panel selector that displays artifact ids.
  getArtifactId: (args) => args?.artifactId,
  language: "tsx",
  renderToHtml: (source) => buildReactArtifactHtml(source, opts),
});
