import json
from typing import Any, Callable

import structlog

from app.core.config import get_settings

logger = structlog.get_logger(__name__)


class KafkaProducer:
    def __init__(self):
        self.settings = get_settings()
        self._producer = None

    def _get_producer(self):
        if self._producer is None:
            from kafka import KafkaProducer as KP

            self._producer = KP(
                bootstrap_servers=self.settings.KAFKA_BOOTSTRAP_SERVERS.split(","),
                value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
                key_serializer=lambda k: k.encode("utf-8") if k else None,
            )
        return self._producer

    async def publish_event(
        self, topic: str, event: dict[str, Any], key: str | None = None
    ) -> bool:
        try:
            producer = self._get_producer()
            producer.send(topic, value=event, key=key)
            producer.flush()
            logger.info("event_published", topic=topic, key=key)
            return True
        except Exception as e:
            logger.error("publish_failed", topic=topic, error=str(e))
            return False

    async def publish_investigation_event(
        self, investigation_id: str, data: dict[str, Any]
    ) -> bool:
        event = {
            "type": "investigation_result",
            "investigation_id": investigation_id,
            "data": data,
        }
        return await self.publish_event(
            self.settings.KAFKA_TOPIC_EVENTS,
            event,
            key=investigation_id,
        )

    async def publish_alert(self, alert: dict[str, Any]) -> bool:
        return await self.publish_event(
            self.settings.KAFKA_TOPIC_ALERTS,
            alert,
            key=alert.get("alert_id"),
        )

    def close(self):
        if self._producer:
            self._producer.close()
            self._producer = None


class KafkaConsumer:
    def __init__(self, topic: str, group_id: str = "intelligence-group"):
        self.settings = get_settings()
        self.topic = topic
        self.group_id = group_id
        self._consumer = None

    def _get_consumer(self):
        if self._consumer is None:
            from kafka import KafkaConsumer as KC

            self._consumer = KC(
                self.topic,
                bootstrap_servers=self.settings.KAFKA_BOOTSTRAP_SERVERS.split(","),
                group_id=self.group_id,
                value_deserializer=lambda v: json.loads(v.decode("utf-8")),
                auto_offset_reset="latest",
                enable_auto_commit=True,
            )
        return self._consumer

    async def consume(
        self, handler: Callable[[dict[str, Any]], Any], max_messages: int | None = None
    ) -> None:
        try:
            consumer = self._get_consumer()
            count = 0
            for message in consumer:
                await handler(message.value)
                count += 1
                if max_messages and count >= max_messages:
                    break
        except Exception as e:
            logger.error("consume_failed", topic=self.topic, error=str(e))

    def close(self):
        if self._consumer:
            self._consumer.close()
            self._consumer = None
