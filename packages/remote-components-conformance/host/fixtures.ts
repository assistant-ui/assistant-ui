/**
 * HTML documents the conformance host renders with the `html` prop. Same
 * content as fixtures/*.html (served by URL), as strings so the case list
 * also loads in Node (Playwright imports cases.tsx).
 */
export const netPage =
  '<!doctype html>\n<html><head><meta charset="utf-8"><title>net</title></head>\n<body>\n<button data-probe="loopback" onclick="go(\'loopback\', \'http://127.0.0.1:5181/__raw/pages/ua-defaults.html\')">loopback</button>\n<pre data-probe="out">{}</pre>\n<script>\n  const out = {};\n  function go(k, u) {\n    fetch(u).then((r) => { out[k] = "ok:" + r.status; show(); }, (e) => { out[k] = "error:" + e.name; show(); });\n  }\n  function show() { document.querySelector("[data-probe=out]").textContent = JSON.stringify(out); }\n</script>\n</body></html>\n';

export const widgetPage =
  '<style>.w{padding:12px;border:1px solid var(--color-border,#ccc);border-radius:8px}</style>\n<div class="w" data-probe="widget">\n  <b>Hello <span data-probe="name">nobody</span></b>\n  <p style="margin:6px 0 0">An HTML document from the host, shown through srcdoc.</p>\n  <button data-probe="pick" onclick="rc.props.onPick(\'blue\')">Pick blue</button>\n  <button data-probe="open" onclick="openMenu(this)">Menu</button>\n  <span data-probe="picked"></span>\n</div>\n<script>\n  const showName = () => (document.querySelector("[data-probe=name]").textContent = rc.props.name ?? "nobody");\n  showName();\n  rc.addEventListener("props-changed", showName);\n  function openMenu(anchor) {\n    rc.overlay({\n      kind: "popover",\n      anchor,\n      html: \'<ul style="margin:0;padding:6px;list-style:none;background:#fff;border:1px solid #888"><li><button data-probe="item" onclick="rc.props.onItem(\\\'one\\\')">One</button></li></ul>\',\n      props: { onItem: (v) => { document.querySelector("[data-probe=picked]").textContent = v; } },\n    });\n  }\n</script>\n';
