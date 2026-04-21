"""
Data pipeline for Historical Strategy Intelligence System.
Loads, cleans, preprocesses, and prepares data for ML training.
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

# Paths
BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "historical_data.json"
PROCESSED_DIR = BASE_DIR / "processed"


def load_data(path: Path = DATA_FILE) -> pd.DataFrame:
    """Load historical conflict data from JSON."""
    with open(path, "r") as f:
        data = json.load(f)
    df = pd.DataFrame(data)
    print(f"[Pipeline] Loaded {len(df)} records from {path}")
    return df


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and preprocess the raw dataframe."""
    df = df.copy()

    # Fill missing numeric columns with median
    numeric_cols = ["year", "duration_days", "casualties_estimate"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            median_val = df[col].median()
            missing_count = df[col].isna().sum()
            if missing_count > 0:
                print(
                    f"[Pipeline] Filling {missing_count} missing values in '{col}' with median={median_val}"
                )
            df[col] = df[col].fillna(median_val)

    # Fill missing categorical columns with 'Unknown'
    cat_cols = [
        "era",
        "region",
        "strategy_type",
        "terrain",
        "technology_level",
        "outcome",
    ]
    for col in cat_cols:
        if col in df.columns:
            missing = df[col].isna().sum()
            if missing > 0:
                print(
                    f"[Pipeline] Filling {missing} missing values in '{col}' with 'Unknown'"
                )
            df[col] = df[col].fillna("Unknown")
            df[col] = df[col].str.strip()

    # Normalize text fields
    if "name" in df.columns:
        df["name"] = df["name"].str.strip()
    if "description" in df.columns:
        df["description"] = df["description"].fillna("").str.strip()

    # Ensure list fields are lists
    for list_col in ["key_tactics", "lessons", "notable_leaders"]:
        if list_col in df.columns:
            df[list_col] = df[list_col].apply(
                lambda x: x if isinstance(x, list) else []
            )

    print(f"[Pipeline] Data cleaned. Shape: {df.shape}")
    return df


def engineer_features(df: pd.DataFrame):
    """
    Create feature vectors for ML.
    Encodes categorical variables and normalizes numeric features.
    Returns: (X, y, encoders, feature_names)
    """
    df = df.copy()

    label_encoders = {}
    categorical_features = ["era", "region", "terrain", "technology_level"]
    target_col = "strategy_type"

    # Encode categorical features
    for col in categorical_features:
        le = LabelEncoder()
        df[col + "_enc"] = le.fit_transform(df[col].astype(str))
        label_encoders[col] = le

    # Encode target
    le_target = LabelEncoder()
    df["strategy_enc"] = le_target.fit_transform(df[target_col].astype(str))
    label_encoders[target_col] = le_target

    # Normalize numeric features
    df["year_norm"] = (df["year"] - df["year"].min()) / (
        df["year"].max() - df["year"].min() + 1e-9
    )
    df["duration_norm"] = (df["duration_days"] - df["duration_days"].min()) / (
        df["duration_days"].max() - df["duration_days"].min() + 1e-9
    )
    df["casualties_norm"] = (
        df["casualties_estimate"] - df["casualties_estimate"].min()
    ) / (df["casualties_estimate"].max() - df["casualties_estimate"].min() + 1e-9)

    # Force ratio proxy: log of casualties
    df["log_casualties"] = np.log1p(df["casualties_estimate"])

    # Outcome encoding (Victory=1, Draw=0.5, Defeat=0)
    outcome_map = {"Victory": 1.0, "Draw": 0.5, "Defeat": 0.0}
    df["outcome_score"] = df["outcome"].map(outcome_map).fillna(0.5)

    feature_cols = [col + "_enc" for col in categorical_features] + [
        "year_norm",
        "duration_norm",
        "casualties_norm",
        "log_casualties",
        "outcome_score",
    ]

    X = df[feature_cols].values
    y = df["strategy_enc"].values

    print(f"[Pipeline] Feature matrix shape: {X.shape}")
    print(f"[Pipeline] Target classes: {list(le_target.classes_)}")

    return X, y, label_encoders, feature_cols


def save_processed(X_train, X_test, y_train, y_test, label_encoders, feature_cols, df):
    """Save processed data to disk."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    np.save(PROCESSED_DIR / "X_train.npy", X_train)
    np.save(PROCESSED_DIR / "X_test.npy", X_test)
    np.save(PROCESSED_DIR / "y_train.npy", y_train)
    np.save(PROCESSED_DIR / "y_test.npy", y_test)

    # Also save combined for legacy compatibility
    np.save(PROCESSED_DIR / "features.npy", np.vstack([X_train, X_test]))
    np.save(PROCESSED_DIR / "labels.npy", np.concatenate([y_train, y_test]))

    # Save metadata
    metadata = {
        "feature_names": feature_cols,
        "strategy_classes": list(label_encoders["strategy_type"].classes_),
        "era_classes": list(label_encoders["era"].classes_),
        "region_classes": list(label_encoders["region"].classes_),
        "terrain_classes": list(label_encoders["terrain"].classes_),
        "technology_classes": list(label_encoders["technology_level"].classes_),
        "train_size": int(X_train.shape[0]),
        "test_size": int(X_test.shape[0]),
        "n_features": int(X_train.shape[1]),
        "n_classes": int(len(label_encoders["strategy_type"].classes_)),
        "strategy_distribution": df["strategy_type"].value_counts().to_dict(),
        "era_distribution": df["era"].value_counts().to_dict(),
        "region_distribution": df["region"].value_counts().to_dict(),
    }

    with open(PROCESSED_DIR / "metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Pipeline] Saved processed data to {PROCESSED_DIR}")
    return metadata


def print_stats(df: pd.DataFrame, metadata: dict):
    """Print detailed dataset statistics."""
    print("\n" + "=" * 60)
    print("DATASET STATISTICS")
    print("=" * 60)
    print(f"Total conflicts: {len(df)}")
    print(f"Year range: {int(df['year'].min())} to {int(df['year'].max())}")
    print(f"Training samples: {metadata['train_size']}")
    print(f"Test samples: {metadata['test_size']}")
    print(f"Features: {metadata['n_features']}")
    print(f"Strategy classes: {metadata['n_classes']}")

    print("\n--- Strategy Type Distribution ---")
    for strategy, count in sorted(
        metadata["strategy_distribution"].items(), key=lambda x: -x[1]
    ):
        bar = "█" * count
        print(f"  {strategy:<20} {bar} ({count})")

    print("\n--- Era Distribution ---")
    for era, count in sorted(metadata["era_distribution"].items(), key=lambda x: -x[1]):
        bar = "█" * count
        print(f"  {era:<20} {bar} ({count})")

    print("\n--- Region Distribution ---")
    for region, count in sorted(
        metadata["region_distribution"].items(), key=lambda x: -x[1]
    ):
        bar = "█" * count
        print(f"  {region:<20} {bar} ({count})")

    print("\n--- Outcome Distribution ---")
    outcome_dist = df["outcome"].value_counts().to_dict()
    for outcome, count in sorted(outcome_dist.items(), key=lambda x: -x[1]):
        bar = "█" * count
        print(f"  {outcome:<20} {bar} ({count})")

    print("\n--- Top 5 Largest Conflicts (by casualties) ---")
    top5 = df.nlargest(5, "casualties_estimate")[
        ["name", "year", "casualties_estimate"]
    ]
    for _, row in top5.iterrows():
        print(
            f"  {row['name'][:40]:<40} ({int(row['year'])}) - {int(row['casualties_estimate']):,} casualties"
        )

    print("=" * 60)


def run_pipeline():
    """Execute the full data pipeline."""
    print("[Pipeline] Starting data pipeline...")

    df_raw = load_data()
    df_clean = clean_data(df_raw)
    X, y, label_encoders, feature_cols = engineer_features(df_clean)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=None
    )

    print(f"[Pipeline] Train/Test split: {len(X_train)}/{len(X_test)}")

    metadata = save_processed(
        X_train, X_test, y_train, y_test, label_encoders, feature_cols, df_clean
    )
    print_stats(df_clean, metadata)

    print("[Pipeline] Pipeline complete.")
    return X_train, X_test, y_train, y_test, label_encoders, metadata


if __name__ == "__main__":
    run_pipeline()
