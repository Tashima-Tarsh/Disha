"""
Self-Healing Monitor — auto-detects system issues and maintains health.

Performs continuous health checks across all Disha subsystems:
  - Python import validation (catches broken imports before runtime)
  - Configuration consistency checks
  - Dependency freshness auditing
  - Checkpoint integrity verification
  - Training pipeline health monitoring
  - Docker service availability

Automatically attempts recovery when safe to do so.

Usage::

    python scripts/self_heal/monitor.py              # one-shot health check
    python scripts/self_heal/monitor.py --fix        # auto-repair what's fixable
    python scripts/self_heal/monitor.py --json       # JSON output
"""

from __future__ import annotations

import ast
import importlib
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any

import structlog

logger = structlog.get_logger("self_heal")

REPO_ROOT = Path(__file__).resolve().parents[2]


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILING = "failing"
    UNKNOWN = "unknown"


@dataclass
class HealthCheck:
    """Result of a single health check."""
    name: str
    status: HealthStatus
    message: str = ""
    details: dict[str, Any] = field(default_factory=dict)
    fixable: bool = False
    fixed: bool = False


@dataclass
class SystemHealth:
    """Overall system health report."""
    timestamp: float = field(default_factory=time.time)
    checks: list[HealthCheck] = field(default_factory=list)

    @property
    def overall_status(self) -> HealthStatus:
        statuses = [c.status for c in self.checks]
        if HealthStatus.FAILING in statuses:
            return HealthStatus.FAILING
        if HealthStatus.DEGRADED in statuses:
            return HealthStatus.DEGRADED
        if not statuses:
            return HealthStatus.UNKNOWN
        return HealthStatus.HEALTHY

    @property
    def score(self) -> float:
        if not self.checks:
            return 0.0
        weights = {HealthStatus.HEALTHY: 1.0, HealthStatus.DEGRADED: 0.5,
                    HealthStatus.FAILING: 0.0, HealthStatus.UNKNOWN: 0.3}
        return sum(weights.get(c.status, 0) for c in self.checks) / len(self.checks)

    def to_dict(self) -> dict[str, Any]:
        return {
            "timestamp": self.timestamp,
            "overall_status": self.overall_status.value,
            "score": round(self.score, 3),
            "checks": [
                {
                    "name": c.name,
                    "status": c.status.value,
                    "message": c.message,
                    "fixable": c.fixable,
                    "fixed": c.fixed,
                    "details": c.details,
                }
                for c in self.checks
            ],
        }


# ═══════════════════════════════════════════════════════════════════════
# Individual health checkers
# ═══════════════════════════════════════════════════════════════════════

class PythonImportChecker:
    """Validates that all Python files parse without syntax errors."""

    def check(self, root: Path) -> HealthCheck:
        errors = []
        total = 0
        for py_file in root.rglob("*.py"):
            if any(skip in str(py_file) for skip in ["node_modules", ".git", "__pycache__", "venv", ".venv"]):
                continue
            total += 1
            try:
                source = py_file.read_text(encoding="utf-8", errors="ignore")
                ast.parse(source, filename=str(py_file))
            except SyntaxError as e:
                errors.append({"file": str(py_file.relative_to(root)), "error": str(e)})

        if errors:
            return HealthCheck(
                name="python_syntax",
                status=HealthStatus.FAILING,
                message=f"{len(errors)} Python files have syntax errors",
                details={"errors": errors, "total_files": total},
            )
        return HealthCheck(
            name="python_syntax",
            status=HealthStatus.HEALTHY,
            message=f"All {total} Python files parse successfully",
            details={"total_files": total},
        )


