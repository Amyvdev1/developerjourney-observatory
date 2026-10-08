import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initialState, transact } from "../src/domain.mjs";
import { makeReport } from "../src/report.mjs";
test("default report matches the reviewed fixture snapshot", () => {
  const meta = JSON.parse(
    readFileSync(new URL("../web/meta.json", import.meta.url)),
  );
  const contract = JSON.parse(
    readFileSync(new URL("../docs/api-contract.json", import.meta.url)),
  );
  const { result } = transact(initialState(), contract["x-example-action"]);
  assert.equal(
    makeReport(meta, result),
    readFileSync(new URL("./snapshots/report.md", import.meta.url), "utf8"),
  );
});
