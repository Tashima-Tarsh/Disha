FROM python:3.11-slim

# Security: use specific non-root user early
RUN groupadd -r appuser && useradd -r -g appuser -u 10001 appuser

WORKDIR /app

# Copy only requirements first for layer caching
COPY disha/brain/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source (minimal)
COPY disha/__init__.py /app/disha/__init__.py
COPY disha/brain /app/disha/brain

# Data dir with correct ownership
RUN mkdir -p /data && chown -R appuser:appuser /data

# Make data dir writable only for app, read-only fs where possible
USER appuser

# Runtime security notes: run container with --read-only --tmpfs /tmp --security-opt no-new-privileges

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/v1/health').read(); print('ok')" || exit 1
CMD ["uvicorn", "disha.brain.app:app", "--host", "0.0.0.0", "--port", "8080"]
