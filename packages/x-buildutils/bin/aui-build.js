#!/usr/bin/env node

import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url);
await jiti.import("../src/index.ts");
