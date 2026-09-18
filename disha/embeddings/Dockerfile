FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/models \
    TRANSFORMERS_CACHE=/models

RUN groupadd -r embeddings && useradd -r -g embeddings -u 10002 embeddings
WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

ARG DISHA_EMBEDDING_MODEL=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('${DISHA_EMBEDDING_MODEL}')"

COPY app.py ./app.py
RUN mkdir -p /models && chown -R embeddings:embeddings /models /app

USER embeddings
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=10s --retries=5 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8081/health', timeout=5).read()" || exit 1
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8081", "--workers", "1"]
