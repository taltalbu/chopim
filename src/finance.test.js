import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarize,
  parseAmount,
  applyEvents,
  validateTransaction,
} from "./finance.js";

const expense = {
  id: "test",
  type: "expense",
  date: "2026-10-10",
  title: "Dinner",
  amount: 10000,
  person: "a",
  shareA: 50,
  category: "dates",
};

test("a shared expense creates a balance for the payer", () => {
  const result = summarize([expense], "2026-10");
  assert.equal(result.spending, 10000);
  assert.equal(result.balance, 5000);
  assert.deepEqual(
    result.people.map((person) => person.spending),
    [5000, 5000],
  );
});

test("repayment settles debt without changing income or spending", () => {
  const result = summarize(
    [
      expense,
      { ...expense, id: "repay", type: "transfer", person: "b", amount: 5000 },
    ],
    "2026-10",
  );
  assert.equal(result.balance, 0);
  assert.equal(result.income, 0);
  assert.equal(result.spending, 10000);
});

test("personal costs, custom splits and odd agorot preserve totals", () => {
  const result = summarize(
    [{ ...expense, amount: 101, shareA: 33 }],
    "2026-10",
  );
  assert.deepEqual(
    result.people.map((person) => person.spending),
    [33, 68],
  );
  assert.equal(result.balance, 68);
  assert.equal(summarize([{ ...expense, shareA: 100 }], "2026-10").balance, 0);
  assert.equal(
    summarize([{ ...expense, shareA: 0 }], "2026-10").balance,
    10000,
  );
});

test("monthly metrics exclude other months but balance is all-time", () => {
  const result = summarize(
    [
      expense,
      { ...expense, id: "income", type: "income", amount: 20000 },
      { ...expense, id: "old", date: "2026-09-10" },
    ],
    "2026-10",
  );
  assert.equal(result.income, 20000);
  assert.equal(result.remaining, 10000);
  assert.equal(result.balance, 10000);
});

test("amount parser rejects invalid money and keeps agorot exact", () => {
  assert.equal(parseAmount("487.90"), 48790);
  assert.equal(parseAmount("0.01"), 1);
  for (const value of ["0", "-1", "1.001", "NaN", "Infinity", "1e3", ""])
    assert.throws(() => parseAmount(value));
});

test("transaction validation rejects invalid dates and splits", () => {
  assert.equal(validateTransaction(expense), expense);
  assert.throws(() => validateTransaction({ ...expense, date: "2026-02-30" }));
  assert.throws(() => validateTransaction({ ...expense, shareA: 101 }));
});

test("append-only events support editing and deletion without row indexing", () => {
  const rows = [
    ["event1", "test", "save", "", JSON.stringify(expense)],
    [
      "event2",
      "test",
      "save",
      "",
      JSON.stringify({ ...expense, amount: 20000 }),
    ],
  ];
  assert.equal(applyEvents(rows)[0].amount, 20000);
  assert.deepEqual(
    applyEvents([...rows, ["event3", "test", "delete", "", ""]]),
    [],
  );
  assert.throws(() =>
    applyEvents([["event4", "wrong-id", "save", "", JSON.stringify(expense)]]),
  );
});
