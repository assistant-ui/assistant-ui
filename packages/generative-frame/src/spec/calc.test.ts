// @vitest-environment node
import { describe, expect, it } from "vitest";
import { evaluateFormula, formulaIssue } from "./calc";

const ctx = {
  state: {
    count: 3,
    name: "Ada",
    tags: ["x", "y"],
    otherTags: ["x", "y"],
    object: { a: 1 },
    values: [2, "3", null, 4, false, NaN, Infinity],
    rows: [
      { price: 2, nested: { price: 3 }, "a/b": 4 },
      { price: "bad" },
      { price: 4, nested: { price: 5 }, "a/b": 6 },
      {},
      null,
      { price: Infinity },
    ],
    empty: [],
    nonNumeric: [null, "1", false, {}, NaN, Infinity],
    nan: NaN,
    infinity: Infinity,
    huge: Number.MAX_VALUE,
    "a/b": { "~key": 9 },
  },
  item: { price: 7 },
  index: 2,
  event: { value: 8 },
};

describe("evaluateFormula", () => {
  it.each([
    ["12", 12],
    ["0.5", 0.5],
    ["true", true],
    ["false", false],
    ["null", null],
    ["'hello'", "hello"],
    ['"hello"', "hello"],
    [String.raw`'it\'s \\ ok'`, "it's \\ ok"],
    [String.raw`"say \"hi\""`, 'say "hi"'],
    [" \t1 +\n 2 ", 3],
    ["1 + 2 * 3", 7],
    ["(1 + 2) * 3", 9],
    ["10 - 4 - 3", 3],
    ["2 * 3 % 4", 2],
    ["12 / 3 / 2", 2],
    ["7 / 2", 3.5],
    ["-7 % 4", -3],
    ["-2 * -3", 6],
    ["--2", 2],
    ["-(1 + 2)", -3],
    ["!true", false],
    ["!null", true],
    ["!!2", true],
    ["!''", true],
    ["1 < 2 == true", true],
    ["1 + 2 < 4", true],
    ["true || false && false", true],
    ["false && 1 == 2", false],
    ["false || true ? 2 : 3", 2],
    ["true ? false ? 1 : 2 : 3", 2],
    ["false ? 1 : true ? 2 : 3", 2],
    ["true ? 0 : true ? 2 : 3", 0],
    ["(true ? 0 : true) ? 2 : 3", 3],
    ["0 ? 1 : 2", 2],
    ["'x' ? 1 : 2", 1],
    ["false && ${/missing}", false],
    ["true || 1 / 0", true],
    ["2 && 3", true],
    ["0 || 'x'", true],
    ["0 || ''", false],
    ["null && 1", false],
    ["'total: ' + 3", "total: 3"],
    ["3 + ' items'", "3 items"],
    ["'value' + null", "value"],
    ["null + 'value'", "value"],
    ["'value' + ${/missing}", "value"],
    ["'value: ' + true", "value: true"],
    ["'tags: ' + ${/tags}", 'tags: ["x","y"]'],
    ["${/object} + '!'", '{"a":1}!'],
    ["1 + 2 + '3'", "33"],
    ["'1' + 2 + 3", "123"],
  ])("evaluates %s", (formula, expected) => {
    expect(evaluateFormula(formula as string, ctx)).toEqual(expected);
  });

  it.each([
    ["1 < 2", true],
    ["2 <= 2", true],
    ["3 > 2", true],
    ["3 >= 3", true],
    ["2 < 1", false],
    ["3 <= 2", false],
    ["2 > 3", false],
    ["2 >= 3", false],
    ["'a' < 'b'", true],
    ["'a' <= 'a'", true],
    ["'b' > 'a'", true],
    ["'b' >= 'b'", true],
    ["1 < '2'", false],
    ["'1' <= 2", false],
    ["3 > '2'", false],
    ["'3' >= 2", false],
    ["true > false", false],
    ["null <= 0", false],
    ["${/tags} >= ${/tags}", false],
    ["1 == 1", true],
    ["1 == '1'", false],
    ["1 != '1'", true],
    ["1 != 1", false],
    ["null == ${/missing}", true],
    ["${/tags} == ${/otherTags}", true],
    ["${/tags} != ${/otherTags}", false],
    ["${/tags} == ${/empty}", false],
    ["true == true == true", true],
    ["1 < 2 < 3", false],
  ])("compares %s", (formula, expected) => {
    expect(evaluateFormula(formula as string, ctx)).toBe(expected);
  });

  it.each([
    ["${/count}", 3],
    ["${count}", 3],
    ["${ /count }", 3],
    ["${/a~1b/~0key}", 9],
    ["${/tags/1}", "y"],
    ["${$item}", { price: 7 }],
    ["${$item/price}", 7],
    ["${$index}", 2],
    ["${$event}", { value: 8 }],
    ["${$event/value}", 8],
    ["${/missing}", null],
    ["${/missing/deep}", null],
    ["${/constructor}", null],
    ["${/__proto__}", null],
    ["${/tags/constructor}", null],
    ["${/tags/99}", null],
    ["${$item/missing}", null],
    ["${$event/missing}", null],
  ])("reads %s", (formula, expected) => {
    expect(evaluateFormula(formula as string, ctx)).toEqual(expected);
  });

  it("reads root values and absent repeat and event contexts", () => {
    expect(evaluateFormula("${}", { state: 3 })).toBe(3);
    expect(evaluateFormula("${$item}", { state: {}, item: "x" })).toBe("x");
    expect(evaluateFormula("${$event}", { state: {}, event: 4 })).toBe(4);
    expect(evaluateFormula("${$index}", { state: {}, index: 0 })).toBe(0);
    for (const formula of [
      "${$item}",
      "${$item/x}",
      "${$index}",
      "${$event}",
      "${$event/x}",
    ]) {
      expect(evaluateFormula(formula, { state: {} })).toBeNull();
    }
    expect(
      evaluateFormula("${/hidden}", { state: Object.create({ hidden: 1 }) }),
    ).toBeNull();
  });

  it("reads only own array slots", () => {
    const list = new Array<number>(1);
    Object.setPrototypeOf(list, { 0: 7 });
    expect(evaluateFormula("${/list/0}", { state: { list } })).toBeNull();
  });

  it("compares only own array slots, like a pointer read", () => {
    const sparse: number[] = [];
    sparse[0] = 1;
    sparse[2] = 3;
    Object.setPrototypeOf(
      sparse,
      Object.assign(Object.create(Array.prototype), { 1: 2 }),
    );
    expect(
      evaluateFormula("${/a} == ${/b}", { state: { a: sparse, b: [1, 2, 3] } }),
    ).toBe(false);
  });

  it.each([
    "1 / 0",
    "0 / 0",
    "1 % 0",
    "1 / -0",
    "${/nan}",
    "${/infinity}",
    "${/huge} * 2",
    "'3' - 1",
    "'3' * 2",
    "'3' / 2",
    "'3' % 2",
    "-'3'",
    "1 + true",
    "1 + null",
    "1 + ${/object}",
    "${/missing} * 2",
    "1 + ${/nan}",
    "null - 1",
    "-null",
    "true * 2",
    "9".repeat(400),
  ])("returns null for invalid arithmetic %s", (formula) => {
    expect(evaluateFormula(formula, ctx)).toBeNull();
  });

  it("never evaluates skipped branches", () => {
    const context = {
      state: {
        get fail() {
          throw new Error("visited");
        },
      },
    };
    for (const [formula, expected] of [
      ["false && ${/fail}", false],
      ["true || ${/fail}", true],
      ["true ? 7 : ${/fail}", 7],
      ["false ? ${/fail} : 8", 8],
    ] as const) {
      expect(evaluateFormula(formula, context)).toBe(expected);
    }
    expect(evaluateFormula("${/fail}", context)).toBeNull();
  });
});

