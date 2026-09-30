from pathlib import Path

import fitz

from app.extractors.base import BaseExtractor


class PDFExtractor(BaseExtractor):

    def extract(self, file_path: Path) -> str:
        document = fitz.open(file_path)

        pages = []

        try:
            for page in document:
                text = page.get_text()

                if text.strip():
                    pages.append(text)

        finally:
            document.close()

        return "\n\n".join(pages)