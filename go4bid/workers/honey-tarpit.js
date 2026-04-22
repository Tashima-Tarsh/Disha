/**
 * Task 3: The Honeypot Tarpit
 * Located at /api/v1/admin/data-export (False Lead).
 * Implements a 1-byte-per-second stream to lock up attacker tools.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // HONEYPOT TRAP: /api/v1/admin/data-export
    if (url.pathname === '/api/v1/admin/data-export') {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const metadata = {
        ua: request.headers.get('User-Agent'),
        geo: request.cf?.country || 'unknown',
        method: request.method,
        time: new Date().toISOString()
      };

      console.warn(`[TARPIT WARNING] High-risk access attempt from ${ip}. Metadata logged.`);
      
      // TRIGGER: Mock CERT-In Report Draft
      generateCertInReport(ip, metadata);

      // TARPIT EXECUTION: 1 byte per second stream
      const message = "UNAUTHORIZED ACCESS: This incident is being reported to CERT-In. Connection held for investigative purposes...";
      const encoder = new TextEncoder();
      const bytes = encoder.encode(message);

      const stream = new ReadableStream({
        async start(controller) {
          for (const byte of bytes) {
            controller.enqueue(new Uint8Array([byte]));
            // 1 second delay between bytes
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          controller.close();
        }
      });

      return new Response(stream, {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache',
          'X-Security-Action': 'TARPIT_ENGAGED'
        }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};

/**
 * Mock function to generate a CERT-In report draft.
 */
function generateCertInReport(ip, metadata) {
  const report = `
--- CERT-In Incident Report Draft ---
INCIDENT_TYPE: UNAUTHORIZED_DATA_EXPORT_ATTEMPT
SOURCE_IP: ${ip}
TIMESTAMP: ${metadata.time}
GEOLOCATION: ${metadata.geo}
USER_AGENT: ${metadata.ua}
THREAT_LEVEL: HIGH
ACTION_TAKEN: Connection Tarpitted (1B/s)
  `;
  console.log(report);
  // In real deployment, this would be emailed or sent to a secure webhook.
}
