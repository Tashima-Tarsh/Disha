FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir psutil httpx

COPY . .

CMD ["python", "agent.py"]
