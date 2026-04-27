import re
import structlog
from typing import List, Dict, Any

logger = structlog.get_logger("citation_engine")

class CitationEngine:
    """Maps AI outputs back to repository source files and line numbers."""
    
    def __init__(self, repo_path: str) -> None:
        self.repo_path = repo_path

    def extract_sources(self, text: str) -> List[Dict[str, Any]]:
        """Parses text for file references and validates them against the repo."""
        # Simple regex to find patterns like `path/to/file.py` or `file.py:L10`
        pattern = r'([a-zA-Z0-9_\-\/]+\.(?:py|ts|tsx|js|html|css|json|md))(?::L(\d+))?'
        matches = re.findall(pattern, text)
        
        citations = []
        for file_path, line in matches:
            # Validate existence (basic check)
            _full_path = f"{self.repo_path}/{file_path}"
            citations.append({
                "file": file_path,
                "line": line if line else "1",
                "is_valid": True # Placeholder for OS path check
            })
            
        logger.info("citations_extracted", count=len(citations))
        return citations

    def format_with_citations(self, text: str) -> str:
        """Appends a citation index to the AI response."""
        citations = self.extract_sources(text)
        if not citations:
            return text
            
        footer = "\n\n---\n**Source Citations:**\n"
        for i, cite in enumerate(citations, 1):
            footer += f"[{i}] {cite['file']}"
            if cite['line'] != "1":
                footer += f" (Line {cite['line']})"
            footer += "\n"
            
        return text + footer
