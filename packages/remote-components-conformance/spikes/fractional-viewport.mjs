import { chromium } from "playwright";
import http from "node:http";
const srv = http
  .createServer((q, r) => {
    r.setHeader("content-type", "text/html");
    if (q.url.startsWith("/host"))
      return r.end(
        '<body style="margin:0"><div style="padding-left:10.3px"><iframe id=f src="http://127.0.0.1:4791/" style="border:0;width:316.61px;height:50.4px;display:block"></iframe></div>',
      );
    r.end(
      `<html style="margin:0"><body style="margin:0"><div id=root style="display:flow-root">x</div></body></html>`,
    );
  })
  .listen(4791);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("http://localhost:4791/host");
await p.waitForTimeout(500);
const f = p.frames().find((x) => x.url().includes("127.0.0.1"));
console.log(
  "host iframe rect",
  await p.evaluate(() =>
    JSON.stringify(document.getElementById("f").getBoundingClientRect()),
  ),
);
console.log(
  "inner",
  await f.evaluate(() =>
    JSON.stringify({
      iw: innerWidth,
      ih: innerHeight,
      html: document.documentElement.getBoundingClientRect().width,
      root: document.getElementById("root").getBoundingClientRect().width,
      vv: visualViewport.width,
      dpr: devicePixelRatio,
    }),
  ),
);
await b.close();
srv.close();
