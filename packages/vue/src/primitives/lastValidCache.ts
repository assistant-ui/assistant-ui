import { nextTick } from "vue";
import {
  createLastValidCache as createNeutralLastValidCache,
  createStaleReporter,
} from "@assistant-ui/store/client";

const scheduleExpiry = (callback: () => void) => void nextTick(callback);

export const createLastValidCache = <T>(reportStale: (() => void) | null) =>
  createNeutralLastValidCache<T>(reportStale, scheduleExpiry);

export { createStaleReporter };
