import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fixtures,
  validateEvent,
  mergeEvents,
  analyzeEvents,
  initialState,
  transact,
} from "../src/domain.mjs";
import { makeReport } from "../src/report.mjs";
test("synthetic journeys are deterministic for a fixed seed", () => {
  assert.deepEqual(fixtures("v1", 42, 12), fixtures("v1", 42, 12));
  assert.notDeepEqual(fixtures("v1", 42, 12), fixtures("v1", 43, 12));
});
test("v2 fixture improves median time to first success by 31 seconds", () => {
  const v1 = analyzeEvents(fixtures("v1", 42, 12), "v1"),
    v2 = analyzeEvents(fixtures("v2", 42, 12), "v2");
  assert.equal(v1.medianFirstSuccess - v2.medianFirstSuccess, 31);
});
test("events reject tokens, arbitrary free text and real-user identifiers", () => {
  const e = fixtures("v1", 42, 1)[0];
  for (const key of ["token", "api_key", "email", "notes"])
    assert.throws(
      () => validateEvent({ ...e, [key]: "secret" }),
      /Extra fields/,
    );
  assert.throws(
    () => validateEvent({ ...e, session_id: "person_123" }),
    /demo_/,
  );
  assert.throws(
    () => validateEvent({ ...e, session_id: "demo_sk_live_secret" }),
    /Credential/,
  );
  assert.throws(() => validateEvent({ ...e, synthetic: false }), /synthetic/);
});
test("duplicate collection does not inflate sessions or events", () => {
  const e = fixtures("v1", 42, 12);
  assert.deepEqual(mergeEvents(e, e), e);
  assert.throws(
    () => mergeEvents(e, [{ ...e[0], at_seconds: 100 }]),
    /Conflicting/,
  );
});
test("invalid taxonomy and nonmonotonic events are rejected", () => {
  const e = fixtures("v1", 42, 1);
  assert.throws(() => validateEvent({ ...e[0], step: "unknown" }));
  assert.throws(
    () =>
      mergeEvents(
        [],
        [...e, { ...e[0], event_id: "demo_backwards", at_seconds: 0 }],
      ),
    /monotonic/,
  );
});
test("unknown timing remains unknown for incomplete sessions", () => {
  const e = [fixtures("v1", 42, 1)[0]];
  assert.equal(analyzeEvents(e, "v1").medianFirstSuccess, null);
  assert.equal(analyzeEvents(e, "v2").successRate, null);
});
test("all privacy-protected data survives persistence model without tokens", () => {
  const r = transact(initialState(), { kind: "run", version: "both" });
  for (const event of r.state.events) validateEvent(event);
  assert.ok(r.result.events.every((e) => e.synthetic));
});
test("comparison report labels timing and findings as synthetic", () => {
  const r = transact(initialState(), { kind: "run", version: "both" }).result;
  const report = makeReport({ name: "DeveloperJourney" }, r);
  assert.match(report, /not evidence of production/);
  assert.match(report, /31 seconds/);
});
