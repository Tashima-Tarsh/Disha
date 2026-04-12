FROM python:3.11-slim

# Install build dependencies for OpenCanary
RUN apt-get update && apt-get install -y --no-install-recommends \
    libssl-dev \
    libffi-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install OpenCanary (https://github.com/thinkst/opencanary)
RUN pip install --no-cache-dir opencanary

# Create log directory
RUN mkdir -p /var/log/opencanary

# Copy OpenCanary configuration
COPY opencanary.conf /root/.opencanary.conf

# Expose honeypot service ports
# HTTP: 8080, FTP: 21, Git: 9418, Redis: 6379
EXPOSE 8080 21 9418 6379

# Run OpenCanary in dev (foreground) mode for Docker compatibility
RUN adduser -D opencanary
USER opencanary

CMD ["opencanaryd", "--dev"]
