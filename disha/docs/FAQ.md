# FAQ

Frequently asked questions about the **DISHA Sovereign Intelligence Platform**.

## 🧠 General Questions

### What does "DISHA" stand for?
DISHA stands for **Digital Intelligence & Strategic Holistic Analysis**. In Sanskrit, "Disha" (दिशा) also means **Direction**.

### Is DISHA an AGI?
DISHA is a high-autonomy cognitive platform. While it exhibits complex reasoning and self-healing behaviors, it is designed for specialized national and institutional protection rather than open-domain multi-purpose intelligence.

### Can DISHA run offline?
Yes. By using the `mock` or `ollama` providers, DISHA can operate in completely air-gapped environments, making it suitable for secure classified deployments.

---

## 🛠️ Technical Questions

### Why use Bun instead of Node.js?
Bun provides significantly better performance ($3x-10x$) for the type of high-frequency CLI and API operations DISHA performs, while also providing a superior unified workspace experience for our monorepo.

### How do I add a new AI agent to the loop?
Agents are defined in `disha/ai/core/agents/`. To add a new one, inherit from `BaseAgent` and register it in the `deliberator.py` module.

### How do I fix "ModuleNotFoundError: No module named 'disha'"?
Ensure you are running commands from the root directory and that the root is in your `PYTHONPATH`.

---

## 🛡️ Security Questions

### Is my data sent to the cloud?
Only if you configure DISHA to use cloud providers like OpenAI or Anthropic. For total privacy, use a local model provider.

### How does the self-healing feature work?
The `Mythos` orchestrator constantly monitors service health via heartbeats. If a service becomes unresponsive or exhibits anomalous behavior, Mythos triggers an automated container restart or deployment rollback.
