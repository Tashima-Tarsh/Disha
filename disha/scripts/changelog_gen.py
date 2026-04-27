import datetime
import subprocess

import structlog

logger = structlog.get_logger("changelog_generator")


class ChangelogGenerator:
    """Automates the generation of elite, narrative-driven changelogs from Git history."""

    def __init__(self, repo_path: str):
        self.repo_path = repo_path

    def get_commits(self, days: int = 7) -> str:
        """Fetches the last N days of commits."""
        cmd = ["git", "log", f"--since={days}.days", "--pretty=format:%h - %s (%an)"]
        result = subprocess.run(cmd, cwd=self.repo_path, capture_output=True, text=True)
        return result.stdout

    def generate_elite_report(self) -> str:
        """Transforms raw commit messages into a professional release report."""
        commits = self.get_commits()
        if not commits:
            return "No recent changes detected."

        header = f"# DISHA OS: Intelligence Update - {datetime.date.today()}\n"
        header += "## System Evolution Summary\n"

        # Categorization logic (Simple version)
        categories = {"feat": [], "fix": [], "chore": [], "docs": []}
        for line in commits.split("\n"):
            if "feat" in line:
                categories["feat"].append(line)
            elif "fix" in line:
                categories["fix"].append(line)
            elif "chore" in line:
                categories["chore"].append(line)
            else:
                categories["docs"].append(line)

        report = header
        for cat, items in categories.items():
            if items:
                report += f"\n### {cat.upper()}\n"
                for item in items:
                    report += f"- {item}\n"

        return report


if __name__ == "__main__":
    gen = ChangelogGenerator("c:/Users/lenovo/Downloads/Disha-main")
    report = gen.generate_elite_report()

    with open("CHANGELOG_AGI.md", "w") as f:
        f.write(report)

    logger.info("changelog_generated", path="CHANGELOG_AGI.md")
