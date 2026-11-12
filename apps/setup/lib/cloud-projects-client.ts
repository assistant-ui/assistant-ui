"use client";

import { useEffect, useState } from "react";
import { DOCS_URL } from "@/lib/config";

export type CloudProject = {
  id: string;
  name: string;
  /** The organization the project belongs to, as accounts names it. */
  organization: string;
  /** The project's Frontend API URL, the origin an app points its runtime at. */
  frontendUrl: string;
};

/** What the docs site's /api/cloud/projects answers. */
export type CloudProjectsPayload = { projects: CloudProject[] };

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
    fetch(`${DOCS_URL}/api/cloud/projects`, {
      cache: "no-store",
      credentials: "include",
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
