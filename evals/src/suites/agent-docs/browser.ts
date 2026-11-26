import { setTimeout as sleep } from "node:timers/promises";
import { openChromePage, type ChromePage } from "../generative-ui/chrome.ts";

/** A check step failed: `step` names what the app didn't do. */
export class CheckFailure extends Error {
  step: string;
  constructor(step: string, detail: string) {
    super(`${step}: ${detail}`);
    this.step = step;
  }
}

/**
 * Page-side helpers. Checks drive whatever UI the agent built, so they find
 * controls the way a person would: the chat input, a button by its label,
 * text on the screen. Nothing depends on assistant-ui's own class names.
 */
const HELPERS = String.raw`
const arg = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
const visible = (el) => {
  const r = el.getBoundingClientRect();
  const s = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
};
const labelOf = (el) => [
  el.getAttribute("aria-label"), el.getAttribute("placeholder"), el.getAttribute("name"),
  el.getAttribute("title"), el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')?.innerText,
  el.closest("label")?.innerText,
].filter(Boolean).join(" ");
const fields = () => [...document.querySelectorAll('textarea, [contenteditable="true"], input:not([type]), input[type="text"], input[type="search"]')].filter(visible);
const composer = () => {
  const all = fields();
  const chat = all.filter((el) => /message|ask|send|type|write|chat|prompt|anything/i.test(labelOf(el)) && !/name/i.test(labelOf(el)));
  return chat.find((el) => el.tagName === "TEXTAREA") ?? chat[0] ?? all.find((el) => el.tagName === "TEXTAREA") ?? all.at(-1);
};
const setValue = (el, value) => {
  el.focus();
  if (el.isContentEditable) {
    document.execCommand("selectAll");
    document.execCommand("insertText", false, value);
    return;
  }
  const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
};
const clickable = 'button, a, [role="button"], [role="option"], [role="menuitem"], [role="menuitemradio"], [role="tab"], [role="link"], li, summary, label';
const ownText = (el) => (el.innerText ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
const findByText = (pattern) => {
  const re = new RegExp(pattern, "i");
  const hits = [...document.querySelectorAll("body *")].filter((el) => visible(el) && (re.test(ownText(el)) || re.test(el.getAttribute("aria-label") ?? "")));
  const leaves = hits.filter((el) => !hits.some((other) => other !== el && el.contains(other)));
  return leaves.map((el) => el.closest(clickable) ?? el);
};
const click = (el) => {
  el.scrollIntoView({ block: "center" });
  for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
    el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: "mouse", button: 0 }));
  }
  el.click();
};
`;

/** A string for the page-side code, base64-encoded so it can never break out of the literal it sits in. */
const lit = (value: string | number) =>
  `arg("${Buffer.from(String(value), "utf8").toString("base64")}")`;

export interface Driver {
  url: string;
  bodyText(): Promise<string>;
  waitForText(text: string, ms?: number): Promise<void>;
  /** Waits until `text` is no longer on the page. */
  waitForNoText(text: string, step: string, ms?: number): Promise<void>;
  /** Types `text` into the chat input and sends it with the send button, or Enter when there is none. */
  send(text: string): Promise<void>;
  /** Clicks the innermost visible element whose text or aria-label matches `pattern` (a regex source); `nth` picks among matches. */
  clickText(pattern: string, step: string, nth?: number): Promise<void>;
  /** Fills the visible text field whose label, placeholder, aria-label or name matches `pattern`. */
  fill(pattern: string, value: string, step: string): Promise<void>;
  /** Picks `option` in a native select or a custom dropdown whose trigger shows `current`. */
  choose(current: string, option: string, step: string): Promise<void>;
  /** Puts a small PNG on the page's file input, as a person picking a file would. */
  attachImage(step: string): Promise<void>;
  /** How many images are visible on the page. */
  imageCount(): Promise<number>;
  reload(): Promise<void>;
  close(): Promise<void>;
}

