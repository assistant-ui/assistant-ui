import { describe, expect, it } from "vitest";
import { negotiateVersion } from "./messages.js";
import {
  isInitializeRequest,
  isInitializeResponse,
  validateFromHost,
  validateFromRemote,
} from "./validate.js";

const theme = {
  inherited: {},
  vars: {},
  fonts: [],
  lang: "",
  rootFontSize: "16px",
};
const init = {
  src: "http://r/x/",
  props: {},
  theme,
  layout: { width: 100, height: null, offsetX: 0, offsetY: 0 },
};
const initialize = (params: object, id = "s1234567") => ({
  jsonrpc: "2.0",
  id,
  method: "rc/initialize",
  params,
});

describe("handshake validation", () => {
  it("accepts well-formed messages", () => {
    expect(
      isInitializeRequest(
        initialize({
          nonce: "n",
          session: "s1234567",
          protocol: { min: 3, max: 3 },
          runtime: "0.3.0",
        }),
      ),
    ).toBe(true);
    expect(
      isInitializeRequest(
        initialize({
          nonce: "",
          session: "s1234567",
          protocol: { min: 3, max: 3 },
          runtime: "0.3.0",
        }),
      ),
    ).toBe(true);
    expect(
      isInitializeRequest(
        initialize({
          nonce: "n",
          session: "s",
          protocol: { min: 3, max: 3 },
          runtime: "0.3.0",
        }),
      ),
    ).toBe(false);
    expect(
      isInitializeResponse({
        jsonrpc: "2.0",
        id: "s1234567",
        result: { nonce: "n", protocol: 3, init },
      }),
    ).toBe(true);
    expect(
      isInitializeResponse({
        jsonrpc: "2.0",
        id: "s1234567",
        error: {
          code: -32600,
          message: "x",
          data: {
            name: "RemoteComponentError",
            message: "x",
            nonce: "n",
            supported: { min: 3, max: 3 },
          },
        },
      }),
    ).toBe(true);
  });

  it("rejects foreign and malformed messages", () => {
    expect(isInitializeRequest(null)).toBe(false);
    expect(isInitializeRequest("rc/initialize")).toBe(false);
    expect(isInitializeRequest({ method: "rc/initialize" })).toBe(false);
    expect(
      isInitializeRequest(
        initialize({
          nonce: 1,
          session: "s1234567",
          protocol: { min: 3, max: 3 },
          runtime: "x",
        }),
      ),
    ).toBe(false);
    expect(
      isInitializeRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "ui/initialize",
        params: {},
      }),
    ).toBe(false);
    expect(
      isInitializeResponse({
        jsonrpc: "2.0",
        id: "s1234567",
        result: {
          nonce: "n",
          protocol: 3,
          init: {
            ...init,
            layout: { width: -1, height: null, offsetX: 0, offsetY: 0 },
          },
        },
      }),
    ).toBe(false);
    expect(
      isInitializeResponse({
        jsonrpc: "2.0",
        id: "s1234567",
        error: { code: -32601, message: "Method not found" },
      }),
    ).toBe(false);
  });
});

describe("channel validation", () => {
  it("validates notifications by method", () => {
    const size = { width: 1, height: 2, minContent: 0, maxContent: 3 };
    expect(
      validateFromRemote({
        jsonrpc: "2.0",
        method: "rc/notifications/ready",
        params: { size },
      }),
    ).toBe(true);
    expect(
      validateFromRemote({
        jsonrpc: "2.0",
        method: "rc/notifications/ready",
        params: {},
      }),
    ).toBe(false);
    expect(
      validateFromRemote({
        method: "rc/notifications/ready",
        params: { size },
      }),
    ).toBe(false); // no jsonrpc
    expect(
      validateFromRemote({
        jsonrpc: "2.0",
        method: "rc/notifications/props-changed",
        params: { seq: 1, set: {}, del: [] },
      }),
    ).toBe(false); // host → remote only
    expect(
      validateFromHost({
        jsonrpc: "2.0",
        method: "rc/notifications/props-changed",
        params: { seq: 1, set: { a: { v: 1 } }, del: [] },
      }),
    ).toBe(true);
    expect(
      validateFromHost({
        jsonrpc: "2.0",
        method: "rc/notifications/props-changed",
        params: { seq: 1, set: { a: 1 }, del: [] },
      }),
    ).toBe(false);
    expect(validateFromHost({ jsonrpc: "2.0", method: "__proto__" })).toBe(
      false,
    );
  });

  it("validates request params for known methods and lets unknown ones through for an error reply", () => {
    const ref = { scope: "props", path: ["onX"] };
    expect(
      validateFromRemote({
        jsonrpc: "2.0",
        id: 1,
        method: "rc/call",
        params: { ref, args: { v: [] } },
      }),
    ).toBe(true);
    expect(
      validateFromRemote({
        jsonrpc: "2.0",
        id: 1,
        method: "rc/call",
        params: { ref: 1 },
      }),
    ).toBe(false);
    expect(
      validateFromRemote({
        jsonrpc: "2.0",
        id: 1.5,
        method: "rc/call",
        params: { ref, args: { v: [] } },
      }),
    ).toBe(false);
    expect(
      validateFromRemote({
        jsonrpc: "2.0",
        id: 1,
        method: "rc/future-thing",
        params: {},
      }),
    ).toBe(true);
    expect(
      validateFromRemote({
        jsonrpc: "2.0",
        id: 1,
        method: "rc/overlay/open",
        params: {
          id: "",
          kind: "popover",
          content: { src: "x", props: { v: 1 } },
        },
      }),
    ).toBe(false);
    expect(
      validateFromHost({
        jsonrpc: "2.0",
        id: 1,
        method: "rc/focus",
        params: { target: "first", focusVisible: true },
      }),
    ).toBe(true);
    expect(
      validateFromHost({
        jsonrpc: "2.0",
        id: 1,
        method: "rc/focus",
        params: { target: "middle" },
      }),
    ).toBe(false);
  });

  it("validates responses", () => {
    expect(validateFromHost({ jsonrpc: "2.0", id: 1, result: undefined })).toBe(
      true,
    );
    expect(validateFromHost({ jsonrpc: "2.0", id: 1 })).toBe(false);
    expect(
      validateFromHost({
        jsonrpc: "2.0",
        id: 1,
        error: {
          code: -32000,
          message: "m",
          data: { name: "E", message: "m" },
        },
      }),
    ).toBe(true);
    expect(validateFromHost({ jsonrpc: "2.0", id: 1, error: "m" })).toBe(false);
    expect(
      validateFromHost({
        jsonrpc: "2.0",
        id: 1,
        result: 1,
        error: {
          code: -32000,
          message: "m",
          data: { name: "E", message: "m" },
        },
      }),
    ).toBe(false);
  });
});

describe("negotiateVersion", () => {
  it("picks the highest common version", () => {
    expect(negotiateVersion({ min: 1, max: 3 }, { min: 2, max: 5 })).toBe(3);
    expect(negotiateVersion({ min: 1, max: 1 }, { min: 1, max: 1 })).toBe(1);
    expect(negotiateVersion({ min: 1, max: 1 }, { min: 2, max: 2 })).toBeNull();
  });
});
