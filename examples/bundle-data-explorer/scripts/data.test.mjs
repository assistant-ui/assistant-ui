import assert from "node:assert/strict";
import { test } from "node:test";
import { sales, answerQuery, summarize, filterSales } from "../src/data.ts";

test("the sample dataset has complete month-region pairs and known totals", () => {
  assert.equal(sales.length, 18);
  assert.equal(
    new Set(sales.map((row) => `${row.month}-${row.region}`)).size,
    18,
  );
  assert.equal(
    sales.reduce((sum, row) => sum + row.revenue, 0),
    192800,
  );
  assert.equal(
    sales.reduce((sum, row) => sum + row.orders, 0),
    1928,
  );
  assert.deepEqual(
    summarize(sales, "month").map((row) => row.revenue),
    [26700, 28600, 29700, 32700, 36000, 39100],
  );
  assert.deepEqual(
    summarize(sales, "region").map((row) => row.revenue),
    [83200, 61700, 47900],
  );
});

test("the region suggestion returns grounded numbers and changes the view", () => {
  const result = answerQuery("Which region has the most revenue?");
  assert.equal(result.filter, "All regions");
  assert.equal(result.grouping, "region");
  assert.match(result.text, /North America leads with \$83,200/);
  assert.match(result.text, /43\.2%/);
});

test("the Europe suggestion filters the actual six source records", () => {
  const result = answerQuery("Focus on Europe");
  assert.equal(result.filter, "Europe");
  assert.equal(result.grouping, "month");
  assert.match(result.text, /\$61,700 from 617/);
  assert.equal(filterSales(result.filter).length, 6);
  assert.ok(filterSales(result.filter).every((row) => row.region === "Europe"));
});

test("the growth suggestion computes a period comparison and restores all regions", () => {
  const result = answerQuery("How did revenue grow?");
  assert.equal(result.filter, "All regions");
  assert.equal(result.grouping, "month");
  assert.match(result.text, /\$26,700 in January to \$39,100 in June/);
  assert.match(result.text, /\$12,400, or 46\.4%/);
  assert.match(result.text, /not a forecast/);
});

test("the reset intent restores every record", () => {
  const result = answerQuery("Show all regions");
  assert.equal(result.filter, "All regions");
  assert.equal(result.grouping, "month");
  assert.equal(filterSales(result.filter).length, 18);
});

test("comparison requests do not silently filter to the first named region", () => {
  const result = answerQuery("Compare revenue for Europe and North America");
  assert.equal(result.filter, "All regions");
  assert.equal(result.grouping, "region");
  assert.match(result.text, /three regions/);
  assert.match(result.text, /Europe \$61,700/);
});

test("unknown prompts state limitations and leave the current view unchanged", () => {
  const result = answerQuery("What caused sales to fall last year?");
  assert.equal(result.filter, undefined);
  assert.equal(result.grouping, undefined);
  assert.match(result.text, /can't infer causes or access other data/);
});

test("causal questions leave the view unchanged and do not return a growth calculation", () => {
  for (const prompt of [
    "What caused this growth?",
    "Why did Europe revenue increase?",
    "What drove revenue growth?",
    "What are the reasons for this change?",
  ]) {
    const result = answerQuery(prompt);
    assert.equal(result.filter, undefined);
    assert.equal(result.grouping, undefined);
    assert.match(result.text, /can't infer causes/);
    assert.doesNotMatch(result.text, /46\.4%|restored/);
  }
});

test("unsupported geographic entities do not silently receive global sample totals", () => {
  for (const prompt of [
    "What is total revenue in Canada?",
    "Show orders for Canada",
    "Compare revenue for Europe and Canada",
    "How did revenue grow in Australia?",
    "What is total revenue in America?",
  ]) {
    const result = answerQuery(prompt);
    assert.equal(result.filter, undefined);
    assert.equal(result.grouping, undefined);
    assert.match(
      result.text,
      /Available regions are North America, Europe, and Asia Pacific/,
    );
    assert.match(result.text, /current view is unchanged/);
    assert.doesNotMatch(result.text, /\$192,800|\$61,700|46\.4%/);
  }
});

test("unsupported dates and data dimensions do not silently receive global totals", () => {
  for (const prompt of [
    "Show total revenue in 2025",
    "Show total revenue for March",
    "Compare revenue by product",
  ]) {
    const result = answerQuery(prompt);
    assert.equal(result.filter, undefined);
    assert.equal(result.grouping, undefined);
    assert.doesNotMatch(result.text, /\$192,800|chart now/);
  }
});

test("region-scoped growth uses only that region's records", () => {
  const result = answerQuery("How did revenue grow in Europe?");
  assert.equal(result.filter, "Europe");
  assert.match(result.text, /\$8,200 in January to \$12,700 in June/);
});

test("unsupported order metrics and ambiguous region filters leave the view unchanged", () => {
  for (const prompt of [
    "Which region has the most orders?",
    "Compare orders by region",
    "Show monthly orders",
    "Focus on Europe and North America",
  ]) {
    const result = answerQuery(prompt);
    assert.equal(result.filter, undefined);
    assert.equal(result.grouping, undefined);
    assert.match(result.text, /current view is unchanged/);
  }
});
