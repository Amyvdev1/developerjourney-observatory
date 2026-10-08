# Scope and limitations

Synthetic sessions only. Timing is fixture-defined, not real developer behavior. No tokens, real-user tracking or external API requests.

- Local single-workspace service; no authenticated multi-user accounts or tenant isolation.
- SQLite persistence has atomic updates and optimistic revision checks, but logs are not tamper-proof against a person with filesystem access.
- Run history returns the latest 200 runs; older records remain in the database. The UI does not yet paginate historical data.
- Monetary values use finite JavaScript numbers rounded to four decimals; a financial accounting system would use currency-specific fixed-point arithmetic.
- No production workload, load, hosted deployment, remote provider execution or external source verification was evaluated.
- Docker configuration is included; its execution status is recorded separately in verification evidence.
- Browser checks cover desktop and mobile forms, runtime errors, history and exports. They do not establish a formal accessibility certification.

## Next useful work

Replace a specific assumption with observed, consented evidence; extend one real integration with authenticated access and explicit failure semantics; add pagination and storage quotas before scaling. Do not remove evidence labels to make forecasts look like results.
