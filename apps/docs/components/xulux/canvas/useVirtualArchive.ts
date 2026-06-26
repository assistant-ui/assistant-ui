"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createVirtualArchive,
  type VirtualArchive,
} from "@/lib/xulux/virtual-archive";

export type ArchiveState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; archive: VirtualArchive }
  | { status: "error"; error: string };

function resolveDownloadFetchUrl(
  downloadUrl: string,
  templateId: string | undefined,
  versionId: string | undefined,
): string {
  if (downloadUrl.startsWith("/")) return downloadUrl;

  if (!templateId) {
    throw new Error("Template id is required to download hosted archives.");
  }

  const parsed = new URL(downloadUrl);
  const params = new URLSearchParams({ templateId });
  if (versionId) params.set("versionId", versionId);
  if (parsed.search) params.set("downloadSearch", parsed.search);
  return `/api/xulux/download-proxy?${params.toString()}`;
}

export function useVirtualArchive(
  downloadUrl: string | undefined,
  templateId?: string,
  versionId?: string,
): ArchiveState {
  const [state, setState] = useState<ArchiveState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const cachedUrlRef = useRef<string | null>(null);
  const cachedArchiveRef = useRef<VirtualArchive | null>(null);

  const load = useCallback(
    async (url: string) => {
      if (cachedUrlRef.current === url && cachedArchiveRef.current) {
        setState({ status: "ready", archive: cachedArchiveRef.current });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: "loading" });
      try {
        const fetchUrl = resolveDownloadFetchUrl(url, templateId, versionId);
        const res = await fetch(fetchUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        const buffer = await res.arrayBuffer();
        const archive = createVirtualArchive(new Uint8Array(buffer));
        cachedUrlRef.current = url;
        cachedArchiveRef.current = archive;
        setState({ status: "ready", archive });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [templateId, versionId],
  );

  useEffect(() => {
    if (!downloadUrl) {
      setState({ status: "idle" });
      return;
    }
    load(downloadUrl);
    return () => abortRef.current?.abort();
  }, [downloadUrl, load]);

  return state;
}
