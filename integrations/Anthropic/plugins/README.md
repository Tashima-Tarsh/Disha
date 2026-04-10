# Claude Code Plugins

This directory contains some official Claude Code plugins that extend functionality through custom commands, agents, and workflows. These are examples of what's possible with the Claude Code plugin system—many more plugins are available through community marketplaces.

## What are Claude Code Plugins?

Claude Code plugins are extensions that enhance Claude Code with custom slash commands, specialized agents, hooks, and MCP servers. Plugins can be shared across projects and teams, providing consistent tooling and workflows.

Learn more in the [official plugins documentation](https://docs.claude.com/en/docs/claude-code/plugins).

## Plugins in This Directory

| Name | Description | Contents |
|------|-------------|----------|
| [agent-sdk-dev](./agent-sdk-dev/) | Development kit for working with the Claude Agent SDK | Command: `/new-sdk-app`, Agents: `agent-sdk-verifier-py`, `agent-sdk-verifier-ts` |
| [claude-opus-4-5-migration](./claude-opus-4-5-migration/) | Migrate code and prompts from Sonnet 4.x and Opus 4.1 to Opus 4.5 | Skill: `claude-opus-4-5-migration` |
| [code-review](./code-review/) | Automated PR code review using multiple specialized agents | Command: `/code-review`, 5 parallel Sonnet agents |
| [commit-commands](./commit-commands/) | Git workflow automation for committing, pushing, and creating PRs | Commands: `/commit`, `/commit-push-pr`, `/clean_gone` |
| [explanatory-output-style](./explanatory-output-style/) | Adds educational insights about implementation choices | Hook: SessionStart |
| [feature-dev](./feature-dev/) | Comprehensive feature development workflow with a structured 7-phase approach | Command: `/feature-dev`, Agents: `code-explorer`, `code-architect`, `code-reviewer` |
| [frontend-design](./frontend-design/) | Create distinctive, production-grade frontend interfaces | Skill: `frontend-design` |
| [hookify](./hookify/) | Easily create custom hooks to prevent unwanted behaviors | Commands: `/hookify`, `/hookify:list`, `/hookify:configure`, `/hookify:help` |
| [learning-output-style](./learning-output-style/) | Interactive learning mode at decision points | Hook: SessionStart |
| [plugin-dev](./plugin-dev/) | Comprehensive toolkit for developing Claude Code plugins | Command: `/plugin-dev:create-plugin`, 7 expert skills |
| [pr-review-toolkit](./pr-review-toolkit/) | Comprehensive PR review agents | Command: `/pr-review-toolkit:review-pr`, 6 specialized agents |
| [ralph-wiggum](./ralph-wiggum/) | Interactive self-referential AI loops for iterative development | Commands: `/ralph-loop`, `/cancel-ralph` |
| [security-guidance](./security-guidance/) | Security reminder hook for potential security issues | Hook: PreToolUse, monitors 9 security patterns |

## Installation

These plugins are included in the Claude Code repository. To use them in your own projects:

1. Install Claude Code globally:
```bash
npm install -g @anthropic-ai/claude-code
```

2. Navigate to your project and run Claude Code:
```bash
claude
```

3. Use the `/plugin` command to install plugins from marketplaces, or configure them in your project's `.claude/settings.json`.

## Plugin Structure

Each plugin follows the standard Claude Code plugin structure:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── commands/                # Slash commands (optional)
├── agents/                  # Specialized agents (optional)
├── skills/                  # Agent Skills (optional)
├── hooks/                   # Event handlers (optional)
├── .mcp.json                # External tool configuration (optional)
└── README.md                # Plugin documentation
```

## Learn More

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code/overview)
- [Plugin System Documentation](https://docs.claude.com/en/docs/claude-code/plugins)
- [Agent SDK Documentation](https://docs.claude.com/en/api/agent-sdk/overview)
