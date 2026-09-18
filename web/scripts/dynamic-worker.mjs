import crypto from "node:crypto";

const baseUrl = (process.env.DISHA_INTERNAL_WEB_URL || "http://web:3000").replace(/\/$/, "");
const token = process.env.DISHA_WORKER_TOKEN;
const pollSeconds = Math.max(5, Math.min(3600, Number(process.env.DISHA_SCHEDULER_POLL_SECONDS || 30)));
const readinessTimeoutMs = Math.max(5_000, Math.min(300_000, Number(process.env.DISHA_WORKER_READINESS_TIMEOUT_MS || 120_000)));
const readinessPollMs = Math.max(250, Math.min(10_000, Number(process.env.DISHA_WORKER_READINESS_POLL_MS || 1_000)));
const workerId = process.env.DISHA_WORKER_ID || `worker-${crypto.randomUUID()}`;
if (!token) throw new Error("DISHA_WORKER_TOKEN is required");

async function waitForWebReady() {
  const deadline = Date.now() + readinessTimeoutMs;
  let attempts = 0;
  while (Date.now() < deadline) {
    attempts += 1;
    try {
      const response = await fetch(`${baseUrl}/api/v1/health`, {
        method: "GET",
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(Math.min(5_000, readinessPollMs * 2)),
      });
      if (response.ok) {
        process.stdout.write(`[${new Date().toISOString()}] worker ready after ${attempts} readiness checks\n`);
        return;
      }
    } catch {
      // Startup is expected to race the web process on shared-service deployments.
      // Suppress transient connection errors until the readiness deadline expires.
    }
    await sleep(readinessPollMs);
  }
  throw new Error(`DISHA web runtime did not become ready within ${readinessTimeoutMs}ms at ${baseUrl}`);
}

async function call(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${path} failed ${response.status}: ${text.slice(0, 500)}`);
  return text;
}

async function tick() {
  const maxJobs = Number(process.env.DISHA_SCHEDULER_MAX_JOBS || 10);
  const scheduler = await call("/api/internal/scheduler/tick", { maxJobs });
  const workflows = await call("/api/internal/workflows/tick", {
    workerId,
    maxJobs: Number(process.env.DISHA_WORKFLOW_MAX_JOBS || maxJobs),
    leaseSeconds: Number(process.env.DISHA_WORKFLOW_LEASE_SECONDS || 120),
  });
  process.stdout.write(`[${new Date().toISOString()}] scheduler ${scheduler}\n`);
  process.stdout.write(`[${new Date().toISOString()}] workflows ${workflows}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

await waitForWebReady();
for (;;) {
  try {
    await tick();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] worker tick failed:`, error);
  }
  await sleep(pollSeconds * 1000);
}
