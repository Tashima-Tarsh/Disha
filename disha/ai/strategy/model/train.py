"""
Training script for Historical Strategy Intelligence System.
Trains StrategyClassifier (RandomForest) and MLPClassifier (neural net),
evaluates with cross-validation, and saves models and metrics.
"""

import json
import logging
import sys
from pathlib import Path

import numpy as np

# Configure logging so messages are visible when running as a script
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    accuracy_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score  # noqa: E402
from sklearn.neural_network import MLPClassifier  # noqa: E402

from model.classifier import StrategyClassifier  # noqa: E402

DATA_DIR = Path(__file__).parent.parent / "data" / "processed"
MODEL_DIR = Path(__file__).parent / "saved"

logger = logging.getLogger(__name__)


def load_processed_data():
    """Load preprocessed feature/label arrays and metadata."""
    X_train = np.load(DATA_DIR / "X_train.npy")
    X_test = np.load(DATA_DIR / "X_test.npy")
    y_train = np.load(DATA_DIR / "y_train.npy")
    y_test = np.load(DATA_DIR / "y_test.npy")

    with open(DATA_DIR / "metadata.json") as f:
        metadata = json.load(f)

    logger.info("Loaded: X_train=%s, X_test=%s", X_train.shape, X_test.shape)
    return X_train, X_test, y_train, y_test, metadata


def print_confusion_matrix_text(cm: np.ndarray, labels: list):
    """Print a text-based confusion matrix."""
    logger.info("--- Confusion Matrix ---")
    col_width = max(len(str(lbl)) for lbl in labels) + 2
    header = " " * col_width + "".join(f"{str(lbl):>{col_width}}" for lbl in labels)
    logger.info(header)
    for i, label in enumerate(labels):
        row = f"{str(label):>{col_width}}" + "".join(
            f"{cm[i, j]:>{col_width}}" for j in range(len(labels))
        )
        logger.info(row)
    logger.info("")


def train_random_forest(X_train, y_train, metadata):
    """Train and cross-validate the RandomForest model."""
    logger.info("Training RandomForest StrategyClassifier...")

    clf = StrategyClassifier(n_estimators=200, max_depth=15, random_state=42)
    clf.train(X_train, y_train, feature_names=metadata["feature_names"])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(clf.model, X_train, y_train, cv=cv, scoring="accuracy")

    logger.info("5-fold CV accuracy: %.4f ± %.4f", cv_scores.mean(), cv_scores.std())
    logger.info("CV scores per fold: %s", [round(s, 4) for s in cv_scores.tolist()])

    return clf, cv_scores


def train_mlp(X_train, y_train):
    """Train an MLP (neural network) as an alternative model."""
    logger.info("Training MLPClassifier (neural network)...")

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
    logger.info("MLP trained in %d iterations.", mlp.n_iter_)
    return mlp


def evaluate_models(rf_clf, mlp_clf, X_test, y_test, metadata):
    """Evaluate both models on test set."""
    labels = metadata["strategy_classes"]

    logger.info("=" * 60)
    logger.info("RANDOM FOREST EVALUATION")
    logger.info("=" * 60)
    rf_preds = rf_clf.predict(X_test)
    rf_accuracy = accuracy_score(y_test, rf_preds)
    logger.info("Test Accuracy: %.4f", rf_accuracy)
    present_labels = sorted(list(set(y_test) | set(rf_preds)))
    present_names = [labels[i] for i in present_labels if i < len(labels)]
    logger.info("--- Classification Report ---")
    logger.info(
        classification_report(
            y_test,
            rf_preds,
            labels=present_labels,
            target_names=present_names,
            zero_division=0,
        )
    )
    rf_cm = confusion_matrix(y_test, rf_preds, labels=present_labels)
    print_confusion_matrix_text(rf_cm, present_names)

    logger.info("--- Feature Importances ---")
    importances = rf_clf.get_feature_importance()
    for feat, imp in list(importances.items())[:10]:
        bar = "█" * int(imp * 40)
        logger.info("  %-25s %s %.4f", feat, bar, imp)

    logger.info("=" * 60)
    logger.info("MLP CLASSIFIER EVALUATION")
    logger.info("=" * 60)
    mlp_preds = mlp_clf.predict(X_test)
    mlp_accuracy = accuracy_score(y_test, mlp_preds)
    logger.info("Test Accuracy: %.4f", mlp_accuracy)
    mlp_present = sorted(list(set(y_test) | set(mlp_preds)))
    mlp_names = [labels[i] for i in mlp_present if i < len(labels)]
    logger.info("--- Classification Report ---")
    logger.info(
        classification_report(
            y_test,
            mlp_preds,
            labels=mlp_present,
            target_names=mlp_names,
            zero_division=0,
        )
    )

    return rf_accuracy, mlp_accuracy, rf_cm


def save_models_and_metrics(
    rf_clf, mlp_clf, rf_accuracy, mlp_accuracy, cv_scores, rf_cm, metadata
):
    """Save trained models and metrics to disk."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Save RandomForest
    rf_clf.save(str(MODEL_DIR / "strategy_classifier.pkl"))

    # Save MLP
    joblib.dump(mlp_clf, MODEL_DIR / "mlp_classifier.pkl")
    logger.info("Saved MLP to %s", MODEL_DIR / "mlp_classifier.pkl")

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
    logger.info("Saved metrics to %s", MODEL_DIR / "metrics.json")

    return metrics


def main():
    """Main training pipeline."""
    logger.info("Starting training pipeline...")

    X_train, X_test, y_train, y_test, metadata = load_processed_data()

    rf_clf, cv_scores = train_random_forest(X_train, y_train, metadata)

    mlp_clf = train_mlp(X_train, y_train)

    rf_accuracy, mlp_accuracy, rf_cm = evaluate_models(
        rf_clf, mlp_clf, X_test, y_test, metadata
    )

    metrics = save_models_and_metrics(
        rf_clf, mlp_clf, rf_accuracy, mlp_accuracy, cv_scores, rf_cm, metadata
    )

    logger.info("Training pipeline complete.")
    logger.info(
        "Best model: RandomForest with %.4f test accuracy",
        metrics["random_forest"]["test_accuracy"],
    )
    return metrics


if __name__ == "__main__":
    main()
