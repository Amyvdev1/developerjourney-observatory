import React from "react";
import { Field, Select, JsonEditor, Table } from "./components.jsx";
export function Workspace({ state, setState, action, save, busy }) {
  const [invalid, setInvalid] = React.useState(false);
  const [version, setVersion] = React.useState("both"),
    [events, setEvents] = React.useState([
      {
        event_id: "demo_import_01",
        session_id: "demo_import",
        step: "read_quickstart",
        status: "started",
        at_seconds: 0,
        documentation_version: "v2",
        synthetic: true,
      },
    ]);
  return (
    <section className="panel">
      <h2>Journey runner</h2>
      <p className="hint">
        Replay reproducible onboarding sessions and compare documentation
        versions.
      </p>
      <div className="fields">
        <Field
          label="Deterministic seed"
          type="number"
          min="0"
          max="1000000"
          value={state.seed}
          onChange={(seed) => setState({ ...state, seed })}
        />
        <Field
          label="Sessions per version"
          type="number"
          min="1"
          max="100"
          value={state.sessions}
          onChange={(sessions) => setState({ ...state, sessions })}
        />
        <Select
          label="Documentation version"
          value={version}
          onChange={setVersion}
          options={[{ value: "both", label: "Compare v1 and v2" }, "v1", "v2"]}
        />
        <button
          className="primary full"
          disabled={busy}
          onClick={() =>
            action({
              kind: "run",
              seed: state.seed,
              sessions: state.sessions,
              version,
            })
          }
        >
          Run synthetic journeys →
        </button>
        <button className="secondary" disabled={busy} onClick={save}>
          Save runner settings
        </button>
      </div>
      <h3>Onboarding path</h3>
      <div className="steps">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <ul className="findings">
        <li>Read quickstart → obtain credentials</li>
        <li>First request → understand error</li>
        <li>Recover → first success → useful task</li>
      </ul>
      <div className="notice">
        Only synthetic demo identifiers are accepted. Extra fields,
        credential-like values and real-user events are rejected.
      </div>
      <details>
        <summary className="key">Import synthetic events</summary>
        <JsonEditor
          onValidity={(valid) => setInvalid(!valid)}
          label="Strict event format"
          value={events}
          onChange={setEvents}
        />
        <button
          className="secondary"
          disabled={busy || invalid}
          onClick={() => action({ kind: "collect", events })}
        >
          Validate & collect events
        </button>
      </details>
    </section>
  );
}
export function Extra(run) {
  return (
    <section className="panel">
      <h2>Recovery taxonomy</h2>
      <p className="hint">
        Failure counts are linked to the included event trail.
      </p>
      <Table rows={run.taxonomy} />
      <h3>Drop-off evidence</h3>
      <Table rows={run.dropoffs} />
      <details>
        <summary className="key">Inspect chronological event trail</summary>
        <Table rows={run.events} />
      </details>
    </section>
  );
}
