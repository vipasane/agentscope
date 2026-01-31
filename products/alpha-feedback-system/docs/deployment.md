# Deployment Guide - Alpha Feedback System

## Overview

This guide covers deploying the Alpha Feedback System to production.

## Prerequisites

- Python 3.11+
- PostgreSQL 15+ (optional, for persistence)
- Redis 7+ (optional, for caching)
- 4GB+ RAM recommended
- GPU optional (for faster ML inference)

---

## Local Development

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/alpha-feedback-system
cd alpha-feedback-system

# Install dependencies
poetry install

# Or with pip
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example environment
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 3. Download ML Models

```bash
# Models will download automatically on first run
# To pre-download:
python -c "
from src.analytics.sentiment import SentimentAnalyzer
from src.analytics.classifier import CategoryClassifier
from src.analytics.embeddings import EmbeddingsGenerator

SentimentAnalyzer()
CategoryClassifier()
EmbeddingsGenerator()
"
```

### 4. Run Development Server

```bash
# Start with uvicorn
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000

# Or with poetry
poetry run uvicorn src.api.main:app --reload
```

### 5. Run Tests

```bash
# Run all tests
pytest

# With coverage
pytest --cov=src --cov-report=html

# Specific test file
pytest tests/domain/test_feedback.py -v
```

---

## Docker Deployment

### Build Image

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml poetry.lock ./
RUN pip install poetry && \
    poetry config virtualenvs.create false && \
    poetry install --no-dev

# Copy application
COPY src ./src
COPY .env.example .env

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - VECTOR_STORE_PATH=/data/vector_store
    volumes:
      - ./data:/data
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: feedback_db
      POSTGRES_USER: feedback_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  redis_data:
  postgres_data:
```

### Build and Run

```bash
# Build
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

---

## Production Deployment

### AWS Deployment

#### Using ECS (Elastic Container Service)

```bash
# 1. Build and push Docker image
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

docker build -t alpha-feedback-system .
docker tag alpha-feedback-system:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/alpha-feedback-system:latest

docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/alpha-feedback-system:latest

# 2. Create ECS task definition
# See ecs-task-definition.json

# 3. Create ECS service
aws ecs create-service \
  --cluster production \
  --service-name alpha-feedback-api \
  --task-definition alpha-feedback-task \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-abc123],securityGroups=[sg-xyz789]}"
```

#### Using Lambda + API Gateway

```bash
# 1. Package application
pip install -r requirements.txt -t package/
cp -r src package/
cd package && zip -r ../deployment.zip .

# 2. Create Lambda function
aws lambda create-function \
  --function-name alpha-feedback-api \
  --runtime python3.11 \
  --role arn:aws:iam::123456789012:role/lambda-execution \
  --handler src.api.lambda_handler.handler \
  --zip-file fileb://deployment.zip \
  --timeout 30 \
  --memory-size 1024

# 3. Create API Gateway
# Configure via AWS Console or CloudFormation
```

### Google Cloud Platform

```bash
# 1. Build and push to GCR
gcloud builds submit --tag gcr.io/project-id/alpha-feedback-system

# 2. Deploy to Cloud Run
gcloud run deploy alpha-feedback-api \
  --image gcr.io/project-id/alpha-feedback-system \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2
```

### Kubernetes

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alpha-feedback-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: alpha-feedback-api
  template:
    metadata:
      labels:
        app: alpha-feedback-api
    spec:
      containers:
      - name: api
        image: your-registry/alpha-feedback-system:latest
        ports:
        - containerPort: 8000
        env:
        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: feedback-secrets
              key: github-token
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: alpha-feedback-api
spec:
  selector:
    app: alpha-feedback-api
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

```bash
# Deploy to Kubernetes
kubectl apply -f kubernetes/deployment.yaml

# Check status
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/alpha-feedback-api
```

---

## Configuration

### Environment Variables

```bash
# Required
GITHUB_TOKEN="ghp_xxxxxxxxxxxxx"
GITHUB_OWNER="your-org"

# Optional (with defaults)
SENTIMENT_MODEL="distilbert-base-uncased-finetuned-sst-2-english"
CLASSIFIER_MODEL="facebook/bart-large-mnli"
EMBEDDINGS_MODEL="sentence-transformers/all-mpnet-base-v2"

VECTOR_STORE_PATH="/data/vector_store"
HNSW_M=16
HNSW_EF_CONSTRUCTION=200
HNSW_EF_SEARCH=50

RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_GLOBAL=1000
```

### Secrets Management

#### AWS Secrets Manager

```python
import boto3
import json

def get_secret(secret_name):
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

secrets = get_secret('alpha-feedback/prod')
GITHUB_TOKEN = secrets['github_token']
```

#### Kubernetes Secrets

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: feedback-secrets
type: Opaque
stringData:
  github-token: ghp_xxxxxxxxxxxxx
  github-webhook-secret: your_secret_here
```

---

## Monitoring & Logging

### Prometheus Metrics

```python
# Add to src/api/main.py
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI(...)

Instrumentator().instrument(app).expose(app)
```

### CloudWatch Logs (AWS)

```python
import watchtower
import logging

logger = logging.getLogger(__name__)
logger.addHandler(watchtower.CloudWatchLogHandler())
```

### Grafana Dashboard

Import dashboard from `monitoring/grafana-dashboard.json`

Key metrics:
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- HNSW search latency
- Classification accuracy

---

## Scaling

### Horizontal Scaling

```bash
# Docker Swarm
docker service scale alpha-feedback-api=5

# Kubernetes
kubectl scale deployment alpha-feedback-api --replicas=5

# ECS
aws ecs update-service \
  --cluster production \
  --service alpha-feedback-api \
  --desired-count 5
```

### Auto-Scaling

#### Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: alpha-feedback-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: alpha-feedback-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Backup & Recovery

### Vector Store Backup

```bash
# Backup HNSW index
tar -czf vector_store_backup_$(date +%Y%m%d).tar.gz data/vector_store/

# Upload to S3
aws s3 cp vector_store_backup_*.tar.gz s3://your-backup-bucket/

# Restore
aws s3 cp s3://your-backup-bucket/vector_store_backup_20260130.tar.gz .
tar -xzf vector_store_backup_20260130.tar.gz
```

### Database Backup

```bash
# PostgreSQL
pg_dump feedback_db > backup_$(date +%Y%m%d).sql

# Restore
psql feedback_db < backup_20260130.sql
```

---

## Performance Optimization

### ML Model Caching

```python
# Use ONNX runtime for faster inference
pip install onnxruntime transformers[onnx]

# Convert model to ONNX
from transformers import AutoModel
model = AutoModel.from_pretrained("distilbert-base-uncased")
model.save_pretrained("./models/distilbert", export=True)
```

### Redis Caching

```python
from redis import asyncio as aioredis

redis = await aioredis.from_url("redis://localhost")

# Cache embeddings
await redis.setex(f"emb:{feedback_id}", 3600, pickle.dumps(embeddings))

# Retrieve
cached = await redis.get(f"emb:{feedback_id}")
if cached:
    embeddings = pickle.loads(cached)
```

---

## Security Checklist

- [ ] HTTPS enabled (TLS 1.3)
- [ ] API keys rotated regularly
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] PII detection active
- [ ] Webhook signatures verified
- [ ] CORS properly configured
- [ ] Secrets in secure storage
- [ ] Logs sanitized (no PII)
- [ ] Security headers set
- [ ] Dependencies updated
- [ ] Vulnerability scanning enabled

---

## Support

- Documentation: https://docs.yourapp.com
- Issues: https://github.com/your-org/feedback-system/issues
- On-call: ops@yourapp.com
