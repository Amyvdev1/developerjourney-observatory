# DeveloperJourney — decision report

Recorded: test fixture
Operation: scenario

## Evidence boundary

Synthetic onboarding sessions only. Timing is fixture-defined, not observed human behavior. No real users, credentials, API requests or production analytics are collected.

## Results

- **Synthetic sessions:** 24  (observed fixture count)
- **Median improvement:** 31 seconds (synthetic benchmark)
- **V1 first success:** 92 sec (synthetic median)
- **V2 first success:** 61 sec (synthetic median)
- **Recoveries:** 6  (synthetic count)
- **Drop-offs:** 2  (synthetic count)

## Findings

- The v2 fixture reaches median first success 31 seconds faster than v1. This is a local synthetic benchmark, not evidence of production developer behavior.
- 3 v1 and 3 v2 fixture sessions hit INVALID_API_KEY; improve credential examples and recovery instructions.
- Drop-off fixture evidence: demo_42_v1_7 at first_request; demo_42_v2_7 at first_request.
- Prioritize a clearer quickstart, credential setup and error recovery. Validate these hypotheses with consented, privacy-reviewed real research before drawing a production conclusion.

## Inputs and assumptions

```json
{
  "seed": 42,
  "sessionsPerVersion": 12,
  "quickstartSeconds": {
    "v1": 48,
    "v2": 25
  },
  "credentialsSeconds": {
    "v1": 32,
    "v2": 24
  },
  "recoverySeconds": {
    "v1": 42,
    "v2": 30
  },
  "privacy": "strict field allowlist, enum error taxonomy, demo identifiers and no free-text events"
}
```

## Inspectable records

```json
[
  {
    "version": "v1",
    "sessions": 12,
    "successful": 11,
    "completed": 11,
    "successRate": 91.6667,
    "medianFirstSuccess": 92,
    "p95FirstSuccess": 138,
    "medianRecovery": 42,
    "recoveredErrors": 3,
    "basis": "synthetic fixture, not production behavior"
  },
  {
    "version": "v2",
    "sessions": 12,
    "successful": 11,
    "completed": 11,
    "successRate": 91.6667,
    "medianFirstSuccess": 61,
    "p95FirstSuccess": 95,
    "medianRecovery": 30,
    "recoveredErrors": 3,
    "basis": "synthetic fixture, not production behavior"
  }
]
```

## Execution measurement

Local calculation duration: not measured ms. This measures local processing, not model, tool, human or production latency.
