
import json
import os

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset


class AttackClassifier(nn.Module):

    def __init__(self, input_dim: int, n_classes: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, n_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


class AnomalyDetector(nn.Module):

    def __init__(self, input_dim: int, latent_dim: int = 16):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, latent_dim),
        )
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 64),
            nn.ReLU(),
            nn.Linear(64, input_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded


ATTACK_LABELS = {
    "benign": 0,
    "brute_force": 1,
    "injection": 2,
    "bot": 3,
    "scan": 4,
}

LABEL_NAMES = {v: k for k, v in ATTACK_LABELS.items()}


class HoneypotLogDataset(Dataset):

    FEATURE_DIM = 8

    def __init__(self, json_files: list[str]):
        self.samples = []
        for filepath in json_files:
            if not os.path.exists(filepath):
                print(f"Warning: Log file not found: {filepath}")
                continue
            with open(filepath) as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                        self.samples.append(entry)
                    except json.JSONDecodeError:
                        continue

        self.features = [self._featurize(s) for s in self.samples]
        self.labels = [
            ATTACK_LABELS.get(s.get("label", "benign"), 0) for s in self.samples
        ]

    def _featurize(self, entry: dict) -> torch.Tensor:
        logdata = entry.get("logdata", {}) or {}

        ip = str(entry.get("ip", entry.get("src_host", "")))

        endpoint = str(entry.get("endpoint", logdata.get("PATH", "")))

        user_agent = str(entry.get("user_agent", logdata.get("USERAGENT", "")))

        payload = str(
            entry.get("payload", logdata.get("CMD", logdata.get("USERNAME", "")))
        )

        method = str(entry.get("method", ""))
        logtype = int(entry.get("logtype", 0))

        features = [
            len(endpoint),
            len(payload),
            1.0 if method == "POST" or logtype in (2000, 17000) else 0.0,
            1.0 if "admin" in endpoint.lower() else 0.0,
            1.0 if "select" in payload.lower() or "union" in payload.lower() else 0.0,
            len(user_agent),
            ip.count("."),
            1.0 if "bot" in user_agent.lower() or "curl" in user_agent.lower() else 0.0,
        ]

        return torch.tensor(features, dtype=torch.float32)

    def __len__(self) -> int:
        return len(self.features)

    def __getitem__(self, idx: int):
        return self.features[idx], self.labels[idx]


def train_classifier(
    log_files: list[str],
    n_classes: int = 5,
    epochs: int = 20,
    batch_size: int = 32,
    output_path: str = "attack_classifier.pt",
) -> None:
    dataset = HoneypotLogDataset(log_files)

    if len(dataset) == 0:
        print("No training data found. Generating synthetic data...")
        dataset = _generate_synthetic_dataset(200)

    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    input_dim = HoneypotLogDataset.FEATURE_DIM
    model = AttackClassifier(input_dim=input_dim, n_classes=n_classes)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    model.train()
    for epoch in range(epochs):
        total_loss = 0.0
        correct = 0
        total = 0

        for features, labels in loader:
            labels = torch.tensor(labels, dtype=torch.long)
            logits = model(features)
            loss = criterion(logits, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            predictions = torch.argmax(logits, dim=1)
            correct += (predictions == labels).sum().item()
            total += labels.size(0)

        accuracy = correct / total if total > 0 else 0
        print(
            f"Epoch {epoch + 1}/{epochs} - "
            f"Loss: {total_loss:.4f} - Accuracy: {accuracy:.4f}"
        )

    torch.save(model.state_dict(), output_path)
    print(f"Model saved to {output_path}")


def train_anomaly_detector(
    log_files: list[str],
    epochs: int = 30,
    batch_size: int = 32,
    output_path: str = "anomaly_detector.pt",
) -> None:
    dataset = HoneypotLogDataset(log_files)

    if len(dataset) == 0:
        print("No training data found. Generating synthetic data...")
        dataset = _generate_synthetic_dataset(200)

    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    input_dim = HoneypotLogDataset.FEATURE_DIM
    model = AnomalyDetector(input_dim=input_dim)
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    model.train()
    for epoch in range(epochs):
        total_loss = 0.0
        for features, _ in loader:
            reconstructed = model(features)
            loss = criterion(reconstructed, features)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        print(f"Epoch {epoch + 1}/{epochs} - Reconstruction Loss: {total_loss:.4f}")

    torch.save(model.state_dict(), output_path)
    print(f"Anomaly detector saved to {output_path}")


def _generate_synthetic_dataset(n_samples: int = 200) -> HoneypotLogDataset:
    import random

    samples = []
    for _ in range(n_samples):
        label = random.choice(list(ATTACK_LABELS.keys()))
        entry = {
            "ip": f"{random.randint(1, 255)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 255)}",
            "endpoint": random.choice(
                ["/auth", "/data", "/admin", "/api/v1/users", "/upload"]
            ),
            "method": random.choice(["GET", "POST"]),
            "payload": "",
            "user_agent": random.choice(
                ["Mozilla/5.0", "curl/7.68", "python-requests/2.28", "Bot/1.0"]
            ),
            "label": label,
        }

        if label == "injection":
            entry["payload"] = "' OR 1=1; SELECT * FROM users--"
        elif label == "brute_force":
            entry["endpoint"] = "/auth"
            entry["method"] = "POST"
            entry["payload"] = '{"user":"root","pass":"password123"}'
        elif label == "bot":
            entry["user_agent"] = "Bot/1.0 (automated scanner)"
        elif label == "scan":
            entry["endpoint"] = random.choice(
                ["/.env", "/wp-admin", "/phpmyadmin", "/.git/config"]
            )

        samples.append(entry)

    dataset = HoneypotLogDataset.__new__(HoneypotLogDataset)
    dataset.samples = samples
    dataset.features = [dataset._featurize(s) for s in samples]
    dataset.labels = [ATTACK_LABELS.get(s.get("label", "benign"), 0) for s in samples]
    return dataset


def main():
    log_dir = os.environ.get("LOG_DIR", "/logs")
    log_files = [
        os.path.join(log_dir, "cowrie", "cowrie.json"),
        os.path.join(log_dir, "opencanary", "opencanary.log"),
    ]

    print("=" * 60)
    print("Disha AI Detection Engine - Training Pipeline")
    print("=" * 60)

    print("\n[1/3] Training binary classifier (benign vs malicious)...")
    train_classifier(
        log_files, n_classes=2, epochs=10, output_path="attack_classifier_binary.pt"
    )

    print("\n[2/3] Training multi-class attack classifier...")
    train_classifier(
        log_files,
        n_classes=len(ATTACK_LABELS),
        epochs=20,
        output_path="attack_classifier.pt",
    )

    print("\n[3/3] Training anomaly detector...")
    train_anomaly_detector(log_files, epochs=30, output_path="anomaly_detector.pt")

    print("\n" + "=" * 60)
    print("Training complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
