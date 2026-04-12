"""Tests for the LLaMA fine-tuning setup."""

import json
import tempfile
from pathlib import Path

import pytest

from auto_learning.llama_finetuning import (
    DatasetConfig,
    DatasetPreparer,
    LLaMAFineTuner,
    LoRAConfig,
    TrainingConfig,
    finetuning_deps_available,
)


# ---------------------------------------------------------------------------
# DatasetPreparer tests
# ---------------------------------------------------------------------------
class TestDatasetPreparer:
    def test_validate_sample_valid(self):
        sample = {"instruction": "Do X", "output": "Done X", "input": "context"}
        assert DatasetPreparer.validate_sample(sample) is True

    def test_validate_sample_missing_instruction(self):
        sample = {"output": "Done X"}
        assert DatasetPreparer.validate_sample(sample) is False

    def test_validate_sample_empty_output(self):
        sample = {"instruction": "Do X", "output": ""}
        assert DatasetPreparer.validate_sample(sample) is False

    def test_validate_sample_not_dict(self):
        assert DatasetPreparer.validate_sample("string") is False
        assert DatasetPreparer.validate_sample(None) is False

    def test_format_prompt(self):
        sample = {"instruction": "Summarise", "input": "text here", "output": "summary"}
        prompt = DatasetPreparer.format_prompt(sample)
        assert "Summarise" in prompt
        assert "text here" in prompt
        assert "summary" in prompt

    def test_load_jsonl(self, tmp_path):
        path = tmp_path / "data.jsonl"
        samples = [
            {"instruction": "Do A", "output": "A done", "input": ""},
            {"instruction": "Do B", "output": "B done", "input": "ctx"},
            {"bad": "data"},
            "not json at all {{{",
        ]
        with open(str(path), "w") as f:
            for s in samples:
                if isinstance(s, dict):
                    f.write(json.dumps(s) + "\n")
                else:
                    f.write(s + "\n")

        loaded = DatasetPreparer.load_jsonl(str(path))
        assert len(loaded) == 2  # Only 2 valid samples

    def test_prepare_dataset(self, tmp_path):
        path = tmp_path / "train.jsonl"
        with open(str(path), "w") as f:
            for i in range(5):
                f.write(json.dumps({
                    "instruction": f"Task {i}",
                    "output": f"Result {i}",
                    "input": "",
                }) + "\n")

        config = DatasetConfig(train_file=str(path), max_samples=3)
        dataset = DatasetPreparer.prepare_dataset(config)
        assert len(dataset["train"]) == 3
        assert len(dataset["eval"]) == 0


# ---------------------------------------------------------------------------
# Configuration tests
# ---------------------------------------------------------------------------
class TestConfigs:
    def test_lora_config_defaults(self):
        cfg = LoRAConfig()
        assert cfg.r == 16
        assert cfg.lora_alpha == 32
        assert "q_proj" in cfg.target_modules

    def test_training_config_defaults(self):
        cfg = TrainingConfig()
        assert cfg.num_train_epochs == 3
        assert cfg.learning_rate == 2e-4

    def test_dataset_config_defaults(self):
        cfg = DatasetConfig()
        assert "Instruction" in cfg.prompt_template


# ---------------------------------------------------------------------------
# LLaMAFineTuner tests (no GPU required)
# ---------------------------------------------------------------------------
class TestLLaMAFineTuner:
    def test_check_environment(self):
        tuner = LLaMAFineTuner()
        env = tuner.check_environment()
        assert "torch" in env
        assert "transformers" in env
        assert "ready" in env

    def test_setup_without_deps(self):
        tuner = LLaMAFineTuner()
        if not finetuning_deps_available():
            result = tuner.setup_model()
            assert result["status"] == "skipped"

    def test_train_without_model(self):
        tuner = LLaMAFineTuner()
        if not finetuning_deps_available():
            result = tuner.train({"train": [], "eval": []})
            assert result["status"] == "skipped"

    def test_save_adapter_without_model(self):
        tuner = LLaMAFineTuner()
        result = tuner.save_adapter()
        assert result["status"] == "error"

    def test_generate_config_file(self, tmp_path):
        tuner = LLaMAFineTuner()
        path = str(tmp_path / "config.json")
        result = tuner.generate_training_config_file(path)
        assert result == path
        assert Path(path).exists()

        with open(path) as f:
            config = json.load(f)
        assert "lora" in config
        assert "training" in config
        assert config["lora"]["r"] == 16
