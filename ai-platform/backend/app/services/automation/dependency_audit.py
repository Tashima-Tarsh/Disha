"""Dependency Audit Service - Automated vulnerability scanning for DISHA Sentinel."""

import structlog
from typing import Any


logger = structlog.get_logger(__name__)

class DependencyAudit:
    """Service to scan for insecure dependencies and supply-chain threats."""

    def __init__(self, requirements_path: str = "requirements.txt"):
        self.requirements_path = requirements_path
        self.logger = logger.bind(service="dependency_audit")

    async def run_scan(self) -> dict[str, Any]:
        """Perform a scan of the repository's dependencies."""
        self.logger.info("audit_started", path=self.requirements_path)

        try:
            # 1. Parse requirements
            packages = self._parse_requirements()

            # 2. Check for vulnerable versions (Simplified for Sentinel demonstration)
            # In production, this would call 'safety' or 'auditwheel'
            vulnerabilities = self._check_vulnerabilities(packages)

            # 3. Generate summary
            severity = "low"
            if any(v["level"] == "critical" for v in vulnerabilities):
                severity = "critical"
            elif any(v["level"] == "high" for v in vulnerabilities):
                severity = "high"

            self.logger.info("audit_completed", vulnerable_count=len(vulnerabilities), severity=severity)

            return {
                "status": "success",
                "packages_scanned": len(packages),
                "vulnerabilities": vulnerabilities,
                "overall_severity": severity,
                "remediation": self._generate_remediation(vulnerabilities)
            }
        except Exception as e:
            self.logger.error("audit_failed", error=str(e))
            return {"status": "error", "message": str(e)}

    def _parse_requirements(self) -> list[dict[str, str]]:
        """Extract packages and versions from requirements.txt."""
        packages = []
        try:
            with open(self.requirements_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        # Basic splitter for 'pkg==version' or 'pkg>=version'
                        if "==" in line:
                            name, ver = line.split("==")
                        elif ">=" in line:
                            name, ver = line.split(">=")
                        else:
                            name, ver = line, "latest"
                        packages.append({"name": name, "version": ver})
        except FileNotFoundError:
            self.logger.error("requirements_not_found")
        return packages

    def _check_vulnerabilities(self, packages: list[dict[str, str]]) -> list[dict[str, Any]]:
        """Check for known insecure versions of critical packages."""
        vulnerabilities = []

        # Example vulnerable patterns (Mock-up for Sentinel mission)
        threat_patterns = {
            "fastapi": {"min_safe": "0.100.0", "level": "high", "id": "SN-001"},
            "langchain": {"min_safe": "0.1.0", "level": "medium", "id": "SN-002"},
            "uvicorn": {"min_safe": "0.20.0", "level": "critical", "id": "SN-003"}
        }

        for pkg in packages:
            name = pkg["name"].lower()
            if name in threat_patterns:
                # Basic version comparison (simplified)
                if pkg["version"] != "latest" and pkg["version"] < threat_patterns[name]["min_safe"]:
                    vulnerabilities.append({
                        "package": pkg["name"],
                        "installed": pkg["version"],
                        "required": threat_patterns[name]["min_safe"],
                        "level": threat_patterns[name]["level"],
                        "threat_id": threat_patterns[name]["id"],
                        "description": f"Vulnerable version of {pkg['name']} detected. Risk of RCE or DoS."
                    })

        return vulnerabilities

    def _generate_remediation(self, vulnerabilities: list[dict[str, Any]]) -> str:
        """Generate a patch priority summary."""
        if not vulnerabilities:
            return "No immediate security patches required for current dependencies."

        steps = ["Fix critical vulnerabilities by updating packages:"]
        for v in vulnerabilities:
            steps.append(f"- Update {v['package']} from {v['installed']} to >= {v['required']}")
        return "\n".join(steps)