describe("formula functions", () => {
  it.each([
    ["round(1.6)", 2],
    ["round(1.234, 2)", 1.23],
    ["round(1.236, 2.9)", 1.24],
    ["round(1.6, -2)", 2],
    ["round(1.25, 30)", 1.25],
    ["round(-1.6)", -2],
    ["floor(1.9)", 1],
    ["floor(-1.1)", -2],
    ["ceil(1.1)", 2],
    ["ceil(-1.9)", -1],
    ["abs(-3)", 3],
    ["abs(3)", 3],
    ["clamp(5, 1, 4)", 4],
    ["clamp(-1, 1, 4)", 1],
    ["clamp(3, 1, 4)", 3],
    ["min(3, 1, 2)", 1],
    ["max(3, 1, 2)", 3],
    ["min(3)", 3],
    ["max(-3, -2)", -2],
    ["max(1, min(2, 3))", 2],
    ["count(${/values})", 7],
    ["count(${/empty})", 0],
    ["sum(${/values})", 6],
    ["avg(${/values})", 3],
    ["min(${/values})", 2],
    ["max(${/values})", 4],
    ["sum(${/rows}, '/price')", 6],
    ["avg(${/rows}, '/price')", 3],
    ["min(${/rows}, '/price')", 2],
    ["max(${/rows}, '/price')", 4],
    ["sum(${/rows}, '/nested/price')", 8],
    ["sum(${/rows}, '/a~1b')", 10],
    ["sum(${/rows}, 'price')", 6],
    ["sum(${/values}, '')", 6],
    ["sum(${/rows}, '/constructor')", 0],
    ["sum(${/empty})", 0],
    ["avg(${/empty})", null],
    ["min(${/empty})", null],
    ["max(${/empty})", null],
    ["sum(${/nonNumeric})", 0],
    ["avg(${/nonNumeric})", null],
    ["min(${/nonNumeric})", null],
    ["max(${/nonNumeric})", null],
    ["number(1234.5678)", "1,234.568"],
    ["number(1234.5, 2)", "1,234.50"],
    ["number(1.256, 2.9)", "1.26"],
    ["number(1.6, -2)", "2"],
    ["number(1.25, 21)", "1.25000000000000000000"],
    ["currency(1234.5, 'USD')", "$1,234.50"],
    ["currency(12.5, 'JPY')", "¥13"],
    ["percent(0.15)", "15%"],
    ["percent(0.1555, 2)", "15.55%"],
    ["percent(0.15, 2.9)", "15.00%"],
    ["percent(0.156, -1)", "16%"],
    ["percent(0.15, 30)", "15.00000000000000000000%"],
    ["time(360)", "6:00 AM"],
    ["time(0)", "12:00 AM"],
    ["time(720)", "12:00 PM"],
    ["time(1500)", "1:00 AM"],
    ["time(2880)", "12:00 AM"],
    ["time(-60)", "11:00 PM"],
    ["time(-1)", "11:59 PM"],
    ["time(59.6)", "1:00 AM"],
    ["time(1439.6)", "12:00 AM"],
    ["plural(1, 'item', 'items')", "item"],
    ["plural(0, 'item', 'items')", "items"],
    ["plural(2, 'item', 'items')", "items"],
    ["plural('1', 'item', 'items')", "items"],
    ["plural(1, 4, null)", 4],
  ])("evaluates %s", (formula, expected) => {
    expect(evaluateFormula(formula as string, ctx)).toEqual(expected);
  });

  it.each([
    "round('1')",
    "round(1, '2')",
    "round(1, ${/nan})",
    "floor(null)",
    "ceil('1')",
    "abs(true)",
    "clamp(1, null, 2)",
    "min(1, '2')",
    "max(1, null)",
    "min(${/values}, '/x', 1)",
    "count(1)",
    "count('abc')",
    "sum(1)",
    "avg(null)",
    "sum(${/values}, 1)",
    "avg(${/values}, null)",
    "min(${/values}, 1)",
    "max(${/values}, false)",
    "number('1')",
    "number(1, null)",
    "number(${/infinity})",
    "number(1, ${/nan})",
    "currency(1, 'invalid')",
    "currency(1, 'US')",
    "currency(1, 2)",
    "currency(null, 'USD')",
    "percent('1')",
    "percent(1, '2')",
    "time(null)",
    "time(${/infinity})",
  ])("rejects invalid function inputs %s", (formula) => {
    expect(evaluateFormula(formula, ctx)).toBeNull();
  });

  it("normalizes non-finite function results", () => {
    const context = { state: { values: [Number.MAX_VALUE, Number.MAX_VALUE] } };
    expect(evaluateFormula("sum(${/values})", context)).toBeNull();
    expect(evaluateFormula("avg(${/values})", context)).toBeNull();
    expect(evaluateFormula("round(${/values/0}, 20)", context)).toBeNull();
    expect(evaluateFormula("min(${/values})", context)).toBe(Number.MAX_VALUE);
  });

  it("uses null from invalid currencies in enclosing expressions", () => {
    expect(evaluateFormula("currency(1, 'invalid') == null", ctx)).toBe(true);
    expect(evaluateFormula("'price: ' + currency(1, 'US')", ctx)).toBe(
      "price: ",
    );
    expect(evaluateFormula("currency(1, 'invalid') ? 1 : 2", ctx)).toBe(2);
  });

  it("reuses format options without caching values", () => {
    expect(evaluateFormula("number(1, 2)", ctx)).toBe("1.00");
    expect(evaluateFormula("number(2, 0)", ctx)).toBe("2");
    expect(evaluateFormula("number(3, 2)", ctx)).toBe("3.00");
  });
});

