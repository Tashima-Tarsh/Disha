import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import process from "node:process";

const require = createRequire(import.meta.url);
if (process.env.DATABASE_URL) {
  const migration = spawnSync(process.execPath, ["scripts/apply-schema.mjs"], { stdio: "inherit", env: process.env });
  if (migration.status !== 0) process.exit(migration.status ?? 1);
}

const nextCli = require.resolve("next/dist/bin/next");
const child = spawn(process.execPath, [nextCli, "start", ...process.argv.slice(2)], { stdio: "inherit", env: process.env });
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