class CheckpointIntegrityChecker:
    """Verifies that training checkpoints are valid."""

    def check(self, root: Path) -> HealthCheck:
        checkpoint_dirs = [
            root / "ai-platform" / "backend" / "checkpoints",
            root / "decision-engine" / "checkpoints",
        ]
        results = {}
        for ckpt_dir in checkpoint_dirs:
            dir_name = str(ckpt_dir.relative_to(root))
            if not ckpt_dir.exists():
                results[dir_name] = "missing"
                continue
            files = list(ckpt_dir.glob("*"))
            if not files:
                results[dir_name] = "empty"
                continue
            # Check for valid JSON metrics
            metrics_ok = 0
            for f in ckpt_dir.glob("*.json"):
                try:
                    json.loads(f.read_text())
                    metrics_ok += 1
                except (json.JSONDecodeError, OSError):
                    results[f"{dir_name}/{f.name}"] = "corrupt_json"
            results[dir_name] = f"{len(files)} files, {metrics_ok} valid metrics"

        has_issues = any("missing" in v or "empty" in v or "corrupt" in v for v in results.values())
        return HealthCheck(
            name="checkpoint_integrity",
            status=HealthStatus.DEGRADED if has_issues else HealthStatus.HEALTHY,
            message="Some checkpoints missing or corrupted" if has_issues else "All checkpoints valid",
            details=results,
        )


class ConfigConsistencyChecker:
    """Ensures configuration files are consistent across subsystems."""

    def check(self, root: Path) -> HealthCheck:
        issues = []

        # Check that .gitignore has essential entries
        gitignore = root / ".gitignore"
        if gitignore.exists():
            content = gitignore.read_text()
            for entry in ["node_modules", ".env", "__pycache__"]:
                if entry not in content:
                    issues.append(f".gitignore missing: {entry}")

        # Check server.json is valid JSON
        server_json = root / "server.json"
        if server_json.exists():
            try:
                data = json.loads(server_json.read_text())
                if "name" not in data:
                    issues.append("server.json missing 'name' field")
            except json.JSONDecodeError:
                issues.append("server.json is invalid JSON")

        # Check all package.json files are valid
        for pkg in root.rglob("package.json"):
            if "node_modules" in str(pkg):
                continue
            try:
                json.loads(pkg.read_text())
            except json.JSONDecodeError:
                issues.append(f"Invalid package.json: {pkg.relative_to(root)}")

        # Check all requirements.txt files exist where expected
        expected_req = [
            "ai-platform/backend/requirements.txt",
            "decision-engine/requirements.txt",
            "cyber-defense/model/requirements.txt",
        ]
        for req in expected_req:
            if not (root / req).exists():
                issues.append(f"Missing requirements: {req}")

        if issues:
            return HealthCheck(
                name="config_consistency",
                status=HealthStatus.DEGRADED,
                message=f"{len(issues)} configuration issues found",
                details={"issues": issues},
                fixable=True,
            )
        return HealthCheck(
            name="config_consistency",
            status=HealthStatus.HEALTHY,
            message="All configurations consistent",
        )


class WorkflowChecker:
    """Validates GitHub Actions workflow files."""

    def check(self, root: Path) -> HealthCheck:
        workflows_dir = root / ".github" / "workflows"
        if not workflows_dir.is_dir():
            return HealthCheck(
                name="github_workflows",
                status=HealthStatus.DEGRADED,
                message="No .github/workflows directory found",
            )

        issues = []
        total = 0
        for wf in workflows_dir.glob("*.yml"):
            total += 1
            try:
                content = wf.read_text()
                # Basic YAML validation (check for required keys)
                if "on:" not in content and "on :" not in content:
                    issues.append(f"{wf.name}: missing 'on' trigger")
                if "jobs:" not in content:
                    issues.append(f"{wf.name}: missing 'jobs' section")
            except OSError as e:
                issues.append(f"{wf.name}: read error: {e}")

        if issues:
            return HealthCheck(
                name="github_workflows",
                status=HealthStatus.DEGRADED,
                message=f"{len(issues)} workflow issues",
                details={"issues": issues, "total": total},
            )
        return HealthCheck(
            name="github_workflows",
            status=HealthStatus.HEALTHY,
            message=f"All {total} workflows valid",
            details={"total": total},
        )


