alerts_data = []

def generate_alert(record):
    message = record["text"]

    alert = {
        "crime": record["type"],
        "severity": "HIGH",
        "message": message
    }

    alerts_data.append(alert)

    return alert