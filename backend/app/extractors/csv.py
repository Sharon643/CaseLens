from pathlib import Path

import pandas as pd

from app.extractors.base import BaseExtractor


class CSVExtractor(BaseExtractor):

    def extract(self, file_path: Path) -> str:
        dataframe = pd.read_csv(file_path)

        return dataframe.to_csv(
            index=False,
        )