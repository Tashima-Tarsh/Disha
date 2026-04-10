import requests
import os

def scrape_ncrb():
    print("Downloading NCRB cybercrime reports...")

    os.makedirs("data/raw/ncrb", exist_ok=True)

    urls = [
        "https://ncrb.gov.in/sites/default/files/crime_in_india_table_additional_table_chapter_reports/Chapter%2015%20Cyber%20Crime_2021.pdf"
    ]

    for url in urls:
        filename = url.split("/")[-1]
        path = f"data/raw/ncrb/{filename}"

        try:
            res = requests.get(url)
            with open(path, "wb") as f:
                f.write(res.content)

            print(f"Downloaded: {filename}")
        except Exception as e:
            print(f"Error downloading {url}: {e}")
