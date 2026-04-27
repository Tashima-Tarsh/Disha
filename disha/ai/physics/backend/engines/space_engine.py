"""
Space Engine — orbital mechanics, NASA APIs, and solar system data.
Uses only numpy (no poliastro required).
"""

from __future__ import annotations

import json
import logging
import math
import os
from pathlib import Path

logger = logging.getLogger(__name__)

try:
    import httpx

    _HTTPX = True
except Exception:
    _HTTPX = False

_KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"
_NASA_API_KEY = os.environ.get("NASA_API_KEY", "DEMO_KEY")

# Gravitational parameter of Sun (km³/s²)
_GM_SUN = 1.327124e11

# AU in km
_AU_KM = 1.495978707e8

# Fallback APOD data
_FALLBACK_APOD = {
    "date": "2024-01-01",
    "title": "The Crab Nebula",
    "explanation": "The Crab Nebula is a supernova remnant, the result of a stellar explosion observed by Chinese and Arab astronomers in 1054 CE. It lies 6,500 light-years away in Taurus.",
    "url": "https://apod.nasa.gov/apod/image/2401/Crab_nebula.jpg",
    "media_type": "image",
    "copyright": "NASA/ESA/Hubble",
    "fallback": True,
}

_FALLBACK_NEO = {
    "element_count": 3,
    "near_earth_objects": [
        {
            "id": "3542519",
            "name": "2021 PH27",
            "estimated_diameter_km": {"min": 0.1, "max": 0.25},
            "is_potentially_hazardous": False,
            "close_approach_date": "2024-06-15",
            "miss_distance_km": 1234567.0,
            "relative_velocity_kms": 12.4,
        },
        {
            "id": "3627918",
            "name": "2020 NK1",
            "estimated_diameter_km": {"min": 0.3, "max": 0.7},
            "is_potentially_hazardous": True,
            "close_approach_date": "2024-08-22",
            "miss_distance_km": 2341890.0,
            "relative_velocity_kms": 18.7,
        },
        {
            "id": "3720004",
            "name": "2019 XS",
            "estimated_diameter_km": {"min": 0.05, "max": 0.1},
            "is_potentially_hazardous": False,
            "close_approach_date": "2024-09-01",
            "miss_distance_km": 500000.0,
            "relative_velocity_kms": 8.1,
        },
    ],
    "fallback": True,
}


