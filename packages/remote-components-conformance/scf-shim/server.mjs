// HTTPS server for the test SCF shim on *.rc.localhost:443 (Chromium resolves
// *.localhost to loopback). Generates a throwaway self-signed certificate.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";

const dir = mkdtempSync(path.join(os.tmpdir(), "rc-shim-"));
execFileSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-days",
    "2",
    "-keyout",
    path.join(dir, "key.pem"),
    "-out",
    path.join(dir, "cert.pem"),
    "-subj",
    "/CN=rc.localhost",
    "-addext",
    "subjectAltName=DNS:rc.localhost,DNS:*.rc.localhost",
  ],
  { stdio: "ignore" },
);
const shim = readFileSync(new URL("./shim.html", import.meta.url));
const port = Number(process.env.SHIM_PORT ?? 443);
https
  .createServer(
    {
      key: readFileSync(path.join(dir, "key.pem")),
      cert: readFileSync(path.join(dir, "cert.pem")),
    },
    (req, res) => {
      const url = new URL(req.url ?? "/", "https://x");
      if (url.pathname === "/health") return res.end("ok");
      if (/^\/[^/]+\/shim\.html$/.test(url.pathname)) {
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        });
        return res.end(shim);
      }
      res.writeHead(404).end();
    },
  )
  .listen(port, "127.0.0.1", () => console.log(`shim on ${port}`));
