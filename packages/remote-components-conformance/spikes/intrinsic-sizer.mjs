import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage();
const content = `<span style="font:16px sans-serif">Hello wonderful world of remote components</span>`;
const sizers = {
  canvas: (A, B) =>
    `<div style="min-width:${A}px;height:40px"><canvas style="display:block;width:${B}px;max-width:100%;height:0"></canvas></div>`,
  img: (A, B) =>
    `<div style="min-width:${A}px;height:40px"><img alt="" style="display:block;width:${B}px;max-width:100%;height:0"></div>`,
  iframe: (A, B) =>
    `<div style="min-width:${A}px;height:40px"><iframe style="display:block;width:${B}px;max-width:100%;height:0;border:0"></iframe></div>`,
};
const ctxs = {
  flexrow: (x) => `<div style="display:flex;width:800px">${x}</div>`,
  flexshrink: (x) =>
    `<div style="display:flex;width:120px">${x}<div style="width:50px;flex:none"></div></div>`,
  gridmin: (x) =>
    `<div style="display:grid;grid-template-columns:min-content 1fr;width:800px">${x}<div></div></div>`,
  gridmax: (x) =>
    `<div style="display:grid;grid-template-columns:max-content 1fr;width:800px">${x}<div></div></div>`,
  gridauto: (x) =>
    `<div style="display:grid;grid-template-columns:auto auto;width:200px">${x}<div style="width:150px"></div></div>`,
  fitcontent: (x) => `<div style="width:fit-content">${x}</div>`,
  float: (x) =>
    `<div style="width:800px"><div style="float:left">${x}</div></div>`,
  mincontent: (x) => `<div style="width:min-content">${x}</div>`,
  block: (x) => `<div style="width:300px">${x}</div>`,
};
await p.setContent(
  `<div id=m style="display:flow-root;position:absolute">${content}</div>`,
);
const [A, B] = await p.evaluate(() => {
  const m = document.getElementById("m");
  m.style.width = "min-content";
  const a = m.getBoundingClientRect().width;
  m.style.width = "max-content";
  const b = m.getBoundingClientRect().width;
  return [a, b];
});
console.log({ A, B });
for (const [sn, s] of Object.entries(sizers))
  for (const [cn, c] of Object.entries(ctxs)) {
    await p.setContent(
      `<body style="margin:0"><div id=r>${c(`<div class=ref style="display:flow-root">${content}</div>`)}</div><div id=e>${c(`<div class=emu>${s(A, B)}</div>`)}</div></body>`,
    );
    const res = await p.evaluate(() => [
      document.querySelector(".ref").getBoundingClientRect().width,
      document.querySelector(".emu").getBoundingClientRect().width,
    ]);
    console.log(
      sn.padEnd(7),
      cn.padEnd(11),
      res.map((x) => x.toFixed(2)).join(" vs "),
      Math.abs(res[0] - res[1]) < 0.5 ? "OK" : "FAIL",
    );
  }
await b.close();
