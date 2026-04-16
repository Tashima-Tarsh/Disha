# Disha Virtual Cyber Defense System — Safety Policy

## Purpose

This system is built **exclusively** for defensive cybersecurity research,
blue team training, and honeypot-based threat intelligence gathering.

## Scope

All components in the `cyber-defense/` directory operate within isolated
Docker containers. No component is designed or permitted to:

1. Attack, scan, or probe external systems or networks
2. Execute real exploits against any target
3. Exfiltrate, modify, or destroy data on production systems
4. Bypass network security controls on the host
5. Perform any unauthorized access to third-party systems

## Isolation Guarantees

- **Container isolation**: All services run in Docker with restricted
  capabilities (`no-new-privileges`, memory limits, read-only where possible)
- **Network isolation**: The `honeynet` bridge network is separate from
  host networking (except explicit port mappings for honeypot services)
- **Response simulation**: The response engine performs simulated actions
  only — no real network traffic, no real file manipulation outside containers
- **Data containment**: All logs and model artifacts remain within the
  `cyber-defense/` directory structure

## Acceptable Use

✅ Blue team exercises and training
✅ Honeypot deployment for threat intelligence
✅ AI/ML research on attack detection
✅ Security tool testing in controlled environments
✅ Academic research and education

## Prohibited Use

❌ Offensive operations against any target
❌ Unauthorized access to systems or networks
❌ Deployment in production environments without proper authorization
❌ Distribution of captured attacker data without proper anonymization
❌ Any use that violates applicable laws or regulations

## Responsible Disclosure

If you discover a security issue in this system, please report it
responsibly via the repository's security advisories.

## Compliance

Users of this system are responsible for ensuring compliance with:
- Local and national cybersecurity laws
- Organizational security policies
- Ethical guidelines for security research
