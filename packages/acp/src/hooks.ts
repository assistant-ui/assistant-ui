"use client";

import { acpExtras } from "./acpExtras";

/** Current ACP connection state. */
export const useAcpConnectionState = () =>
  acpExtras.useExtras((e) => e.connectionState, "disconnected");

/** The ACP session id for the current connection, once created. */
export const useAcpSessionId = () =>
  acpExtras.useExtras((e) => e.sessionId, undefined);

/** Agent identity returned by the `initialize` handshake. */
export const useAcpAgentInfo = () =>
  acpExtras.useExtras((e) => e.agentInfo, undefined);

/** Capabilities the agent advertised in the `initialize` handshake. */
export const useAcpAgentCapabilities = () =>
  acpExtras.useExtras((e) => e.agentCapabilities, undefined);

/** The agent's plan for the current turn, when it emits one. */
export const useAcpPlan = () => acpExtras.useExtras((e) => e.plan, undefined);

/** Session title, when the agent provides one. */
export const useAcpSessionTitle = () =>
  acpExtras.useExtras((e) => e.sessionTitle, undefined);

/** The agent's current mode id, when it reports modes. */
export const useAcpCurrentModeId = () =>
  acpExtras.useExtras((e) => e.currentModeId, undefined);

/** Slash-style commands the agent makes available, when it reports them. */
export const useAcpAvailableCommands = () =>
  acpExtras.useExtras((e) => e.availableCommands, undefined);

/** Session configuration options, when the agent reports them. */
export const useAcpConfigOptions = () =>
  acpExtras.useExtras((e) => e.configOptions, undefined);

/** Context-window and cost usage, when the agent reports it. */
export const useAcpUsage = () => acpExtras.useExtras((e) => e.usage, undefined);
