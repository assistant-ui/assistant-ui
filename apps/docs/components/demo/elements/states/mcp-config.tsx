"use client";

import { defineStates } from "./types";

// The dialog owns its open state and offers no prop to open it, so every
// server state (connecting, needs auth, error, empty) sits behind a click.
export const states = defineStates([{ key: "default", label: "Default" }]);
