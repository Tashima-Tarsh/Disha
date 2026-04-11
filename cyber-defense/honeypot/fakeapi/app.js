"use strict";
/**
 * Disha Fake API Honeypot
 *
 * Simulates vulnerable API endpoints to capture attacker behavior.
 * Logs all requests to structured JSON for analysis.
 *
 * DEFENSIVE SIMULATION ONLY - No offensive actions.
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const LOG_DIR = path.join(__dirname, "logs");
const LOG_FILE = path.join(LOG_DIR, "api-activity.json");

// Ensure log directory exists
fs.mkdirSync(LOG_DIR, { recursive: true });

// Middleware
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting to protect the honeypot itself
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});
app.use(limiter);

/**
 * Log activity to structured JSON file.
 * @param {object} data - Activity data to log
 */
function logActivity(data) {
  const entry = {
    ...data,
    timestamp: new Date().toISOString(),
    user_agent: data.user_agent || "unknown",
  };
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
}

// ---------------------------------------------------------------------------
// Simulated Vulnerable Endpoints
// ---------------------------------------------------------------------------

// Fake authentication endpoint (captures credential attempts)
app.post("/auth", (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  logActivity({
    ip: clientIp,
    endpoint: "/auth",
    method: "POST",
    payload: req.body,
    user_agent: req.get("User-Agent"),
  });

  // Tarpit: random delay to slow down brute-force attacks
  const delay = Math.floor(Math.random() * 2000) + 500;
  setTimeout(() => {
    res
      .status(200)
      .json({ status: "error", message: "Invalid credentials" });
  }, delay);
});

// Fake data endpoint (exposes decoy data)
app.get("/data", (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  logActivity({
    ip: clientIp,
    endpoint: "/data",
    method: "GET",
    query: req.query,
    user_agent: req.get("User-Agent"),
  });

  res.status(200).json({
    data: [
      { id: 1, name: "DECOY_RECORD_001", value: "not_a_real_secret" },
      { id: 2, name: "DECOY_RECORD_002", value: "fake_api_key_12345" },
    ],
    note: "This is simulated data for honeypot analysis",
  });
});

// Fake admin panel
app.get("/admin", (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  logActivity({
    ip: clientIp,
    endpoint: "/admin",
    method: "GET",
    query: req.query,
    user_agent: req.get("User-Agent"),
  });

  res.status(200).json({
    status: "error",
    message: "Access denied. This incident has been logged.",
  });
});

// Fake file upload (captures payload metadata)
app.post("/upload", (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  logActivity({
    ip: clientIp,
    endpoint: "/upload",
    method: "POST",
    content_length: req.get("Content-Length"),
    content_type: req.get("Content-Type"),
    user_agent: req.get("User-Agent"),
  });

  res.status(200).json({ status: "uploaded", filename: "decoy_response.txt" });
});

// Fake database query endpoint
app.get("/api/v1/users", (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  logActivity({
    ip: clientIp,
    endpoint: "/api/v1/users",
    method: "GET",
    query: req.query,
    user_agent: req.get("User-Agent"),
  });

  res.status(200).json({
    users: [
      { id: 1, username: "admin", role: "administrator" },
      { id: 2, username: "operator", role: "user" },
    ],
    total: 2,
  });
});

// Catch-all for any other requests
app.all("*", (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  logActivity({
    ip: clientIp,
    endpoint: req.path,
    method: req.method,
    query: req.query,
    payload: req.body,
    user_agent: req.get("User-Agent"),
  });

  res.status(404).json({ error: "Not found" });
});

// Start server
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Fake API honeypot running on 0.0.0.0:${PORT}`);
  });
}

module.exports = app;
