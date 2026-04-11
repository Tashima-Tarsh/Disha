"use strict";
/**
 * Tests for Disha Fake API Honeypot
 */

const { describe, it } = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

const app = require("./app");

let server;
let baseUrl;

function startServer() {
  return new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (server) server.close(resolve);
    else resolve();
  });
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { "Content-Type": "application/json" },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({ status: res.statusCode, body: JSON.parse(data) });
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe("Fake API Honeypot", () => {
  it("should respond to POST /auth with error status", async () => {
    await startServer();
    try {
      const res = await request("POST", "/auth", {
        user: "admin",
        pass: "test",
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "error");
      assert.ok(res.body.message.includes("Invalid credentials"));
    } finally {
      await stopServer();
    }
  });

  it("should respond to GET /data with decoy data", async () => {
    await startServer();
    try {
      const res = await request("GET", "/data");
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length > 0);
    } finally {
      await stopServer();
    }
  });

  it("should respond to GET /admin with access denied", async () => {
    await startServer();
    try {
      const res = await request("GET", "/admin");
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, "error");
    } finally {
      await stopServer();
    }
  });

  it("should respond to GET /api/v1/users with decoy users", async () => {
    await startServer();
    try {
      const res = await request("GET", "/api/v1/users");
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.users));
    } finally {
      await stopServer();
    }
  });

  it("should return 404 for unknown paths", async () => {
    await startServer();
    try {
      const res = await request("GET", "/nonexistent");
      assert.strictEqual(res.status, 404);
    } finally {
      await stopServer();
    }
  });
});
