"""
CalcHEP-inspired AI Processing Pipeline.

Provides a modular, stage-based pipeline for transforming raw input through
parsing, symbolic manipulation, numerical computation, simulation, and
formatted output.  Each stage is independently testable and the pipeline
supports middleware hooks for monitoring and transformation.
"""

from __future__ import annotations

import abc
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Type aliases
# ---------------------------------------------------------------------------
StageCallback = Callable[["PipelineStage", Dict[str, Any]], None]


# =========================================================================
# Base Stage
# =========================================================================
class PipelineStage(abc.ABC):
    """Abstract base class for a single pipeline processing stage."""

    def __init__(self, name: str) -> None:
        self.name = name

    @abc.abstractmethod
    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform *data* and return the updated dictionary.

        Args:
            data: A mutable dictionary that flows through the pipeline.

        Returns:
            The (possibly modified) data dictionary.
        """

    def validate(self, data: Dict[str, Any]) -> bool:
        """Check whether *data* satisfies the pre-conditions for this stage.

        The default implementation accepts any dictionary.  Override in
        subclasses for stricter validation.

        Args:
            data: Data dictionary to validate.

        Returns:
            ``True`` if validation passes, ``False`` otherwise.
        """
        return isinstance(data, dict)

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name!r})"


# =========================================================================
# Concrete Stages
# =========================================================================
class InputStage(PipelineStage):
    """Parse raw input (text, dict, or file path) into structured data."""

    def __init__(self, name: str = "input") -> None:
        super().__init__(name)

    def validate(self, data: Dict[str, Any]) -> bool:
        return "raw_input" in data

    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse *raw_input* into ``parsed_input``.

        Supported raw formats:
        * ``dict`` – used as-is.
        * ``str`` that is a valid file path – file contents are read and
          decoded as JSON (falling back to plain text).
        * ``str`` – attempted JSON parse, otherwise stored as plain text.
        """
        raw = data.get("raw_input")
        if raw is None:
            raise ValueError("InputStage requires 'raw_input' in data.")

        if isinstance(raw, dict):
            parsed = dict(raw)
        elif isinstance(raw, str) and os.path.isfile(raw):
            with open(raw, "r", encoding="utf-8") as fh:
                content = fh.read()
            try:
                parsed = json.loads(content)
            except json.JSONDecodeError:
                parsed = {"text": content}
        elif isinstance(raw, str):
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = {"text": raw}
        else:
            parsed = {"value": raw}

        data["parsed_input"] = parsed
        logger.debug("InputStage produced parsed_input keys: %s", list(parsed.keys()))
        return data


