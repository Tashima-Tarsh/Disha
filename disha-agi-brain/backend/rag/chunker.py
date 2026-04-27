import os

import tree_sitter_python as tspython
from tree_sitter import Language, Parser


class CodeChunker:
    """
    AST-based code chunker for generating highly contextual RAG embeddings.
    Rather than chunking by line, this chunks by functions and classes,
    preserving docstrings and logical boundaries.
    """

    def __init__(self):
        # Initialize the Python language parser
        self.PY_LANGUAGE = Language(tspython.language(), "python")
        self.parser = Parser()
        self.parser.set_language(self.PY_LANGUAGE)

    def parse_file(self, filepath: str) -> list[dict]:
        """Reads a file and returns a list of semantic chunks (functions/classes)."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")

        with open(filepath, encoding="utf-8") as f:
            content = f.read()

        tree = self.parser.parse(bytes(content, "utf8"))
        return self._extract_chunks(tree.root_node, content, filepath)

    def _extract_chunks(self, node, content: str, filepath: str) -> list[dict]:
        chunks = []

        # Traverse the AST to find function and class definitions
        for child in node.children:
            if child.type in ["function_definition", "class_definition"]:
                chunk_text = content[child.start_byte : child.end_byte]
                chunks.append(
                    {
                        "type": child.type,
                        "filepath": filepath,
                        "start_line": child.start_point[0] + 1,
                        "end_line": child.end_point[0] + 1,
                        "content": chunk_text,
                    }
                )

            # Recursively extract methods from within classes
            if child.type == "class_definition":
                for grandchild in child.children:
                    if grandchild.type == "block":
                        chunks.extend(
                            self._extract_chunks(grandchild, content, filepath)
                        )

        return chunks


if __name__ == "__main__":
    # Quick test of the chunker
    chunker = CodeChunker()
    print("Code chunker initialized successfully. Ready to parse repository files.")
