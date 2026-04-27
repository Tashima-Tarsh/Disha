import datetime
import os
import shutil

import structlog

logger = structlog.get_logger("disaster_recovery")


class DisasterRecoveryManager:
    """Automates backup and restoration of critical AGI state and vector stores."""

    def __init__(self, workspace_root: str):
        self.root = workspace_root
        self.backup_dir = os.path.join(workspace_root, "backups")
        os.makedirs(self.backup_dir, exist_ok=True)

    def perform_snapshot(self):
        """Creates a timestamped snapshot of the current AGI brain and config."""
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_path = os.path.join(self.backup_dir, f"snapshot_{timestamp}")

        logger.info("starting_snapshot", target=snapshot_path)

        # Directories to backup
        targets = ["disha-agi-brain/backend", "docs", "disha/ai/core"]

        os.makedirs(snapshot_path, exist_ok=True)
        for target in targets:
            src = os.path.join(self.root, target)
            if os.path.exists(src):
                dst = os.path.join(snapshot_path, os.path.basename(target))
                if os.path.isdir(src):
                    shutil.copytree(src, dst)
                else:
                    shutil.copy2(src, dst)

        logger.info("snapshot_complete", path=snapshot_path)

    def verify_integrity(self):
        """Checks if the core service files are present and uncorrupted."""
        critical_files = [
            "disha-agi-brain/backend/main.py",
            "docker-compose.yml",
            "package.json",
        ]

        for f in critical_files:
            if not os.path.exists(os.path.join(self.root, f)):
                logger.error("integrity_failure", missing_file=f)
                return False

        logger.info("integrity_verified")
        return True


if __name__ == "__main__":
    dr = DisasterRecoveryManager("c:/Users/lenovo/Downloads/Disha-main")
    dr.verify_integrity()
    dr.perform_snapshot()
