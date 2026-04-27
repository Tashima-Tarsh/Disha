"""Tests for the Disha Agent Core."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from agent_core.agent import Agent

# ---------------------------------------------------------------------------
# Import all modules under test
# ---------------------------------------------------------------------------
from agent_core.config import (
    AgentConfig,
    ClaudeConfig,
    ControllerConfig,
    ExecutorConfig,
    MemoryConfig,
)
from agent_core.controller import Controller
from agent_core.executor import Executor
from agent_core.memory import MemoryStore
from agent_core.planner import Planner
from agent_core.tools import (
    AnalyzeStructureTool,
    ListDirectoryTool,
    ReadFileTool,
    RunCommandTool,
    SearchFilesTool,
    WriteFileTool,
    init_tools,
    list_tools,
)
from agent_core.types import (
    AgentState,
    LogLevel,
    MemoryEntry,
    MemoryScope,
    Plan,
    Task,
    TaskPriority,
    TaskStatus,
)

# ===========================================================================
# Types tests
# ===========================================================================


class TestTypes:
    def test_task_lifecycle(self):
        task = Task(title="Test task", description="Do something")
        assert task.status == TaskStatus.PENDING
        assert task.completed_at is None

        task.mark_completed(result="done")
        assert task.status == TaskStatus.COMPLETED
        assert task.result == "done"
        assert task.completed_at is not None

    def test_task_failure(self):
        task = Task(title="Failing task")
        task.mark_failed("something broke")
        assert task.status == TaskStatus.FAILED
        assert task.error == "something broke"

    def test_plan_progress(self):
        t1 = Task(title="A")
        t2 = Task(title="B")
        plan = Plan(objective="test", tasks=[t1, t2])
        assert plan.progress == 0.0
        assert not plan.completed

        t1.mark_completed()
        assert plan.progress == 0.5

        t2.mark_completed()
        assert plan.progress == 1.0
        assert plan.completed

    def test_plan_empty(self):
        plan = Plan(objective="empty")
        assert plan.progress == 0.0
        assert plan.completed  # no tasks = trivially complete

    def test_memory_entry_touch(self):
        entry = MemoryEntry(key="k", value="v")
        assert entry.access_count == 0
        entry.touch()
        assert entry.access_count == 1

    def test_agent_state_defaults(self):
        state = AgentState()
        assert state.cycle == 0
        assert not state.is_running


# ===========================================================================
# Config tests
# ===========================================================================


class TestConfig:
    def test_defaults(self):
        config = AgentConfig()
        assert config.claude.model == "claude-sonnet-4-20250514"
        assert config.executor.sandbox_mode is True
        assert config.controller.max_cycles == 50
        assert config.memory.max_session_entries == 500

    def test_from_env(self, monkeypatch):
        monkeypatch.setenv("DISHA_CLAUDE_MODEL", "claude-haiku-35-20241022")
        monkeypatch.setenv("DISHA_MAX_CYCLES", "10")
        monkeypatch.setenv("DISHA_SANDBOX", "false")
        monkeypatch.setenv("DISHA_LOG_LEVEL", "debug")

        config = AgentConfig.from_env()
        assert config.claude.model == "claude-haiku-35-20241022"
        assert config.controller.max_cycles == 10
        assert config.executor.sandbox_mode is False
        assert config.log_level == "debug"


# ===========================================================================
# Memory tests
# ===========================================================================


class TestMemory:
    def test_store_and_recall(self):
        mem = MemoryStore(MemoryConfig())
        mem.store("key1", "value1")
        assert mem.recall("key1") == "value1"

    def test_recall_missing(self):
        mem = MemoryStore(MemoryConfig())
        assert mem.recall("nonexistent") is None

    def test_forget(self):
        mem = MemoryStore(MemoryConfig())
        mem.store("key1", "value1")
        assert mem.forget("key1") is True
        assert mem.recall("key1") is None
        assert mem.forget("nonexistent") is False

    def test_scopes(self):
        mem = MemoryStore(MemoryConfig())
        mem.store("x", 1, scope=MemoryScope.SESSION)
        mem.store("x", 2, scope=MemoryScope.PROJECT)
        assert mem.recall("x", MemoryScope.SESSION) == 1
        assert mem.recall("x", MemoryScope.PROJECT) == 2

    def test_clear_scope(self):
        mem = MemoryStore(MemoryConfig())
        mem.store("a", 1, scope=MemoryScope.SESSION)
        mem.store("b", 2, scope=MemoryScope.SESSION)
        mem.store("c", 3, scope=MemoryScope.PROJECT)
        removed = mem.clear_scope(MemoryScope.SESSION)
        assert removed == 2
        assert mem.recall("c", MemoryScope.PROJECT) == 3

    def test_search_by_tags(self):
        mem = MemoryStore(MemoryConfig())
        mem.store("a", 1, tags=["important"])
        mem.store("b", 2, tags=["debug"])
        mem.store("c", 3, tags=["important", "debug"])

        results = mem.search(tags=["important"])
        assert len(results) == 2

    def test_search_by_prefix(self):
        mem = MemoryStore(MemoryConfig())
        mem.store("plan:1", "data1")
        mem.store("plan:2", "data2")
        mem.store("task:1", "data3")

        results = mem.search(prefix="plan:")
        assert len(results) == 2

    def test_logging(self):
        mem = MemoryStore(MemoryConfig())
        mem.log("test message", LogLevel.INFO)
        mem.log("error msg", LogLevel.ERROR)

        logs = mem.get_logs()
        assert len(logs) == 2
        assert logs[0]["message"] == "test message"

        error_logs = mem.get_logs(level=LogLevel.ERROR)
        assert len(error_logs) == 1

    def test_decisions(self):
        mem = MemoryStore(MemoryConfig())
        mem.record_decision(
            "Use pattern A",
            "It's simpler",
            alternatives=["pattern B", "pattern C"],
        )
        decisions = mem.get_decisions()
        assert len(decisions) == 1
        assert decisions[0]["decision"] == "Use pattern A"

    def test_snapshot(self):
        mem = MemoryStore(MemoryConfig())
        mem.store("a", 1)
        mem.log("msg")
        snap = mem.snapshot()
        assert snap["total_entries"] == 1
        assert snap["total_logs"] == 1

    def test_persistence(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            config = MemoryConfig(persist_path=tmpdir)
            mem = MemoryStore(config)
            mem.store("persistent", "data")
            mem.log("test log")
            mem.record_decision("decision", "reason")
            mem.save()

            # Load into new instance
            mem2 = MemoryStore(config)
            assert mem2.load() is True
            assert mem2.recall("persistent") == "data"
            assert len(mem2.get_logs()) == 1
            assert len(mem2.get_decisions()) == 1

    def test_eviction(self):
        config = MemoryConfig(max_session_entries=3)
        mem = MemoryStore(config)
        # Access some entries more than others
        mem.store("a", 1)
        mem.store("b", 2)
        mem.store("c", 3)
        mem.recall("b")  # bump access count
        mem.recall("c")
        mem.recall("c")

        # This should trigger eviction
        mem.store("d", 4)
        # Least accessed ("a") should be evicted
        assert mem.recall("a") is None
        assert mem.recall("d") == 4


# ===========================================================================
# Tools tests
# ===========================================================================


class TestTools:
    def test_init_tools(self):
        config = ExecutorConfig()
        tools = init_tools(config)
        assert "read_file" in tools
        assert "write_file" in tools
        assert "list_directory" in tools
        assert "grep" in tools
        assert "run_command" in tools
        assert "analyze_structure" in tools

    def test_list_tools(self):
        config = ExecutorConfig()
        init_tools(config)
        names = list_tools()
        assert len(names) >= 6

    def test_read_file(self):
        config = ExecutorConfig()
        tool = ReadFileTool(config)
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("hello world")
            f.flush()
            result = tool.execute(path=f.name)
        os.unlink(f.name)
        assert result.success
        assert "hello world" in result.output

    def test_read_file_missing(self):
        config = ExecutorConfig()
        tool = ReadFileTool(config)
        result = tool.execute(path="/nonexistent/file.txt")
        assert not result.success

    def test_write_file(self):
        config = ExecutorConfig(sandbox_mode=False)
        tool = WriteFileTool(config)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.txt")
            result = tool.execute(path=path, content="written")
            assert result.success
            assert Path(path).read_text() == "written"

    def test_write_file_sandbox_blocks_extension(self):
        config = ExecutorConfig(sandbox_mode=True)
        tool = WriteFileTool(config)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "test.exe")
            result = tool.execute(path=path, content="bad")
            assert not result.success
            assert "not allowed" in result.error

    def test_list_directory(self):
        tool = ListDirectoryTool()
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "file1.txt").touch()
            Path(tmpdir, "file2.py").touch()
            Path(tmpdir, "subdir").mkdir()
            result = tool.execute(path=tmpdir)
            assert result.success
            assert "file1.txt" in result.output
            assert "subdir/" in result.output

    def test_list_directory_not_a_dir(self):
        tool = ListDirectoryTool()
        result = tool.execute(path="/nonexistent")
        assert not result.success

    def test_search_files(self):
        tool = SearchFilesTool()
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "a.py").touch()
            Path(tmpdir, "b.py").touch()
            Path(tmpdir, "c.txt").touch()
            result = tool.execute(pattern="*.py", path=tmpdir)
            assert result.success
            assert "a.py" in result.output
            assert "c.txt" not in result.output

    def test_run_command(self):
        config = ExecutorConfig()
        tool = RunCommandTool(config)
        result = tool.execute(command="echo hello")
        assert result.success
        assert "hello" in result.output

    def test_run_command_blocked(self):
        config = ExecutorConfig()
        tool = RunCommandTool(config)
        result = tool.execute(command="rm -rf /")
        assert not result.success
        assert "Blocked" in result.error

    def test_analyze_structure(self):
        tool = AnalyzeStructureTool()
        with tempfile.TemporaryDirectory() as tmpdir:
            Path(tmpdir, "test.py").write_text("print('hi')")
            result = tool.execute(path=tmpdir)
            assert result.success
            assert "test.py" in result.output


# ===========================================================================
# Planner tests
# ===========================================================================


class TestPlanner:
    def test_rule_based_plan(self):
        """Without API key, planner falls back to rule-based."""
        config = ClaudeConfig(api_key="")
        mem = MemoryStore(MemoryConfig())
        planner = Planner(config, mem)

        plan = planner.create_plan("Refactor the auth module")
        assert len(plan.tasks) == 4
        assert plan.objective == "Refactor the auth module"

    def test_next_task_ordering(self):
        config = ClaudeConfig(api_key="")
        mem = MemoryStore(MemoryConfig())
        planner = Planner(config, mem)

        plan = planner.create_plan("Test objective")
        # First task has no dependencies
        task = planner.next_task(plan)
        assert task is not None
        assert task.title == "Analyze current state"

        # Complete it, get next
        task.mark_completed()
        task2 = planner.next_task(plan)
        assert task2 is not None
        assert task2.title == "Identify changes needed"

    def test_next_task_all_done(self):
        config = ClaudeConfig(api_key="")
        mem = MemoryStore(MemoryConfig())
        planner = Planner(config, mem)

        plan = planner.create_plan("Test")
        for task in plan.tasks:
            task.mark_completed()
        assert planner.next_task(plan) is None

    def test_parse_claude_response(self):
        config = ClaudeConfig(api_key="")
        mem = MemoryStore(MemoryConfig())
        planner = Planner(config, mem)

        response = json.dumps(
            {
                "tasks": [
                    {"title": "Step 1", "description": "Do A", "priority": "high"},
                    {"title": "Step 2", "description": "Do B", "priority": "low"},
                ]
            }
        )
        tasks = planner._parse_claude_response(response)
        assert tasks is not None
        assert len(tasks) == 2
        assert tasks[0].priority == TaskPriority.HIGH

    def test_parse_claude_response_with_code_block(self):
        config = ClaudeConfig(api_key="")
        mem = MemoryStore(MemoryConfig())
        planner = Planner(config, mem)

        response = '```json\n{"tasks": [{"title": "T", "description": "D"}]}\n```'
        tasks = planner._parse_claude_response(response)
        assert tasks is not None
        assert len(tasks) == 1

    def test_replan(self):
        config = ClaudeConfig(api_key="")
        mem = MemoryStore(MemoryConfig())
        planner = Planner(config, mem)

        plan = planner.create_plan("Original objective")
        plan.tasks[0].mark_completed()
        plan.tasks[1].mark_failed("error")

        new_plan = planner.replan(plan, failed_task=plan.tasks[1])
        assert len(new_plan.tasks) > 0


# ===========================================================================
# Executor tests
# ===========================================================================


class TestExecutor:
    def test_execute_task_heuristic(self):
        config_claude = ClaudeConfig(api_key="")
        config_exec = ExecutorConfig()
        mem = MemoryStore(MemoryConfig())
        executor = Executor(config_claude, config_exec, mem)

        task = Task(title="Analyze project structure", description="scan the repo")
        result = executor.execute_task(task)
        assert result.status == TaskStatus.COMPLETED

    def test_run_tool_directly(self):
        config_claude = ClaudeConfig(api_key="")
        config_exec = ExecutorConfig()
        mem = MemoryStore(MemoryConfig())
        executor = Executor(config_claude, config_exec, mem)

        result = executor.run_tool("run_command", command="echo test")
        assert result.success
        assert "test" in result.output

    def test_run_unknown_tool(self):
        config_claude = ClaudeConfig(api_key="")
        config_exec = ExecutorConfig()
        mem = MemoryStore(MemoryConfig())
        executor = Executor(config_claude, config_exec, mem)

        result = executor.run_tool("nonexistent_tool")
        assert not result.success
        assert "Unknown tool" in result.error

    def test_available_tools(self):
        config_claude = ClaudeConfig(api_key="")
        config_exec = ExecutorConfig()
        mem = MemoryStore(MemoryConfig())
        executor = Executor(config_claude, config_exec, mem)

        tools = executor.available_tools()
        assert "read_file" in tools
        assert "run_command" in tools


# ===========================================================================
# Controller tests
# ===========================================================================


class TestController:
    def test_run_completes_plan(self):
        config = AgentConfig(
            claude=ClaudeConfig(api_key=""),
            controller=ControllerConfig(max_cycles=20, cycle_delay_seconds=0),
        )
        mem = MemoryStore(config.memory)
        planner = Planner(config.claude, mem)
        executor = Executor(config.claude, config.executor, mem)
        controller = Controller(config.controller, planner, executor, mem)

        state = controller.run("Test autonomous cycle")
        assert state.cycle > 0
        assert not state.is_running

    def test_hooks(self):
        config = AgentConfig(
            claude=ClaudeConfig(api_key=""),
            controller=ControllerConfig(max_cycles=10, cycle_delay_seconds=0),
        )
        mem = MemoryStore(config.memory)
        planner = Planner(config.claude, mem)
        executor = Executor(config.claude, config.executor, mem)
        controller = Controller(config.controller, planner, executor, mem)

        events: list[str] = []
        controller.register_hook("on_cycle_start", lambda _: events.append("start"))
        controller.register_hook("on_cycle_end", lambda _: events.append("end"))

        controller.run("Hook test")
        assert "start" in events
        assert "end" in events

    def test_single_cycle(self):
        config = AgentConfig(
            claude=ClaudeConfig(api_key=""),
            controller=ControllerConfig(max_cycles=5, cycle_delay_seconds=0),
        )
        mem = MemoryStore(config.memory)
        planner = Planner(config.claude, mem)
        executor = Executor(config.claude, config.executor, mem)
        controller = Controller(config.controller, planner, executor, mem)

        plan = planner.create_plan("Single cycle test")
        task = controller.run_single_cycle(plan)
        assert task is not None
        assert task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED)


# ===========================================================================
# Agent integration tests
# ===========================================================================


class TestAgent:
    def test_initialization(self):
        config = AgentConfig(claude=ClaudeConfig(api_key=""))
        agent = Agent(config)
        assert agent.state.cycle == 0

    def test_plan_creation(self):
        config = AgentConfig(claude=ClaudeConfig(api_key=""))
        agent = Agent(config)
        plan = agent.plan("Test plan creation")
        assert len(plan.tasks) > 0

    def test_direct_tool_access(self):
        config = AgentConfig(claude=ClaudeConfig(api_key=""))
        agent = Agent(config)
        result = agent.tool("run_command", command="echo agent_test")
        assert result.success
        assert "agent_test" in result.output

    def test_memory_operations(self):
        config = AgentConfig(claude=ClaudeConfig(api_key=""))
        agent = Agent(config)
        agent.remember("test_key", "test_value")
        assert agent.recall("test_key") == "test_value"

    def test_memory_snapshot(self):
        config = AgentConfig(claude=ClaudeConfig(api_key=""))
        agent = Agent(config)
        agent.remember("k", "v")
        snap = agent.memory_snapshot()
        assert snap["total_entries"] > 0

    def test_available_tools(self):
        config = AgentConfig(claude=ClaudeConfig(api_key=""))
        agent = Agent(config)
        tools = agent.available_tools()
        assert isinstance(tools, list)
        assert len(tools) >= 6

    def test_dry_run(self):
        config = AgentConfig(claude=ClaudeConfig(api_key=""), dry_run=True)
        agent = Agent(config)
        state = agent.run("Should not execute")
        assert state.active_plan is not None
        assert not state.is_running

    def test_iterate(self):
        config = AgentConfig(claude=ClaudeConfig(api_key=""))
        agent = Agent(config)
        plan = agent.plan("Iterate test")
        results = agent.iterate(plan)
        assert len(results) > 0
