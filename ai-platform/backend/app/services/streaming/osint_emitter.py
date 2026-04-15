import asyncio
import json
import random
import time
from datetime import datetime
from typing import Any

import structlog
from app.core.config import get_settings
from app.services.streaming.kafka_service import KafkaProducer

logger = structlog.get_logger(__name__)

class OSINTFeedEmitter:
    """
    Real-time OSINT Feed Emitter.
    Simulates or fetches global intelligence events and publishes them to Kafka.
    """

    def __init__(self):
        self.settings = get_settings()
        self.producer = KafkaProducer()
        self.running = False
        self._mock_events = [
            {"type": "vulnerability", "source": "CVE-Database", "severity": "CRITICAL", "description": "Unauthenticated RCE in popular VPN gateway."},
            {"type": "leak", "source": "DarkWeb-Monitor", "severity": "HIGH", "description": "Credential dump found for major financial institution."},
            {"type": "malware", "source": "threat-intel-pulse", "severity": "MEDIUM", "description": "New variant of 'QuantumStealer' observed in the wild."},
            {"type": "market_volatility", "source": "Global-Markets-Feed", "severity": "HIGH", "description": "VIX Index spiking above 30. Major sell-off in emerging market tech stocks."},
            {"type": "supply_chain", "source": "Logistics-Intel", "severity": "CRITICAL", "description": "Maritime trade disruption in the Suez Canal. Shipping delays predicted for SETU materials."},
            {"type": "geopolitical", "source": "State-Intel-Brief", "severity": "CRITICAL", "description": "Escalation in regional conflict. Increased sovereign risk for Indo-Pacific trade corridors."},
            {"type": "blockchain_theft", "source": "Chain-Watch", "severity": "CRITICAL", "description": "Large movement of funds from hacked exchange wallet."}
        ]

    async def start(self):
        """Start the emitter loop."""
        self.running = True
        logger.info("osint_emitter_started", simulation=self.settings.OSINT_STREAM_SIMULATION_ENABLED)
        
        while self.running:
            try:
                if self.settings.OSINT_STREAM_SIMULATION_ENABLED:
                    await self._emit_simulated_event()
                else:
                    # In production, this would poll real APIs
                    await self._emit_simulated_event() 
                
                # Randomized interval between 5 to 15 seconds for realism
                await asyncio.sleep(random.uniform(5, 15))
            except Exception as e:
                logger.error("osint_emitter_error", error=str(e))
                await asyncio.sleep(10)

    async def stop(self):
        """Stop the emitter loop."""
        self.running = False
        self.producer.close()
        logger.info("osint_emitter_stopped")

    async def _emit_simulated_event(self):
        """Generate and publish a high-fidelity intelligence event."""
        event_template = random.choice(self._mock_events)
        event = {
            "event_id": f"evt-{int(time.time())}-{random.randint(1000, 9999)}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "metadata": {
                "confidentiality": "STRICT",
                "traffic_light_protocol": "RED" if event_template["severity"] == "CRITICAL" else "AMBER"
            },
            **event_template
        }

        # Publish to Kafka (internal logic in KafkaProducer handles transport)
        success = await self.producer.publish_event(
            self.settings.KAFKA_TOPIC_OSINT_STREAM,
            event,
            key=event["type"]
        )
        
        if success:
            logger.debug("osint_event_emitted", event_id=event["event_id"], type=event["type"])
        else:
            # Fallback log for local testing if Kafka is down
            logger.warning("osint_event_emitted_local_only", event_id=event["event_id"])