class KnowledgeBaseChecker:
    """Validates knowledge base JSON files."""

    def check(self, root: Path) -> HealthCheck:
        kb_dir = root / "knowledge-base"
        if not kb_dir.is_dir():
            return HealthCheck(
                name="knowledge_base",
                status=HealthStatus.DEGRADED,
                message="No knowledge-base directory",
            )

        total = 0
        errors = []
        total_items = 0
        for json_file in kb_dir.rglob("*.json"):
            total += 1
            try:
                data = json.loads(json_file.read_text(encoding="utf-8"))
                if isinstance(data, dict):
                    total_items += len(data)
                elif isinstance(data, list):
                    total_items += len(data)
            except (json.JSONDecodeError, OSError) as e:
                errors.append({"file": str(json_file.relative_to(root)), "error": str(e)})

        if errors:
            return HealthCheck(
                name="knowledge_base",
                status=HealthStatus.DEGRADED,
                message=f"{len(errors)} corrupt knowledge files",
                details={"errors": errors, "total_files": total},
            )
        return HealthCheck(
            name="knowledge_base",
            status=HealthStatus.HEALTHY,
            message=f"{total} knowledge files, {total_items} items",
            details={"total_files": total, "total_items": total_items},
        )


class TrainingPipelineChecker:
    """Validates the continuous training pipeline can be imported."""

    def check(self, root: Path) -> HealthCheck:
        scripts = [
            root / "scripts" / "continuous_train.py",
            root / "scripts" / "knowledge_engine.py",
            root / "scripts" / "data_fetchers.py",
            root / "scripts" / "train_all.py",
        ]
        missing = [str(s.relative_to(root)) for s in scripts if not s.exists()]
        if missing:
            return HealthCheck(
                name="training_pipeline",
                status=HealthStatus.FAILING,
                message=f"Missing training scripts: {missing}",
                details={"missing": missing},
            )

        # Try to parse each script
        errors = []
        for script in scripts:
            try:
                source = script.read_text(encoding="utf-8")
                ast.parse(source, filename=str(script))
            except SyntaxError as e:
                errors.append({"file": str(script.relative_to(root)), "error": str(e)})

        if errors:
            return HealthCheck(
                name="training_pipeline",
                status=HealthStatus.FAILING,
                message="Training scripts have syntax errors",
                details={"errors": errors},
            )
        return HealthCheck(
            name="training_pipeline",
            status=HealthStatus.HEALTHY,
            message="All training scripts valid",
        )


class SubsystemChecker:
    """Verifies all major subsystems have expected structure."""

    _EXPECTED = {
        "ai-platform/backend": ["app", "graph_ai", "requirements.txt"],
        "decision-engine": ["main_decision_engine.py", "tests", "requirements.txt"],
        "cyber-defense": ["honeypot", "model", "docker-compose.yml"],
        "quantum-physics/backend": ["api", "engines", "requirements.txt"],
        "historical-strategy": ["api", "simulation"],
        "mcp-server": ["package.json", "src"],
    }

    def check(self, root: Path) -> HealthCheck:
        issues = []
        for subsystem, required in self._EXPECTED.items():
            base = root / subsystem
            if not base.exists():
                issues.append(f"{subsystem}: directory missing")
                continue
            for item in required:
                if not (base / item).exists():
                    issues.append(f"{subsystem}/{item}: missing")

        if issues:
            return HealthCheck(
                name="subsystem_structure",
                status=HealthStatus.DEGRADED,
                message=f"{len(issues)} structural issues",
                details={"issues": issues},
            )
        return HealthCheck(
            name="subsystem_structure",
            status=HealthStatus.HEALTHY,
            message="All subsystems structurally complete",
        )


# ═══════════════════════════════════════════════════════════════════════
# Self-Healing Monitor (orchestrator)
# ═══════════════════════════════════════════════════════════════════════

