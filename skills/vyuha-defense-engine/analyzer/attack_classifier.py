from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path


def _load_sibling(module_filename: str):
    here = Path(__file__).resolve().parent
    module_path = here / module_filename
    module_name = f"vyuha_{Path(module_filename).stem}"
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if not spec or not spec.loader:
        raise RuntimeError(f"Failed to load module: {module_filename}")
    mod = importlib.util.module_from_spec(spec)
    # dataclasses with postponed annotations require the module to be in sys.modules
    # during execution for type resolution.
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


_schema = _load_sibling("event_schema.py")
_risk = _load_sibling("risk_score.py")

AttackEvent = _schema.AttackEvent
ClassificationResult = _schema.ClassificationResult
DetectionSpec = _schema.DetectionSpec
EventType = _schema.EventType
compute_risk = _risk.compute_risk


def _specs() -> dict[EventType, DetectionSpec]:
    """
    Specs map event types to a deterministic, defensive-only response plan.

    All actions must remain inside the No First Use policy boundary.
    """
    return {
        "ransomware_behavior": DetectionSpec(
            detection_signal="Burst of file rewrites + high entropy writes + shadow-copy tamper indicators.",
            severity_score=95,
            confidence_score=0.75,
            related_formation_id="formation.agni",
            defensive_response=[
                {
                    "action": "file.quarantine",
                    "params": {"selector": "recent_high_entropy_writes"},
                    "reason": "Stop encryption spread.",
                },
                {
                    "action": "process.kill_local",
                    "params": {"selector": "suspected_ransomware"},
                    "reason": "Terminate encryption process.",
                },
                {
                    "action": "device.isolate",
                    "params": {"profile": "limited-egress"},
                    "reason": "Prevent external keying/C2 while preserving admin access.",
                },
            ],
            evidence_required=[
                {"artifact": "file.write_journal", "params": {"since_seconds": 3600}},
                {"artifact": "process.tree_snapshot", "params": {"depth": 8}},
                {"artifact": "logs.system", "params": {"since_seconds": 3600}},
            ],
            false_positive_handling="Require correlation: high-entropy writes + suspicious process lineage; allow operator override.",
            recovery_step="Restore from known-good snapshot, then rotate keys and re-enable egress gradually.",
        ),
        "brute_force_login": DetectionSpec(
            detection_signal="High auth failure rate from same source or across many accounts in short window.",
            severity_score=70,
            confidence_score=0.8,
            related_formation_id="formation.chakra",
            defensive_response=[
                {
                    "action": "traffic.rate_limit",
                    "params": {"scope": "local_device", "profile": "auth-tight"},
                    "reason": "Slow brute force attempts.",
                },
                {
                    "action": "session.revoke_local",
                    "params": {"scope": "local_device"},
                    "reason": "Invalidate suspicious sessions.",
                },
            ],
            evidence_required=[
                {"artifact": "logs.auth", "params": {"since_seconds": 1800}},
                {
                    "artifact": "network.connections_snapshot",
                    "params": {"include_process": True},
                },
            ],
            false_positive_handling="Exclude known SSO outages; require distinct source IPs or repeated failures from one source.",
            recovery_step="Relax rate limits after baseline returns; keep enhanced auth logging for a cooldown window.",
        ),
        "suspicious_process_behavior": DetectionSpec(
            detection_signal="Unusual spawn tree, unsigned binary execution, or anomalous CPU/memory spikes tied to a process.",
            severity_score=75,
            confidence_score=0.7,
            related_formation_id="formation.sarpa",
            defensive_response=[
                {
                    "action": "process.kill_local",
                    "params": {"selector": "suspicious_tree"},
                    "reason": "Stop suspicious process chains.",
                },
                {
                    "action": "evidence.preserve",
                    "params": {"scope": "local_device"},
                    "reason": "Preserve artifacts for later analysis.",
                },
            ],
            evidence_required=[
                {"artifact": "process.tree_snapshot", "params": {"depth": 8}},
                {"artifact": "process.snapshot", "params": {"include_cmdline": True}},
            ],
            false_positive_handling="Allowlist trusted updaters/build tools; require repeated anomaly confirmation before kill.",
            recovery_step="Re-enable allowlisted processes; apply updates; monitor for recurrence.",
        ),
        "privilege_escalation_attempt": DetectionSpec(
            detection_signal="Repeated sudo/UAC prompts, token manipulation, or privileged API access denials.",
            severity_score=85,
            confidence_score=0.75,
            related_formation_id="formation.mandala",
            defensive_response=[
                {
                    "action": "session.revoke_local",
                    "params": {"scope": "local_device"},
                    "reason": "Invalidate sessions after escalation attempts.",
                },
                {
                    "action": "keys.rotate",
                    "params": {"scope": "local_device"},
                    "reason": "Reduce exposure window for privileged tokens.",
                },
            ],
            evidence_required=[
                {"artifact": "logs.auth", "params": {"since_seconds": 3600}},
                {"artifact": "system.audit_trail", "params": {"since_seconds": 3600}},
            ],
            false_positive_handling="Differentiate admin maintenance windows; require correlation with suspicious process behavior.",
            recovery_step="Require MFA re-auth; restore least privilege; verify no new admins were created.",
        ),
        "unauthorized_file_access": DetectionSpec(
            detection_signal="Access to sensitive paths by untrusted processes or outside expected time windows.",
            severity_score=80,
            confidence_score=0.7,
            related_formation_id="formation.vajra",
            defensive_response=[
                {
                    "action": "file.quarantine",
                    "params": {"selector": "suspicious_recent_writes"},
                    "reason": "Prevent execution of suspicious writes.",
                },
                {
                    "action": "traffic.block",
                    "params": {"scope": "local_device", "target": "unknown_egress"},
                    "reason": "Prevent immediate exfiltration.",
                },
            ],
            evidence_required=[
                {"artifact": "file.access_log", "params": {"since_seconds": 3600}},
                {"artifact": "process.snapshot", "params": {"include_cmdline": True}},
            ],
            false_positive_handling="Allowlist signed system binaries; require both access + untrusted lineage for high severity.",
            recovery_step="Restore file permissions; validate integrity; rotate affected secrets if accessed.",
        ),
        "data_exfiltration_pattern": DetectionSpec(
            detection_signal="Sustained outbound bytes, unusual destinations, and high DNS churn correlated with a process.",
            severity_score=90,
            confidence_score=0.7,
            related_formation_id="formation.ardha_chandra",
            defensive_response=[
                {
                    "action": "device.isolate",
                    "params": {"profile": "limited-egress"},
                    "reason": "Reduce exfiltration channels.",
                },
                {
                    "action": "traffic.block",
                    "params": {"scope": "local_device", "target": "unknown_egress"},
                    "reason": "Block unknown destinations.",
                },
            ],
            evidence_required=[
                {
                    "artifact": "network.transfer_summary",
                    "params": {"since_seconds": 7200},
                },
                {"artifact": "dns.query_log", "params": {"since_seconds": 7200}},
            ],
            false_positive_handling="Exclude known backup windows and approved sync endpoints via allowlists.",
            recovery_step="Re-enable egress only for approved endpoints; rotate keys; conduct post-incident review.",
        ),
        "malware_persistence": DetectionSpec(
            detection_signal="New startup entries/services, scheduled tasks, or autoruns created unexpectedly.",
            severity_score=88,
            confidence_score=0.75,
            related_formation_id="formation.varaha",
            defensive_response=[
                {
                    "action": "device.isolate",
                    "params": {"profile": "limited-egress"},
                    "reason": "Contain while persistence is investigated.",
                },
                {
                    "action": "evidence.preserve",
                    "params": {"scope": "local_device"},
                    "reason": "Capture persistence artifacts before changes.",
                },
            ],
            evidence_required=[
                {
                    "artifact": "startup.entries_snapshot",
                    "params": {"include_services": True},
                },
                {"artifact": "logs.system", "params": {"since_seconds": 7200}},
            ],
            false_positive_handling="Recognize legitimate installers; require unsigned binary or suspicious parent process to escalate.",
            recovery_step="Remove unauthorized persistence, then harden startup paths and rotate affected credentials.",
        ),
        "rootkit_suspicion": DetectionSpec(
            detection_signal="Kernel/module anomalies, hidden processes, tampered system binaries, or integrity check failures.",
            severity_score=98,
            confidence_score=0.6,
            related_formation_id="formation.kurma",
            defensive_response=[
                {
                    "action": "device.isolate",
                    "params": {"profile": "lockdown"},
                    "reason": "Contain and preserve evidence.",
                },
                {
                    "action": "evidence.preserve",
                    "params": {"scope": "local_device"},
                    "reason": "Preserve forensic artifacts.",
                },
                {
                    "action": "system.recover",
                    "params": {"mode": "hard"},
                    "reason": "Restore to known-good baseline after verification.",
                },
            ],
            evidence_required=[
                {
                    "artifact": "file.integrity_report",
                    "params": {"scope": "system_paths"},
                },
                {"artifact": "logs.system", "params": {"since_seconds": 14400}},
            ],
            false_positive_handling="Treat as high impact; require operator review and verified integrity toolchain.",
            recovery_step="Re-image/restore from trusted baseline; rotate all keys; verify secure boot measurements (if available).",
        ),
        "lateral_movement": DetectionSpec(
            detection_signal="New internal connection attempts, remote exec indicators, or abnormal authentication across hosts (owned env).",
            severity_score=85,
            confidence_score=0.65,
            related_formation_id="formation.trishula",
            defensive_response=[
                {
                    "action": "device.isolate",
                    "params": {"profile": "limited-egress"},
                    "reason": "Contain lateral movement risk locally.",
                },
                {
                    "action": "session.revoke_local",
                    "params": {"scope": "local_device"},
                    "reason": "Revoke sessions potentially used for pivoting.",
                },
            ],
            evidence_required=[
                {
                    "artifact": "network.connections_snapshot",
                    "params": {"include_process": True},
                },
                {"artifact": "logs.auth", "params": {"since_seconds": 7200}},
            ],
            false_positive_handling="Only valid inside owned/authorized networks; otherwise classify as local anomaly without remote assumptions.",
            recovery_step="Reset credentials, verify endpoint baselines, and restore segmentation profiles.",
        ),
        "phishing_download": DetectionSpec(
            detection_signal="Downloaded executable/document from untrusted origin + immediate execution attempt.",
            severity_score=78,
            confidence_score=0.7,
            related_formation_id="formation.shyena",
            defensive_response=[
                {
                    "action": "file.quarantine",
                    "params": {"selector": "recent_downloads_high_risk"},
                    "reason": "Prevent execution of suspicious downloads.",
                },
                {
                    "action": "evidence.preserve",
                    "params": {"scope": "local_device"},
                    "reason": "Preserve artifacts for investigation.",
                },
            ],
            evidence_required=[
                {"artifact": "browser.download_log", "params": {"since_seconds": 3600}},
                {
                    "artifact": "file.hash_manifest",
                    "params": {"scope": "recent_downloads"},
                },
            ],
            false_positive_handling="Allowlist corporate portals; require reputation + execution attempt to escalate.",
            recovery_step="Educate user via policy notice; remove file from quarantine only via admin approval.",
        ),
        "abnormal_outbound_traffic": DetectionSpec(
            detection_signal="Outbound connection volume spike, rare ports, or unknown domains beyond baseline.",
            severity_score=72,
            confidence_score=0.7,
            related_formation_id="formation.suchi",
            defensive_response=[
                {
                    "action": "traffic.block",
                    "params": {"scope": "local_device", "target": "rare_ports"},
                    "reason": "Block rare port egress.",
                },
                {
                    "action": "traffic.rate_limit",
                    "params": {"scope": "local_device", "profile": "egress-gentle"},
                    "reason": "Slow suspicious outbound.",
                },
            ],
            evidence_required=[
                {
                    "artifact": "network.transfer_summary",
                    "params": {"since_seconds": 3600},
                },
                {"artifact": "dns.query_log", "params": {"since_seconds": 3600}},
            ],
            false_positive_handling="Exclude approved update mirrors; require process correlation for escalation.",
            recovery_step="Re-enable normal egress after baseline; keep monitoring for cooldown.",
        ),
        "suspicious_dns": DetectionSpec(
            detection_signal="High NXDOMAIN rates, DGA-like entropy, or bursts of unique domains.",
            severity_score=68,
            confidence_score=0.75,
            related_formation_id="formation.shyena",
            defensive_response=[
                {
                    "action": "traffic.block",
                    "params": {"scope": "local_device", "target": "suspicious_dns"},
                    "reason": "Block suspicious DNS behavior.",
                },
                {
                    "action": "evidence.preserve",
                    "params": {"scope": "local_device"},
                    "reason": "Preserve DNS evidence.",
                },
            ],
            evidence_required=[
                {"artifact": "dns.query_log", "params": {"since_seconds": 7200}},
            ],
            false_positive_handling="Account for captive portal and connectivity checks; correlate with process lineage.",
            recovery_step="Restore DNS access; keep DNS logging temporarily enhanced.",
        ),
        "failed_login_storm": DetectionSpec(
            detection_signal="Many login failures in a short window across accounts or endpoints.",
            severity_score=75,
            confidence_score=0.8,
            related_formation_id="formation.sarvatobhadra",
            defensive_response=[
                {
                    "action": "traffic.rate_limit",
                    "params": {"scope": "local_device", "profile": "auth-storm"},
                    "reason": "Throttle authentication endpoints.",
                },
                {
                    "action": "session.revoke_local",
                    "params": {"scope": "local_device"},
                    "reason": "Reset sessions under storm conditions.",
                },
            ],
            evidence_required=[
                {"artifact": "logs.auth", "params": {"since_seconds": 3600}},
            ],
            false_positive_handling="Detect password spray vs outage by checking success rate and provider status.",
            recovery_step="Relax limits after storm; force password reset only under admin policy.",
        ),
        "usb_attack_risk": DetectionSpec(
            detection_signal="New USB device with HID/storage + unusual autorun-like behavior indicators.",
            severity_score=65,
            confidence_score=0.6,
            related_formation_id="formation.padma",
            defensive_response=[
                {
                    "action": "device.isolate",
                    "params": {"profile": "limited-egress"},
                    "reason": "Reduce exposure while USB activity is assessed.",
                },
                {
                    "action": "evidence.preserve",
                    "params": {"scope": "local_device"},
                    "reason": "Preserve USB event evidence.",
                },
            ],
            evidence_required=[
                {"artifact": "usb.device_log", "params": {"since_seconds": 3600}},
                {"artifact": "process.snapshot", "params": {"include_cmdline": True}},
            ],
            false_positive_handling="Allowlist known enterprise devices; require correlated process anomalies to escalate.",
            recovery_step="Remove device, scan locally with allowlisted tools, re-enable normal profile after review.",
        ),
        "supply_chain_package_risk": DetectionSpec(
            detection_signal="New dependency with high-risk indicators (typosquat, unsigned source, sudden maintainer change).",
            severity_score=82,
            confidence_score=0.65,
            related_formation_id="formation.shakata",
            defensive_response=[
                {
                    "action": "traffic.block",
                    "params": {
                        "scope": "local_device",
                        "target": "unapproved_pkg_hosts",
                    },
                    "reason": "Prevent fetching from unapproved package sources.",
                },
                {
                    "action": "evidence.preserve",
                    "params": {"scope": "local_device"},
                    "reason": "Preserve dependency evidence for review.",
                },
            ],
            evidence_required=[
                {"artifact": "sbom.diff", "params": {"since_seconds": 86400}},
                {"artifact": "package.lockfile_snapshot", "params": {}},
            ],
            false_positive_handling="Require reproducible build mismatch or reputation signals; default to warn+review before block.",
            recovery_step="Pin to known-good versions, re-run CI, and rotate keys if compromise suspected.",
        ),
    }


