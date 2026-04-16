def classify_crime(text):
    text = text.lower()

    if "upi" in text or "otp" in text:
        return "UPI Fraud"
    elif "phishing" in text:
        return "Phishing"
    elif "ransom" in text:
        return "Ransomware"
    return "Other"
