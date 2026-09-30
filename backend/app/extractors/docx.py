from pathlib import Path

from docx import Document

from app.extractors.base import BaseExtractor


class DOCXExtractor(BaseExtractor):

    def extract(self, file_path: Path) -> str:
        document = Document(file_path)

        paragraphs = [
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        ]

        return "\n".join(paragraphs)