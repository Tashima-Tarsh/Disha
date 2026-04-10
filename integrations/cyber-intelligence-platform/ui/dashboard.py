from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse
from alerts.alert_engine import alerts_data
import random

app = FastAPI()

# 🔴 Sample data (can be replaced with real later)
def get_data():
    return {
        "upi": random.randint(50, 150),
        "phishing": random.randint(30, 100),
        "ransomware": random.randint(10, 50)
    }

# 📊 Data API
@app.get("/data")
def data():
    return JSONResponse(get_data())

# 🚨 Alerts API (connected to pipeline)
@app.get("/alerts")
def alerts():
    return alerts_data

# 🌐 Dashboard UI
@app.get("/", response_class=HTMLResponse)
def dashboard():
    return """
    <html>
    <head>
        <title>Cyber Intelligence Dashboard</title>

        <!-- Chart.js -->
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

        <!-- Leaflet Map -->
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
    </head>

    <body>
        <h1>🚨 Cyber Intelligence Dashboard</h1>

        <h2>📊 Crime Statistics</h2>
        <canvas id="chart" width="400" height="200"></canvas>

        <h2>🚨 Live Alerts</h2>
        <ul id="alerts"></ul>

        <h2>🗺️ India Map</h2>
        <div id="map" style="height: 400px;"></div>

        <script>
            async function loadData() {
                const res = await fetch('/data');
                const data = await res.json();

                // Chart
                const ctx = document.getElementById('chart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['UPI Fraud', 'Phishing', 'Ransomware'],
                        datasets: [{
                            label: 'Cases',
                            data: [data.upi, data.phishing, data.ransomware]
                        }]
                    }
                });

                // Alerts (LIVE)
                const res2 = await fetch('/alerts');
                const alertData = await res2.json();

                const alerts = document.getElementById('alerts');
                alerts.innerHTML = "";
                alertData.forEach(a => {
                    const li = document.createElement('li');
                    li.innerText = a.message;
                    alerts.appendChild(li);
                });
            }

            loadData();

            // Map
            var map = L.map('map').setView([22.9734, 78.6569], 5);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'Map'
            }).addTo(map);

            // Sample markers
            L.marker([28.6139, 77.2090]).addTo(map).bindPopup("Delhi Fraud");
            L.marker([19.0760, 72.8777]).addTo(map).bindPopup("Mumbai Attack");
        </script>

    </body>
    </html>
    """