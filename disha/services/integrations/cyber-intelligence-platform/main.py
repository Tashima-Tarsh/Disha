"""
Disha Cyber Intelligence System — entry point.

Usage:
    python main.py "UPI fraud via OTP scam"
    python main.py "Phishing email detected" google.com
    echo "Ransomware alert" | python main.py
"""
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [CyberIntel] %(levelname)s: %(message)s",
)

from automation.pipeline import run_pipeline  # noqa: E402

if __name__ == "__main__":
    logging.info("🚀 Starting Disha Cyber Intelligence System...")

    if len(sys.argv) > 1:
        incident_text = sys.argv[1]
        osint_target = sys.argv[2] if len(sys.argv) > 2 else ""
    elif not sys.stdin.isatty():
        incident_text = sys.stdin.read().strip()
        osint_target = ""
    else:
        logging.error("No input provided.")
        print("Usage: python main.py '<incident text>' [<domain_or_ip>]")
        sys.exit(1)

    result = run_pipeline(incident_text, osint_target)
    logging.info("✅ Pipeline complete. Crime: %s", result.get("crime"))
    sys.exit(0)