class ParsingStage(PipelineStage):
    """Tokenise text and extract lightweight structure."""

    def __init__(self, name: str = "parsing") -> None:
        super().__init__(name)

    def validate(self, data: Dict[str, Any]) -> bool:
        return "parsed_input" in data

    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Tokenise and extract structure from ``parsed_input``.

        If the parsed input contains a ``text`` key its value is tokenised
        into words and simple numeric literals are tagged.  Non-text inputs
        are passed through with type annotations.
        """
        parsed = data.get("parsed_input", {})
        tokens: List[Dict[str, Any]] = []
        structure: Dict[str, Any] = {}

        text = parsed.get("text", "")
        if text:
            words = re.findall(r"[A-Za-z_]\w*|[+\-*/^=<>!]+|\d+\.?\d*", text)
            for word in words:
                if re.fullmatch(r"\d+\.?\d*", word):
                    tokens.append({"type": "number", "value": float(word)})
                elif re.fullmatch(r"[+\-*/^=<>!]+", word):
                    tokens.append({"type": "operator", "value": word})
                else:
                    tokens.append({"type": "identifier", "value": word})
            structure["token_count"] = len(tokens)
            structure["has_numbers"] = any(t["type"] == "number" for t in tokens)
            structure["has_operators"] = any(t["type"] == "operator" for t in tokens)
        else:
            for key, value in parsed.items():
                tokens.append(
                    {"type": type(value).__name__, "key": key, "value": value}
                )
            structure["keys"] = list(parsed.keys())

        data["tokens"] = tokens
        data["structure"] = structure
        logger.debug("ParsingStage produced %d tokens", len(tokens))
        return data


# ---------------------------------------------------------------------------
# Minimal expression tree for SymbolicStage
# ---------------------------------------------------------------------------
@dataclass
class _ExprNode:
    """A node in a simple expression tree."""

    kind: str  # "num", "var", "op"
    value: Any = None
    children: List["_ExprNode"] = field(default_factory=list)

    def evaluate(self, variables: Dict[str, float]) -> float:
        """Recursively evaluate the expression tree."""
        if self.kind == "num":
            return float(self.value)
        if self.kind == "var":
            if self.value not in variables:
                raise ValueError(f"Undefined variable: {self.value}")
            return float(variables[self.value])
        if self.kind == "op":
            left = self.children[0].evaluate(variables)
            right = self.children[1].evaluate(variables)
            ops = {
                "+": float.__add__,
                "-": float.__sub__,
                "*": float.__mul__,
                "/": float.__truediv__,
                "^": lambda a, b: a**b,
            }
            fn = ops.get(self.value)
            if fn is None:
                raise ValueError(f"Unknown operator: {self.value}")
            return fn(left, right)
        raise ValueError(f"Unknown node kind: {self.kind}")

    def __repr__(self) -> str:
        if self.kind in ("num", "var"):
            return f"{self.value}"
        return f"({self.children[0]} {self.value} {self.children[1]})"


def _tokens_to_expr(tokens: List[Dict[str, Any]]) -> Optional[_ExprNode]:
    """Build a flat left-associative expression tree from a token list.

    This intentionally does *not* implement full precedence parsing – it is
    a lightweight helper for the symbolic stage.
    """
    nodes: List[_ExprNode] = []
    operators: List[str] = []

    for tok in tokens:
        if tok["type"] == "number":
            nodes.append(_ExprNode(kind="num", value=tok["value"]))
        elif tok["type"] == "identifier":
            nodes.append(_ExprNode(kind="var", value=tok["value"]))
        elif tok["type"] == "operator" and tok["value"] in {"+", "-", "*", "/", "^"}:
            operators.append(tok["value"])

    if not nodes:
        return None

    tree = nodes[0]
    for i, op in enumerate(operators):
        if i + 1 < len(nodes):
            tree = _ExprNode(kind="op", value=op, children=[tree, nodes[i + 1]])
    return tree


# ---------------------------------------------------------------------------
# Simplification rules
# ---------------------------------------------------------------------------
def _simplify(node: _ExprNode) -> _ExprNode:
    """Apply basic algebraic simplification rules."""
    if node.kind != "op":
        return node
    left = _simplify(node.children[0])
    right = _simplify(node.children[1])

    # x + 0, 0 + x
    if node.value == "+" and right.kind == "num" and right.value == 0:
        return left
    if node.value == "+" and left.kind == "num" and left.value == 0:
        return right

    # x * 1, 1 * x
    if node.value == "*" and right.kind == "num" and right.value == 1:
        return left
    if node.value == "*" and left.kind == "num" and left.value == 1:
        return right

    # x * 0, 0 * x
    if node.value == "*" and (
        (right.kind == "num" and right.value == 0)
        or (left.kind == "num" and left.value == 0)
    ):
        return _ExprNode(kind="num", value=0.0)

    # x - 0
    if node.value == "-" and right.kind == "num" and right.value == 0:
        return left

    # constant folding
    if left.kind == "num" and right.kind == "num":
        result = _ExprNode(
            kind="op", value=node.value, children=[left, right]
        ).evaluate({})
        return _ExprNode(kind="num", value=result)

    return _ExprNode(kind="op", value=node.value, children=[left, right])


class SymbolicStage(PipelineStage):
    """Build and simplify a symbolic expression tree from tokens."""

    def __init__(self, name: str = "symbolic") -> None:
        super().__init__(name)

    def validate(self, data: Dict[str, Any]) -> bool:
        return "tokens" in data

    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert tokens into an expression tree and apply simplification rules."""
        tokens = data.get("tokens", [])
        tree = _tokens_to_expr(tokens)
        if tree is not None:
            simplified = _simplify(tree)
            data["expression_tree"] = tree
            data["simplified_tree"] = simplified
            logger.debug("SymbolicStage built tree: %s -> %s", tree, simplified)
        else:
            data["expression_tree"] = None
            data["simplified_tree"] = None
            logger.debug("SymbolicStage: no expression could be built from tokens")
        return data


