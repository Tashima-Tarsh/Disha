"""
Git sync utility — commits and pushes pending changes using subprocess
for proper error handling and to avoid shell-injection risks.
"""

import logging
import subprocess
from datetime import UTC, datetime

logger = logging.getLogger(__name__)


def git_sync(repo_path: str = ".") -> bool:
    """
    Stage all changes, commit with a timestamped message, and push.

    Args:
        repo_path: Path to the git repository root. Defaults to CWD.

    Returns:
        True if all operations succeeded, False otherwise.
    """
    timestamp = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    commit_msg = f"chore: auto-update {timestamp}"

    commands = [
        ["git", "-C", repo_path, "add", "."],
        ["git", "-C", repo_path, "commit", "-m", commit_msg],
        ["git", "-C", repo_path, "push"],
    ]

    for cmd in commands:
        try:
            result = subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                text=True,
            )
            logger.info("git_sync: %s -> OK", " ".join(cmd[2:]))
            if result.stdout:
                logger.debug(result.stdout.strip())
        except subprocess.CalledProcessError as exc:
            # "nothing to commit" is not a failure
            if "nothing to commit" in (exc.stdout or "") + (exc.stderr or ""):
                logger.info("git_sync: nothing to commit, skipping push.")
                return True
            logger.error(
                "git_sync: command failed: %s\nstdout: %s\nstderr: %s",
                " ".join(cmd[2:]),
                exc.stdout,
                exc.stderr,
            )
            return False

    logger.info("git_sync: sync complete (%s)", timestamp)
    return True


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    success = git_sync()
    raise SystemExit(0 if success else 1)
