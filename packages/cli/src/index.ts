#!/usr/bin/env node

import { handleCliError } from "./lib/handle-cli-error";
import { runCli } from "./run";

void runCli().catch(handleCliError);