def _load_space_json() -> dict:
    try:
        with open(_KNOWLEDGE_DIR / "space_science.json", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


class SpaceEngine:
    """Space science computations and NASA API wrapper."""

    def __init__(self) -> None:
        self._space_data = _load_space_json()
        self._planet_data = self._build_planet_map()

    # ── Public API ────────────────────────────────────────────────────────────

    def get_apod(self) -> dict:
        """Fetch NASA Astronomy Picture of the Day."""
        if not _HTTPX:
            return _FALLBACK_APOD
        try:
            url = f"https://api.nasa.gov/planetary/apod?api_key={_NASA_API_KEY}"
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url)
                resp.raise_for_status()
                data = resp.json()
                return {
                    "date": data.get("date", ""),
                    "title": data.get("title", ""),
                    "explanation": data.get("explanation", ""),
                    "url": data.get("url", ""),
                    "hdurl": data.get("hdurl", data.get("url", "")),
                    "media_type": data.get("media_type", "image"),
                    "copyright": data.get("copyright", "NASA"),
                    "fallback": False,
                }
        except Exception:
            return _FALLBACK_APOD

    def get_neo(self) -> dict:
        """Fetch Near Earth Objects from NASA NeoWs."""
        if not _HTTPX:
            return _FALLBACK_NEO
        try:
            from datetime import date, timedelta

            today = date.today().isoformat()
            end = (date.today() + timedelta(days=7)).isoformat()
            url = (
                f"https://api.nasa.gov/neo/rest/v1/feed"
                f"?start_date={today}&end_date={end}&api_key={_NASA_API_KEY}"
            )
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(url)
                resp.raise_for_status()
                raw = resp.json()
            neos: list[dict] = []
            for day_objects in raw.get("near_earth_objects", {}).values():
                for neo in day_objects[:5]:
                    dia = neo.get("estimated_diameter", {}).get("kilometers", {})
                    approach = neo.get("close_approach_data", [{}])[0]
                    neos.append(
                        {
                            "id": neo.get("id", ""),
                            "name": neo.get("name", ""),
                            "estimated_diameter_km": {
                                "min": round(dia.get("estimated_diameter_min", 0), 4),
                                "max": round(dia.get("estimated_diameter_max", 0), 4),
                            },
                            "is_potentially_hazardous": neo.get(
                                "is_potentially_hazardous_asteroid", False
                            ),
                            "close_approach_date": approach.get(
                                "close_approach_date", ""
                            ),
                            "miss_distance_km": round(
                                float(
                                    approach.get("miss_distance", {}).get(
                                        "kilometers", 0
                                    )
                                ),
                                0,
                            ),
                            "relative_velocity_kms": round(
                                float(
                                    approach.get("relative_velocity", {}).get(
                                        "kilometers_per_second", 0
                                    )
                                ),
                                2,
                            ),
                        }
                    )
            return {
                "element_count": raw.get("element_count", len(neos)),
                "near_earth_objects": neos[:20],
                "fallback": False,
            }
        except Exception:
            return _FALLBACK_NEO

    def simulate_orbit(self, planet: str, duration_days: int) -> dict:
        """Compute Keplerian orbit trajectory (heliocentric, ecliptic plane)."""
        try:
            pdata = self._planet_data.get(planet.lower())
            if not pdata:
                available = list(self._planet_data.keys())
                return {"error": f"Unknown planet: {planet}. Available: {available}"}

            a_au = pdata["distance_au"]
            period_days = pdata["orbital_period_days"]
            a_km = a_au * _AU_KM

            # Approximate eccentricities
            eccentricities = {
                "mercury": 0.2056,
                "venus": 0.0068,
                "earth": 0.0167,
                "mars": 0.0934,
                "jupiter": 0.0489,
                "saturn": 0.0565,
                "uranus": 0.0457,
                "neptune": 0.0113,
            }
            e = eccentricities.get(planet.lower(), 0.02)
            b_km = a_km * math.sqrt(1 - e**2)

            steps = min(duration_days, 365 * 2)
            step_days = duration_days / steps
            positions: list[dict] = []
            for i in range(steps):
                t = i * step_days
                M = 2 * math.pi * t / period_days  # Mean anomaly
                # Eccentric anomaly (Newton iteration)
                E = M
                for _ in range(10):
                    E = M + e * math.sin(E)
                x = a_km * (math.cos(E) - e)
                y = b_km * math.sin(E)
                r = math.sqrt(x**2 + y**2)
                v = math.sqrt(_GM_SUN * (2 / r - 1 / a_km))
                positions.append(
                    {
                        "day": round(t, 2),
                        "x_au": round(x / _AU_KM, 6),
                        "y_au": round(y / _AU_KM, 6),
                        "z_au": 0.0,
                        "r_au": round(r / _AU_KM, 6),
                        "velocity_kms": round(v, 4),
                    }
                )

            return {
                "planet": pdata["name"],
                "semi_major_axis_au": a_au,
                "eccentricity": e,
                "orbital_period_days": period_days,
                "duration_days": duration_days,
                "num_positions": len(positions),
                "positions": positions,
                "units": {"position": "AU", "velocity": "km/s"},
            }
        except Exception:
            logger.exception("simulate_orbit failed")
            return {"error": "Orbit simulation failed"}

    def get_solar_system(self) -> dict:
        """Return planet data from knowledge JSON."""
        try:
            for topic in self._space_data.get("topics", []):
                if topic.get("id") == "solar_system":
                    return {
                        "name": topic["name"],
                        "description": topic["description"],
                        "planets": topic.get("planets", []),
                        "source": "space_science.json",
                    }
            return {"planets": [], "error": "Solar system data not found"}
        except Exception:
            logger.exception("get_solar_system failed")
            return {"error": "Failed to load solar system data"}

    # ── Private helpers ───────────────────────────────────────────────────────

    def _build_planet_map(self) -> dict[str, dict]:
        planet_map: dict[str, dict] = {}
        for topic in self._space_data.get("topics", []):
            if topic.get("id") == "solar_system":
                for p in topic.get("planets", []):
                    planet_map[p["name"].lower()] = p
        return planet_map
