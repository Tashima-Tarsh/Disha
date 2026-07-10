# Sentinel Cyber Defense Mesh

DishaOS operates on the assumption that any network it connects to is hostile. To protect the Sovereign Intelligence Core, we run a containerized, ML-powered blue-team defense mesh.

## 1. The Honeypot Mesh
We deploy a triad of deceptive services to attract, log, and isolate attackers.
- **Cowrie:** A medium-interaction SSH and Telnet honeypot designed to log brute force attacks and shell interaction.
- **OpenCanary:** A lightweight daemon configured to mimic HTTP, FTP, Redis, and Git services, generating high-fidelity alerts upon interaction.
- **Dionaea:** Captures malware payloads via SMB and MySQL emulation.

## 2. ML Threat Detection
Raw logs from the honeypot mesh are streamed to the PyTorch-based detection engine.
- **Binary Classification:** Instantly flags traffic as benign or malicious.
- **Multiclass Classification:** Categorizes the attack vector (e.g., DDoS, SQLi, Lateral Movement).
- **Anomaly Autoencoder:** An unsupervised model that detects zero-day behaviors that deviate from the established network baseline.

## 3. The Response Engine
**DishaOS executes zero offensive actions.** We are strictly blue-team.
When a threat is classified with high confidence (> 90%), the Response Engine engages:
1. **Tarpitting:** Deliberately slows down TCP connections to exhaust the attacker's resources (highly effective on the Go4Bid service).
2. **Virtual Containment:** Reroutes the attacker's IP to a decoy filesystem that mimics the production environment.
3. **Alerting:** Pings the FastAPI `/api/v1/agents/sentinel` endpoint, allowing the Security Agent to analyze the attack pattern and update the Semantic Memory graph.
