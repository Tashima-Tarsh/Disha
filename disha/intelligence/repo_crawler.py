import os
from pathlib import Path


def crawl_repo(root_dir):
    """
    Crawls the repository and extracts file contents, paths, and metadata.
    Excludes large binaries and ignored directories.
    """
    repo_data = []
    ignored_dirs = {
        ".git",
        ".claude",
        "node_modules",
        "__pycache__",
        ".next",
        "dist",
        ".pytest_cache",
    }
    allowed_extensions = {
        ".py",
        ".ts",
        ".tsx",
        ".md",
        ".json",
        ".yaml",
        ".yml",
        ".toml",
        ".css",
        ".html",
    }

    root_path = Path(root_dir)

    for current_root, dirs, files in os.walk(root_dir):
        # Filter ignored directories
        dirs[:] = [d for d in dirs if d not in ignored_dirs]

        for file in files:
            file_path = Path(current_root) / file
            if file_path.suffix in allowed_extensions:
                try:
                    with open(file_path, encoding="utf-8") as f:
                        content = f.read()

                    repo_data.append(
                        {
                            "path": str(file_path.relative_to(root_path)),
                            "type": file_path.suffix,
                            "content": content,
                            "size": file_path.stat().st_size,
                        }
                    )
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")

    return repo_data


if __name__ == "__main__":
    # In a real scenario, this would output to a file
    # For this task, we will simulate the extraction
    root = os.getcwd()
    print(f"Crawling repository at {root}...")
    # repo_intelligence = crawl_repo(root)
    # with open('disha/intelligence/repo_data.json', 'w') as f:
    #    json.dump(repo_intelligence, f, indent=2)
