FROM python:3.11-slim

WORKDIR /app

COPY sim_response.py .

RUN adduser -D appuser
USER appuser

CMD ["python", "sim_response.py"]
