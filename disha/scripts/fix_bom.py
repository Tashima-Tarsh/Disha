import os

# Function to remove UTF-8 BOM


def remove_utf8_bom(file_path):
    with open(file_path, "rb") as file:
        content = file.read()
    if content.startswith(b"\xef\xbb\xbf"):
        content = content[3:]
        with open(file_path, "wb") as file:
            file.write(content)


# Main logic to process Python files in the disha directory


def main():
    for root, _, files in os.walk("disha"):
        for file in files:
            if file.endswith(".py"):
                print(f"Removing UTF-8 BOM from: {file}")
                remove_utf8_bom(os.path.join(root, file))


if __name__ == "__main__":
    main()
