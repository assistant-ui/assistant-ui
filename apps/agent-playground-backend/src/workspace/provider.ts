import type { Workspace } from "@mastra/core/workspace";

export interface ProvisionedWorkspace {
  workspacePath?: string;
  workspace: Workspace;
  cleanup?: () => Promise<void>;
  providerKind: "sandbox";
  sandboxInstance?: any;
}

export interface WorkspaceProvider {
  provision(input: {
    sessionId: string;
    cleanupOnDestroy?: boolean;
  }): Promise<ProvisionedWorkspace>;
}

export const sessionWorkspaceRegistry = new Map<string, ProvisionedWorkspace>();

export interface ProvisionOptions {
  sessionId: string;
  workspaceProvider: "sandbox";
  sandboxProvider: "blaxel";
  cleanupOnDestroy?: boolean;
}

export async function provisionWorkspace(options: ProvisionOptions): Promise<ProvisionedWorkspace> {
  if (options.workspaceProvider !== "sandbox" || options.sandboxProvider !== "blaxel") {
    throw new Error("The public assistant-ui backend supports only Blaxel sandbox workspaces.");
  }

  const { BlaxelWorkspaceProvider } = await import("./blaxel-provider.js");
  const provider = new BlaxelWorkspaceProvider();
  return provider.provision({
    sessionId: options.sessionId,
    cleanupOnDestroy: options.cleanupOnDestroy,
  });
}
