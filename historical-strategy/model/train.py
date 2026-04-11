"""
Training script for Historical Strategy Intelligence System.
Trains StrategyClassifier (RandomForest) and MLPClassifier (neural net),
evaluates with cross-validation, and saves models and metrics.
"""

import json
import sys
import numpy as np
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
)
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

from model.classifier import StrategyClassifier

DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
MODEL_DIR = Path(__file__).parent / "saved"


def load_processed_data():
    """Load preprocessed feature/label arrays and metadata."""
    X_train = np.load(DATA_DIR / "X_train.npy")
    X_test = np.load(DATA_DIR / "X_test.npy")
    y_train = np.load(DATA_DIR / "y_train.npy")
    y_test = np.load(DATA_DIR / "y_test.npy")

    with open(DATA_DIR / "metadata.json") as f:
        metadata = json.load(f)

    print(f"[Train] Loaded: X_train={X_train.shape}, X_test={X_test.shape}")
    return X_train, X_test, y_train, y_test, metadata


def print_confusion_matrix_text(cm: np.ndarray, labels: list):
    """Print a text-based confusion matrix."""
    print("\n--- Confusion Matrix ---")
    col_width = max(len(str(l)) for l in labels) + 2
    header = " " * col_width + "".join(f"{str(l):>{col_width}}" for l in labels)
    print(header)
    for i, label in enumerate(labels):
        row = f"{str(label):>{col_width}}" + "".join(f"{cm[i, j]:>{col_width}}" for j in range(len(labels)))
        print(row)
    print()


def train_random_forest(X_train, y_train, metadata):
    """Train and cross-validate the RandomForest model."""
    print("\n[Train] Training RandomForest StrategyClassifier...")

    clf = StrategyClassifier(n_estimators=200, max_depth=15, random_state=42)
    clf.train(X_train, y_train, feature_names=metadata["feature_names"])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(clf.model, X_train, y_train, cv=cv, scoring="accuracy")

    print(f"[Train] 5-fold CV accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print(f"[Train] CV scores per fold: {[round(s, 4) for s in cv_scores.tolist()]}")

    return clf, cv_scores


def train_mlp(X_train, y_train):
    """Train an MLP (neural network) as an alternative model."""
    print("\n[Train] Training MLPClassifier (neural network)...")

    mlp = MLPClassifier(
        hidden_layer_sizes=(128, 64, 32),
        activation="relu",
        solver="adam",
        max_iter=500,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
        n_iter_no_change=20,
        learning_rate_init=0.001,
    )
    mlp.fit(X_train, y_train)
    print(f"[Train] MLP trained in {mlp.n_iter_} iterations.")
    return mlp


def evaluate_models(rf_clf, mlp_clf, X_test, y_test, metadata):
    """Evaluate both models on test set."""
    labels = metadata["strategy_classes"]

    print("\n" + "=" * 60)
    print("RANDOM FOREST EVALUATION")
    print("=" * 60)
    rf_preds = rf_clf.predict(X_test)
    rf_accuracy = accuracy_score(y_test, rf_preds)
    print(f"Test Accuracy: {rf_accuracy:.4f}")
    present_labels = sorted(list(set(y_test) | set(rf_preds)))
    present_names = [labels[i] for i in present_labels if i < len(labels)]
    print("\n--- Classification Report ---")
    print(classification_report(y_test, rf_preds, labels=present_labels, target_names=present_names, zero_division=0))
    rf_cm = confusion_matrix(y_test, rf_preds, labels=present_labels)
    print_confusion_matrix_text(rf_cm, present_names)

    print("\n--- Feature Importances ---")
    importances = rf_clf.get_feature_importance()
    for feat, imp in list(importances.items())[:10]:
        bar = "█" * int(imp * 40)
        print(f"  {feat:<25} {bar} {imp:.4f}")

    print("\n" + "=" * 60)
    print("MLP CLASSIFIER EVALUATION")
    print("=" * 60)
    mlp_preds = mlp_clf.predict(X_test)
    mlp_accuracy = accuracy_score(y_test, mlp_preds)
    print(f"Test Accuracy: {mlp_accuracy:.4f}")
    mlp_present = sorted(list(set(y_test) | set(mlp_preds)))
    mlp_names = [labels[i] for i in mlp_present if i < len(labels)]
    print("\n--- Classification Report ---")
    print(classification_report(y_test, mlp_preds, labels=mlp_present, target_names=mlp_names, zero_division=0))

    return rf_accuracy, mlp_accuracy, rf_cm


def save_models_and_metrics(rf_clf, mlp_clf, rf_accuracy, mlp_accuracy, cv_scores, rf_cm, metadata):
    """Save trained models and metrics to disk."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Save RandomForest
    rf_clf.save(str(MODEL_DIR / "strategy_classifier.pkl"))

    # Save MLP
    joblib.dump(mlp_clf, MODEL_DIR / "mlp_classifier.pkl")
    print(f"[Train] Saved MLP to {MODEL_DIR / 'mlp_classifier.pkl'}")

    # Save metrics
    metrics = {
        "random_forest": {
            "test_accuracy": round(float(rf_accuracy), 4),
            "cv_mean": round(float(cv_scores.mean()), 4),
            "cv_std": round(float(cv_scores.std()), 4),
            "cv_scores": [round(float(s), 4) for s in cv_scores.tolist()],
            "confusion_matrix": rf_cm.tolist(),
        },
        "mlp": {
            "test_accuracy": round(float(mlp_accuracy), 4),
        },
        "dataset": {
            "n_classes": metadata["n_classes"],
            "strategy_classes": metadata["strategy_classes"],
            "train_size": metadata["train_size"],
            "test_size": metadata["test_size"],
            "n_features": metadata["n_features"],
        },
    }

    with open(MODEL_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"[Train] Saved metrics to {MODEL_DIR / 'metrics.json'}")

    return metrics


def main():
    """Main training pipeline."""
    print("[Train] Starting training pipeline...")

    X_train, X_test, y_train, y_test, metadata = load_processed_data()

    rf_clf, cv_scores = train_random_forest(X_train, y_train, metadata)

    mlp_clf = train_mlp(X_train, y_train)

    rf_accuracy, mlp_accuracy, rf_cm = evaluate_models(rf_clf, mlp_clf, X_test, y_test, metadata)

    metrics = save_models_and_metrics(
        rf_clf, mlp_clf, rf_accuracy, mlp_accuracy, cv_scores, rf_cm, metadata
    )

    print("\n[Train] Training pipeline complete.")
    print(f"[Train] Best model: RandomForest with {metrics['random_forest']['test_accuracy']:.4f} test accuracy")
    return metrics


if __name__ == "__main__":
    main()
