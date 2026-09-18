import crypto from "node:crypto";

const baseUrl = (process.env.DISHA_INTERNAL_WEB_URL || "http://web:3000").replace(/\/$/, "");
const token = process.env.DISHA_WORKER_TOKEN;
const pollSeconds = Math.max(5, Math.min(3600, Number(process.env.DISHA_SCHEDULER_POLL_SECONDS || 30)));
const workerId = process.env.DISHA_WORKER_ID || `worker-${crypto.randomUUID()}`;
if (!token) throw new Error("DISHA_WORKER_TOKEN is required");

async function call(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
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

for (;;) {
  try { await tick(); } catch (error) { console.error(`[${new Date().toISOString()}]`, error); }
  await new Promise((resolve) => setTimeout(resolve, pollSeconds * 1000));
}
