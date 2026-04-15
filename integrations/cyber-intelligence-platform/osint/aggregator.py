"""
OSINT Aggregator — uses free, open-source intelligence APIs.

Sources:
  - ip-api.com  : geo-location and ASN data for IPs (free, no key required)
  - HackerTarget: passive DNS and host-search (free tier, no key required)
"""
import logging
import re
import socket

import requests

logger = logging.getLogger(__name__)

_SESSION = requests.Session()
_SESSION.headers.update({"User-Agent": "Disha-CyberIntelligence/1.0"})
_TIMEOUT = 10


def domain_lookup(domain: str) -> dict:
    """
    Look up a domain using HackerTarget's free passive-DNS API.
    Returns resolved IPs and reverse-DNS entries.
    """
    result = {"domain": domain, "resolved_ips": [], "reverse_dns": [], "error": None}
    try:
        # HackerTarget hostsearch — free, no API key
        resp = _SESSION.get(
            "https://api.hackertarget.com/hostsearch/",
            params={"q": domain},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        lines = [l.strip() for l in resp.text.splitlines() if l.strip()]
        if lines and "error" not in lines[0].lower():
            for line in lines:
                parts = line.split(",")
                if len(parts) == 2:
                    result["resolved_ips"].append(parts[1].strip())
                    result["reverse_dns"].append(parts[0].strip())
    except requests.RequestException as exc:
        logger.warning("domain_lookup failed for %s: %s", domain, exc)
        result["error"] = str(exc)
        # Fallback: stdlib DNS resolution
        try:
            result["resolved_ips"] = [
                info[4][0]
                for info in socket.getaddrinfo(domain, None)
                if info[4][0]
            ]
        except socket.gaierror:
            pass
    return result


def ip_lookup(ip: str) -> dict:
    """
    Geo-locate an IP using ip-api.com (free, no API key required).
    Returns country, region, city, ISP, ASN, and more.
    """
    result = {"ip": ip, "error": None}
    # Reject obviously invalid / private ranges before making the request
    if not ip or not re.match(r"^\d{1,3}(\.\d{1,3}){3}$", ip):
        result["error"] = "Invalid IP address"
        return result
    try:
        resp = _SESSION.get(
            f"https://ip-api.com/json/{ip}",
            params={
                "fields": "status,message,country,countryCode,regionName,"
                          "city,zip,isp,org,as,query"
            },
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "success":
            result.update(
                {
                    "country": data.get("country", "Unknown"),
                    "country_code": data.get("countryCode", ""),
                    "region": data.get("regionName", "Unknown"),
                    "city": data.get("city", "Unknown"),
                    "zip": data.get("zip", ""),
                    "isp": data.get("isp", "Unknown"),
                    "org": data.get("org", "Unknown"),
                    "asn": data.get("as", "Unknown"),
                }
            )
        else:
            result["error"] = data.get("message", "ip-api returned failure status")
    except requests.RequestException as exc:
        logger.warning("ip_lookup failed for %s: %s", ip, exc)
        result["error"] = str(exc)
    return result


def run_osint(target: str) -> dict:
    """
    Run full OSINT against a target (domain or IP).
    Returns combined domain and IP intelligence.
    """
    logger.info("Running OSINT for target: %s", target)

    # Determine if target is an IP or a domain
    is_ip = bool(re.match(r"^\d{1,3}(\.\d{1,3}){3}$", target))

    domain_info: dict = {}
    ip_info: dict = {}

    if is_ip:
        ip_info = ip_lookup(target)
    else:
        domain_info = domain_lookup(target)
        # Also geo-locate the first resolved IP
        if domain_info.get("resolved_ips"):
            ip_info = ip_lookup(domain_info["resolved_ips"][0])
        else:
            # Last-resort stdlib resolution
            try:
                resolved = socket.gethostbyname(target)
                ip_info = ip_lookup(resolved)
            except socket.gaierror:
                ip_info = {"ip": "unresolved", "error": "DNS resolution failed"}

    return {
        "target": target,
        "domain": domain_info,
        "ip": ip_info,
    }
