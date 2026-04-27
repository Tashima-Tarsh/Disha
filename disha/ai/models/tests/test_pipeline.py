"""Pipeline tests."""

import os
import sys
import unittest

from core.pipeline_engine.pipeline import (
    InputStage,
    NumericalStage,
    OutputStage,
    ParsingStage,
    Pipeline,
    SimulationStage,
    SymbolicStage,
)

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


class TestPipeline(unittest.TestCase):
    def test_pipeline_stage_execution(self):
        stage = InputStage()
        data = {"raw_input": {"key": "value"}}
        result = stage.process(data)
        self.assertIn("parsed_input", result)
        self.assertEqual(result["parsed_input"]["key"], "value")

    def test_full_pipeline_run(self):
        pipe = Pipeline(name="test")
        pipe.add_stage(InputStage())
        pipe.add_stage(ParsingStage())
        pipe.add_stage(SymbolicStage())
        pipe.add_stage(NumericalStage())
        pipe.add_stage(SimulationStage(n_steps=10, dt=0.1))
        pipe.add_stage(OutputStage())
        result = pipe.run({"raw_input": "3.0 + 4.0"})
        self.assertIn("output", result)
        self.assertIn("simulation_history", result)
        self.assertIsNotNone(result.get("numerical_result"))

    def test_pipeline_hooks(self):
        pipe = Pipeline(name="hooks")
        pipe.add_stage(InputStage())
        pipe.add_stage(ParsingStage())
        log = []
        pipe.before_stage(lambda s, d: log.append(("before", s.name)))
        pipe.after_stage(lambda s, d: log.append(("after", s.name)))
        pipe.run({"raw_input": "hello"})
        self.assertEqual(len(log), 4)  # 2 stages × 2 hooks
        self.assertEqual(log[0], ("before", "input"))
        self.assertEqual(log[1], ("after", "input"))

    def test_stage_validation(self):
        stage = InputStage()
        self.assertTrue(stage.validate({"raw_input": "x"}))
        self.assertFalse(stage.validate({"other": "x"}))
        pipe = Pipeline(name="val")
        pipe.add_stage(ParsingStage())  # requires parsed_input
        with self.assertRaises(ValueError):
            pipe.run({"raw_input": "test"})


if __name__ == "__main__":
    unittest.main()