class NumericalStage(PipelineStage):
    """Evaluate symbolic expressions numerically using numpy."""

    def __init__(self, name: str = "numerical") -> None:
        super().__init__(name)

    def validate(self, data: Dict[str, Any]) -> bool:
        return "simplified_tree" in data or "tokens" in data

    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate the simplified expression tree to a numerical result.

        If variable values are provided under ``data["variables"]`` they are
        substituted before evaluation.  The result is stored in
        ``data["numerical_result"]``.  Additional numpy-based statistics are
        computed when the parsed input contains array-like data.
        """
        variables: Dict[str, float] = data.get("variables", {})
        tree: Optional[_ExprNode] = data.get("simplified_tree")

        if tree is not None:
            try:
                result = tree.evaluate(variables)
                data["numerical_result"] = result
                logger.debug("NumericalStage evaluated to %s", result)
            except Exception as exc:
                data["numerical_result"] = None
                data["numerical_error"] = str(exc)
                logger.warning("NumericalStage evaluation failed: %s", exc)
        else:
            data["numerical_result"] = None

        # Compute numpy statistics over any numeric arrays in parsed_input
        parsed = data.get("parsed_input", {})
        stats: Dict[str, Any] = {}
        for key, value in parsed.items():
            try:
                arr = np.asarray(value, dtype=np.float64)
                if arr.ndim >= 1 and arr.size > 0:
                    stats[key] = {
                        "mean": float(np.mean(arr)),
                        "std": float(np.std(arr)),
                        "min": float(np.min(arr)),
                        "max": float(np.max(arr)),
                        "sum": float(np.sum(arr)),
                    }
            except (ValueError, TypeError):
                pass
        if stats:
            data["array_stats"] = stats

        return data


class SimulationStage(PipelineStage):
    """Run a lightweight simulation on the computed data."""

    def __init__(
        self,
        name: str = "simulation",
        n_steps: int = 100,
        dt: float = 0.01,
    ) -> None:
        super().__init__(name)
        self.n_steps = n_steps
        self.dt = dt

    def validate(self, data: Dict[str, Any]) -> bool:
        return True  # simulation can always run with defaults

    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a simple numerical simulation.

        If ``data["simulation_fn"]`` is present it is called with the current
        state array at every step.  Otherwise a default damped-oscillator
        simulation is run using the numerical result as the initial amplitude.
        """
        sim_fn: Optional[Callable] = data.get("simulation_fn")
        initial_value = data.get("numerical_result", 1.0) or 1.0

        steps = data.get("sim_steps", self.n_steps)
        dt = data.get("sim_dt", self.dt)

        if sim_fn is not None:
            state = np.array([float(initial_value)], dtype=np.float64)
            history = [state.copy()]
            for _ in range(steps):
                state = sim_fn(state, dt)
                history.append(state.copy())
        else:
            # Default: damped harmonic oscillator  x'' + 2ζω x' + ω²x = 0
            omega = 2.0 * np.pi
            zeta = 0.1
            x = float(initial_value)
            v = 0.0
            history_x: List[float] = [x]
            for _ in range(steps):
                a = -2.0 * zeta * omega * v - omega**2 * x
                v += a * dt
                x += v * dt
                history_x.append(x)
            history = [np.array(history_x)]

        data["simulation_history"] = np.array(history[0] if sim_fn is None else history)
        data["simulation_steps"] = steps
        data["simulation_dt"] = dt
        logger.debug("SimulationStage completed %d steps (dt=%.4f)", steps, dt)
        return data


