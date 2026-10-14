"use client";

import { useEffect, useRef, useState } from "react";
import { useAuiState } from "@assistant-ui/store";
import type { MCPConnectionState } from "@assistant-ui/react-mcp";

const FOCUSABLE_SELECTOR = "button:not([disabled]), a[href]";

const firstFocusable = (element: Element | null | undefined) =>
  element?.matches(FOCUSABLE_SELECTOR)
    ? (element as HTMLElement)
    : element?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

const indexOfServer = (list: Element, element: Element) =>
  [...list.children].findIndex((card) => card.contains(element));

const isFocusLost = () => {
  const active = document.activeElement;
  return (
    !active ||
    active === document.body ||
    active.getAttribute("role") === "dialog"
  );
};

export function useCustomServersSection() {
  const serverIds = useAuiState((s) =>
    s.mcp.customServers.map((server) => server.id).join("\x1f"),
  );
  const [showForm, setShowForm] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const focusedServerRef = useRef<{ element: Element; index: number } | null>(
    null,
  );
  const addTriggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  useEffect(() => {
    if (showForm || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    addTriggerRef.current?.focus();
  }, [showForm]);

  useEffect(() => {
    const list = listRef.current;
    const focused = focusedServerRef.current;
    if (!list || !focused) return;
    if (focused.element.isConnected) {
      focused.index = indexOfServer(list, focused.element);
      return;
    }
    focusedServerRef.current = null;
    if (!isFocusLost()) return;
    (
      firstFocusable(list.children[focused.index]) ??
      firstFocusable(list.nextElementSibling)
    )?.focus();
  }, [serverIds]);

  const onListFocus = (list: Element, element: Element) => {
    focusedServerRef.current = {
      element,
      index: indexOfServer(list, element),
    };
  };

  const openForm = () => setShowForm(true);
  const closeForm = () => {
    restoreFocusRef.current = true;
    setShowForm(false);
  };

  return { showForm, listRef, addTriggerRef, onListFocus, openForm, closeForm };
}

export const STATUS_LABEL: Record<MCPConnectionState, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  authRequired: "Auth required",
  authPending: "Authorizing…",
  error: "Error",
  disconnected: "Disconnected",
};

export function useServerAnnouncement() {
  const status = useAuiState((s) => s.mcpServer.connectionState);
  const message = useAuiState((s) => s.mcpServer.lastError?.message ?? null);
  const [seen, setSeen] = useState({ status, message });
  const [announcement, setAnnouncement] = useState("");

  if (seen.status !== status || seen.message !== message) {
    setSeen({ status, message });
    if (message && message !== seen.message) {
      setAnnouncement(`${STATUS_LABEL.error}: ${message}`);
    } else if (status !== seen.status) {
      setAnnouncement(STATUS_LABEL[status]);
    }
  }

  useEffect(() => {
    if (!announcement) return;
    const timeout = setTimeout(() => setAnnouncement(""), 1000);
    return () => clearTimeout(timeout);
  }, [announcement]);

  return announcement;
}

export function useServerActionFocus() {
  const state = useAuiState((s) => s.mcpServer.connectionState);
  const actionRef = useRef<HTMLButtonElement>(null);
  const focusedRef = useRef<Element | null>(null);

  useEffect(() => {
    const focused = focusedRef.current;
    if (!focused || focused.isConnected) return;
    focusedRef.current = null;
    if (isFocusLost()) actionRef.current?.focus();
  }, [state]);

  const onActionFocus = (element: Element) => {
    focusedRef.current = element;
  };

  return { actionRef, onActionFocus };
}
