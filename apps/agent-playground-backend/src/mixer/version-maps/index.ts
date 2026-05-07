import {
  ASSISTANT_UI_VERSIONS,
  REMOVE_PACKAGES,
  type UnknownWorkspaceDependencyPolicy,
} from "./assistant-ui.js";

export interface WorkspaceVersionMap {
  versions: Record<string, string>;
  removePackages: string[];
}

export function getWorkspaceVersionMap(): WorkspaceVersionMap {
  return {
    versions: ASSISTANT_UI_VERSIONS,
    removePackages: REMOVE_PACKAGES,
  };
}

export type { UnknownWorkspaceDependencyPolicy };
