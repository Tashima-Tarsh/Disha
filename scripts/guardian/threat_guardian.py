"""
Adaptive Threat Guardian — Disha's Mythos-style protective intelligence.

Continuously monitors all subsystems, detects anomalies, classifies threats,
and takes automated protective action.  Works with the RL agent, GNN, and
decision engine to provide layered defense.

Usage::

    python scripts/guardian/threat_guardian.py              # interactive monitor
    python scripts/guardian/threat_guardian.py --scan       # one-shot scan
    python scripts/guardian/threat_guardian.py --daemon     # background daemon
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger("threat_guardian")

REPO_ROOT = Path(__file__).resolve().parents[2]


# ═══════════════════════════════════════════════════════════════════════
# Threat classification
# ═══════════════════════════════════════════════════════════════════════

class ThreatLevel(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ThreatCategory(str, Enum):
    SECRET_LEAK = "secret_leak"
    DEPENDENCY_VULN = "dependency_vuln"
    CONFIG_DRIFT = "config_drift"
    MERGE_CONFLICT = "merge_conflict"
    INJECTION_RISK = "injection_risk"
    PERMISSION_ESCALATION = "permission_escalation"
    DATA_EXFILTRATION = "data_exfiltration"
    SUPPLY_CHAIN = "supply_chain"
    CODE_QUALITY = "code_quality"
    SYSTEM_HEALTH = "system_health"


@dataclass
class Threat:
    """A detected threat with full context."""
    category: ThreatCategory
    level: ThreatLevel
    title: str
    description: str
    file_path: str | None = None
    line_number: int | None = None
    evidence: str = ""
    remediation: str = ""
    auto_fixable: bool = False
    neutralized: bool = False


@dataclass
class GuardianReport:
    """Complete scan report."""
    timestamp: float = field(default_factory=time.time)
    threats: list[Threat] = field(default_factory=list)
    scans_performed: list[str] = field(default_factory=list)
    system_health: float = 1.0  # 0.0 = critical, 1.0 = healthy

    @property
    def critical_count(self) -> int:
        return sum(1 for t in self.threats if t.level == ThreatLevel.CRITICAL)

    @property
    def high_count(self) -> int:
        return sum(1 for t in self.threats if t.level == ThreatLevel.HIGH)

    def to_dict(self, include_evidence: bool = False) -> dict[str, Any]:
        threats_list = []
        for t in self.threats:
            entry: dict[str, Any] = {
                "category": t.category.value,
                "level": t.level.value,
                "title": t.title,
                "description": t.description,
                "file": t.file_path,
                "line": t.line_number,
                "auto_fixable": t.auto_fixable,
                "neutralized": t.neutralized,
            }
            if include_evidence and t.evidence:
                entry["evidence"] = t.evidence
            threats_list.append(entry)
        return {
            "timestamp": self.timestamp,
            "system_health": self.system_health,
            "threat_counts": {
                "critical": self.critical_count,
                "high": self.high_count,
                "medium": sum(1 for t in self.threats if t.level == ThreatLevel.MEDIUM),
                "low": sum(1 for t in self.threats if t.level == ThreatLevel.LOW),
                "info": sum(1 for t in self.threats if t.level == ThreatLevel.INFO),
            },
            "scans_performed": self.scans_performed,
            "threats": threats_list,
        }


# ═══════════════════════════════════════════════════════════════════════
# Scanner modules
# ═══════════════════════════════════════════════════════════════════════

# Patterns for detecting leaked secrets
_SECRET_PATTERNS = [
    (r"(?:sk-ant-)[a-zA-Z0-9\-_]{20,}", "Anthropic API key"),
    (r"(?:sk-)[a-zA-Z0-9]{20,}", "OpenAI API key"),
    (r"(?:AIza)[a-zA-Z0-9\-_]{35}", "Google API key"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub personal access token"),
    (r"gho_[a-zA-Z0-9]{36}", "GitHub OAuth token"),
    (r"(?:AKIA)[A-Z0-9]{16}", "AWS access key"),
    (r"(?:-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----)", "Private key"),
    (r"(?:xox[bpsa]-)[a-zA-Z0-9\-]{10,}", "Slack token"),
    (r"(?:mongodb\+srv://)[^\s]+", "MongoDB connection string"),
    (r"(?:postgres://)[^\s]+", "PostgreSQL connection string"),
]

# Files/dirs to exclude from scanning
_SCAN_EXCLUDE = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".tox", "*.pyc", "*.whl",
    "bun.lock", "package-lock.json", "*.png", "*.jpg",
    "*.gif", "*.ico", "*.woff", "*.woff2", "*.ttf",
    "*.eot", "*.svg", "*.mp4", "*.zip", "*.tar.gz",
}

# Extensions to scan for secrets
_TEXT_EXTENSIONS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml",
    ".toml", ".cfg", ".ini", ".env", ".sh", ".bash", ".md", ".txt",
    ".html", ".css", ".go", ".rs", ".java", ".rb", ".php", ".sql",
}


def _should_scan(path: Path) -> bool:
    """Check if a file should be scanned."""
    for part in path.parts:
        if part in _SCAN_EXCLUDE:
            return False
    return path.suffix in _TEXT_EXTENSIONS


class SecretScanner:
    """Scans for leaked secrets and credentials."""

    # Paths that commonly contain fake / test / example secrets
    _FALSE_POSITIVE_PATHS = {
        "_test.go", "_test.py", "test_", "tests/", ".example",
        "config_test", "README", "docs/", ".md",
        "docker-compose", "launch.json",
        "threat_guardian.py",  # our own scanner contains regex patterns
    }
    # Known dummy values (prefixes) used in tests — never real secrets
    _DUMMY_PREFIXES = [
        "sk-ant-abcdef", "sk-1234", "AIzaSyC1", "AKIAIOSFODNN",
        "postgres://user:password@localhost",
        "postgres://postgres:postgres@",
        "postgres://test", "mongodb+srv://test",
    ]

    def _is_likely_false_positive(self, path: Path, root: Path, matched: str) -> bool:
        """Heuristic to filter out test fixtures and docker defaults."""
        rel = str(path.relative_to(root))
        # Files known to contain fake keys
        for fp in self._FALSE_POSITIVE_PATHS:
            if fp in rel:
                return True
        # Known dummy values
        for prefix in self._DUMMY_PREFIXES:
            if matched.startswith(prefix):
                return True
        return False

    def scan(self, root: Path) -> list[Threat]:
        threats: list[Threat] = []
        for path in root.rglob("*"):
            if not path.is_file() or not _should_scan(path):
                continue
            try:
                content = path.read_text(encoding="utf-8", errors="ignore")
            except (OSError, PermissionError):
                continue
            # Skip .env.example files — they have placeholder keys
            if path.name.endswith(".example"):
                continue
            for pattern, name in _SECRET_PATTERNS:
                for match in re.finditer(pattern, content):
                    matched_text = match.group()
                    if self._is_likely_false_positive(path, root, matched_text):
                        continue
                    # Find line number
                    line_num = content[: match.start()].count("\n") + 1
                    threats.append(Threat(
                        category=ThreatCategory.SECRET_LEAK,
                        level=ThreatLevel.CRITICAL,
                        title=f"Potential {name} detected",
                        description=f"Found potential {name} in {path.relative_to(root)}",
                        file_path=str(path.relative_to(root)),
                        line_number=line_num,
                        evidence=matched_text[:8] + "..." + matched_text[-4:],
                        remediation=f"Remove the secret and rotate the {name}.",
                        auto_fixable=False,
                    ))
        return threats


class MergeConflictScanner:
    """Detects leftover merge conflict markers."""

    _OPEN = re.compile(r"^<{7}\s")
    _MID = re.compile(r"^={7}$")
    _CLOSE = re.compile(r"^>{7}\s")

    def scan(self, root: Path) -> list[Threat]:
        threats: list[Threat] = []
        for path in root.rglob("*"):
            if not path.is_file() or not _should_scan(path):
                continue
            try:
                content = path.read_text(encoding="utf-8", errors="ignore")
            except (OSError, PermissionError):
                continue
            lines = content.splitlines()
            # Only flag ======= lines if the file also has <<<<<<< or >>>>>>>
            has_open = any(self._OPEN.match(l) for l in lines)
            has_close = any(self._CLOSE.match(l) for l in lines)
            for i, line in enumerate(lines, 1):
                if self._OPEN.match(line) or self._CLOSE.match(line):
                    threats.append(Threat(
                        category=ThreatCategory.MERGE_CONFLICT,
                        level=ThreatLevel.HIGH,
                        title="Merge conflict marker found",
                        description=f"Unresolved merge conflict in {path.relative_to(root)}:{i}",
                        file_path=str(path.relative_to(root)),
                        line_number=i,
                        evidence=line[:80],
                        remediation="Resolve the merge conflict and remove markers.",
                        auto_fixable=False,
                    ))
                elif self._MID.match(line) and (has_open or has_close):
                    threats.append(Threat(
                        category=ThreatCategory.MERGE_CONFLICT,
                        level=ThreatLevel.HIGH,
                        title="Merge conflict marker found",
                        description=f"Unresolved merge conflict in {path.relative_to(root)}:{i}",
                        file_path=str(path.relative_to(root)),
                        line_number=i,
                        evidence=line[:80],
                        remediation="Resolve the merge conflict and remove markers.",
                        auto_fixable=False,
                    ))
        return threats


class DependencyScanner:
    """Checks for known-vulnerable or outdated dependency patterns."""

    # Known-vulnerable version ranges (simplified checks)
    _VULN_PATTERNS_PY = {
        "requests": (r"requests[=<>~!]*([0-9.]+)", "2.31.0", "CVE-2023-32681"),
        "urllib3": (r"urllib3[=<>~!]*([0-9.]+)", "2.0.7", "CVE-2023-45803"),
    }

    def scan(self, root: Path) -> list[Threat]:
        threats: list[Threat] = []
        # Scan Python requirements
        for req_file in root.rglob("requirements*.txt"):
            if "node_modules" in str(req_file):
                continue
            try:
                content = req_file.read_text(encoding="utf-8")
            except (OSError, PermissionError):
                continue
            for pkg, (pattern, min_ver, cve) in self._VULN_PATTERNS_PY.items():
                match = re.search(pattern, content)
                if match:
                    installed = match.group(1) if match.lastindex else ""
                    if installed and self._version_lt(installed, min_ver):
                        threats.append(Threat(
                            category=ThreatCategory.DEPENDENCY_VULN,
                            level=ThreatLevel.HIGH,
                            title=f"Vulnerable {pkg} version {installed}",
                            description=f"{pkg}=={installed} is affected by {cve}",
                            file_path=str(req_file.relative_to(root)),
                            remediation=f"Upgrade {pkg} to >= {min_ver}.",
                            auto_fixable=True,
                        ))
        return threats

    @staticmethod
    def _version_lt(a: str, b: str) -> bool:
        """Simple version comparison."""
        try:
            a_parts = [int(x) for x in a.split(".")]
            b_parts = [int(x) for x in b.split(".")]
            return a_parts < b_parts
        except ValueError:
            return False


class InjectionScanner:
    """Detects potential injection vulnerabilities."""

    _PATTERNS = [
        # SQL injection via string formatting
        (r'f"[^"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s', "Potential SQL injection via f-string"),
        (r"f'[^']*(?:SELECT|INSERT|UPDATE|DELETE|DROP)\s", "Potential SQL injection via f-string"),
        # Command injection
        (r"os\.system\(.*\+", "Potential command injection via os.system"),
        (r"subprocess\.(?:call|run|Popen)\([^)]*shell\s*=\s*True", "Shell=True subprocess call"),
        # Eval/exec
        (r"\beval\(\s*(?:input|request|args)", "Eval on user input"),
        (r"\bexec\(\s*(?:input|request|args)", "Exec on user input"),
    ]

    def scan(self, root: Path) -> list[Threat]:
        threats: list[Threat] = []
        for path in root.rglob("*.py"):
            if not _should_scan(path):
                continue
            try:
                content = path.read_text(encoding="utf-8", errors="ignore")
            except (OSError, PermissionError):
                continue
            for pattern, desc in self._PATTERNS:
                for match in re.finditer(pattern, content, re.IGNORECASE):
                    line_num = content[: match.start()].count("\n") + 1
                    threats.append(Threat(
                        category=ThreatCategory.INJECTION_RISK,
                        level=ThreatLevel.HIGH,
                        title=desc,
                        description=f"{desc} at {path.relative_to(root)}:{line_num}",
                        file_path=str(path.relative_to(root)),
                        line_number=line_num,
                        evidence=match.group()[:80],
                        remediation="Use parameterized queries or safe APIs.",
                    ))
        return threats


class ConfigDriftScanner:
    """Detects configuration drift and misconfiguration."""

    def scan(self, root: Path) -> list[Threat]:
        threats: list[Threat] = []

        # Check for .env files committed (should be in .gitignore)
        for env_file in root.rglob(".env"):
            if "node_modules" in str(env_file) or ".example" in env_file.name:
                continue
            threats.append(Threat(
                category=ThreatCategory.CONFIG_DRIFT,
                level=ThreatLevel.HIGH,
                title=f".env file found: {env_file.relative_to(root)}",
                description="Environment file may contain secrets and should not be committed.",
                file_path=str(env_file.relative_to(root)),
                remediation="Add .env to .gitignore and remove from version control.",
                auto_fixable=True,
            ))

        # Check gitignore coverage
        gitignore = root / ".gitignore"
        if gitignore.exists():
            content = gitignore.read_text()
            essentials = ["node_modules", ".env", "__pycache__", "dist", ".next"]
            for item in essentials:
                if item not in content:
                    threats.append(Threat(
                        category=ThreatCategory.CONFIG_DRIFT,
                        level=ThreatLevel.MEDIUM,
                        title=f"Missing .gitignore entry: {item}",
                        description=f"{item} is not in .gitignore — may leak build artifacts.",
                        file_path=".gitignore",
                        remediation=f"Add {item} to .gitignore.",
                        auto_fixable=True,
                    ))

        # Check Docker configs for security
        for compose in root.rglob("docker-compose*.yml"):
            if "node_modules" in str(compose):
                continue
            try:
                content = compose.read_text(encoding="utf-8")
            except (OSError, PermissionError):
                continue
            if "privileged: true" in content:
                threats.append(Threat(
                    category=ThreatCategory.PERMISSION_ESCALATION,
                    level=ThreatLevel.HIGH,
                    title="Privileged Docker container",
                    description=f"Privileged mode in {compose.relative_to(root)}",
                    file_path=str(compose.relative_to(root)),
                    remediation="Remove privileged: true unless absolutely necessary.",
                ))

        return threats


class SupplyChainScanner:
    """Detects supply-chain attack patterns."""

    def scan(self, root: Path) -> list[Threat]:
        threats: list[Threat] = []

        # Check GitHub Actions for pinned versions
        workflows_dir = root / ".github" / "workflows"
        if workflows_dir.is_dir():
            for wf in workflows_dir.glob("*.yml"):
                try:
                    content = wf.read_text(encoding="utf-8")
                except (OSError, PermissionError):
                    continue
                # Find unpinned action references (uses: owner/action@branch instead of @sha)
                for match in re.finditer(r"uses:\s+([^\s]+)@([^\s]+)", content):
                    ref = match.group(2)
                    # If it's a branch name (not a SHA or semver tag)
                    if not re.match(r"^[0-9a-f]{40}$", ref) and not re.match(r"^v?\d+", ref):
                        line_num = content[: match.start()].count("\n") + 1
                        threats.append(Threat(
                            category=ThreatCategory.SUPPLY_CHAIN,
                            level=ThreatLevel.MEDIUM,
                            title=f"Unpinned GitHub Action: {match.group(1)}",
                            description=f"Action {match.group(1)}@{ref} uses branch ref instead of SHA or version tag.",
                            file_path=str(wf.relative_to(root)),
                            line_number=line_num,
                            remediation="Pin to a specific SHA or version tag (e.g., @v4).",
                        ))

        return threats


# ═══════════════════════════════════════════════════════════════════════
# Threat Guardian (main orchestrator)
# ═══════════════════════════════════════════════════════════════════════

class ThreatGuardian:
    """Orchestrates all scanners and produces a unified threat report.

    Like Claude Mythos, the Guardian continuously monitors, learns from
    past scans, and adapts its detection thresholds.
    """

    def __init__(self, root: Path | None = None):
        self.root = root or REPO_ROOT
        self.scanners = [
            ("secret_scan", SecretScanner()),
            ("merge_conflict_scan", MergeConflictScanner()),
            ("dependency_scan", DependencyScanner()),
            ("injection_scan", InjectionScanner()),
            ("config_drift_scan", ConfigDriftScanner()),
            ("supply_chain_scan", SupplyChainScanner()),
        ]
        self._history: list[GuardianReport] = []

    def full_scan(self) -> GuardianReport:
        """Run all scanners and produce a comprehensive report."""
        report = GuardianReport()

        for name, scanner in self.scanners:
            logger.info("scan_start", scanner=name)
            try:
                threats = scanner.scan(self.root)
                report.threats.extend(threats)
                report.scans_performed.append(name)
                logger.info("scan_complete", scanner=name, threats_found=len(threats))
            except Exception as exc:
                logger.error("scan_failed", scanner=name, error=str(exc))
                report.threats.append(Threat(
                    category=ThreatCategory.SYSTEM_HEALTH,
                    level=ThreatLevel.MEDIUM,
                    title=f"Scanner {name} failed",
                    description=str(exc),
                ))

        # Calculate system health
        report.system_health = self._calculate_health(report)
        self._history.append(report)
        return report

    def neutralize(self, report: GuardianReport) -> int:
        """Attempt to auto-fix all auto-fixable threats. Returns count fixed."""
        fixed = 0
        for threat in report.threats:
            if threat.auto_fixable and not threat.neutralized:
                success = self._try_fix(threat)
                if success:
                    threat.neutralized = True
                    fixed += 1
                    logger.info("threat_neutralized", title=threat.title)
        return fixed

    def _try_fix(self, threat: Threat) -> bool:
        """Attempt automatic remediation of a threat."""
        if threat.category == ThreatCategory.CONFIG_DRIFT:
            if ".gitignore" in (threat.file_path or ""):
                return self._fix_gitignore(threat)
        return False

    def _fix_gitignore(self, threat: Threat) -> bool:
        """Add missing entry to .gitignore."""
        gitignore = self.root / ".gitignore"
        if not gitignore.exists():
            return False
        # Extract the missing entry from the title
        match = re.search(r"Missing .gitignore entry: (.+)", threat.title)
        if not match:
            return False
        entry = match.group(1)
        # Directories get trailing slash, files don't
        _DIR_ENTRIES = {"node_modules", "__pycache__", "dist", ".next", "venv", ".venv", "build"}
        suffix = "/" if entry in _DIR_ENTRIES else ""
        try:
            content = gitignore.read_text()
            if entry not in content:
                with open(gitignore, "a") as f:
                    f.write(f"\n{entry}{suffix}\n")
                return True
        except OSError:
            pass
        return False

    @staticmethod
    def _calculate_health(report: GuardianReport) -> float:
        """Calculate system health score 0.0–1.0."""
        if not report.threats:
            return 1.0
        penalty = 0.0
        for t in report.threats:
            if t.neutralized:
                continue
            if t.level == ThreatLevel.CRITICAL:
                penalty += 0.25
            elif t.level == ThreatLevel.HIGH:
                penalty += 0.10
            elif t.level == ThreatLevel.MEDIUM:
                penalty += 0.03
            else:
                penalty += 0.01
        return max(0.0, 1.0 - penalty)

    def get_trend(self) -> str:
        """Compare last two scans to show improvement/degradation."""
        if len(self._history) < 2:
            return "insufficient_data"
        prev = self._history[-2].system_health
        curr = self._history[-1].system_health
        if curr > prev + 0.01:
            return "improving"
        elif curr < prev - 0.01:
            return "degrading"
        return "stable"


# ═══════════════════════════════════════════════════════════════════════
# CLI entry point
# ═══════════════════════════════════════════════════════════════════════

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Disha Adaptive Threat Guardian")
    parser.add_argument("--scan", action="store_true", help="Run a full scan and report")
    parser.add_argument("--neutralize", action="store_true", help="Auto-fix fixable threats")
    parser.add_argument("--json", action="store_true", help="Output JSON report")
    parser.add_argument("--daemon", action="store_true", help="Run as background daemon")
    parser.add_argument("--interval", type=int, default=3600, help="Daemon scan interval (seconds)")
    args = parser.parse_args()

    guardian = ThreatGuardian()

    if args.daemon:
        logger.info("daemon_start", interval=args.interval)
        while True:
            report = guardian.full_scan()
            if args.neutralize:
                guardian.neutralize(report)
            _print_report(report, as_json=args.json)
            time.sleep(args.interval)
    else:
        report = guardian.full_scan()
        if args.neutralize:
            fixed = guardian.neutralize(report)
            logger.info("neutralization_complete", fixed=fixed)
        _print_report(report, as_json=args.json)

        # Save report
        report_path = REPO_ROOT / "guardian_report.json"
        with open(report_path, "w") as f:
            json.dump(report.to_dict(), f, indent=2)
        logger.info("report_saved", path=str(report_path))

        # Exit code based on threats
        if report.critical_count > 0:
            sys.exit(2)
        elif report.high_count > 0:
            sys.exit(1)
        sys.exit(0)


def _print_report(report: GuardianReport, as_json: bool = False) -> None:
    # Build a safe summary that never includes raw evidence.
    safe_summary = {
        "timestamp": report.timestamp,
        "system_health": report.system_health,
        "threat_counts": {
            "critical": report.critical_count,
            "high": report.high_count,
            "medium": sum(1 for t in report.threats if t.level == ThreatLevel.MEDIUM),
            "low": sum(1 for t in report.threats if t.level == ThreatLevel.LOW),
            "info": sum(1 for t in report.threats if t.level == ThreatLevel.INFO),
        },
        "scans_performed": list(report.scans_performed),
        "total_threats": len(report.threats),
    }
    if as_json:
        print(json.dumps(safe_summary, indent=2))
        return

    health_emoji = "🟢" if report.system_health > 0.8 else "🟡" if report.system_health > 0.5 else "🔴"
    print(f"\n{'═' * 60}")
    print(f"  {health_emoji} Disha Threat Guardian Report")
    print(f"  System Health: {report.system_health:.0%}")
    print(f"{'═' * 60}")

    counts = safe_summary["threat_counts"]
    for level, emoji in [("critical", "🔴"), ("high", "🟠"), ("medium", "🟡"), ("low", "🔵"), ("info", "⚪")]:
        if counts[level]:
            print(f"  {emoji} {level.capitalize():10s} {counts[level]}")

    for t in report.threats:
        neutralized = t.neutralized
        status = "✅ NEUTRALIZED" if neutralized else "⚠️  ACTIVE"
        level_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵", "info": "⚪"}

        # Redact details for secret-related findings to avoid logging sensitive data
        is_secret = t.category == ThreatCategory.SECRET_LEAK
        title = "[SECRET FINDING REDACTED]" if is_secret else t.title
        description = "[details redacted]" if is_secret else t.description

        print(f"\n  {level_emoji.get(t.level.value, '⚪')} [{t.level.value.upper()}] {title}")
        print(f"     {description}")
        if t.file_path and not is_secret:
            loc = t.file_path
            if t.line_number:
                loc += f":{t.line_number}"
            print(f"     📍 {loc}")
        elif t.file_path and is_secret:
            # Show only filename, not full path, for secret findings
            print(f"     📍 {Path(t.file_path).name}")
        print(f"     Status: {status}")

    print(f"\n{'═' * 60}\n")


if __name__ == "__main__":
    main()
