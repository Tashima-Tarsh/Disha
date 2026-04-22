/**
 * Cloudflare Tarpit Worker (Honey-API Protection)
 * Rule 6: Suspicious traffic must be Tarpitted (delayed).
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // HONEYPOT: Any request to /api/v1/auth or sensitive endpoints
    // is checked for suspicious patterns (e.g., high rate, suspicious User-Agents)
    const isHoneyEndpoint = url.pathname.includes('/honey-api/') || url.pathname === '/api/v1/secure-bidding';
    
    // Check for suspicious signals (Mock logic)
    const rateLimitExceeded = false; // Integrate with KV or Durable Objects for real rate limiting
    const suspiciousUA = request.headers.get('User-Agent')?.includes('sqlmap') || false;

    if (isHoneyEndpoint && (rateLimitExceeded || suspiciousUA)) {
      console.log(`[TARPIT] Delaying suspicious request from ${request.headers.get('CF-Connecting-IP')}`);
      
      /**
       * TARPIT LOGIC:
       * Delaying the response to waste the attacker's resources.
       * 30 seconds is a standard tarpit delay.
       */
      await scheduler.wait(30000); 

      return new Response(JSON.stringify({ 
        error: "Maintenance in progress", 
        code: "TARPIT_ACTIVE" 
      }), {
        status: 503,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Normal traffic continues to Origin
    return await fetch(request);
  },
};
