import os
import re


def parse_prompts(prompts_dir):
    """
    Parses Markdown prompts into instruction/output pairs.
    Each file is treated as a specialized instruction.
    """
    dataset = []
    for file in os.listdir(prompts_dir):
        if file.endswith(".md"):
            path = os.path.join(prompts_dir, file)
            with open(path, encoding="utf-8") as f:
                content = f.read()

            title_match = re.search(r"# (.*)", content)
            title = title_match.group(1) if title_match else file

            # Simple synthesis: Title as instruction, content as output
            dataset.append(
                {
                    "instruction": f"Provide the guidelines and configuration for: {title}",
                    "input": "",
                    "output": content,
                }
            )
    return dataset


def synthesize_fine_tuning(repo_data_path):
    """
    Simulates extracting code snippets for fine-tuning.
    In reality, this would split code into logical chunks.
    """
    # This is a placeholder for actual extraction logic
    return []


if __name__ == "__main__":
    prompts_path = "disha/ai/prompts"
    dataset = parse_prompts(prompts_path)

    print(f"Synthesized {len(dataset)} instruction pairs from prompts.")
    # with open('disha/intelligence/instruction_dataset.jsonl', 'w') as f:
    #    for entry in dataset:
    #        f.write(json.dumps(entry) + '\n')
