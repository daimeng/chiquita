import requests
import pandas as pd
from bs4 import BeautifulSoup
import re
import math

def get_tournaments(from_year: int, to_year: int):
    lines = []
    for year in range(from_year, to_year + 1):
        resp = requests.get(
            'https://results.ittf.link/index.php',
            params=dict(
                option='com_fabrik',
                view='list',
                listid=1,
                Itemid=111,
                resetfilters=0,
                clearordering=0,
                clearfilters=0,
                limitstart1=0,
                limit1=500,
                fab_tournaments___code=year
            )
        )
        soup = BeautifulSoup(resp.text)
        rows = soup.find('table', {'id': 'list_1_com_fabrik_1'}).find_all("tr", {"class": "fabrik_row"})
        for row in rows:
            lines.append(list(map(lambda x: x.text.strip(), row.find_all('td'))))
    return lines
