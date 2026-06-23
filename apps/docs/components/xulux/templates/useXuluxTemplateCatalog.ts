"use client";

import { useEffect, useState } from "react";
import type { XuluxTemplateCatalog } from "./types";

export function useXuluxTemplateCatalog(): XuluxTemplateCatalog & {
  isLoading: boolean;
  error: string | null;
} {
  const [catalog, setCatalog] = useState<XuluxTemplateCatalog>({
    categories: [],
    templates: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setIsLoading(true);
      setError(null);
      try {
        const templatesResponse = await fetch("/api/xulux/templates");
        if (!templatesResponse.ok) {
          throw new Error(
            `Templates API failed with ${templatesResponse.status}`,
          );
        }

        const templatesCatalog =
          (await templatesResponse.json()) as XuluxTemplateCatalog;

        if (!cancelled) {
          setCatalog(templatesCatalog);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ...catalog,
    isLoading,
    error,
  };
}
