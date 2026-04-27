import datetime
import random

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="DISHA Forecast Service", version="6.0.0")


class ForecastRequest(BaseModel):
    region: str
    target_date: str | None = None
    indicators: list[str] = ["weather", "crime", "traffic"]


@app.get("/")
async def root():
    return {"status": "online", "service": "DISHA Forecast", "version": "6.0.0"}


@app.post("/predict")
async def generate_forecast(request: ForecastRequest):
    # This would normally involve ML model inference
    # Placeholder logic simulating risk scores

    risks = {
        "flood_risk": round(random.uniform(0.1, 0.9), 2),
        "crime_probability": round(random.uniform(0.05, 0.4), 2),
        "heatwave_index": round(random.uniform(20, 45), 1),
        "traffic_congestion": random.choice(["Low", "Moderate", "High", "Severe"]),
    }

    return {
        "region": request.region,
        "forecast_timestamp": datetime.datetime.now().isoformat(),
        "risks": risks,
        "recommendation": "Monitor critical infrastructure"
        if risks["flood_risk"] > 0.7
        else "Normal awareness",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8002)
