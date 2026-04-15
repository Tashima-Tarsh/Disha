import asyncio
import structlog
from app.core.config import get_settings
from app.services.streaming.kafka_service import KafkaConsumer
from app.api.deps import get_connection_manager

logger = structlog.get_logger(__name__)

class OSINTStreamProcessor:
    """
    Real-time OSINT Stream Processor.
    Consumes intelligence events from Kafka and broadcasts them to connected UI clients.
    """

    def __init__(self):
        self.settings = get_settings()
        self.connection_manager = get_connection_manager()
        self.consumer = KafkaConsumer(
            topic=self.settings.KAFKA_TOPIC_OSINT_STREAM,
            group_id="osint-processor-v5-1"
        )
        self.running = False

    async def start(self):
        """Start the consumer and processor loop."""
        self.running = True
        logger.info("osint_processor_started")
        
        while self.running:
            try:
                # We use the consume method from KafkaConsumer
                # It accepts a handler function.
                await self.consumer.consume(
                    handler=self.process_event,
                    max_messages=10 # Process in small batches for responsiveness
                )
                # Small sleep to prevent tight loop if no messages
                await asyncio.sleep(1)
            except Exception as e:
                logger.error("osint_processor_error", error=str(e))
                await asyncio.sleep(5)

    async def stop(self):
        """Stop the processor."""
        self.running = False
        self.consumer.close()
        logger.info("osint_processor_stopped")

    async def process_event(self, event: dict):
        """
        Process a raw OSINT event and broadcast to UI.
        This is where enrichment (e.g. sentiment, entity enrichment) happens.
        """
        event_id = event.get("event_id", "unknown")
        
        # Enrichment: Calculate urgency based on severity
        severity = event.get("severity", "LOW")
        event["urgency"] = 100 if severity == "CRITICAL" else 75 if severity == "HIGH" else 50 if severity == "MEDIUM" else 25
        
        # Tagging for UI pulses
        event["ui_display_type"] = "PULSE_ALERT" if severity in ["CRITICAL", "HIGH"] else "NEWS_FEED"

        # Broadcast to all connected WebSocket clients via ConnectionManager
        # We wrap it in a standard message format
        broadcast_msg = {
            "type": "osint_pulse",
            "data": event
        }
        
        try:
            await self.connection_manager.broadcast_json(broadcast_msg)
            logger.debug("osint_event_processed_and_broadcast", event_id=event_id)
        except Exception as e:
            logger.error("osint_broadcast_failed", event_id=event_id, error=str(e))
