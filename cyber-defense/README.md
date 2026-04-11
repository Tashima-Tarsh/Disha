[← Back to main README](../README.md)

## Table of Contents
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)

# 🛡️ Disha Virtual Cyber Defense System

> **STRICTLY DEFENSIVE — SAFE — ISOLATED**
>
> For Blue Team Research, Education, and Defense Simulation Only.

## Overview

The Disha Virtual Cyber Defense System is an AI-powered honeypot and defense simulation platform. It detects attackers, analyzes behavior using machine learning, and simulates countermeasures — all within isolated containers with **no real-world offensive actions**.

## Architecture

```
cyber-defense/
├── honeypot/                  # Honeypot services
│   ├── cowrie/                # SSH honeypot (Cowrie)
│   ├── dionaea/               # Multi-protocol honeypot (Dionaea)
│   ├── opencanary/               # Multi-service honeypot (OpenCanary)
│   └── fail2ban/              # IP blocking configuration
├── model/                     # AI detection engine
│   ├── train.py               # Training pipeline (PyTorch)
│   └── inference.py           # Real-time inference
├── response_engine/           # Simulated countermeasures
│   └── sim_response.py        # Tarpit, fake shell, decoys, containment
├── dashboard/                 # ELK Stack configuration
│   └── logstash.conf          # Log ingestion pipeline
├── scripts/                   # Automation & utilities
│   ├── threat_intel/          # Threat intelligence feed updater
│   ├── health_check.sh        # Service health monitoring
│   └── cron.txt               # Scheduled task configuration
├── logs/                      # Centralized log storage
│   ├── cowrie/                # SSH honeypot logs
│   ├── dionaea/               # Multi-protocol logs
│   └── opencanary/               # OpenCanary logs (HTTP, FTP, Git, Redis)
├── test/                      # Test suite
├── docker-compose.yml         # Full system orchestration
├── .env.example               # Environment template
└── README.md                  # This file
```

## Features

| Component | Description |
|-----------|-------------|
| **SSH Honeypot** | Cowrie-based SSH/Telnet honeypot capturing login attempts and commands |
| **Multi-Protocol Honeypot** | Dionaea capturing HTTP, SMB, and MySQL attack traffic |
| **OpenCanary Honeypot** | Open-source multi-service honeypot (HTTP, FTP, Git, Redis) by Thinkst |
| **AI Detection Engine** | PyTorch binary & multi-class attack classifier + anomaly detection |
| **Response Engine** | Simulated tarpit, fake shell, decoy filesystem, containment zones |
| **ELK Dashboard** | Real-time monitoring of attackers, attack types, threat scores |
| **Threat Intelligence** | Auto-enrichment with geo-location, ASN, and blocklist feeds |
| **Fail2ban** | Automated IP blocking based on honeypot log patterns |
| **Automation** | Health checks, cron jobs, auto-restart, feed updates |

## Quick Start

### Prerequisites

- Docker & Docker Compose v2+
- 4 GB RAM minimum (8 GB recommended for ELK)

### 1. Clone & Configure

```bash
git clone https://github.com/Tashima-Tarsh/Disha.git
cd Disha/cyber-defense
cp .env.example .env
# Edit .env with your preferences
```

### 2. Start the System

```bash
docker compose up --build -d
```

### 3. Access Services

| Service | URL | Description |
|---------|-----|-------------|
| Kibana Dashboard | http://localhost:5601 | Real-time attack monitoring |
| Elasticsearch | http://localhost:9200 | Log search API |
| OpenCanary HTTP | http://localhost:8081 | HTTP honeypot (open-source) |
| OpenCanary FTP | `ftp localhost 2121` | FTP honeypot |
| OpenCanary Redis | `redis-cli -p 6379` | Redis honeypot |
| OpenCanary Git | `git clone git://localhost:9418/test` | Git honeypot |
| SSH Honeypot | `ssh -p 2222 localhost` | Cowrie SSH trap |

### 4. Train AI Models