class OutputStage(PipelineStage):
    """Format pipeline results into a human-readable output."""

    def __init__(self, name: str = "output", fmt: str = "dict") -> None:
        super().__init__(name)
        self.fmt = fmt

    def validate(self, data: Dict[str, Any]) -> bool:
        return True

    def process(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Produce a formatted summary of the pipeline results.

        Supported formats: ``"dict"`` (default), ``"json"``, ``"text"``.
        """
        summary: Dict[str, Any] = {
            "numerical_result": data.get("numerical_result"),
            "expression": (
                str(data["simplified_tree"]) if data.get("simplified_tree") else None
            ),
            "token_count": data.get("structure", {}).get("token_count"),
            "simulation_steps": data.get("simulation_steps"),
        }
        if "array_stats" in data:
            summary["array_stats"] = data["array_stats"]

        sim_hist = data.get("simulation_history")
        if sim_hist is not None:
            arr = np.asarray(sim_hist, dtype=np.float64).ravel()
            summary["simulation_summary"] = {
                "final_value": float(arr[-1]) if arr.size > 0 else None,
                "mean": float(np.mean(arr)),
                "std": float(np.std(arr)),
            }

        if self.fmt == "json":
            data["output"] = json.dumps(summary, indent=2, default=str)
        elif self.fmt == "text":
            lines = [f"{k}: {v}" for k, v in summary.items()]
            data["output"] = "\n".join(lines)
        else:
            data["output"] = summary

        logger.debug("OutputStage formatted result as %s", self.fmt)
        return data


# =========================================================================
# Pipeline
# =========================================================================
class Pipeline:
    """Chain multiple :class:`PipelineStage` instances into a processing pipeline.

    Supports middleware hooks that fire before and after each stage.

    Example::

        pipe = Pipeline()
        pipe.add_stage(InputStage())
        pipe.add_stage(ParsingStage())
        pipe.add_stage(OutputStage())
        result = pipe.run({"raw_input": "hello world"})
    """

    def __init__(self, name: str = "pipeline") -> None:
        self.name = name
        self._stages: List[PipelineStage] = []
        self._before_hooks: List[StageCallback] = []
        self._after_hooks: List[StageCallback] = []

    # -- Stage management ---------------------------------------------------

    def add_stage(self, stage: PipelineStage) -> "Pipeline":
        """Append a stage to the pipeline.  Returns *self* for chaining."""
        self._stages.append(stage)
        logger.info("Pipeline '%s': added stage '%s'", self.name, stage.name)
        return self

    def remove_stage(self, name: str) -> "Pipeline":
        """Remove the first stage matching *name*.  Returns *self*."""
        for i, stage in enumerate(self._stages):
            if stage.name == name:
                self._stages.pop(i)
                logger.info("Pipeline '%s': removed stage '%s'", self.name, name)
                return self
        raise KeyError(f"No stage named '{name}' in pipeline '{self.name}'")

    @property
    def stages(self) -> Tuple[PipelineStage, ...]:
        """Return an immutable view of current stages."""
        return tuple(self._stages)

    # -- Hooks / middleware --------------------------------------------------

    def before_stage(self, callback: StageCallback) -> None:
        """Register a callback invoked **before** each stage runs."""
        self._before_hooks.append(callback)

    def after_stage(self, callback: StageCallback) -> None:
        """Register a callback invoked **after** each stage runs."""
        self._after_hooks.append(callback)

    # -- Execution ----------------------------------------------------------

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the full pipeline on *input_data*.

        Each stage's :meth:`validate` is called before :meth:`process`.  The
        wall-clock time of every stage is logged at *INFO* level.

        Args:
            input_data: Initial data dictionary.

        Returns:
            The data dictionary after all stages have processed it.

        Raises:
            ValueError: If a stage's validation fails.
        """
        data = dict(input_data)
        total_start = time.perf_counter()

        for stage in self._stages:
            # Before hooks
            for hook in self._before_hooks:
                hook(stage, data)

            # Validate
            if not stage.validate(data):
                raise ValueError(
                    f"Validation failed at stage '{stage.name}' "
                    f"in pipeline '{self.name}'"
                )

            # Process
            stage_start = time.perf_counter()
            data = stage.process(data)
            elapsed = time.perf_counter() - stage_start
            logger.info(
                "Pipeline '%s' | stage '%s' completed in %.4fs",
                self.name,
                stage.name,
                elapsed,
            )

            # After hooks
            for hook in self._after_hooks:
                hook(stage, data)

        total_elapsed = time.perf_counter() - total_start
        logger.info(
            "Pipeline '%s' finished in %.4fs (%d stages)",
            self.name,
            total_elapsed,
            len(self._stages),
        )
        return data

    def __repr__(self) -> str:
        stage_names = [s.name for s in self._stages]
        return f"Pipeline(name={self.name!r}, stages={stage_names})"
