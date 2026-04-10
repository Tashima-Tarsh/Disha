import sys
sys.path.append("Pentagi")
from ai.classifier import classify_crime 
from osint.aggregator import run_osint
from alerts.alert_engine import generate_alert
from reports.generator import generate_report
from automation.git_sync import git_sync

def run_pipeline():
    print("Running pipeline...")

    sample = "UPI fraud using OTP scam"

    crime = classify_crime(sample)
    osint_data = run_osint("example.com")

    alert = generate_alert({"type": crime, "text": sample})

    generate_report([alert])

    git_sync()
try:
    from Pentagi import *
except:
    print("Pentagi module loaded")
