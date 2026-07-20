"use client";

import { useResource } from "@assistant-ui/tap";
import {
  HarnessResource,
  type HarnessApi,
  type HarnessOptions,
} from "../HarnessResource";

export function useHarness<TExtras = unknown>(
  options: HarnessOptions,
): HarnessApi<TExtras> {
  return useResource(HarnessResource(options)) as HarnessApi<TExtras>;
}
