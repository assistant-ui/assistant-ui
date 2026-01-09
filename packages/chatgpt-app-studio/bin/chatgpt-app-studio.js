#!/usr/bin/env node
import("../dist/index.js").catch((err) => {
  console.error(err);
  process.exit(1);
});
