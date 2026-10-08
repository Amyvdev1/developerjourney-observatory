import {
  requireThat,
  number,
  text,
  clone,
  round,
  percentile,
} from "./validation.mjs";
export const describe = {
  name: "DeveloperJourney",
  slug: "developerjourney-observatory",
  port: 4315,
};
export const steps = [
  "read_quickstart",
  "obtain_credentials",
  "first_request",
  "understand_error",
  "retry_request",
  "first_success",
  "complete_task",
];
export const errors = [
  "INVALID_API_KEY",
  "VALIDATION_ERROR",
  "RATE_LIMITED",
  "TIMEOUT",
  "UNCLEAR_DOCUMENTATION",
];
const allowed = [
  "event_id",
  "session_id",
  "step",
  "status",
  "at_seconds",
  "error_code",
  "recovered",
  "recovery_seconds",
  "documentation_version",
  "synthetic",
];
export function validateEvent(event) {
  requireThat(
    event && typeof event === "object" && !Array.isArray(event),
    "Event must be an object",
  );
  requireThat(
    Object.keys(event).every((k) => allowed.includes(k)),
    "Extra fields are rejected to protect privacy",
    "PRIVACY_FIELD_REJECTED",
  );
  requireThat(
    event.synthetic === true,
    "Only explicitly synthetic events are accepted",
    "SYNTHETIC_ONLY",
  );
  text(event.event_id, "Event id");
  text(event.session_id, "Session id");
  requireThat(
    /^demo_[A-Za-z0-9_-]{1,80}$/.test(event.session_id) &&
      /^demo_[A-Za-z0-9_-]{1,120}$/.test(event.event_id),
    "Use demo_ identifiers only",
  );
  requireThat(
    !/(sk[_-]|bearer|token|@|password|secret|api[_-]?key)/i.test(
      event.session_id + " " + event.event_id,
    ),
    "Credential-like identifiers are rejected",
    "PRIVACY_VALUE_REJECTED",
  );
  requireThat(steps.includes(event.step), "Unknown onboarding step");
  requireThat(
    ["started", "completed", "failed"].includes(event.status),
    "Invalid step status",
  );
  number(event.at_seconds, "Synthetic offset seconds");
  requireThat(
    ["v1", "v2"].includes(event.documentation_version),
    "Documentation version must be v1 or v2",
  );
  if (event.error_code !== undefined)
    requireThat(errors.includes(event.error_code), "Unrecognized error code");
  if (event.recovered !== undefined)
    requireThat(
      typeof event.recovered === "boolean",
      "Recovered must be boolean",
    );
  if (event.recovery_seconds !== undefined)
    number(event.recovery_seconds, "Recovery seconds");
  if (event.status === "failed")
    requireThat(event.error_code, "Failed events need an error code");
  return Object.fromEntries(
    allowed.filter((key) => key in event).map((key) => [key, event[key]]),
  );
}
export function initialState() {
  return { seed: 42, sessions: 12, events: [] };
}
export function validateState(value) {
  requireThat(
    value && typeof value === "object",
    "Journey workspace is required",
  );
  const s = clone(value);
  number(s.seed, "Seed", { max: 1000000 });
  number(s.sessions, "Session count", { min: 1, max: 100 });
  requireThat(
    Number.isInteger(s.sessions) && Number.isInteger(s.seed),
    "Use integer seed and session count",
  );
  requireThat(
    Array.isArray(s.events) && s.events.length <= 10000,
    "Event list must contain at most 10,000 records",
  );
  s.events = s.events.map(validateEvent);
  const seen = new Set();
  for (const event of s.events) {
    requireThat(
      !seen.has(event.event_id),
      "Duplicate event ids are not allowed in saved state",
    );
    seen.add(event.event_id);
  }
  return s;
}
export function fixtures(version, seed, count) {
  requireThat(["v1", "v2"].includes(version), "Choose v1 or v2");
  const events = [];
  for (let i = 0; i < count; i++) {
    const session = `demo_${seed}_${version}_${i + 1}`;
    let time = 0,
      sequence = 0;
    const add = (step, status, extra = {}) =>
      events.push({
        event_id: `${session}_${++sequence}`,
        session_id: session,
        step,
        status,
        at_seconds: time,
        documentation_version: version,
        synthetic: true,
        ...extra,
      });
    const jitter = (seed + i * 7) % 9;
    add("read_quickstart", "started");
    time += (version === "v1" ? 48 : 25) + jitter;
    add("read_quickstart", "completed");
    time += version === "v1" ? 32 : 24;
    add("obtain_credentials", "completed");
    time += 8;
    const drops = i % 7 === 6;
    if (drops) {
      add("first_request", "failed", {
        error_code: "UNCLEAR_DOCUMENTATION",
        recovered: false,
      });
      continue;
    }
    if (i % 4 === 0) {
      const recovery = version === "v1" ? 42 : 30;
      add("first_request", "failed", {
        error_code: "INVALID_API_KEY",
        recovered: true,
        recovery_seconds: recovery,
      });
      time += 12;
      add("understand_error", "completed");
      time += recovery - 12;
      add("retry_request", "completed");
    } else add("first_request", "completed");
    add("first_success", "completed");
    time += 18;
    add("complete_task", "completed");
  }
  return events.map(validateEvent);
}
export function mergeEvents(existing, incoming) {
  const byId = new Map(existing.map((e) => [e.event_id, e]));
  for (const value of incoming) {
    const event = validateEvent(value);
    if (byId.has(event.event_id))
      requireThat(
        JSON.stringify(byId.get(event.event_id)) === JSON.stringify(event),
        "Conflicting event id",
        "DUPLICATE_CONFLICT",
      );
    else byId.set(event.event_id, event);
  }
  const events = [...byId.values()];
  const sessions = new Map();
  for (const event of events) {
    const prior = sessions.get(event.session_id);
    if (prior) {
      requireThat(
        prior.version === event.documentation_version,
        "A session cannot change documentation version",
      );
      requireThat(
        event.at_seconds >= prior.at,
        "Event times must be monotonic within a session",
      );
    }
    sessions.set(event.session_id, {
      at: event.at_seconds,
      version: event.documentation_version,
    });
  }
  requireThat(events.length <= 10000, "Event capacity exceeded");
  return events;
}
export function analyzeEvents(events, version) {
  const selected = events.filter((e) => e.documentation_version === version);
  const sessions = new Map();
  for (const event of selected) {
    if (!sessions.has(event.session_id)) sessions.set(event.session_id, []);
    sessions.get(event.session_id).push(event);
  }
  const latencies = [],
    recovery = [];
  let successful = 0,
    completed = 0;
  const dropoffs = [],
    failures = {};
  for (const [id, sequence] of sessions) {
    const first = sequence.find(
      (e) => e.step === "first_success" && e.status === "completed",
    );
    if (first) {
      successful++;
      latencies.push(
        first.at_seconds - Math.min(...sequence.map((e) => e.at_seconds)),
      );
    }
    if (
      sequence.some(
        (e) => e.step === "complete_task" && e.status === "completed",
      )
    )
      completed++;
    else
      dropoffs.push({
        session: id,
        step: sequence.at(-1).step,
        reason: sequence.at(-1).error_code ?? "journey_incomplete",
      });
    for (const event of sequence.filter((e) => e.status === "failed")) {
      failures[event.error_code] = (failures[event.error_code] ?? 0) + 1;
      if (event.recovered && event.recovery_seconds !== undefined)
        recovery.push(event.recovery_seconds);
    }
  }
  return {
    version,
    sessions: sessions.size,
    successful,
    completed,
    successRate: sessions.size
      ? round((successful / sessions.size) * 100)
      : null,
    medianFirstSuccess: percentile(latencies, 0.5),
    p95FirstSuccess: percentile(latencies, 0.95),
    medianRecovery: percentile(recovery, 0.5),
    recoveredErrors: recovery.length,
    dropoffs,
    failures,
    basis: "synthetic fixture, not production behavior",
  };
}
export function analyze(state) {
  const before = analyzeEvents(state.events, "v1"),
    after = analyzeEvents(state.events, "v2");
  const delta =
    before.medianFirstSuccess === null || after.medianFirstSuccess === null
      ? null
      : round(before.medianFirstSuccess - after.medianFirstSuccess);
  const sessions = new Set(state.events.map((e) => e.session_id)).size;
  const finding =
    delta === null
      ? "Run both documentation versions to compare time to first success."
      : `The v2 fixture reaches median first success ${delta} seconds faster than v1. This is a local synthetic benchmark, not evidence of production developer behavior.`;
  return {
    status: "synthetic_benchmark",
    boundary:
      "Synthetic onboarding sessions only. Timing is fixture-defined, not observed human behavior. No real users, credentials, API requests or production analytics are collected.",
    metrics: [
      {
        label: "Synthetic sessions",
        value: sessions,
        basis: "observed fixture count",
      },
      {
        label: "Median improvement",
        value: delta,
        unit: "seconds",
        basis: "synthetic benchmark",
      },
      {
        label: "V1 first success",
        value: before.medianFirstSuccess,
        unit: "sec",
        basis: "synthetic median",
      },
      {
        label: "V2 first success",
        value: after.medianFirstSuccess,
        unit: "sec",
        basis: "synthetic median",
      },
      {
        label: "Recoveries",
        value: before.recoveredErrors + after.recoveredErrors,
        basis: "synthetic count",
      },
      {
        label: "Drop-offs",
        value: before.dropoffs.length + after.dropoffs.length,
        basis: "synthetic count",
      },
    ],
    table: [before, after].map(({ dropoffs, failures, ...r }) => r),
    events: state.events,
    series: [
      { label: "v1 median", value: before.medianFirstSuccess },
      { label: "v2 median", value: after.medianFirstSuccess },
      { label: "v1 recovery", value: before.medianRecovery },
      { label: "v2 recovery", value: after.medianRecovery },
    ],
    findings: [
      finding,
      `${before.failures.INVALID_API_KEY ?? 0} v1 and ${after.failures.INVALID_API_KEY ?? 0} v2 fixture sessions hit INVALID_API_KEY; improve credential examples and recovery instructions.`,
      `Drop-off fixture evidence: ${[...before.dropoffs, ...after.dropoffs].map((d) => `${d.session} at ${d.step}`).join("; ") || "none"}.`,
      "Prioritize a clearer quickstart, credential setup and error recovery. Validate these hypotheses with consented, privacy-reviewed real research before drawing a production conclusion.",
    ],
    assumptions: {
      seed: state.seed,
      sessionsPerVersion: state.sessions,
      quickstartSeconds: { v1: 48, v2: 25 },
      credentialsSeconds: { v1: 32, v2: 24 },
      recoverySeconds: { v1: 42, v2: 30 },
      privacy:
        "strict field allowlist, enum error taxonomy, demo identifiers and no free-text events",
    },
    dropoffs: [...before.dropoffs, ...after.dropoffs],
    taxonomy: errors.map((code) => ({
      errorCode: code,
      v1: before.failures[code] ?? 0,
      v2: after.failures[code] ?? 0,
    })),
  };
}
export function transact(current, payload) {
  let state = validateState(current);
  if (payload.kind === "run") {
    state.seed = payload.seed ?? state.seed;
    state.sessions = payload.sessions ?? state.sessions;
    validateState(state);
    const versions =
      payload.version === "both" ? ["v1", "v2"] : [payload.version];
    const incoming = versions.flatMap((version) =>
      fixtures(version, state.seed, state.sessions),
    );
    state.events = mergeEvents(state.events, incoming);
  } else if (payload.kind === "collect") {
    requireThat(
      Array.isArray(payload.events) && payload.events.length <= 500,
      "Collect up to 500 synthetic events at a time",
    );
    state.events = mergeEvents(state.events, payload.events);
  } else
    requireThat(
      payload.kind === "inspect",
      "Supported operations: run, collect, inspect",
    );
  return { state: validateState(state), result: analyze(state) };
}

export function validateReplacement(next, current) {
  const value = validateState(next);
  requireThat(
    JSON.stringify(value.events) === JSON.stringify(current.events),
    "Use the validated collector to change events",
    "HISTORY_PROTECTED",
  );
  return value;
}
