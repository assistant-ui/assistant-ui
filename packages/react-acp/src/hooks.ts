"use client";

import { acpExtras } from "./acpExtras";

/** Current ACP connection state. */
export const useAcpConnectionState = () =>
  acpExtras.use((e) => e.connectionState);

/** The ACP session id for the current connection, once created. */
export const useAcpSessionId = () => acpExtras.use((e) => e.sessionId);

/** Agent identity returned by the `initialize` handshake. */
export const useAcpAgentInfo = () => acpExtras.use((e) => e.agentInfo);

/** The agent's plan for the current turn, when it emits one. */
export const useAcpPlan = () => acpExtras.use((e) => e.plan);

/** Session title, when the agent provides one. */
export const useAcpSessionTitle = () => acpExtras.use((e) => e.sessionTitle);

/** The agent's current mode id, when it reports modes. */
export const useAcpCurrentModeId = () => acpExtras.use((e) => e.currentModeId);

/** Slash-style commands the agent makes available, when it reports them. */
export const useAcpAvailableCommands = () =>
  acpExtras.use((e) => e.availableCommands);
