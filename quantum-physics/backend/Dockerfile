FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install a lean subset: skip heavy optional deps (qiskit, pennylane, astropy)
# that are tried at runtime; install only the essentials for production
RUN pip install --no-cache-dir \
    fastapi==0.115.0 \
    "uvicorn[standard]==0.30.0" \
    pydantic==2.9.0 \
    pydantic-settings==2.5.0 \
    httpx==0.27.0 \
    numpy==1.26.4 \
    scikit-learn==1.5.0 \
    python-dotenv==1.0.1 \
    structlog==24.4.0

COPY . .

EXPOSE 8002

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]
