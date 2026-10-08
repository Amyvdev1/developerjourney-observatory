export function makeReport(product, run) {
  return [
    `# ${product.name} — decision report`,
    "",
    `Recorded: ${run.createdAt ?? "test fixture"}`,
    `Operation: ${run.operation ?? "scenario"}`,
    "",
    `## Evidence boundary\n\n${run.boundary}`,
    "",
    "## Results",
    "",
    ...(run.metrics ?? []).map(
      (m) =>
        `- **${m.label}:** ${m.value === null ? "Unknown" : m.value} ${m.unit ?? ""} (${m.basis})`,
    ),
    "",
    "## Findings",
    "",
    ...(run.findings ?? []).map((f) => `- ${f}`),
    "",
    "## Inputs and assumptions",
    "",
    "```json",
    JSON.stringify(run.assumptions ?? {}, null, 2),
    "```",
    "",
    "## Inspectable records",
    "",
    "```json",
    JSON.stringify(run.table ?? run.events ?? [], null, 2),
    "```",
    "",
    "## Execution measurement",
    "",
    `Local calculation duration: ${run.observedExecutionMs ?? "not measured"} ms. This measures local processing, not model, tool, human or production latency.`,
    "",
  ].join("\n");
}
const cell = (value) => {
  let s = String(value ?? "unknown");
  if (typeof value === "string" && /^\s*[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
};
export function makeCSV(run) {
  const rows = run.table?.length
    ? run.table
    : run.events?.length
      ? run.events
      : (run.metrics ?? []);
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return (
    [
      keys.map(cell).join(","),
      ...rows.map((r) =>
        keys
          .map((k) =>
            cell(
              typeof r[k] === "object" && r[k] !== null
                ? JSON.stringify(r[k])
                : r[k],
            ),
          )
          .join(","),
      ),
    ].join("\r\n") + "\r\n"
  );
}
