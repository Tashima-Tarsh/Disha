import asyncio
import httpx
import logging
import datetime
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("DISHA-AutoHeal")

SERVICES = {
    "alerts": "http://localhost:8001/",
    "forecast": "http://localhost:8002/"
}

class AutoHeal:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=5.0)
        self.heal_counts = {name: 0 for name in SERVICES}

    async def check_health(self, name, url):
        try:
            response = await self.client.get(url)
            if response.status_code == 200:
                logger.info(f"Service '{name}' is healthy.")
                return True
        except Exception as e:
            logger.warning(f"Service '{name}' is UNHEALTHY: {e}")
            return False

    async def self_heal(self, name):
        logger.info(f"Attempting self-healing for '{name}'...")
        self.heal_counts[name] += 1
        
        # In a real Docker/K8s environment, this would call container restart APIs
        # For this demonstration, we simulate a restart
        logger.info(f"RESTART COMMAND SENT to container: disha-{name}-v6")
        
        # Simulate wait for restart
        await asyncio.sleep(2)
        logger.info(f"Service '{name}' has been successfully RESTARTED (Attempt #{self.heal_counts[name]})")

    async def run_loop(self):
        logger.info("DISHA Autonomous Layer Started.")
        while True:
            for name, url in SERVICES.items():
                is_healthy = await self.check_health(name, url)
                if not is_healthy:
                    await self.self_heal(name)
            
            await asyncio.sleep(10) # Check every 10 seconds

if __name__ == "__main__":
    auto_heal = AutoHeal()
    try:
        asyncio.run(auto_heal.run_loop())
    except KeyboardInterrupt:
        logger.info("Autonomous Layer shutting down.")
