"use client";

import { useSyncExternalStore } from "react";

export type NotificationState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

const listeners = new Set<() => void>();

const read = (): NotificationState => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The browser's notification permission, re-read after every request. */
export const useNotificationState = (): NotificationState =>
  useSyncExternalStore(subscribe, read, () => "unsupported");

export const requestNotifications = async () => {
  if (read() === "unsupported") return;
  try {
    await Notification.requestPermission();
  } catch {
    // Older Safari takes a callback and throws on the promise form; the state re-read covers both.
  }
  for (const listener of listeners) listener();
};

/** Shows a notification unless the page already has the user's attention. */
export const notifyCheckout = (title: string, body: string) => {
  if (read() !== "granted" || document.hasFocus()) return;
  try {
    const notification = new Notification(title, { body, tag: "aui-checkout" });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some browsers only allow notifications from a service worker; there is nothing to fall back to.
  }
};