```bash
# Train with existing logs
docker compose run --rm model-engine python train.py

# Or train locally
cd model && pip install -r requirements.txt && python train.py
```

### 5. Run Inference

```bash
docker compose run --rm model-engine python inference.py
```

### 6. Update Threat Intelligence

```bash
docker compose run --rm threat-intel
```

## OpenCanary Honeypot

[OpenCanary](https://github.com/thinkst/opencanary) is an open-source multi-service honeypot by Thinkst. It simulates real services and logs all interactions to structured JSON.

### Simulated Services

| Service | Port | Description |
|---------|------|-------------|
| HTTP | 8081 | Web server honeypot (Apache banner) |
| FTP | 2121 | FTP login trap |
| Git | 9418 | Git repository access trap |
| Redis | 6379 | Redis command trap |

### Log Format

OpenCanary outputs JSON lines with the following key fields:

```json
{
  "src_host": "172.17.0.1",
  "dst_port": 8080,
  "logtype": 3000,
  "logdata": {
    "PATH": "/admin",
    "USERAGENT": "curl/7.68.0"
  },
  "utc_time": "2026-04-11T01:23:45.123456Z",
  "node_id": "disha-opencanary-1"
}
```

### Log Types

| logtype | Service |
|---------|---------|
| 2000 | FTP login attempt |
| 3000 | HTTP request |
| 14000 | Git access |
| 17000 | Redis command |

## AI Detection Engine

### Models

1. **Binary Classifier** — Benign vs Malicious (2 classes)
2. **Multi-Class Classifier** — Benign, Brute Force, Injection, Bot, Scan (5 classes)
3. **Anomaly Detector** — Autoencoder for unsupervised anomaly detection

### Features Extracted

- Endpoint path length and pattern matching
- HTTP method type
- Payload content analysis (SQL injection patterns)
- User-Agent classification
- IP address characteristics

### Training

Models auto-generate synthetic training data when real logs are insufficient, then can be retrained as honeypots collect more data.

## Response Engine (Simulation Only)

All responses are **virtual simulations** with no real-world impact:

| Response | Description |
|----------|-------------|
| **Tarpit** | Artificial delays to slow attacker tools |
| **Fake Shell** | Simulated command responses (ls, whoami, etc.) |
| **Decoy Files** | Fake SSH keys, credentials, configs |
| **Containment** | Virtual isolation zone tracking |

## Monitoring & Dashboard

The ELK Stack provides:

- **Real-time log ingestion** via Logstash
- **GeoIP enrichment** for attacker location mapping
- **Attack pattern detection** via Logstash filters
- **Kibana dashboards** for visualization

### Suggested Kibana Dashboards

1. Active Attackers Map (GeoIP)
2. Attack Types Distribution
3. Threat Score Timeline
4. Top Targeted Endpoints
5. Login Attempt Frequency

## Automation

| Task | Schedule | Method |
|------|----------|--------|
| Threat feed update | Daily 4:00 AM UTC | Cron / Docker |
| Health check | Every 15 minutes | Cron |
| Container updates | Weekly Sunday 3:00 AM | Cron |
| Log rotation | Monthly | Cron |

Install cron jobs: `crontab scripts/cron.txt`

## Testing

```bash
# Python tests (model + response engine)
cd cyber-defense && python -m pytest test/ -v

# Validate configurations
docker compose config --quiet
```

## Security & Safety

⚠️ **IMPORTANT**: This system is designed for **defensive research and blue team simulation ONLY**.

- All honeypots run in isolated Docker containers
- No offensive capabilities are included
- Response engine actions are strictly simulated
- Fail2ban provides automated IP blocking
- Rate limiting protects honeypot services
- Containers run with `no-new-privileges` and memory limits
- All data stays within the local environment

### What This System Does NOT Do

- ❌ Attack or scan real systems
- ❌ Execute real exploits
- ❌ Exfiltrate data
- ❌ Modify host network configuration
- ❌ Connect to unauthorized external systems

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

See the root [LICENSE](../LICENSE) file.

---

**For education, defensive research, and blue team simulation only.**
