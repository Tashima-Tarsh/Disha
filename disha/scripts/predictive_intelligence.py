import json
import os
from datetime import datetime, timedelta

import structlog
from pydriller import Repository

logger = structlog.get_logger("predictive_intelligence")


class PredictiveAnalyzer:
    def __init__(self, repo_path: str):
        self.repo_path = repo_path
        self.risk_report = {}

    def analyze(self, days=90):
        """Analyze the last N days of commit history to predict risks."""
        since = datetime.now() - timedelta(days=days)

        file_stats = {}  # {filename: {'commits': 0, 'fixes': 0, 'authors': set()}}

        logger.info("starting_commit_analysis", days=days, path=self.repo_path)

        for commit in Repository(self.repo_path, since=since).traverse_commits():
            is_fix = any(
                keyword in commit.msg.lower()
                for keyword in ["fix", "bug", "issue", "repair", "hotfix"]
            )

            for m in commit.modified_files:
                filename = m.filename
                if filename not in file_stats:
                    file_stats[filename] = {
                        "commits": 0,
                        "fixes": 0,
                        "authors": set(),
                        "complexity": m.complexity,
                    }

                file_stats[filename]["commits"] += 1
                if is_fix:
                    file_stats[filename]["fixes"] += 1
                file_stats[filename]["authors"].add(commit.author.email)
                # Update complexity if available
                if m.complexity:
                    file_stats[filename]["complexity"] = m.complexity

        # Calculate Risk Scores
        processed_stats = []
        for filename, stats in file_stats.items():
            # Risk Formula: (Commits * 0.3) + (Fixes * 0.7) + (Authors * 0.2)
            # High churn + High fix rate = High risk
            risk_score = (
                (stats["commits"] * 0.3)
                + (stats["fixes"] * 0.7)
                + (len(stats["authors"]) * 0.2)
            )

            processed_stats.append(
                {
                    "file": filename,
                    "risk_score": round(risk_score, 2),
                    "total_commits": stats["commits"],
                    "fix_commits": stats["fixes"],
                    "author_count": len(stats["authors"]),
                    "complexity": stats["complexity"],
                }
            )

        # Sort by risk score
        processed_stats.sort(key=lambda x: x["risk_score"], reverse=True)

        self.risk_report = {
            "timestamp": datetime.now().isoformat(),
            "analysis_period_days": days,
            "top_risk_files": processed_stats[:10],
            "summary": {
                "total_files_analyzed": len(file_stats),
                "high_risk_threshold": 5.0,
            },
        }

        logger.info(
            "analysis_complete",
            high_risk_files=len([f for f in processed_stats if f["risk_score"] > 5.0]),
        )
        return self.risk_report

    def save_report(self, output_path="predictive_risk_report.json"):
        with open(output_path, "w") as f:
            json.dump(self.risk_report, f, indent=4)
        logger.info("report_saved", path=output_path)


if __name__ == "__main__":
    # Use current directory as repo path
    analyzer = PredictiveAnalyzer(os.getcwd())
    report = analyzer.analyze(days=180)
    analyzer.save_report()
    print(json.dumps(report, indent=2))
