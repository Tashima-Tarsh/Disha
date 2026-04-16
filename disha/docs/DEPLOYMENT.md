# Deployment Guide

DISHA is designed to scale from local investigation environments to high-availability national data centers.

## 🐳 Docker Deployment (Recommended)

The standard way to deploy DISHA is using Docker Compose to orchestrate the monorepo clusters.

```bash
docker compose -f disha/infra/docker/docker-compose.yml up -d
```

### Production Hardening
For production deployments, ensure:
1.  **Secrets**: Use Docker Secrets or HashiCorp Vault instead of `.env` files.
2.  **Volumes**: Maps persistent storage for Neo4j and ChromaDB to RAID/SSD arrays.
3.  **Networking**: Place the AI Core and Memory layers in an internal private network.

---

## ☸️ Kubernetes (Enterprise Scale)

Deployment manifests for K8s are located in `disha/infra/k8s/`.

1.  **Deploy Memory Tier**:
    ```bash
    kubectl apply -f disha/infra/k8s/persistence/
    ```
2.  **Deploy Intelligence Core**:
    ```bash
    kubectl apply -f disha/infra/k8s/core/
    ```
3.  **Deploy Web Command Center**:
    ```bash
    kubectl apply -f disha/infra/k8s/apps/
    ```

---

## ☁️ Cloud Providers

### AWS / GCP / Azure
- **Compute**: Use GPU-enabled instances (p3/g4 on AWS) for the reasoning and physics engines.
- **Managed Services**: You can replace local Neo4j/Kafka with managed alternatives like Neo4j Aura or Confluent Cloud by updating the `.env` configuration.

---

## ⚡ Edge Deployment

For deploying on low-power devices (NVIDIA Jetson, dedicated IoT gateways):
- Use the `edge` build profile to disable the high-fidelity physics simulator.
- Use quantized GGUF models via Ollama to reduce VRAM requirements to < 4GB.
