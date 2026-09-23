import { useEffect } from "react";

export type WakeConnection = {
  status: string;
  reason?: string;
  reconnect: () => void;
};

/** Reconnects a dropped or idled session as soon as the page is in front of the user again. */
export function useWakeReconnect(connection: WakeConnection) {
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      if (
        connection.status === "retrying" ||
        (connection.status === "standby" && connection.reason === "idle")
      )
        connection.reconnect();
    };
    document.addEventListener("visibilitychange", wake);
    document.addEventListener("resume", wake);
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      document.removeEventListener("resume", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
    };
  }, [connection]);
}
