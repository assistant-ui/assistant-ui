#!/usr/bin/env node
import { main } from "./run";

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

void main();
