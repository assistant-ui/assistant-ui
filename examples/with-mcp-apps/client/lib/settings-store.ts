import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MCP_SERVERS, getDefaultEnabledServers } from "./server-config";

// Valid server IDs from config
const VALID_SERVER_IDS = new Set(MCP_SERVERS.map((s) => s.id));

// Filter out server IDs that no longer exist in config
function filterValidServers(serverIds: string[]): string[] {
  return serverIds.filter((id) => VALID_SERVER_IDS.has(id));
}

interface SettingsState {
  enabledServers: string[];
  toggleServer: (serverId: string) => void;
  setEnabledServers: (serverIds: string[]) => void;
  resetToDefaults: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      enabledServers: getDefaultEnabledServers(),

      toggleServer: (serverId: string) =>
        set((state) => ({
          enabledServers: state.enabledServers.includes(serverId)
            ? state.enabledServers.filter((id) => id !== serverId)
            : [...state.enabledServers, serverId],
        })),

      setEnabledServers: (serverIds: string[]) =>
        set({ enabledServers: filterValidServers(serverIds) }),

      resetToDefaults: () =>
        set({ enabledServers: getDefaultEnabledServers() }),
    }),
    {
      name: "mcp-ui-settings",
      // Clean up stale server IDs on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          const validServers = filterValidServers(state.enabledServers);
          if (validServers.length !== state.enabledServers.length) {
            state.setEnabledServers(validServers);
          }
        }
      },
    },
  ),
);

// Helper to get server configs for enabled servers
export function getEnabledServerConfigs() {
  const { enabledServers } = useSettingsStore.getState();
  return MCP_SERVERS.filter((s) => enabledServers.includes(s.id));
}
