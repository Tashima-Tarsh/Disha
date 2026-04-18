import subprocess


def get_git_history():
    """
    Extracts commit messages and hashes from the git log.
    In a production scenario, we would also extract the diffs.
    """
    try:
        # Get commit hash, author date, and subject
        command = ["git", "log", "--pretty=format:%H|%ad|%s", "--date=short"]
        result = subprocess.run(command, capture_output=True, text=True, check=True)

        commits = []
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
            h, d, s = line.split('|', 2)
            commits.append({
                "hash": h,
                "date": d,
                "subject": s
            })

        return commits
    except Exception as e:
        print(f"Error mining git history: {e}")
        return []


def categorize_commit(subject):
    """Categorizes commits based on keywords."""
    subject = subject.lower()
    if any(k in subject for k in ['fix', 'bug', 'resolve', 'issue']):
        return "FIX"
    if any(k in subject for k in ['feat', 'add', 'new']):
        return "FEATURE"
    if any(k in subject for k in ['refactor', 'clean', 'style']):
        return "REFACTOR"
    if any(k in subject for k in ['doc', 'readme', 'wiki']):
        return "DOCUMENTATION"
    return "MISC"


if __name__ == "__main__":
    commits = get_git_history()
    dataset = []

    for commit in commits:
        category = categorize_commit(commit['subject'])
        dataset.append({
            "instruction": f"Explain the purpose of the following {category} commit.",
            "input": commit['subject'],
            "output": f"This commit is a {category.lower()} aimed at: {commit['subject']}. It was committed on {commit['date']}."
        })

    print(f"Extracted {len(dataset)} commits for fine-tuning.")
    # with open('disha/intelligence/ft_commits.jsonl', 'w') as f:
    #    for entry in dataset:
    #        f.write(json.dumps(entry) + '\n')
