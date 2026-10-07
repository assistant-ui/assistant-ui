"use client";

import { useEffect, useState } from "react";
import type { CloudProjectsPayload } from "@/app/api/cloud/projects/route";
import type { CloudProject } from "@/lib/cloud-projects";

export type CloudProjectsState =
  | { status: "loading" }
  | { status: "ready"; projects: CloudProject[] }
  /** The listing failed or the deployment has none; the visitor types the URL instead. */
  | { status: "unavailable" };

const unavailable: CloudProjectsState = { status: "unavailable" };

/** The signed-in visitor's Assistant Cloud projects; `enabled` false asks for nothing and reports unavailable. */
export function useCloudProjects(enabled: boolean): CloudProjectsState {
  const [state, setState] = useState<CloudProjectsState>({
    status: "loading",
  });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/cloud/projects", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) =>
        response.ok ? (response.json() as Promise<CloudProjectsPayload>) : null,
      )
      .then((payload) =>
        setState(
          payload
            ? { status: "ready", projects: payload.projects }
            : unavailable,
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setState(unavailable);
      });
    return () => controller.abort();
  }, [enabled]);
  return enabled ? state : unavailable;
}
