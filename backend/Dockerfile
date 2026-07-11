FROM python:3.10-slim

WORKDIR /app

# Install compiler tools and library packages required for Prophet and PostgreSQL compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code into a subfolder named 'backend' to match import structures
COPY . /app/backend

# Set PYTHONPATH environment variable so imports like 'from backend.app.xxx' resolve correctly
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
