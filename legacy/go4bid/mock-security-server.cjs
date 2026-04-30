const http = require('http');

/**
 * Task 3: The Honeypot Tarpit (Local Simulation)
 * Port: 5555
 */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ip = req.socket.remoteAddress;
  const method = req.method;
  const ua = req.headers['user-agent'] || 'unknown';

  console.log(`[ACCESS] ${method} ${url.pathname} from ${ip}`);

  // HONEYPOT TRAP: /api/v1/admin/data-export
  if (url.pathname === '/api/v1/admin/data-export') {
    console.warn(`[TARPIT] High-risk access attempt detected from ${ip}. Initiating Tarpit...`);
    
    // Log Metadata for CERT-In
    logIncident({ ip, ua, method, path: url.pathname });

    // TARPIT: 1 byte per second
    const message = "UNAUTHORIZED: Connection held for forensic analysis.";
    res.writeHead(403, {
      'Content-Type': 'text/plain',
      'Cache-Control': 'no-cache',
      'X-Security-Action': 'TARPIT_ENGAGED'
    });

    for (let i = 0; i < message.length; i++) {
        if (res.writableEnded) break;
        res.write(message[i]);
        // 1 second delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    res.end();
    return;
  }

  // SQLi LOGIC Simulation 
  if (url.search.includes("'") || url.search.includes("--")) {
    console.warn(`[SQLi] SQL Injection attempt detected: ${url.search}`);
    logIncident({ ip, ua, method, path: url.pathname, payload: url.search, type: 'SQL_INJECTION' });
    res.writeHead(400);
    res.end("Bad Request: Malicious Pattern Detected");
    return;
  }

  res.writeHead(200);
  res.end("Sovereign Node: Honey-API Active");
});

function logIncident(data) {
  process.stdout.write(`[LOG] INCIDENT_CAPTURED: ${JSON.stringify(data)}\n`);
}

server.listen(5555, () => {
  console.log('Sovereign Honey-API Mock Server running on port 5555');
});
