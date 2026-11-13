const url = process.argv[2];
const orig = console.error;
console.error = (...a) => { for (const x of a) if (x && x.componentStack) orig("STACK", x.componentStack.split("\n").slice(0, 25).join("\n")); orig(...a.map(x => x instanceof Error ? x.message : x)); };
const mod = await import(new URL("../apps/docs-tanstack/dist/server/server.js", import.meta.url));
const h = mod.default;
const res = await h.fetch(new Request("http://localhost" + url));
const t = await res.text();
console.log(res.status, t.length, /nd-page|<article/.test(t));
