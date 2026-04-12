FROM python:3.11-slim

WORKDIR /model

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY train.py inference.py ./

RUN adduser -D appuser
USER appuser

CMD ["python", "train.py"]
