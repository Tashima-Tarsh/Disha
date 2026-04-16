# Troubleshooting Guide

This guide provides solutions to common issues encountered while setting up or running the **DISHA Sovereign Intelligence Platform**.

## 🚀 Build & Installation Issues

### `npm install` or `bun install` fails
- **Cause**: Dependency conflicts or network issues.
- **Solution**: 
  1. Clear the cache: `bun pm cache clean`.
  2. Remove lockfiles: `rm bun.lock package-lock.json`.
  3. Re-run: `bun install`.

### `TypeScript` errors during build
- **Cause**: Version mismatch or missing types.
- **Solution**: Ensure you are on **TypeScript 5.6.2**. If errors persist in specific microservices, run `bun run check` from the root to identify the colliding workspace.

---

## 🧠 Intelligence & AI Issues

### `ModuleNotFoundError: No module named 'disha'`
- **Cause**: Python cannot find the root package.
- **Solution**: Run your scripts from the repository root, or add the root to your environment:
  ```bash
  export PYTHONPATH=$PYTHONPATH:$(pwd)
  ```

### `Confidence Gate` rejecting all actions
- **Cause**: The model is uncertain or the `confidence_gate` threshold is too high.
- **Solution**: Adjust the `confidence_gate` in `disha/ai/core/config.json`. Default is `0.85`. For testing, try `0.5`.

---

## 🛡️ Sentinel & Microservice Issues

### Service becomes "Unresponsive" in dashboard
- **Cause**: The microservice has crashed or the heartbeat is blocked.
- **Solution**:
  1. Check logs: `docker logs <service_name>`.
  2. Manual Restart: Use the `disha_mythos.py` orchestrator to trigger a self-healing cycle.

### `Neo4j` Connection Refused
- **Cause**: The graph database is not running or the port (7687) is blocked.
- **Solution**: Verify the container status with `docker ps`. Ensure the `NEO4J_URI` in your `.env` matches the container's internal network address.

---

## 📊 Dashboard Issues

### Real-time telemetry is not showing
- **Cause**: WebSocket connection failed.
- **Solution**: Check if the backend service (port 8000) is running and that `NEXT_PUBLIC_WS_URL` is correctly set in your frontend `.env`.

---

## 🆘 Still Need Help?
If your issue isn't listed here:
1.  Check the [GitHub Issues](https://github.com/Tashima-Tarsh/Disha/issues).
2.  Review the [Full Wiki](./wiki/Home.md).
3.  Run the system diagnostic: `python disha/scripts/monitor.py --check-health`.
