"""
Evaluation utilities for Historical Strategy Intelligence System.
Provides functions to evaluate models, analyze patterns, and generate reports.
"""

import json
import numpy as np
from typing import Dict, List, Any, Optional
from collections import defaultdict

try:
    from sklearn.metrics import (
        accuracy_score,
        precision_score,
        recall_score,
        f1_score,
        confusion_matrix,
        classification_report,
    )
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def evaluate_model(model, X_test: np.ndarray, y_test: np.ndarray,
                   class_names: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Evaluate a classifier on test data.

    Returns a dict with:
        accuracy, precision (weighted), recall (weighted), f1 (weighted),
        per_class_metrics, confusion_matrix
    """
    if not SKLEARN_AVAILABLE:
        raise ImportError("scikit-learn is required for evaluation.")

    y_pred = model.predict(X_test)

    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
    recall = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    cm = confusion_matrix(y_test, y_pred).tolist()

    report = classification_report(
        y_test, y_pred,
        target_names=class_names,
        output_dict=True,
        zero_division=0
    )

    metrics = {
        "accuracy": round(accuracy, 4),
        "precision_weighted": round(precision, 4),
        "recall_weighted": round(recall, 4),
        "f1_weighted": round(f1, 4),
        "confusion_matrix": cm,
        "classification_report": report,
        "n_test_samples": len(y_test),
        "n_correct": int(np.sum(y_pred == y_test)),
    }

    return metrics


def plot_confusion_matrix(cm: List[List[int]], labels: List[str]) -> str:
    """
    Generate a text-based confusion matrix visualization.
    Returns a formatted string.
    """
    cm_arr = np.array(cm)
    n = len(labels)
    col_w = max(max(len(str(l)) for l in labels), 4) + 2
    lines = []

    # Header
    lines.append("Predicted →")
    header = "Actual ↓" + " " * (col_w - 8) + "".join(f"{str(l)[:col_w-1]:>{col_w}}" for l in labels)
    lines.append(header)
    lines.append("-" * len(header))

    for i in range(n):
        row_label = f"{str(labels[i])[:col_w-1]:>{col_w}}"
        row_values = "".join(f"{cm_arr[i, j]:>{col_w}}" for j in range(n))
        # Highlight diagonal
        lines.append(row_label + row_values)

    lines.append("-" * len(header))

    # Per-class accuracy
    lines.append("\nPer-class accuracy:")
    for i in range(min(n, cm_arr.shape[0])):
        total = cm_arr[i].sum()
        correct = cm_arr[i, i] if i < cm_arr.shape[1] else 0
        acc = correct / total if total > 0 else 0.0
        bar = "█" * int(acc * 20)
        lines.append(f"  {str(labels[i]):<25} {bar:<20} {acc:.2%} ({correct}/{total})")

    return "\n".join(lines)


def analyze_strategy_patterns(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze patterns in strategy success rates from historical data.

    Returns dict with:
        strategy_win_rates, terrain_effectiveness, era_patterns,
        technology_advantage_impact, top_strategies_by_terrain
    """
    strategy_wins: Dict[str, List[int]] = defaultdict(list)
    terrain_strategy_wins: Dict[str, Dict[str, List[int]]] = defaultdict(lambda: defaultdict(list))
    era_wins: Dict[str, List[int]] = defaultdict(list)
    region_wins: Dict[str, List[int]] = defaultdict(list)
    technology_wins: Dict[str, List[int]] = defaultdict(list)

    outcome_score = {"Victory": 1, "Draw": 0, "Defeat": 0}

    for conflict in data:
        strategy = conflict.get("strategy_type", "Unknown")
        terrain = conflict.get("terrain", "Unknown")
        era = conflict.get("era", "Unknown")
        region = conflict.get("region", "Unknown")
        tech = conflict.get("technology_level", "Unknown")
        outcome = conflict.get("outcome", "Unknown")
        won = outcome_score.get(outcome, 0)

        strategy_wins[strategy].append(won)
        terrain_strategy_wins[terrain][strategy].append(won)
        era_wins[era].append(won)
        region_wins[region].append(won)
        technology_wins[tech].append(won)

    def compute_win_rate(wins_dict):
        return {
            k: {
                "win_rate": round(sum(v) / len(v), 3) if v else 0.0,
                "total": len(v),
                "wins": sum(v),
            }
            for k, v in wins_dict.items()
        }

    strategy_rates = compute_win_rate(strategy_wins)
    era_rates = compute_win_rate(era_wins)
    region_rates = compute_win_rate(region_wins)
    tech_rates = compute_win_rate(technology_wins)

    # Top strategy per terrain
    top_by_terrain = {}
    for terrain, strats in terrain_strategy_wins.items():
        if strats:
            best_strategy = max(strats.keys(), key=lambda s: sum(strats[s]) / len(strats[s]) if strats[s] else 0)
            top_by_terrain[terrain] = {
                "best_strategy": best_strategy,
                "win_rate": round(sum(strats[best_strategy]) / len(strats[best_strategy]), 3) if strats[best_strategy] else 0.0,
            }

    # Terrain effectiveness matrix
    terrain_matrix = {}
    for terrain, strats in terrain_strategy_wins.items():
        terrain_matrix[terrain] = {
            s: round(sum(wins) / len(wins), 3) if wins else 0.0
            for s, wins in strats.items()
        }

    # Most frequent strategy types
    strategy_frequency = {s: len(wins) for s, wins in strategy_wins.items()}
    most_used = sorted(strategy_frequency.items(), key=lambda x: -x[1])

    # Correlation: duration vs outcome
    durations_by_outcome = defaultdict(list)
    for conflict in data:
        durations_by_outcome[conflict.get("outcome", "Unknown")].append(
            conflict.get("duration_days", 0)
        )
    avg_duration = {
        outcome: round(sum(durs) / len(durs), 1) if durs else 0.0
        for outcome, durs in durations_by_outcome.items()
    }

    patterns = {
        "strategy_win_rates": strategy_rates,
        "era_win_rates": era_rates,
        "region_win_rates": region_rates,
        "technology_win_rates": tech_rates,
        "top_strategy_by_terrain": top_by_terrain,
        "terrain_effectiveness_matrix": terrain_matrix,
        "most_used_strategies": dict(most_used),
        "avg_duration_by_outcome": avg_duration,
        "total_conflicts_analyzed": len(data),
    }

    return patterns


def generate_report(metrics: Dict[str, Any], patterns: Dict[str, Any]) -> str:
    """
    Generate a comprehensive text evaluation report.
    Returns formatted report string.
    """
    lines = []
    lines.append("=" * 70)
    lines.append("HISTORICAL STRATEGY INTELLIGENCE SYSTEM — EVALUATION REPORT")
    lines.append("=" * 70)

    lines.append("\n### MODEL PERFORMANCE ###")
    if "random_forest" in metrics:
        rf = metrics["random_forest"]
        lines.append(f"  RandomForest Test Accuracy : {rf.get('test_accuracy', 'N/A')}")
        lines.append(f"  5-Fold CV Mean Accuracy    : {rf.get('cv_mean', 'N/A')} ± {rf.get('cv_std', 'N/A')}")
    if "mlp" in metrics:
        lines.append(f"  MLP Test Accuracy          : {metrics['mlp'].get('test_accuracy', 'N/A')}")

    lines.append("\n### DATASET OVERVIEW ###")
    ds = metrics.get("dataset", {})
    lines.append(f"  Training Samples  : {ds.get('train_size', 'N/A')}")
    lines.append(f"  Test Samples      : {ds.get('test_size', 'N/A')}")
    lines.append(f"  Feature Count     : {ds.get('n_features', 'N/A')}")
    lines.append(f"  Strategy Classes  : {ds.get('n_classes', 'N/A')}")
    classes = ds.get("strategy_classes", [])
    if classes:
        lines.append(f"  Classes           : {', '.join(classes)}")

    lines.append("\n### STRATEGY WIN RATES (Historical) ###")
    win_rates = patterns.get("strategy_win_rates", {})
    sorted_strategies = sorted(win_rates.items(), key=lambda x: -x[1].get("win_rate", 0))
    for strategy, data in sorted_strategies:
        wr = data.get("win_rate", 0)
        total = data.get("total", 0)
        bar = "█" * int(wr * 20)
        lines.append(f"  {strategy:<20} {bar:<20} {wr:.1%} ({data.get('wins', 0)}/{total})")

    lines.append("\n### TOP STRATEGY BY TERRAIN ###")
    top_terrain = patterns.get("top_strategy_by_terrain", {})
    for terrain, info in sorted(top_terrain.items()):
        lines.append(f"  {terrain:<15} → {info.get('best_strategy', 'N/A'):<20} ({info.get('win_rate', 0):.1%} win rate)")

    lines.append("\n### ERA WIN RATES ###")
    era_rates = patterns.get("era_win_rates", {})
    era_order = ["Ancient", "Medieval", "Early Modern", "Modern", "Contemporary"]
    for era in era_order:
        if era in era_rates:
            data = era_rates[era]
            wr = data.get("win_rate", 0)
            bar = "█" * int(wr * 20)
            lines.append(f"  {era:<20} {bar:<20} {wr:.1%} ({data.get('total', 0)} conflicts)")

    lines.append("\n### AVERAGE CONFLICT DURATION BY OUTCOME ###")
    durations = patterns.get("avg_duration_by_outcome", {})
    for outcome, days in sorted(durations.items()):
        lines.append(f"  {outcome:<15} : {days} days average")

    lines.append("\n" + "=" * 70)
    lines.append("END OF REPORT")
    lines.append("=" * 70)

    return "\n".join(lines)


if __name__ == "__main__":
    import json
    from pathlib import Path

    data_file = Path(__file__).parent.parent / "data" / "historical_data.json"
    with open(data_file) as f:
        conflicts = json.load(f)

    patterns = analyze_strategy_patterns(conflicts)

    metrics_file = Path(__file__).parent / "saved" / "metrics.json"
    if metrics_file.exists():
        with open(metrics_file) as f:
            metrics = json.load(f)
    else:
        metrics = {"note": "No trained model metrics found. Run train.py first."}

    report = generate_report(metrics, patterns)
    print(report)
