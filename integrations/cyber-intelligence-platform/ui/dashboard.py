"""
Cyber Intelligence Dashboard — FastAPI service.

/data    → real alert counts aggregated from the pipeline
/alerts  → live alert feed
/        → HTML dashboard with Chart.js + Leaflet (OpenStreetMap)
"""
import logging

from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

from alerts.alert_engine import alerts_data

logger = logging.getLogger(__name__)

app = FastAPI(title="Cyber Intelligence Dashboard", version="1.0.0")


def get_data() -> dict:
    """
    Aggregate live alert counts by crime type.
    Falls back to zero-counts when no alerts have been processed yet.
    """
    counts = {"upi": 0, "phishing": 0, "ransomware": 0, "other": 0}
    for alert in alerts_data:
        crime = (alert.get("crime") or "").lower()
        if "upi" in crime or "otp" in crime:
            counts["upi"] += 1
        elif "phishing" in crime:
            counts["phishing"] += 1
        elif "ransom" in crime:
            counts["ransomware"] += 1
        else:
            counts["other"] += 1
    return counts


@app.get("/data")
def data():
    return JSONResponse(get_data())


@app.get("/alerts")
def alerts():
    return alerts_data


@app.get("/", response_class=HTMLResponse)
def dashboard():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Cyber Intelligence Dashboard</title>

        <!-- Chart.js (open-source, MIT) -->
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

        <!-- Leaflet (open-source, BSD-2) -->
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

        <style>
            body { font-family: sans-serif; padding: 1rem; background: #0f172a; color: #e2e8f0; }
            h1, h2 { color: #f87171; }
            canvas { background: #1e293b; border-radius: 8px; padding: 1rem; }
            ul#alerts-list { list-style: none; padding: 0; }
            ul#alerts-list li { background: #1e293b; margin: 4px 0; padding: 8px 12px; border-left: 3px solid #f87171; border-radius: 4px; }
            #map { height: 400px; border-radius: 8px; margin-top: 1rem; }
        </style>
    </head>
    <body>
        <h1>🚨 Disha Cyber Intelligence Dashboard</h1>

        <h2>📊 Live Crime Statistics</h2>
        <canvas id="chart" width="600" height="250"></canvas>

        <h2>🚨 Live Alerts</h2>
        <ul id="alerts-list"></ul>

        <h2>🗺️ India Threat Map (OpenStreetMap)</h2>
        <div id="map"></div>

        <script>
            let chartInstance = null;

            async function loadData() {
                try {
                    const res = await fetch('/data');
                    const data = await res.json();

                    const labels = ['UPI Fraud', 'Phishing', 'Ransomware', 'Other'];
                    const values = [data.upi, data.phishing, data.ransomware, data.other];

                    const ctx = document.getElementById('chart').getContext('2d');
                    if (chartInstance) {
                        chartInstance.data.datasets[0].data = values;
                        chartInstance.update();
                    } else {
                        chartInstance = new Chart(ctx, {
                            type: 'bar',
                            data: {
                                labels,
                                datasets: [{
                                    label: 'Cases (live)',
                                    data: values,
                                    backgroundColor: ['#f87171','#fb923c','#facc15','#4ade80'],
                                }]
                            },
                            options: {
                                plugins: { legend: { labels: { color: '#e2e8f0' } } },
                                scales: {
                                    x: { ticks: { color: '#e2e8f0' } },
                                    y: { ticks: { color: '#e2e8f0' }, beginAtZero: true }
                                }
                            }
                        });
                    }

                    const res2 = await fetch('/alerts');
                    const alertData = await res2.json();
                    const list = document.getElementById('alerts-list');
                    list.innerHTML = alertData.length === 0
                        ? '<li>No alerts yet — run the pipeline to generate events.</li>'
                        : '';
                    alertData.forEach(a => {
                        const li = document.createElement('li');
                        li.textContent = `[${a.crime || 'Unknown'}] ${a.message}`;
                        list.appendChild(li);
                    });
                } catch (err) {
                    console.error('Dashboard fetch error:', err);
                }
            }

            loadData();
            setInterval(loadData, 10000);  // auto-refresh every 10 s

            // Map — OpenStreetMap tiles (free, no API key)
            const map = L.map('map').setView([22.9734, 78.6569], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Threat markers from alert data (populated on load)
            async function addMapMarkers() {
                try {
                    const res = await fetch('/alerts');
                    const alertData = await res.json();
                    alertData.forEach(a => {
                        if (a.lat && a.lon) {
                            L.marker([a.lat, a.lon]).addTo(map).bindPopup(a.message);
                        }
                    });
                } catch (_) {}
            }
            addMapMarkers();
        </script>
    </body>
    </html>
    """


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