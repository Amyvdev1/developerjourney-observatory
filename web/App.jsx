import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Workspace, Extra } from "./Workspace.jsx";
import { Results } from "./components.jsx";
import { makeReport } from "../src/report.mjs";
import "./style.css";
import meta from "./meta.json";
document.body.dataset.theme = meta.theme;
function App() {
  const [state, setState] = useState(null),
    [runs, setRuns] = useState([]),
    [revision, setRevision] = useState(0),
    [run, setRun] = useState(null),
    [tab, setTab] = useState("Workspace"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function load() {
    try {
      const response = await fetch("/api/state");
      const data = await response.json();
      if (!response.ok)
        throw Error(data.error?.message ?? "Could not load workspace");
      setState(data.state);
      setRuns(data.runs);
      setRevision(data.revision);
      setRun(data.runs[0] ?? null);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function action(payload) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, revision }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error?.message ?? "Action failed");
      setState(data.state);
      setRevision(data.revision);
      if (data.run) {
        setRun(data.run);
        setRuns((previous) => [data.run, ...previous]);
      }
      setNotice("Saved locally. Evidence is available in the run history.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, revision }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error?.message ?? "Could not save");
      setRevision(data.revision);
      setNotice("Workspace saved to SQLite.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header>
        <div className="brand">
          <i>{meta.symbol}</i>
          {meta.name}
        </div>
        <div className="owner">
          <span className="live">Local workspace</span>
          <span className="byline">
            Built by <a href="https://github.com/Amyvdev1">Amy Villa</a>
          </span>
        </div>
      </header>
      <main className="shell">
        <section className="hero">
          <div>
            <div className="eyebrow">{meta.subtitle} / 01</div>
            <h1>
              {meta.headline} <em>{meta.emphasis}</em>
            </h1>
            <p>{meta.description}</p>
          </div>
          <div className="seal">
            {meta.symbol}
            <small>{meta.seal}</small>
          </div>
        </section>
        <nav className="tabs" aria-label="Workspace sections">
          {["Workspace", "Run history", "Report & export", "How it works"].map(
            (t) => (
              <button
                className={tab === t ? "active" : ""}
                key={t}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ),
          )}
        </nav>
        {error && (
          <div className="notice error" role="alert">
            {error}{" "}
            <button className="secondary" onClick={load}>
              Reload saved data
            </button>
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {!state ? (
          <div className="panel empty">
            {error
              ? "Workspace unavailable. Use reload to reconnect."
              : "Loading your workspace…"}
          </div>
        ) : tab === "Workspace" ? (
          <div className="workspace">
            <Workspace
              state={state}
              setState={setState}
              action={action}
              save={save}
              busy={busy}
            />
            <Results run={run} renderExtra={Extra} />
          </div>
        ) : tab === "Run history" ? (
          <section className="panel">
            <h2>Persisted decision history</h2>
            <p className="hint">
              Choose a previous result to inspect or export. Runs are retained
              across server restarts.
            </p>
            {runs.length ? (
              runs.map((r) => (
                <div className="history-item" key={r.id}>
                  <div>
                    {r.operation}{" "}
                    <span className="badge">{r.status ?? "complete"}</span>
                    <small>
                      {r.createdAt} · {r.id}
                    </small>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setRun(r);
                      setTab("Workspace");
                    }}
                  >
                    Inspect run
                  </button>
                </div>
              ))
            ) : (
              <div className="empty">No runs yet. Start in the workspace.</div>
            )}
          </section>
        ) : tab === "Report & export" ? (
          <section className="panel">
            <h2>Portable evidence</h2>
            <p className="hint">
              The report includes inputs, uncertainty, findings and the evidence
              trail for the selected run.
            </p>
            {run ? (
              <>
                <div className="row">
                  {["markdown", "json", "csv"].map((format) => (
                    <a
                      className="secondary"
                      key={format}
                      href={`/api/export?id=${run.id}&format=${format}`}
                    >
                      Download {format.toUpperCase()}
                    </a>
                  ))}
                </div>
                <div className="divider" />
                <pre>{makeReport(meta, run)}</pre>
              </>
            ) : (
              <div className="empty">Create a run to export a report.</div>
            )}
          </section>
        ) : (
          <section className="panel">
            <h2>Inspectable by design</h2>
            <p className="hint">{meta.boundary}</p>
            <div className="steps">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <ul className="findings">
              {meta.method.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
            <div className="divider" />
            <div className="row">
              <a
                className="secondary"
                href={`https://github.com/Amyvdev1/${meta.slug}`}
              >
                Explore source ↗
              </a>
              <a className="secondary" href="/api/contract">
                API contract
              </a>
            </div>
          </section>
        )}
        <footer>
          <span>{meta.name} · A system by Amy Villa</span>
          <span>{meta.footer}</span>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")).render(<App />);
