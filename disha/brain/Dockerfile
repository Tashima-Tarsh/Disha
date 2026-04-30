FROM python:3.11-slim

WORKDIR /app

RUN useradd -m -u 10001 appuser

COPY disha/brain/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY disha/__init__.py /app/disha/__init__.py
COPY disha/brain /app/disha/brain

RUN mkdir -p /data && chown -R appuser:appuser /data

USER appuser

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/v1/health').read(); print('ok')" || exit 1
CMD ["uvicorn", "disha.brain:app", "--host", "0.0.0.0", "--port", "8080"]
