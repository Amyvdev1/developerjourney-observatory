# Local API usage

1. `GET /api/state` returns the current `revision`, validated state and latest runs.
2. Send a JSON object with that revision to `POST /api/action`.
3. The response includes the incremented revision, persisted state and new run.
4. `GET /api/export?id=<run-id>&format=markdown` downloads the selected evidence report. Formats: `json`, `csv`, `markdown`.

## Default operation

```json
{
  "revision": 0,
  "kind": "run",
  "version": "both"
}
```

`POST /api/state` edits workspace configuration. It cannot overwrite operational audit/decision/event history in TrustBoundary, EvidenceGraph or DeveloperJourney. Use recorded actions to change those records.

## Error behavior

Errors use `{"error": {"code": "...", "message": "..."}}`. Invalid inputs return 400, blocked origins 403, missing resources 404, stale revisions 409, unsupported content types 415 and oversized request bodies 413. No stack trace is exposed to the browser.

The service does not claim authenticated identities. It is restricted to the documented local workflow. Consult `src/domain.mjs` for the complete product validation rules and `tests/http.test.mjs` for executable request examples.
