from __future__ import annotations

import os
from dataclasses import asdict, dataclass

import psutil


@dataclass(slots=True)
class TelemetrySample:
    device_id: str
    user_id: str
    cpu_percent: float
    memory_percent: float
    process_count: int
    network_sent_kb: float
    network_recv_kb: float
    active_app: str | None = None
    source: str = "desktop-agent"


class TelemetryCollector:
    def __init__(self) -> None:
        self.device_id = os.getenv("JARVIS_X_DEVICE_ID", "desktop")
        self.user_id = os.getenv("JARVIS_X_USER_ID", "local-user")

    def collect(self) -> dict:
        net = psutil.net_io_counters()
        sample = TelemetrySample(
            device_id=self.device_id,
            user_id=self.user_id,
            cpu_percent=psutil.cpu_percent(interval=0.5),
            memory_percent=psutil.virtual_memory().percent,
            process_count=len(psutil.pids()),
            network_sent_kb=round(net.bytes_sent / 1024.0, 2),
            network_recv_kb=round(net.bytes_recv / 1024.0, 2),
        )
        return asdict(sample)