describe("formula bounds and parsing", () => {
  it("accepts 500 characters and rejects 501", () => {
    const formula = "1".padEnd(500);
    expect(formulaIssue(formula)).toBeUndefined();
    expect(evaluateFormula(formula, ctx)).toBe(1);
    expect(formulaIssue(`${formula} `)).toMatch(/500|length|characters/i);
    expect(evaluateFormula(`${formula} `, ctx)).toBeNull();
  });

  it.each([
    (n: number) => "(".repeat(n) + "1" + ")".repeat(n),
    (n: number) => "!".repeat(n) + "1",
    (n: number) => "abs(".repeat(n) + "1" + ")".repeat(n),
    (n: number) => "true ? 1 : ".repeat(n) + "1",
    (n: number) => "true ? ".repeat(n) + "1" + " : 0".repeat(n),
  ])("counts nesting for each recursive construct (%#)", (formula) => {
    expect(formulaIssue(formula(32))).toBeUndefined();
    expect(evaluateFormula(formula(32), ctx)).not.toBeNull();
    expect(formulaIssue(formula(33))).toMatch(/32|depth|nesting/i);
    expect(evaluateFormula(formula(33), ctx)).toBeNull();
  });

  it("combines nesting across parentheses, calls, unary operators, and ternaries", () => {
    let formula = "1";
    for (let n = 0; n < 8; n++) formula = `-abs(true ? (${formula}) : 0)`;
    expect(formulaIssue(formula)).toBeUndefined();
    expect(formulaIssue(`(${formula})`)).toMatch(/nesting/i);
  });

  it("counts evaluated nodes and list items against one budget per call", () => {
    const context = { state: { list: Array.from({ length: 9998 }, () => 1) } };
    expect(evaluateFormula("sum(${/list})", context)).toBe(9998);
    context.state.list.push(1);
    expect(evaluateFormula("sum(${/list})", context)).toBeNull();
    expect(evaluateFormula("sum(${/list}) == null", context)).toBeNull();
    context.state.list.pop();
    expect(evaluateFormula("sum(${/list})", context)).toBe(9998);
    const shared = {
      state: {
        a: Array.from({ length: 5000 }, () => 1),
        b: Array.from({ length: 4995 }, () => 1),
      },
    };
    expect(evaluateFormula("sum(${/a}) + sum(${/b})", shared)).toBe(9995);
    shared.state.b.push(1);
    expect(evaluateFormula("sum(${/a}) + sum(${/b})", shared)).toBeNull();
  });

  it("counts every value a text join serializes against the budget", () => {
    expect(evaluateFormula("'v: ' + ${/o}", { state: { o: { a: [1] } } })).toBe(
      'v: {"a":[1]}',
    );
    const big = Array.from({ length: 12_000 }, (_, i) => i);
    expect(evaluateFormula("'v: ' + ${/big}", { state: { big } })).toBeNull();
  });

  it("counts every value an equality visits against the budget", () => {
    const list = (length: number) => Array.from({ length }, (_, i) => ({ i }));
    expect(
      evaluateFormula("${/a} == ${/b}", { state: { a: list(3), b: list(3) } }),
    ).toBe(true);
    expect(
      evaluateFormula("${/a} != ${/b}", {
        state: { a: list(6000), b: list(6000) },
      }),
    ).toBeNull();
  });

  it("spends steps on every visited item, including non-numeric items", () => {
    const context = {
      state: { large: Array.from({ length: 20_000 }, () => null) },
    };
    for (const name of ["sum", "avg", "min", "max"]) {
      const formula = `${name}(${"${/large}"})`;
      expect(formulaIssue(formula)).toBeUndefined();
      expect(evaluateFormula(formula, context)).toBeNull();
    }
    expect(evaluateFormula("count(${/large})", context)).toBe(20_000);
    expect(evaluateFormula("false && sum(${/large})", context)).toBe(false);
    expect(evaluateFormula("true || sum(${/large})", context)).toBe(true);
    expect(evaluateFormula("true ? 1 : sum(${/large})", context)).toBe(1);
    expect(evaluateFormula("false ? sum(${/large}) : 2", context)).toBe(2);
  });

  it.each([
    ["unknown(1)", /unknown function/i],
    ["constructor(1)", /unknown function/i],
    ["round()", /argument count/i],
    ["floor(1, 2)", /argument count/i],
    ["ceil()", /argument count/i],
    ["abs(1, 2)", /argument count/i],
    ["clamp(1, 2)", /argument count/i],
    ["min()", /argument count/i],
    ["max()", /argument count/i],
    ["count()", /argument count/i],
    ["sum()", /argument count/i],
    ["avg(1, 2, 3)", /argument count/i],
    ["number()", /argument count/i],
    ["currency(1)", /argument count/i],
    ["percent(1, 2, 3)", /argument count/i],
    ["time()", /argument count/i],
    ["plural(1, 'a')", /argument count/i],
    ["'unterminated", /unterminated string/i],
    ['"unterminated', /unterminated string/i],
    ["1 @ 2", /token/i],
    ["1 2", /token/i],
  ])("reports why %s cannot parse", (formula, issue) => {
    expect(formulaIssue(formula as string)).toMatch(issue as RegExp);
    expect(evaluateFormula(formula as string, ctx)).toBeNull();
  });

  it.each([
    "${",
    "(((",
    "'",
    "1 +",
    "",
    " ",
    "1.",
    ".5",
    "1e2",
    "[1]",
    "1 === 1",
    "1 ? 2",
    "abs(1,)",
    "abs 1",
    "true ? 1 : unknown()",
    String.raw`'bad\n'`,
  ])("never throws for malformed input %j", (formula) => {
    expect(() => evaluateFormula(formula, ctx)).not.toThrow();
    expect(evaluateFormula(formula, ctx)).toBeNull();
    expect(formulaIssue(formula)).toEqual(expect.any(String));
  });

  it("never throws for runtime inputs outside JSON", () => {
    for (const value of [undefined, null, 1, {}, Symbol("formula")]) {
      expect(() => evaluateFormula(value as never, ctx)).not.toThrow();
      expect(evaluateFormula(value as never, ctx)).toBeNull();
    }
    const cycle: { self?: unknown } = {};
    cycle.self = cycle;
    expect(
      evaluateFormula("'text' + ${/cycle}", { state: { cycle } }),
    ).toBeNull();
    expect(evaluateFormula("${/count}", null as never)).toBeNull();
  });

  it("keeps cached parsing independent of context across cache rollover", () => {
    for (let n = 0; n <= 500; n++) {
      expect(evaluateFormula(`${n} + ${"${/count}"}`, ctx)).toBe(n + 3);
    }
    expect(evaluateFormula("0 + ${/count}", { state: { count: 9 } })).toBe(9);
    expect(formulaIssue("0 + ${/count}")).toBeUndefined();
    expect(formulaIssue("unknown()")).toMatch(/unknown function/i);
    expect(formulaIssue("unknown()")).toMatch(/unknown function/i);
  });
});
