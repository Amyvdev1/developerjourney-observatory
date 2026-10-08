import React, { useState } from "react";
export const format = (v) =>
  v === null || v === undefined
    ? "Unknown"
    : typeof v === "number"
      ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(v)
      : String(v);
export function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
  ...rest
}) {
  return (
    <label className="field">
      {label}
      <input
        type={type}
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        onChange={(e) =>
          onChange(
            type === "number"
              ? e.target.value === ""
                ? null
                : Number(e.target.value)
              : e.target.value,
          )
        }
        {...rest}
      />
    </label>
  );
}
export function Select({ label, value, onChange, options }) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}
export function JsonEditor({ label, value, onChange, onValidity = () => {} }) {
  const [draft, setDraft] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  return (
    <label className="field">
      {label}
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          try {
            onChange(JSON.parse(e.target.value));
            onValidity(true);
            setError("");
          } catch {
            onValidity(false);
            setError("Complete the JSON before saving.");
          }
        }}
      />
      {error && <span role="alert">{error}</span>}
    </label>
  );
}
export function Table({ rows = [] }) {
  if (!rows.length) return <p className="hint">No records yet.</p>;
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k.replaceAll("_", " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {keys.map((k) => (
                <td key={k}>
                  {typeof r[k] === "object" && r[k] !== null
                    ? JSON.stringify(r[k])
                    : format(r[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Chart({ series = [] }) {
  if (!series.length) return null;
  const valid = series.filter((s) => typeof s.value === "number");
  const max = Math.max(1, ...valid.map((s) => Math.abs(s.value)));
  return (
    <svg
      className="chart"
      viewBox="0 0 680 160"
      role="img"
      aria-label="Comparison chart; values are also available in the result table"
    >
      {series.map((s, i) => {
        const x = 20 + i * (640 / series.length);
        const h =
          typeof s.value === "number" ? (Math.abs(s.value) / max) * 90 : 0;
        return (
          <g key={i}>
            <rect
              x={x}
              y={110 - h}
              width={Math.max(6, 640 / series.length - 25)}
              height={h}
              rx="3"
              fill="var(--accent)"
              opacity={0.4 + (0.5 * i) / series.length}
            />
            <text x={x} y="132">
              {s.label.slice(0, 18)}
            </text>
            <text x={x} y={Math.max(12, 102 - h)}>
              {format(s.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export function Results({ run, renderExtra }) {
  if (!run)
    return (
      <div className="panel empty">
        <b>Inspect. Compare. Decide.</b>
        <span>Configure the workspace and run your first scenario.</span>
      </div>
    );
  return (
    <div className="stack">
      <div className="metrics">
        {(run.metrics ?? []).map((m, i) => (
          <div className="metric" key={i}>
            <small>{m.label}</small>
            <strong>
              {format(m.value)}
              <span className="unit">{m.unit}</span>
            </strong>
            <span className="basis">{m.basis}</span>
          </div>
        ))}
      </div>
      {renderExtra?.(run)}
      <section className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2>Decision brief</h2>
          <span className="badge">{run.status ?? "inspectable"}</span>
        </div>
        <Chart series={run.series} />
        <ul className="findings">
          {run.findings?.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
        <div className="notice">{run.boundary}</div>
      </section>
      <section className="panel">
        <h2>Evidence trail</h2>
        <p className="hint">
          Records behind this result. Unknown inputs stay unknown.
        </p>
        <Table rows={run.table?.length ? run.table : run.events} />
      </section>
    </div>
  );
}