export async function openDriver(url: string): Promise<Driver> {
  const page: ChromePage = await openChromePage(url, 1280);
  // Let the app hydrate before anything is typed.
  await sleep(2_000);
  const run = <T>(body: string, ms = 15_000) =>
    page.evaluate<T>(`(async () => { ${HELPERS}\n${body} })()`, ms);

  const waitUntil = async (
    body: string,
    ms: number,
    step: string,
    detail: string,
  ) => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      try {
        if (await run<boolean>(body)) return;
      } catch {
        // The page may be navigating; try again.
      }
      await sleep(250);
    }
    throw new CheckFailure(step, detail);
  };

  const driver: Driver = {
    url,
    bodyText: () => run<string>("return document.body.innerText;"),
    async waitForText(text, ms = 20_000) {
      await waitUntil(
        `return document.body.innerText.includes(${lit(text)});`,
        ms,
        `shows "${text}"`,
        `"${text}" never appeared on the page`,
      );
    },
    async waitForNoText(text, step, ms = 10_000) {
      await waitUntil(
        `return !document.body.innerText.includes(${lit(text)});`,
        ms,
        step,
        `"${text}" stayed on the page`,
      );
    },
    async send(text) {
      await waitUntil(
        "return !!composer();",
        20_000,
        "has a chat input",
        "no text field found on the page",
      );
      const attempt = async () => {
        await run(
          `const c = composer(); setValue(c, ${lit(text)}); return true;`,
        );
        await sleep(300);
        await run<string>(`
          const c = composer();
          const scope = c.closest("form") ?? c.parentElement?.parentElement?.parentElement ?? document;
          const buttons = [...scope.querySelectorAll('button, [role="button"]')].filter((b) => visible(b) && !b.disabled && b.getAttribute("aria-disabled") !== "true");
          const send = buttons.find((b) => /send|submit/i.test(labelOf(b) + " " + ownText(b))) ?? buttons.find((b) => b.getAttribute("type") === "submit");
          if (send) { click(send); return "button"; }
          const form = c.closest("form");
          if (form) { form.requestSubmit(); return "form"; }
          c.focus();
          for (const type of ["keydown", "keypress", "keyup"]) {
            c.dispatchEvent(new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
          }
          return "enter";`);
      };
      // The sent message shows up in the thread. If it hasn't and the text is still in the input,
      // the page wasn't ready to send yet, so try once more; never resend a message that left the input.
      const shown = `return document.body.innerText.includes(${lit(text)});`;
      await attempt();
      try {
        await waitUntil(shown, 5_000, "sends", "");
      } catch {
        const unsent = await run<boolean>(
          `const c = composer(); return !!c && (c.value ?? c.textContent ?? "").includes(${lit(text)});`,
        );
        if (unsent) await attempt();
      }
      await sleep(300);
    },
    async clickText(pattern, step, nth = 0) {
      await waitUntil(
        `return findByText(${lit(pattern)}).length > Number(${lit(nth)});`,
        20_000,
        step,
        `nothing matching /${pattern}/i to click`,
      );
      await run(
        `click(findByText(${lit(pattern)})[Number(${lit(nth)})]); return true;`,
      );
      await sleep(300);
    },
    async fill(pattern, value, step) {
      const found = `fields().find((el) => new RegExp(${lit(pattern)}, "i").test(labelOf(el)))`;
      await waitUntil(
        `return !!${found};`,
        20_000,
        step,
        `no text field labelled /${pattern}/i`,
      );
      await run(`setValue(${found}, ${lit(value)}); return true;`);
      await sleep(300);
    },
    async choose(current, option, step) {
      const native = await run<boolean>(`
        const select = [...document.querySelectorAll("select")].find((s) => visible(s) && (s.selectedOptions[0]?.text.includes(${lit(current)}) || s.value === ${lit(current)}) && [...s.options].some((o) => o.text.includes(${lit(option)}) || o.value === ${lit(option)}));
        if (!select) return false;
        const opt = [...select.options].find((o) => o.text.includes(${lit(option)}) || o.value === ${lit(option)});
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, opt.value);
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;`);
      if (native) return void (await sleep(300));
      await driver.clickText(current, step);
      await sleep(500);
      const pattern = option.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // The open list may repeat the current value; pick the last match, which is usually the popup.
      await waitUntil(
        `return findByText(${lit(pattern)}).length > 0;`,
        10_000,
        step,
        `no "${option}" choice after opening the picker`,
      );
      await run(
        `const hits = findByText(${lit(pattern)}); click(hits.at(-1)); return true;`,
      );
      await sleep(500);
    },
    async attachImage(step) {
      // Pickers often create their file input only when the attach button is clicked, so catch that input too.
      await run(`
        window.__picked = document.querySelector('input[type="file"]');
        if (!window.__picked) {
          const original = HTMLInputElement.prototype.click;
          HTMLInputElement.prototype.click = function () {
            if (this.type === "file") { window.__picked = this; return; }
            return original.call(this);
          };
          HTMLInputElement.prototype.showPicker = function () {
            if (this.type === "file") window.__picked = this;
          };
          const attach = [...document.querySelectorAll('button, [role="button"], label')]
            .filter(visible)
            .find((b) => /attach|upload|add (a )?file|add image|add photo|paperclip/i.test(labelOf(b) + " " + ownText(b)));
          if (attach) click(attach);
        }
        return true;`);
      await waitUntil(
        "return !!window.__picked;",
        5_000,
        step,
        "no file input on the page and no attach button that opens one",
      );
      // A 1x1 red PNG.
      await run(`
        const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
        const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
        const file = new File([bytes], "red-dot.png", { type: "image/png" });
        const input = window.__picked;
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        return true;`);
      await sleep(1_000);
    },
    imageCount: () =>
      run<number>(
        'return [...document.querySelectorAll("img")].filter(visible).length;',
      ),
    async reload() {
      // Same page and profile, so browser storage survives as it would for a person.
      await page.evaluate(
        "setTimeout(() => location.reload(), 50); true",
        5_000,
      );
      await sleep(2_000);
      await waitUntil(
        `return document.readyState === "complete";`,
        30_000,
        "reloads",
        "the page did not finish loading after a reload",
      );
      await sleep(1_500);
    },
    close: () => page.close(),
  };
  return driver;
}
