import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import https from "node:https";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoot = path.join(repoRoot, ".disha", "external-intelligence");
const runtimeStatusPath = path.join(runtimeRoot, "runtime-status.json");

const targets = [
  {
    id: "nousresearch-docs",
    repoId: "nousresearch",
    label: "NousResearch Hermes docs",
    url: "http://127.0.0.1:8020/docs/",
    healthUrl: "http://127.0.0.1:8020/docs/",
    cwd: path.join(runtimeRoot, "nousresearch", "website"),
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "start", "--", "--host", "127.0.0.1", "--port", "8020"],
    env: {},
    requiredPath: "package.json",
    mode: "docusaurus_docs",
  },
  {
    id: "nousresearch-landing",
    repoId: "nousresearch",
    label: "NousResearch Hermes landing page",
    url: "http://127.0.0.1:8021/",
    healthUrl: "http://127.0.0.1:8021/",
    cwd: path.join(runtimeRoot, "nousresearch", "landingpage"),
    command: "python",
    args: ["-m", "http.server", "8021", "--bind", "127.0.0.1"],
    env: {},
    requiredPath: "index.html",
    mode: "static_site",
  },
  {
    id: "pentagi-full",
    repoId: "pentagi",
    label: "Pentagi full product",
    url: "https://127.0.0.1:8443/",
    healthUrl: "https://127.0.0.1:8443/",
    cwd: path.join(runtimeRoot, "pentagi"),
    command: "docker",
    args: ["compose", "up"],
    env: {},
    requiredPath: "docker-compose.yml",
    mode: "docker_compose_product",
    notes: "This is the real Pentagi product path. It requires Docker Desktop/Compose and provider keys.",
  },
  {
    id: "pentagi-frontend-shell",
    repoId: "pentagi",
    label: "Pentagi frontend shell only",
    url: "http://127.0.0.1:8000/dashboard",
    healthUrl: "http://127.0.0.1:8000/",
    cwd: path.join(runtimeRoot, "pentagi", "frontend"),
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", "dev", "--", "--host", "127.0.0.1", "--port", "8000"],
    env: { VITE_API_URL: "127.0.0.1:3000" },
    requiredPath: "package.json",
    mode: "frontend_shell_not_full_product",
    notes: "Developer-only frontend shell. It is not the real Pentagi backend product.",
  },
  {
    id: "cyber-dashboard",
    repoId: "cyber-intelligence-platform",
    label: "Cyber intelligence FastAPI dashboard",
    url: "http://127.0.0.1:8010/",
    healthUrl: "http://127.0.0.1:8010/",
    cwd: path.join(runtimeRoot, "cyber-intelligence-platform"),
    command: "python",
    args: ["-m", "uvicorn", "ui.dashboard:app", "--host", "127.0.0.1", "--port", "8010"],
    env: { PYTHONPATH: "." },
    requiredPath: "ui/dashboard.py",
    mode: "live_ui_if_python_deps_installed",
  },
  {
    id: "osint-analyser",
    repoId: "osint-analyser",
    label: "OSINT analyser docker stack",
    url: null,
    healthUrl: null,
    cwd: path.join(runtimeRoot, "osint-analyser"),
    command: "docker",
    args: ["compose", "up"],
    env: {},
    requiredPath: "docker-compose.yml",
    mode: "env_gated_stack",
    notes: "Requires Docker and repository .env values for Telegram, MySQL, RabbitMQ, and analysis providers.",
  },
];

const wantsStatus = process.argv.includes("--status") || process.argv.length <= 2;
const upIndex = process.argv.indexOf("--up");
const upTarget = upIndex >= 0 ? process.argv[upIndex + 1] : "";

function commandExists(command) {
  const checker = process.platform === "win32" ? "where" : "which";
  try {
    execFileSync(checker, [command], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function httpStatus(url) {
  if (!url) return Promise.resolve({ live: false, statusCode: null });
  return new Promise((resolve) => {
    const client = url.startsWith("https:") ? https : http;
    const req = client.get(url, { rejectUnauthorized: false, timeout: 1500 }, (res) => {
      res.resume();
      resolve({ live: res.statusCode >= 200 && res.statusCode < 500, statusCode: res.statusCode });
    });
    req.on("timeout", () => {
      req.destroy();
      resolve({ live: false, statusCode: null });
    });
    req.on("error", () => resolve({ live: false, statusCode: null }));
  });
}

function isTargetReady(target) {
  return existsSync(path.join(target.cwd, target.requiredPath));
}

function startTarget(target) {
  if (!isTargetReady(target)) {
    throw new Error(`${target.id} is not synced at ${path.relative(repoRoot, target.cwd)}`);
  }
  if (!commandExists(target.command)) {
    throw new Error(`${target.command} is not available on PATH`);
  }

  const child = spawn(target.command, target.args, {
    cwd: target.cwd,
    detached: true,
    env: { ...process.env, ...target.env },
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}

async function collectStatus(started = []) {
  mkdirSync(runtimeRoot, { recursive: true });
  const services = await Promise.all(targets.map(async (target) => {
    const health = await httpStatus(target.healthUrl);
    return {
      id: target.id,
      repoId: target.repoId,
      label: target.label,
      mode: target.mode,
      url: target.url,
      cwd: path.relative(repoRoot, target.cwd).replaceAll("\\", "/"),
      command: [target.command, ...target.args].join(" "),
      synced: isTargetReady(target),
      commandAvailable: commandExists(target.command),
      live: health.live,
      statusCode: health.statusCode,
      startedPid: started.find((item) => item.id === target.id)?.pid ?? null,
      notes: target.notes ?? null,
    };
  }));

  const payload = {
    generatedAt: new Date().toISOString(),
    rule: "DISHA launches external repositories as their own local apps; it does not fake their dashboards or vendor their code.",
    services,
  };
  writeFileSync(runtimeStatusPath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

const started = [];
if (upTarget) {
  const selected = upTarget === "all"
    ? targets.filter((target) => target.mode !== "frontend_shell_not_full_product" && target.mode !== "env_gated_stack")
    : targets.filter((target) => target.id === upTarget);
  if (!selected.length) {
    throw new Error(`Unknown external runtime target: ${upTarget}`);
  }
  for (const target of selected) {
    const health = await httpStatus(target.healthUrl);
    if (health.live) continue;
    const pid = startTarget(target);
    started.push({ id: target.id, pid });
  }
}

const payload = await collectStatus(started);

if (wantsStatus || upTarget) {
  console.log(JSON.stringify(payload, null, 2));
} else if (existsSync(runtimeStatusPath)) {
  console.log(readFileSync(runtimeStatusPath, "utf8"));
}