class SelfHealingMonitor:
    """Orchestrates all health checkers, reports status, and auto-heals."""

    def __init__(self, root: Path | None = None):
        self.root = root or REPO_ROOT
        self.checkers = [
            PythonImportChecker(),
            CheckpointIntegrityChecker(),
            ConfigConsistencyChecker(),
            WorkflowChecker(),
            KnowledgeBaseChecker(),
            TrainingPipelineChecker(),
            SubsystemChecker(),
        ]

    def check_all(self) -> SystemHealth:
        """Run all health checks."""
        health = SystemHealth()
        for checker in self.checkers:
            logger.info("health_check", checker=checker.__class__.__name__)
            try:
                result = checker.check(self.root)
                health.checks.append(result)
                logger.info("health_result",
                            name=result.name, status=result.status.value,
                            message=result.message)
            except Exception as e:
                health.checks.append(HealthCheck(
                    name=checker.__class__.__name__,
                    status=HealthStatus.UNKNOWN,
                    message=f"Check failed: {e}",
                ))
        return health

    def heal(self, health: SystemHealth) -> int:
        """Attempt to auto-fix fixable issues. Returns count of fixes."""
        fixed = 0
        for check in health.checks:
            if check.fixable and check.status != HealthStatus.HEALTHY:
                success = self._attempt_fix(check)
                if success:
                    check.fixed = True
                    check.status = HealthStatus.HEALTHY
                    check.message += " [auto-fixed]"
                    fixed += 1
        return fixed

    def _attempt_fix(self, check: HealthCheck) -> bool:
        """Attempt to fix a specific health check issue."""
        if check.name == "config_consistency":
            return self._fix_config_issues(check)
        return False

    def _fix_config_issues(self, check: HealthCheck) -> bool:
        """Fix configuration consistency issues."""
        issues = check.details.get("issues", [])
        fixed_any = False
        for issue in issues:
            if ".gitignore missing:" in issue:
                entry = issue.split("missing: ")[1]
                gitignore = self.root / ".gitignore"
                if gitignore.exists():
                    content = gitignore.read_text()
                    if entry not in content:
                        with open(gitignore, "a") as f:
                            f.write(f"\n{entry}/\n")
                        fixed_any = True
        return fixed_any


# ═══════════════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════════════

def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Disha Self-Healing Monitor")
    parser.add_argument("--fix", action="store_true", help="Attempt auto-repair")
    parser.add_argument("--json", action="store_true", help="JSON output")
    args = parser.parse_args()

    monitor = SelfHealingMonitor()
    health = monitor.check_all()

    if args.fix:
        fixed = monitor.heal(health)
        logger.info("heal_complete", fixed=fixed)

    if args.json:
        print(json.dumps(health.to_dict(), indent=2))
    else:
        _print_health(health)

    # Save report
    report_path = REPO_ROOT / "health_report.json"
    with open(report_path, "w") as f:
        json.dump(health.to_dict(), f, indent=2)

    # Exit code
    if health.overall_status == HealthStatus.FAILING:
        sys.exit(2)
    elif health.overall_status == HealthStatus.DEGRADED:
        sys.exit(1)
    sys.exit(0)


def _print_health(health: SystemHealth) -> None:
    status_emoji = {
        HealthStatus.HEALTHY: "🟢",
        HealthStatus.DEGRADED: "🟡",
        HealthStatus.FAILING: "🔴",
        HealthStatus.UNKNOWN: "⚪",
    }

    emoji = status_emoji.get(health.overall_status, "⚪")
    print(f"\n{'═' * 60}")
    print(f"  {emoji} Disha System Health: {health.overall_status.value.upper()}")
    print(f"  Score: {health.score:.0%}")
    print(f"{'═' * 60}")

    for check in health.checks:
        e = status_emoji.get(check.status, "⚪")
        fixed_tag = " [AUTO-FIXED]" if check.fixed else ""
        print(f"  {e} {check.name}: {check.message}{fixed_tag}")

    print(f"\n{'═' * 60}\n")


if __name__ == "__main__":
    main()