def classify_event(event: AttackEvent) -> ClassificationResult:
    spec = _specs().get(event.event_type)
    if not spec:
        # Unknown event: default to observe-only posture (defensive, low disruption).
        severity = 30
        confidence = 0.4
        formation_id = "formation.matsya"
        risk = compute_risk(severity, confidence)
        return ClassificationResult(
            event_id=event.event_id,
            event_type=event.event_type,
            severity=severity,
            confidence=confidence,
            risk=risk,
            formation_id=formation_id,
            defensive_response=[
                {
                    "action": "evidence.preserve",
                    "params": {"scope": "local_device"},
                    "reason": "Unknown event type; preserve evidence.",
                },
                {
                    "action": "traffic.rate_limit",
                    "params": {"scope": "local_device", "profile": "observe"},
                    "reason": "Reduce risk during investigation.",
                },
            ],
            evidence_required=[
                {
                    "artifact": "telemetry.snapshot",
                    "params": {"include_network": True, "include_process": True},
                }
            ],
            reason="unknown_event_type_default_observe",
        )

    severity = int(spec.severity_score)
    confidence = float(spec.confidence_score)
    # Allow sensors to provide modifiers without allowing arbitrary jumps.
    sev_mod = int(event.signals.get("severity_mod", 0) or 0)
    conf_mod = float(event.signals.get("confidence_mod", 0.0) or 0.0)
    severity = max(0, min(100, severity + max(-15, min(15, sev_mod))))
    confidence = max(0.0, min(1.0, confidence + max(-0.2, min(0.2, conf_mod))))
    risk = compute_risk(severity, confidence)

    reason = f"{spec.detection_signal} False-positive handling: {spec.false_positive_handling} Recovery: {spec.recovery_step}"

    return ClassificationResult(
        event_id=event.event_id,
        event_type=event.event_type,
        severity=severity,
        confidence=confidence,
        risk=risk,
        formation_id=spec.related_formation_id,
        defensive_response=spec.defensive_response,
        evidence_required=spec.evidence_required,
        reason=reason,
    )


def load_sample_events(path: str | Path) -> list[AttackEvent]:
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    events: list[AttackEvent] = []
    for item in raw:
        events.append(
            AttackEvent(
                event_id=str(item["event_id"]),
                event_type=item["event_type"],
                ts_ms=int(item["ts_ms"]),
                device_id=str(item["device_id"]),
                user_id=item.get("user_id"),
                source=str(item.get("source", "sample")),
                signals=dict(item.get("signals", {})),
            )
        )
    return events
