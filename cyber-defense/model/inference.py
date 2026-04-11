"""
Disha AI Detection Engine - Inference Pipeline

Loads trained models and performs real-time classification
and anomaly detection on new honeypot log entries.

DEFENSIVE SIMULATION ONLY - For blue team research and training.
"""

import json
import os
import sys

import torch

from train import (
    LABEL_NAMES,
    AnomalyDetector,
    AttackClassifier,
    HoneypotLogDataset,
)


def load_classifier(
    model_path: str, n_classes: int = 5
) -> AttackClassifier:
    """Load a trained attack classifier."""
    input_dim = HoneypotLogDataset.FEATURE_DIM
    model = AttackClassifier(input_dim=input_dim, n_classes=n_classes)
    model.load_state_dict(torch.load(model_path, weights_only=True))
    model.eval()
    return model


def load_anomaly_detector(model_path: str) -> AnomalyDetector:
    """Load a trained anomaly detector."""
    input_dim = HoneypotLogDataset.FEATURE_DIM
    model = AnomalyDetector(input_dim=input_dim)
    model.load_state_dict(torch.load(model_path, weights_only=True))
    model.eval()
    return model


def classify(model: AttackClassifier, log_entry: dict) -> dict:
    """Classify a single log entry.

    Returns:
        dict with 'label', 'confidence', and 'probabilities'
    """
    dataset = HoneypotLogDataset.__new__(HoneypotLogDataset)
    features = dataset._featurize(log_entry).unsqueeze(0)

    with torch.no_grad():
        logits = model(features)
        probabilities = torch.softmax(logits, dim=1)
        predicted_class = torch.argmax(probabilities, dim=1).item()
        confidence = probabilities[0][predicted_class].item()

    return {
        "label": LABEL_NAMES.get(predicted_class, "unknown"),
        "class_id": predicted_class,
        "confidence": round(confidence, 4),
        "probabilities": {
            LABEL_NAMES.get(i, f"class_{i}"): round(p.item(), 4)
            for i, p in enumerate(probabilities[0])
        },
    }


def detect_anomaly(
    model: AnomalyDetector, log_entry: dict, threshold: float = 0.5
) -> dict:
    """Detect anomalies using reconstruction error.

    Returns:
        dict with 'is_anomaly', 'reconstruction_error', 'threshold'
    """
    dataset = HoneypotLogDataset.__new__(HoneypotLogDataset)
    features = dataset._featurize(log_entry).unsqueeze(0)

    with torch.no_grad():
        reconstructed = model(features)
        error = torch.mean((features - reconstructed) ** 2).item()

    return {
        "is_anomaly": error > threshold,
        "reconstruction_error": round(error, 6),
        "threshold": threshold,
    }


def analyze_log_entry(log_entry: dict, models: dict) -> dict:
    """Run full analysis pipeline on a log entry.

    Args:
        log_entry: Parsed JSON log entry
        models: Dict with 'classifier', 'binary_classifier', 'anomaly_detector'

    Returns:
        Complete analysis result
    """
    result = {"input": log_entry, "analysis": {}}

    if "classifier" in models:
        result["analysis"]["classification"] = classify(
            models["classifier"], log_entry
        )

    if "binary_classifier" in models:
        binary_result = classify(models["binary_classifier"], log_entry)
        result["analysis"]["binary"] = {
            "is_malicious": binary_result["class_id"] == 1,
            "confidence": binary_result["confidence"],
        }

    if "anomaly_detector" in models:
        result["analysis"]["anomaly"] = detect_anomaly(
            models["anomaly_detector"], log_entry
        )

    # Compute threat score (0-100)
    threat_score = _compute_threat_score(result["analysis"])
    result["analysis"]["threat_score"] = threat_score

    return result


def _compute_threat_score(analysis: dict) -> int:
    """Compute a composite threat score from analysis results."""
    score = 0.0

    if "binary" in analysis and analysis["binary"]["is_malicious"]:
        score += 40 * analysis["binary"]["confidence"]

    if "classification" in analysis:
        label = analysis["classification"]["label"]
        conf = analysis["classification"]["confidence"]
        if label != "benign":
            score += 35 * conf

    if "anomaly" in analysis and analysis["anomaly"]["is_anomaly"]:
        score += 25

    return min(100, int(score))


def main():
    """Run inference on log files."""
    model_dir = os.environ.get("MODEL_DIR", ".")
    log_dir = os.environ.get("LOG_DIR", "/logs")

    models = {}

    # Load available models
    classifier_path = os.path.join(model_dir, "attack_classifier.pt")
    if os.path.exists(classifier_path):
        models["classifier"] = load_classifier(classifier_path, n_classes=5)
        print(f"Loaded classifier from {classifier_path}")

    binary_path = os.path.join(model_dir, "attack_classifier_binary.pt")
    if os.path.exists(binary_path):
        models["binary_classifier"] = load_classifier(binary_path, n_classes=2)
        print(f"Loaded binary classifier from {binary_path}")

    anomaly_path = os.path.join(model_dir, "anomaly_detector.pt")
    if os.path.exists(anomaly_path):
        models["anomaly_detector"] = load_anomaly_detector(anomaly_path)
        print(f"Loaded anomaly detector from {anomaly_path}")

    if not models:
        print("No trained models found. Run train.py first.")
        sys.exit(1)

    # Process log files
    log_files = [
        os.path.join(log_dir, "cowrie", "cowrie.json"),
        os.path.join(log_dir, "opencanary", "opencanary.log"),
    ]

    print("\nRunning inference on honeypot logs...")
    for log_file in log_files:
        if not os.path.exists(log_file):
            print(f"  Skipping {log_file} (not found)")
            continue

        print(f"\n  Processing: {log_file}")
        with open(log_file) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                result = analyze_log_entry(entry, models)
                print(f"    {json.dumps(result['analysis'], indent=2)}")


if __name__ == "__main__":
    main()
