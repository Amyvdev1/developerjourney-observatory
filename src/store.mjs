import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function openStore(filename, initial) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(
    `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS run (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS run_event (run_id TEXT NOT NULL REFERENCES run(id), sequence INTEGER NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(run_id,sequence)); PRAGMA foreign_keys=ON;`,
  );
  db.prepare("INSERT OR IGNORE INTO workspace VALUES (1,0,?)").run(
    JSON.stringify(initial),
  );
  return {
    state: () =>
      JSON.parse(
        db.prepare("SELECT payload FROM workspace WHERE id=1").get().payload,
      ),
    revision: () =>
      db.prepare("SELECT revision FROM workspace WHERE id=1").get().revision,
    runs: () =>
      db
        .prepare(
          "SELECT payload FROM run ORDER BY created_at DESC, rowid DESC LIMIT 200",
        )
        .all()
        .map((r) => JSON.parse(r.payload)),
    commit(state, run, expected) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const revision = db
          .prepare("SELECT revision FROM workspace WHERE id=1")
          .get().revision;
        if (expected !== revision) {
          const error = new Error("Workspace changed. Reload before saving.");
          error.status = 409;
          error.code = "REVISION_CONFLICT";
          throw error;
        }
        db.prepare(
          "UPDATE workspace SET payload=?, revision=revision+1 WHERE id=1",
        ).run(JSON.stringify(state));
        if (run) {
          db.prepare("INSERT INTO run VALUES (?,?,?,?)").run(
            run.id,
            run.createdAt,
            run.operation,
            JSON.stringify(run),
          );
          (run.events ?? []).forEach((event, index) =>
            db
              .prepare("INSERT INTO run_event VALUES (?,?,?)")
              .run(run.id, index, JSON.stringify(event)),
          );
        }
        db.exec("COMMIT");
        return revision + 1;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    close: () => db.close(),
  };
}
