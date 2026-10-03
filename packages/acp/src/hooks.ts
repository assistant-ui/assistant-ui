"use client";

import { acpExtras } from "./acpExtras";

/** Current ACP connection state. */
export const useAcpConnectionState = () =>
  acpExtras.use((e) => e.connectionState, "disconnected");

/** The ACP session id for the current connection, once created. */
export const useAcpSessionId = () =>
  acpExtras.use((e) => e.sessionId, undefined);

/** Agent identity returned by the `initialize` handshake. */
export const useAcpAgentInfo = () =>
  acpExtras.use((e) => e.agentInfo, undefined);

/** Capabilities the agent advertised in the `initialize` handshake. */
export const useAcpAgentCapabilities = () =>
  acpExtras.use((e) => e.agentCapabilities, undefined);

/** The agent's plan for the current turn, when it emits one. */
export const useAcpPlan = () => acpExtras.use((e) => e.plan, undefined);

/** Session title, when the agent provides one. */
export const useAcpSessionTitle = () =>
  acpExtras.use((e) => e.sessionTitle, undefined);

/** The agent's current mode id, when it reports modes. */
export const useAcpCurrentModeId = () =>
  acpExtras.use((e) => e.currentModeId, undefined);

/** Slash-style commands the agent makes available, when it reports them. */
export const useAcpAvailableCommands = () =>
  acpExtras.use((e) => e.availableCommands, undefined);

/** Session configuration options, when the agent reports them. */
export const useAcpConfigOptions = () =>
  acpExtras.use((e) => e.configOptions, undefined);

/** Context-window and cost usage, when the agent reports it. */
export const useAcpUsage = () => acpExtras.use((e) => e.usage, undefined);
