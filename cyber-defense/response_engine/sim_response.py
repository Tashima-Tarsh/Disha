"""
Disha Response Engine - Simulated Countermeasures

Provides virtual-only defensive responses to detected attacks.
All actions are simulated within containers — NO real-world impact.

DEFENSIVE SIMULATION ONLY - No offensive actions.
"""

import json
import logging
import random
import time

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ResponseEngine] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)


class SimulatedResponse:
    """Base class for simulated defensive responses."""

    def __init__(self):
        self.log_entries = []

    def _log_action(self, action: str, details: dict) -> dict:
        entry = {
            "action": action,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "simulated": True,
            **details,
        }
        self.log_entries.append(entry)
        logger.info("Action: %s | Details: %s", action, json.dumps(details))
        return entry


class TarpitResponse(SimulatedResponse):
    """Simulates a tarpit that slows down attacker interactions."""

    def engage(self, attacker_ip: str, delay_seconds: float = 0.0) -> dict:
        if delay_seconds <= 0:
            delay_seconds = random.uniform(5.0, 15.0)
        logger.info(
            "Tarpit engaged for %s: delaying %.1fs", attacker_ip, delay_seconds
        )
        # In production, this would add artificial delay to responses
        # Here we just log the simulated delay
        return self._log_action(
            "tarpit",
            {"attacker_ip": attacker_ip, "delay_seconds": round(delay_seconds, 1)},
        )


class FakeShellResponse(SimulatedResponse):
    """Simulates a fake shell environment for attacker interaction logging."""

    FAKE_RESPONSES = {
        "ls": "Desktop  Documents  Downloads  .ssh  .bash_history",
        "whoami": "root",
        "cat /etc/passwd": "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:",
        "uname -a": "Linux honeypot 5.4.0-generic #1 SMP x86_64 GNU/Linux",
        "id": "uid=0(root) gid=0(root) groups=0(root)",
        "pwd": "/root",
        "cat /etc/shadow": "Permission denied",
    }

    def process_command(self, attacker_ip: str, command: str) -> dict:
        response = self.FAKE_RESPONSES.get(
            command.strip(), f"bash: {command.strip()}: command not found"
        )
        return self._log_action(
            "fake_shell",
            {
                "attacker_ip": attacker_ip,
                "command": command.strip(),
                "fake_response": response,
            },
        )


class DecoyFilesystem(SimulatedResponse):
    """Simulates a decoy filesystem with fake sensitive files."""

    DECOY_FILES = {
        "/root/.ssh/id_rsa": "-----BEGIN FAKE RSA PRIVATE KEY-----\nNOT_A_REAL_KEY\n-----END FAKE RSA PRIVATE KEY-----",
        "/etc/config/db.conf": "host=decoy.internal\nuser=admin\npassword=decoy_password_not_real",
        "/var/www/html/.env": "DB_HOST=localhost\nDB_PASS=fake_credential_for_honeypot",
        "/root/credentials.txt": "admin:decoy_password\nroot:not_a_real_password",
    }

    def serve_file(self, attacker_ip: str, filepath: str) -> dict:
        return self._log_action(
            "decoy_filesystem",
            {
                "attacker_ip": attacker_ip,
                "requested_file": filepath,
                "served_decoy": filepath in self.DECOY_FILES,
                "content": self.DECOY_FILES.get(filepath, "File not found"),
            },
        )


class ContainmentZone(SimulatedResponse):
    """Simulates a virtual containment zone for attackers.

    In a real deployment, this would redirect attacker traffic
    to an isolated sandbox. Here it logs the containment action.
    """

    def __init__(self):
        super().__init__()
        self.contained_ips: dict[str, dict] = {}

    def contain(self, attacker_ip: str, reason: str) -> dict:
        self.contained_ips[attacker_ip] = {
            "reason": reason,
            "contained_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        return self._log_action(
            "containment",
            {
                "attacker_ip": attacker_ip,
                "reason": reason,
                "zone": "virtual_sandbox",
                "note": "No real systems affected",
            },
        )

    def is_contained(self, ip: str) -> bool:
        return ip in self.contained_ips


class ResponseOrchestrator:
    """Orchestrates simulated responses based on threat analysis."""

    def __init__(self):
        self.tarpit = TarpitResponse()
        self.fake_shell = FakeShellResponse()
        self.decoy_fs = DecoyFilesystem()
        self.containment = ContainmentZone()

    def respond(self, analysis: dict) -> list[dict]:
        """Determine and execute appropriate responses based on analysis."""
        actions = []
        threat_score = analysis.get("threat_score", 0)
        attacker_ip = analysis.get("input", {}).get("ip", "unknown")
        classification = analysis.get("analysis", {}).get("classification", {})
        attack_label = classification.get("label", "benign")

        # Low threat: just log
        if threat_score < 20:
            logger.info("Low threat from %s (score: %d). Monitoring.", attacker_ip, threat_score)
            return actions

        # Medium threat: engage tarpit
        if threat_score < 50:
            actions.append(self.tarpit.engage(attacker_ip))
            return actions

        # High threat: full response
        if threat_score >= 50:
            actions.append(self.tarpit.engage(attacker_ip, delay_seconds=15.0))

            if attack_label in ("brute_force", "injection"):
                actions.append(
                    self.containment.contain(
                        attacker_ip, f"High-threat {attack_label} detected"
                    )
                )

            if attack_label == "scan":
                actions.append(
                    self.decoy_fs.serve_file(attacker_ip, "/root/.ssh/id_rsa")
                )

        # Critical threat: immediate containment
        if threat_score >= 80:
            if not self.containment.is_contained(attacker_ip):
                actions.append(
                    self.containment.contain(
                        attacker_ip, f"Critical threat (score: {threat_score})"
                    )
                )

        return actions


def main():
    """Demo: Run simulated responses."""
    logger.info("=" * 60)
    logger.info("Disha Response Engine - Simulated Countermeasures")
    logger.info("SIMULATION ONLY - No real systems are affected")
    logger.info("=" * 60)

    orchestrator = ResponseOrchestrator()

    # Simulate responses for different threat levels
    test_analyses = [
        {
            "input": {"ip": "10.0.0.1"},
            "analysis": {"classification": {"label": "benign"}},
            "threat_score": 5,
        },
        {
            "input": {"ip": "192.168.1.100"},
            "analysis": {"classification": {"label": "scan"}},
            "threat_score": 35,
        },
        {
            "input": {"ip": "172.16.0.50"},
            "analysis": {"classification": {"label": "brute_force"}},
            "threat_score": 65,
        },
        {
            "input": {"ip": "10.8.34.56"},
            "analysis": {"classification": {"label": "injection"}},
            "threat_score": 90,
        },
    ]

    for analysis_result in test_analyses:
        ip = analysis_result["input"]["ip"]
        score = analysis_result["threat_score"]
        logger.info("\n--- Processing: IP=%s, Threat=%d ---", ip, score)
        actions = orchestrator.respond(analysis_result)
        for action in actions:
            logger.info("  -> %s", json.dumps(action))

    logger.info("\nSimulation complete. All actions were virtual.")


if __name__ == "__main__":
    main()
