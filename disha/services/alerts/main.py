from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import datetime

app = FastAPI(title="DISHA Alerts Service", version="6.0.0")

class AlertRequest(BaseModel):
    title: str
    message: str
    severity: str # critical, high, medium, low
    region: str
    category: str # disaster, crime, health, cyber, traffic
    channels: List[str] = ["web"] # sms, push, web, voice

@app.get("/")
async def root():
    return {"status": "online", "service": "DISHA Alerts", "version": "6.0.0"}

@app.post("/dispatch")
async def dispatch_alert(alert: AlertRequest):
    # Log the alert dispatch
    timestamp = datetime.datetime.now().isoformat()
    print(f"[{timestamp}] Dispatching {alert.severity} alert: {alert.title} to {alert.region}")
    
    # Placeholder for actual notification dispatch logic
    # In a real scenario, this would integrate with Twilio, Firebase, etc.
    
    return {
        "status": "dispatched",
        "alert_id": f"ALRT-{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}",
        "timestamp": timestamp,
        "details": alert
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
