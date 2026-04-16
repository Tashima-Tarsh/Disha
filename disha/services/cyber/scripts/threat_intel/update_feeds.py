"""
Disha Threat Intelligence - Feed Updater

Downloads and aggregates IP blocklists from open threat
intelligence feeds. Enriches IPs with geo-location and ASN data.

DEFENSIVE SIMULATION ONLY.
"""

import json
import logging
import os
import time

import requests

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [ThreatIntel] %(levelname)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Open threat intelligence feed URLs
THREAT_FEEDS = [
    "https://feodotracker.abuse.ch/downloads/ipblocklist.txt",
    "https://rules.emergingthreats.net/blockrules/compromised-ips.txt",
    "https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt",
]

OUTPUT_DIR = os.environ.get("OUTPUT_DIR", "/logs")


def fetch_blocklist() -> set:
    """Fetch and aggregate IPs from threat intelligence feeds."""
    blocklist = set()

    for url in THREAT_FEEDS:
        try:
            logger.info("Fetching: %s", url)
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()

            for line in resp.text.splitlines():
                line = line.strip()
                # Skip comments and empty lines
                if not line or line.startswith("#") or line.startswith(";"):
                    continue
                # Extract IP (first field, tab or space separated)
                ip = line.split()[0] if line.split() else ""
                # Basic IP validation
                parts = ip.split(".")
                if len(parts) == 4 and all(
                    p.isdigit() and 0 <= int(p) <= 255 for p in parts
                ):
                    blocklist.add(ip)

            logger.info("  -> Collected %d IPs from this feed", len(blocklist))

        except requests.RequestException as e:
            logger.warning("Failed to fetch %s: %s", url, e)

    return blocklist


def enrich_ip(ip: str) -> dict:
    """Enrich an IP with geo-location and ASN data using ip-api.com."""
    try:
        resp = requests.get(
            f"https://ip-api.com/json/{ip}",
            params={"fields": "status,country,regionName,city,isp,org,as,query"},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "success":
                return {
                    "ip": ip,
                    "country": data.get("country", "Unknown"),
                    "region": data.get("regionName", "Unknown"),
                    "city": data.get("city", "Unknown"),
                    "isp": data.get("isp", "Unknown"),
                    "org": data.get("org", "Unknown"),
                    "asn": data.get("as", "Unknown"),
                }
    except requests.RequestException:
        pass

    return {"ip": ip, "country": "Unknown", "enrichment_failed": True}


def save_blocklist(blocklist: set) -> str:
    """Save aggregated blocklist to JSON."""
    output_path = os.path.join(OUTPUT_DIR, "threat_blocklist.json")
    data = {
        "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_ips": len(blocklist),
        "sources": THREAT_FEEDS,
        "blocklist": sorted(blocklist),
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    logger.info("Blocklist saved: %s (%d IPs)", output_path, len(blocklist))
    return output_path


def main():
    logger.info("=" * 60)
    logger.info("Disha Threat Intelligence - Feed Update")
    logger.info("=" * 60)

    blocklist = fetch_blocklist()
    logger.info("Total unique malicious IPs collected: %d", len(blocklist))

    save_blocklist(blocklist)

    # Enrich a sample of IPs (limit to avoid rate limiting)
    sample_size = min(5, len(blocklist))
    if sample_size > 0:
        sample_ips = sorted(blocklist)[:sample_size]
        logger.info("\nEnriching sample of %d IPs...", sample_size)
        enriched = []
        for ip in sample_ips:
            info = enrich_ip(ip)
            enriched.append(info)
            logger.info("  %s -> %s, %s", ip, info.get("country"), info.get("asn"))
            time.sleep(1)  # Rate limit courtesy

        enriched_path = os.path.join(OUTPUT_DIR, "enriched_sample.json")
        with open(enriched_path, "w") as f:
            json.dump(enriched, f, indent=2)
        logger.info("Enriched sample saved to %s", enriched_path)

    logger.info("\nThreat intelligence update complete.")


if __name__ == "__main__":
    main()
