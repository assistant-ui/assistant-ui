import * as vscode from "vscode";
import type { OpenedUrl, OpenExternalState } from "./protocol";

const MAX_OPENED = 100;

/**
 * The host's `openExternal`. It records every URL, and while `stub` is on
 * (`AUI_TESTBED_STUB_OPEN_EXTERNAL=1`, or the external-link probe) it does not
 * open a browser.
 */
export class ExternalOpener {
  stub = process.env.AUI_TESTBED_STUB_OPEN_EXTERNAL === "1";
  private readonly opened: OpenedUrl[] = [];
  private seq = 0;

  readonly open = async (url: string) => {
    this.opened.push({ seq: ++this.seq, url, stubbed: this.stub });
    if (this.opened.length > MAX_OPENED) this.opened.shift();
    if (this.stub) return true;
    // VS Code opens a string as is but re-encodes a Uri, which corrupts escaped characters.
    return vscode.env.openExternal(url as unknown as vscode.Uri);
  };

  state(): OpenExternalState {
    return { stub: this.stub, opened: [...this.opened] };
  }
}
