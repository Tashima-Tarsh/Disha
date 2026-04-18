import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
from collections import defaultdict
import structlog

logger = structlog.get_logger(__name__)

class MessageType(Enum):
    REQUEST = "request"
    RESPONSE = "response"
    BROADCAST = "broadcast"
    DELEGATE = "delegate"
    CONSENSUS = "consensus"
    FEEDBACK = "feedback"

class Priority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3

@dataclass
class AgentMessage:
    sender: str
    receiver: str
    message_type: MessageType
    content: dict
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str = ""
    priority: Priority = Priority.NORMAL
    timestamp: float = field(default_factory=time.time)
    parent_message_id: Optional[str] = None
    requires_response: bool = False
    ttl: int = 300

    def is_expired(self) -> bool:
        return time.time() - self.timestamp > self.ttl

class Conversation:

    def __init__(self, conversation_id: Optional[str] = None, topic: str = ""):
        self.conversation_id = conversation_id or str(uuid.uuid4())
        self.topic = topic
        self.messages: list = []
        self.participants: set = set()
        self.started_at = time.time()
        self.status = "active"
        self.conclusion: Optional[dict] = None

    def add_message(self, message: AgentMessage):
        message.conversation_id = self.conversation_id
        self.messages.append(message)
        self.participants.add(message.sender)
        if message.receiver != "*":
            self.participants.add(message.receiver)

    def get_history(self, last_n: Optional[int] = None) -> list:
        msgs = self.messages
        if last_n:
            msgs = msgs[-last_n:]
        return [
            {
                "sender": m.sender,
                "receiver": m.receiver,
                "type": m.message_type.value,
                "content": m.content,
                "timestamp": m.timestamp,
            }
            for m in msgs
        ]

    def conclude(self, conclusion: dict):
        self.status = "concluded"
        self.conclusion = conclusion

class MessageRouter:

    def __init__(self):
        self.conversations: dict = {}
        self.agent_inboxes: dict = defaultdict(list)
        self.message_log: list = []
        self._subscribers: dict = defaultdict(list)

    def create_conversation(self, topic: str = "") -> Conversation:
        conv = Conversation(topic=topic)
        self.conversations[conv.conversation_id] = conv
        return conv

    def send(self, message: AgentMessage) -> str:
        self.message_log.append(message)

        if message.conversation_id and message.conversation_id in self.conversations:
            self.conversations[message.conversation_id].add_message(message)

        if message.receiver == "*":

            for agent_name in list(self.agent_inboxes.keys()):
                if agent_name != message.sender:
                    self.agent_inboxes[agent_name].append(message)
        else:
            self.agent_inboxes[message.receiver].append(message)

        logger.info(
            "message_routed",
            sender=message.sender,
            receiver=message.receiver,
            type=message.message_type.value,
            conversation=message.conversation_id[:8] if message.conversation_id else "none",
        )

        return message.message_id

    def receive(self, agent_name: str, max_messages: int = 10) -> list:
        inbox = self.agent_inboxes.get(agent_name, [])

        valid = [m for m in inbox if not m.is_expired()]
        self.agent_inboxes[agent_name] = valid[max_messages:]

        return valid[:max_messages]

    def register_agent(self, agent_name: str):
        if agent_name not in self.agent_inboxes:
            self.agent_inboxes[agent_name] = []
            logger.info("agent_registered", agent=agent_name)

    def get_conversation(self, conversation_id: str) -> Optional[Conversation]:
        return self.conversations.get(conversation_id)

    def get_stats(self) -> dict:
        return {
            "total_messages": len(self.message_log),
            "active_conversations": sum(
                1 for c in self.conversations.values() if c.status == "active"
            ),
            "registered_agents": len(self.agent_inboxes),
            "pending_messages": sum(len(v) for v in self.agent_inboxes.values()),
        }
