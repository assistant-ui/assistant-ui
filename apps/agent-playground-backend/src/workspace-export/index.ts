import type { ProvisionedWorkspace } from "../workspace-provider.js";
import { exportBlaxelWorkspace } from "./blaxel.js";
import type { WorkspaceExportOptions, WorkspaceExportResult } from "./types.js";
import { WorkspaceExportError } from "./types.js";

export async function exportWorkspace(
  provisioned: ProvisionedWorkspace,
  options: WorkspaceExportOptions,
): Promise<WorkspaceExportResult> {
  if (options.format && options.format !== "tar.gz") {
    throw new WorkspaceExportError(`Unsupported export format: ${options.format}`, 400);
  }
  if (provisioned.providerKind !== "sandbox") {
    throw new WorkspaceExportError("Only Blaxel sandbox workspace export is supported.", 400);
  }
  return exportBlaxelWorkspace(provisioned, options);
}

export type {
  WorkspaceExportOptions,
  WorkspaceExportResult,
  WorkspaceExportFormat,
} from "./types.js";
export { WorkspaceExportError } from "./types.js";
