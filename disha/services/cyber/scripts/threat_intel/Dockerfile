FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY update_feeds.py .

RUN groupadd -r appuser && useradd -r -g appuser -m appuser
USER appuser

CMD ["python", "update_feeds.py"]
