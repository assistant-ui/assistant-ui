#!/usr/bin/env node
import { main } from "../dist/index.js";

process.exitCode = await main(process.argv.slice(2));
