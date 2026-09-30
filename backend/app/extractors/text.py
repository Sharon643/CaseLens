from pathlib import Path

from app.extractors.base import BaseExtractor


class TextExtractor(BaseExtractor):

    SUPPORTED_EXTENSIONS = {
        ".txt",
        ".log",
    }

    def extract(self, file_path: Path) -> str:
        return file_path.read_text(
            encoding="utf-8",
            errors="replace",
        )