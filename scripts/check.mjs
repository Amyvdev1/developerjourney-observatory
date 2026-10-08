import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
for (const dir of ["src", "scripts", "tests"])
  for (const name of readdirSync(dir).filter((x) => x.endsWith(".mjs"))) {
    const r = spawnSync(process.execPath, ["--check", `${dir}/${name}`], {
      stdio: "inherit",
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
console.log(
  "JavaScript syntax checks passed. JSX is checked by the production build.",
);
