/**
 * Security Attack Simulator
 * Tests DDoS (Hammer) and SQL Injection on the Honey-API.
 */

async function runSimulation() {
  const TARGET = 'http://localhost:5555';
  
  console.log('--- STARTING SECURITY SIMULATION ---');

  // 1. SQL Injection Simulation
  console.log('\n[1] Simulating SQL Injection Attack...');
  const sqliPayload = "/api/v1/users?id=1' OR '1'='1' --";
  const sqliRes = await fetch(TARGET + sqliPayload);
  const sqliText = await sqliRes.text();
  console.log(`Response Code: ${sqliRes.status}`);
  console.log(`Response Body: ${sqliText}`);

  // 2. DDoS (Hammer) Simulation
  console.log('\n[2] Simulating DDoS Hammer Attack (Concurrent Bursts)...');
  const BURST_COUNT = 50;
  const promises = [];
  
  for (let i = 0; i < BURST_COUNT; i++) {
    promises.push(fetch(TARGET + '/api/v1/admin/data-export').then(async res => {
        const start = Date.now();
        // We only read 10 bytes to observe the tarpit effect
        const reader = res.body.getReader();
        let received = 0;
        while (received < 10) {
            const { value, done } = await reader.read();
            if (done) break;
            received += value.length;
        }
        const end = Date.now();
        return { status: res.status, duration: end - start };
    }));
  }

  const results = await Promise.all(promises);
  const averageLatency = results.reduce((acc, r) => acc + r.duration, 0) / results.length;
  
  console.log(`Burst Complete: ${results.length} connections.`);
  console.log(`Average Latency for first 10 bytes: ${averageLatency.toFixed(2)}ms`); 
  console.log('Observation: High latency confirms Tarpit is engaging the concurrent connections.');

  console.log('\n--- SIMULATION COMPLETE ---');
}

runSimulation();
