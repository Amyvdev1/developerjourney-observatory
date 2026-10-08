import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { openStore } from "./store.mjs";
import {
  initialState,
  validateState,
  validateReplacement,
  transact,
  describe,
} from "./domain.mjs";
import { InputError } from "./validation.mjs";
import { makeReport, makeCSV } from "./report.mjs";
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
export function createApplication({ database = ":memory:" } = {}) {
  const store = openStore(database, initialState());
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    const send = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(data));
    };
    try {
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}`
      )
        throw new InputError(
          "Cross-origin requests are not allowed",
          "ORIGIN_DENIED",
          403,
        );
      const host = req.headers.host?.split(":")[0];
      if (!["127.0.0.1", "localhost", "["].includes(host))
        throw new InputError(
          "Use the local loopback address",
          "HOST_DENIED",
          403,
        );
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (req.method === "GET" && url.pathname === "/api/health")
        return send(200, {
          status: "ok",
          product: describe.name,
          mode: "local",
        });
      if (req.method === "GET" && url.pathname === "/api/state")
        return send(200, {
          state: store.state(),
          runs: store.runs(),
          revision: store.revision(),
          product: describe,
        });
      if (req.method === "GET" && url.pathname === "/api/contract")
        return send(
          200,
          JSON.parse(
            readFileSync(resolve(root, "docs/api-contract.json"), "utf8"),
          ),
        );
      if (req.method === "GET" && url.pathname === "/api/export") {
        const run =
          store.runs().find((r) => r.id === url.searchParams.get("id")) ??
          (!url.searchParams.get("id") ? store.runs()[0] : null);
        if (!run)
          throw new InputError(
            "Run a scenario or create a decision first",
            "RUN_NOT_FOUND",
            404,
          );
        const format = url.searchParams.get("format") ?? "json";
        if (!["json", "csv", "markdown"].includes(format))
          throw new InputError("Choose json, csv or markdown");
        const output =
          format === "json"
            ? JSON.stringify(run, null, 2)
            : format === "csv"
              ? makeCSV(run)
              : makeReport(describe, run);
        res.writeHead(200, {
          "Content-Type":
            format === "json"
              ? "application/json"
              : format === "csv"
                ? "text/csv; charset=utf-8"
                : "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${describe.slug}-${run.id}.${format === "markdown" ? "md" : format}"`,
        });
        return res.end(output);
      }
      if (
        req.method === "POST" &&
        ["/api/action", "/api/state"].includes(url.pathname)
      ) {
        if (!(req.headers["content-type"] ?? "").includes("application/json"))
          throw new InputError(
            "Content-Type must be application/json",
            "CONTENT_TYPE",
            415,
          );
        let body = "";
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 131072)
            throw new InputError(
              "Request exceeds 128 KiB",
              "BODY_TOO_LARGE",
              413,
            );
        }
        let payload;
        try {
          payload = JSON.parse(body);
        } catch {
          throw new InputError(
            "Request must contain valid JSON",
            "INVALID_JSON",
          );
        }
        if (!payload || Array.isArray(payload) || typeof payload !== "object")
          throw new InputError("Request must be an object");
        const expected = payload.revision;
        if (!Number.isInteger(expected))
          throw new InputError("Workspace revision is required");
        let state, result;
        const started = performance.now();
        if (url.pathname === "/api/state") {
          state = validateReplacement(payload.state, store.state());
          result = null;
        } else {
          ({ state, result } = transact(store.state(), payload));
        }
        const run = result
          ? {
              ...result,
              id: randomUUID(),
              createdAt: new Date().toISOString(),
              operation: payload.kind,
              observedExecutionMs:
                Math.round((performance.now() - started) * 1000) / 1000,
            }
          : null;
        const revision = store.commit(state, run, expected);
        return send(200, { state, run, revision });
      }
      if (url.pathname.startsWith("/api/"))
        throw new InputError("Route not found", "NOT_FOUND", 404);
      if (req.method !== "GET")
        throw new InputError("Method not allowed", "METHOD_NOT_ALLOWED", 405);
      let filepath = resolve(
        root,
        "dist",
        "." + decodeURIComponent(url.pathname),
      );
      const publicRoot = resolve(root, "dist");
      if (filepath !== publicRoot && !filepath.startsWith(publicRoot + sep))
        throw new InputError("Invalid path", "INVALID_PATH");
      if (!existsSync(filepath) || !extname(filepath))
        filepath = resolve(publicRoot, "index.html");
      if (!existsSync(filepath))
        throw new InputError(
          "Build the dashboard with npm run build first",
          "BUILD_REQUIRED",
          503,
        );
      const mime = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
      };
      res.writeHead(200, {
        "Content-Type": mime[extname(filepath)] ?? "application/octet-stream",
      });
      res.end(readFileSync(filepath));
    } catch (error) {
      if (!res.headersSent)
        send(error.status ?? 500, {
          error: {
            code: error.code ?? "INTERNAL_ERROR",
            message:
              error.status || error instanceof InputError
                ? error.message
                : "Unexpected server error",
          },
        });
      else res.end();
    }
  });
  return {
    server,
    store,
    close: async () => {
      await new Promise((resolve) => server.close(resolve));
      store.close();
    },
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const app = createApplication({
    database:
      process.env.DATABASE_PATH ?? resolve(root, "data/workspace.sqlite"),
  });
  const port = Number(process.env.PORT ?? describe.port);
  app.server.listen(port, process.env.BIND_HOST ?? "127.0.0.1", () =>
    console.log(
      `${describe.name}: http://127.0.0.1:${port} (local, persistent SQLite)`,
    ),
  );
  const stop = () =>
    app.server.close(() => {
      app.store.close();
      process.exit(0);
    });
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
