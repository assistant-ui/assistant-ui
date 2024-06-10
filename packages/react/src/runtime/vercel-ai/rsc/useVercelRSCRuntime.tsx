"use client";

import { useEffect, useInsertionEffect, useState } from "react";
import type { VercelRSCAdapter } from "./VercelRSCAdapter";
import { VercelRSCRuntime } from "./VercelRSCRuntime";

export const useVercelRSCRuntime = <T extends WeakKey>(
  adapter: VercelRSCAdapter<T>,
) => {
  const [runtime] = useState(() => new VercelRSCRuntime(adapter));

  useInsertionEffect(() => {
    runtime.adapter = adapter;
  });
  useEffect(() => {
    runtime.onAdapterUpdated();
  });

  return runtime;
};
