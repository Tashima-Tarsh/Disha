FROM python:3.11-slim

WORKDIR /app

COPY sim_response.py .

RUN groupadd -r appuser && useradd -r -g appuser -m appuser
USER appuser

CMD ["python", "sim_response.py"]
