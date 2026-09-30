from pathlib import Path

import cv2
import pytesseract

from app.extractors.base import BaseExtractor


class ImageExtractor(BaseExtractor):

    SUPPORTED_EXTENSIONS = {
        ".png",
        ".jpg",
        ".jpeg",
        ".bmp",
        ".tiff",
        ".webp",
    }

    def extract(self, file_path: Path) -> str:
        image = cv2.imread(str(file_path))

        if image is None:
            raise ValueError(
                f"Unable to read image: {file_path}"
            )

        gray = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2GRAY,
        )

        # Improve OCR quality
        thresholded = cv2.threshold(
            gray,
            0,
            255,
            cv2.THRESH_BINARY + cv2.THRESH_OTSU,
        )[1]

        text = pytesseract.image_to_string(
            thresholded
        )

        return text.strip()