import { useEffect } from "react";
import type { useStatewire } from "statewire";

export type WakeConnection = ReturnType<typeof useStatewire>["connection"];

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
