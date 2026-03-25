"use client";

export type PermissionMode = "ask-all" | "auto-reads" | "auto-all" | "custom";

export interface ToolPermission {
  toolName: string;
  mode: "allow" | "ask" | "deny";
  expiresAt?: number;
}

export interface PermissionStoreInterface {
  getMode(): PermissionMode;
  setMode(mode: PermissionMode): void;

  getToolPermission(toolName: string): ToolPermission | undefined;
  setToolPermission(toolName: string, permission: ToolPermission): void;
  clearToolPermission(toolName: string): void;

  getPersistedPermissions(): ToolPermission[];
  persistPermission(toolName: string): void;
  clearPersistedPermission(toolName: string): void;

  subscribe(callback: () => void): () => void;
}

export class LocalStoragePermissionStore implements PermissionStoreInterface {
  private mode: PermissionMode = "ask-all";
  private sessionPermissions: Map<string, ToolPermission> = new Map();
  private listeners: Set<() => void> = new Set();
  private storageKey = "agent-ui-permissions";

  constructor() {
    this.loadPersistedPermissions();
  }

  getMode(): PermissionMode {
    return this.mode;
  }

  setMode(mode: PermissionMode): void {
    this.mode = mode;
    this.notify();
  }

  getToolPermission(toolName: string): ToolPermission | undefined {
    const permission = this.sessionPermissions.get(toolName);

    if (permission?.expiresAt && Date.now() > permission.expiresAt) {
      this.clearToolPermission(toolName);
      return undefined;
    }

    return permission;
  }

  setToolPermission(toolName: string, permission: ToolPermission): void {
    this.sessionPermissions.set(toolName, permission);
    this.notify();
  }

  clearToolPermission(toolName: string): void {
    this.sessionPermissions.delete(toolName);
    this.notify();
  }

  getPersistedPermissions(): ToolPermission[] {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];

      const data = JSON.parse(stored);
      return this.parsePermissions(data);
    } catch {
      return [];
    }
  }

  persistPermission(toolName: string): void {
    if (typeof window === "undefined") return;

    const persisted = this.getPersistedPermissions();
    const existingIndex = persisted.findIndex((p) => p.toolName === toolName);

    const persistedPermission: ToolPermission = {
      toolName,
      mode: "allow",
    };

    if (existingIndex >= 0) {
      persisted[existingIndex] = persistedPermission;
    } else {
      persisted.push(persistedPermission);
    }

    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({ permissions: persisted }),
      );
    } catch {
      // Silently fail on SSR or storage errors
    }
  }

  clearPersistedPermission(toolName: string): void {
    if (typeof window === "undefined") return;

    const persisted = this.getPersistedPermissions();
    const filtered = persisted.filter((p) => p.toolName !== toolName);

    try {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({ permissions: filtered }),
      );
    } catch {
      // Silently fail on SSR or storage errors
    }
  }

  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  private loadPersistedPermissions(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const data = JSON.parse(stored);
      const permissions = this.parsePermissions(data);

      for (const permission of permissions) {
        this.sessionPermissions.set(permission.toolName, permission);
      }
    } catch {
      // Silently fail on SSR or storage errors
    }
  }

  private parsePermissions(data: unknown): ToolPermission[] {
    if (!data || typeof data !== "object") return [];
    const permissions = (data as { permissions?: unknown }).permissions;
    if (!Array.isArray(permissions)) return [];

    const parsed: ToolPermission[] = [];
    for (const item of permissions) {
      if (!item || typeof item !== "object") continue;

      const toolName = (item as { toolName?: unknown }).toolName;
      const mode = (item as { mode?: unknown }).mode;
      const expiresAt = (item as { expiresAt?: unknown }).expiresAt;

      if (
        typeof toolName !== "string" ||
        (mode !== "allow" && mode !== "ask" && mode !== "deny")
      ) {
        continue;
      }

      if (expiresAt !== undefined && typeof expiresAt !== "number") {
        continue;
      }

      const permission: ToolPermission = { toolName, mode };
      if (expiresAt !== undefined) {
        permission.expiresAt = expiresAt;
      }
      parsed.push(permission);
    }

    return parsed;
  }
}
