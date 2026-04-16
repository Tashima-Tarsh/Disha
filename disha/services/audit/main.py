from fastapi import FastAPI, Request
import json
import datetime
import os

app = FastAPI(title="DISHA Audit Log Service", version="6.0.0")

LOG_FILE = "audit_log.jsonl"


@app.post("/log")
async def log_event(request: Request):
    data = await request.json()
    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "event": data.get("event", "unknown"),
        "actor": data.get("actor", "system"),
        "details": data.get("details", {}),
        "status": data.get("status", "info")
    }

    with open(LOG_FILE, "a") as f:
        f.write(json.dumps(log_entry) + "\n")

    return {"status": "logged", "entry": log_entry}


@app.get("/logs")
async def get_logs(limit: int = 100):
    logs = []
    if os.path.exists(LOG_FILE):
        with open(LOG_FILE, "r") as f:
            lines = f.readlines()
            for line in lines[-limit:]:
                logs.append(json.loads(line))
    return logs

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
