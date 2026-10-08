import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApplication } from "../src/server.mjs";
import { initialState } from "../src/domain.mjs";
import { makeCSV, makeReport } from "../src/report.mjs";
test("HTTP validation, optimistic concurrency and SQLite persistence", async () => {
  const dir = mkdtempSync(join(tmpdir(), "inspectable-"));
  const db = join(dir, "test.sqlite");
  let app = createApplication({ database: db });
  const listen = async () => {
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    return `http://127.0.0.1:${app.server.address().port}`;
  };
  let base = await listen();
  try {
    assert.equal((await fetch(base + "/api/health")).status, 200);
    const current = await (await fetch(base + "/api/state")).json();
    assert.equal(current.revision, 0);
    const post = (body, origin) =>
      fetch(base + "/api/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(origin ? { Origin: origin } : {}),
        },
        body: JSON.stringify(body),
      });
    assert.equal(
      (
        await post(
          { revision: 0, state: initialState() },
          "https://evil.example",
        )
      ).status,
      403,
    );
    assert.equal((await post({ revision: 0, state: {} })).status, 400);
    const saved = await post({ revision: 0, state: initialState() });
    assert.equal(saved.status, 200);
    assert.equal(
      (await post({ revision: 0, state: initialState() })).status,
      409,
    );
    await app.close();
    app = createApplication({ database: db });
    base = await listen();
    assert.equal((await (await fetch(base + "/api/state")).json()).revision, 1);
    assert.equal((await fetch(base + "/api/export")).status, 404);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("reports retain uncertainty and prevent spreadsheet formula injection", () => {
  const run = {
    boundary: "Synthetic fixture",
    metrics: [{ label: "Cost", value: null, basis: "unknown" }],
    table: [{ claim: '=HYPERLINK("bad")' }],
    assumptions: { laborRate: "estimated" },
  };
  assert.match(makeReport({ name: "Test" }, run), /Unknown/);
  assert.match(makeReport({ name: "Test" }, run), /estimated/);
  assert.match(makeCSV(run), /"'=HYPERLINK/);
});

test("actual operation produces exportable evidence and survives service restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "operation-"));
  const db = join(dir, "test.sqlite");
  let app = createApplication({ database: db });
  const listen = async () => {
    await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
    return `http://127.0.0.1:${app.server.address().port}`;
  };
  let base = await listen();
  try {
    const contract = await (await fetch(base + "/api/contract")).json();
    assert.equal(contract.openapi, "3.1.0");
    const response = await fetch(base + "/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contract["x-example-action"]),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(data.run.id);
    assert.ok(data.run.boundary);
    assert.ok(data.run.observedExecutionMs >= 0);
    for (const format of ["json", "csv", "markdown"]) {
      const result = await fetch(
        `${base}/api/export?id=${data.run.id}&format=${format}`,
      );
      assert.equal(result.status, 200);
      assert.ok((await result.text()).length > 40);
    }
    await app.close();
    app = createApplication({ database: db });
    base = await listen();
    const restored = await (await fetch(base + "/api/state")).json();
    assert.equal(restored.runs[0].id, data.run.id);
    assert.deepEqual(restored.runs[0].assumptions, data.run.assumptions);
  } finally {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("workspace replacement cannot forge operational history", async () => {
  const app = createApplication();
  await new Promise((r) => app.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${app.server.address().port}`;
  try {
    const forged = initialState();
    forged.events.push({
      event_id: "demo_forged_1",
      session_id: "demo_forged",
      step: "read_quickstart",
      status: "started",
      at_seconds: 0,
      documentation_version: "v1",
      synthetic: true,
    });
    const response = await fetch(base + "/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: 0, state: forged }),
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "HISTORY_PROTECTED");
    assert.equal(app.store.revision(), 0);
  } finally {
    await app.close();
  }
});
