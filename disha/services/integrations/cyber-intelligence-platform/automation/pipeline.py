"""
Cyber Intelligence Pipeline — orchestrates classification, OSINT,
alerting, and report generation from real or CLI-supplied input.

Usage:
    python pipeline.py                          # reads from stdin
    python pipeline.py "UPI fraud via OTP"      # single text argument
    echo "Phishing email detected" | python pipeline.py
"""

import os
import sys

# Ensure sibling packages are importable regardless of working directory
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from ai.classifier import classify_crime  # noqa: E402
from osint.aggregator import run_osint  # noqa: E402
from alerts.alert_engine import generate_alert  # noqa: E402
from reports.generator import generate_report  # noqa: E402


def run_pipeline(text: str, osint_target: str = "") -> dict:
    """
    Run the full intelligence pipeline for a single incident description.

    Args:
        text: Raw incident / alert text to classify and process.
        osint_target: Domain or IP to run OSINT against.
                      If empty, no OSINT lookup is performed.

    Returns:
        dict with 'crime', 'osint', 'alert', and 'report_path'.
    """
    print(f"[Pipeline] Processing: {text!r}")

    crime = classify_crime(text)
    print(f"[Pipeline] Classified as: {crime}")

    osint_data: dict = {}
    if osint_target:
        print(f"[Pipeline] Running OSINT for: {osint_target}")
        osint_data = run_osint(osint_target)

    alert = generate_alert({"type": crime, "text": text})
    print(f"[Pipeline] Alert generated: {alert}")

    report_path = generate_report([alert])
    print(f"[Pipeline] Report saved to: {report_path}")

    return {
        "crime": crime,
        "osint": osint_data,
        "alert": alert,
        "report_path": report_path,
    }


if __name__ == "__main__":
    # Accept text from CLI argument or stdin
    if len(sys.argv) > 1:
        incident_text = " ".join(sys.argv[1:])
    elif not sys.stdin.isatty():
        incident_text = sys.stdin.read().strip()
    else:
        print("[Pipeline] No input provided. Pass text as an argument or via stdin.")
        print("  Example: python pipeline.py 'UPI fraud via OTP scam'")
        sys.exit(1)

    # Optional: second arg is OSINT target
    osint_target = sys.argv[2] if len(sys.argv) > 2 else ""

    result = run_pipeline(incident_text, osint_target)
    print("\n[Pipeline] Complete.")
    print(f"  Crime type : {result['crime']}")
    print(f"  Alert      : {result['alert']}")
    if result.get("osint"):
        print(f"  OSINT      : {result['osint']}")
