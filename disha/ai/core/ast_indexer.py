import os
import tree_sitter_python as tspython
import tree_sitter_javascript as tsjs
from tree_sitter import Language, Parser
import structlog
from typing import Dict, Any

logger = structlog.get_logger("ast_indexer")

class ASTIndexer:
    """Sovereign Repository Indexer using Tree-Sitter for deep structural understanding."""
    
    def __init__(self):
        # Initialize parsers
        self.py_language = Language(tspython.language())
        self.js_language = Language(tsjs.language())
        
        self.py_parser = Parser()
        self.py_parser.set_language(self.py_language)
        
        self.js_parser = Parser()
        self.js_parser.set_language(self.js_language)

    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parses a file and extracts structural metadata (classes, functions)."""
        if not os.path.exists(file_path):
            return {"error": "File not found"}

        with open(file_path, "rb") as f:
            content = f.read()

        ext = os.path.splitext(file_path)[1]
        if ext == ".py":
            tree = self.py_parser.parse(content)
            return self._extract_python_metadata(tree.root_node, content)
        elif ext in [".js", ".jsx", ".ts", ".tsx"]:
            tree = self.js_parser.parse(content)
            return self._extract_javascript_metadata(tree.root_node, content)
        
        return {"error": "Unsupported file type"}

    def _extract_python_metadata(self, node, content) -> Dict[str, Any]:
        metadata = {"classes": [], "functions": [], "imports": []}
        
        for child in node.children:
            if child.type == "class_definition":
                name_node = child.child_by_field_name("name")
                if name_node:
                    metadata["classes"].append(content[name_node.start_byte:name_node.end_byte].decode("utf8"))
            elif child.type == "function_definition":
                name_node = child.child_by_field_name("name")
                if name_node:
                    metadata["functions"].append(content[name_node.start_byte:name_node.end_byte].decode("utf8"))
            elif child.type == "import_statement" or child.type == "import_from_statement":
                metadata["imports"].append(content[child.start_byte:child.end_byte].decode("utf8"))
                
        return metadata

    def _extract_javascript_metadata(self, node, content) -> Dict[str, Any]:
        # Similar logic for JS/TS
        metadata = {"classes": [], "functions": [], "imports": []}
        # Simplified for demonstration; frontier implementation would use more complex queries
        return metadata

    def index_directory(self, root_dir: str) -> Dict[str, Any]:
        """Performs a full structural sweep of the directory."""
        index = {}
        for root, _, files in os.walk(root_dir):
            for file in files:
                if file.endswith((".py", ".js", ".jsx", ".ts", ".tsx")):
                    path = os.path.join(root, file)
                    rel_path = os.path.relpath(path, root_dir)
                    logger.info("indexing_file", path=rel_path)
                    index[rel_path] = self.parse_file(path)
        return index

if __name__ == "__main__":
    indexer = ASTIndexer()
    # Test on a small part of the repo
    results = indexer.index_directory("disha-agi-brain/backend/app/services")
    print(results)
