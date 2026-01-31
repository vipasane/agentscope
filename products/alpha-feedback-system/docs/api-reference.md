# API Reference - Alpha Feedback System

## Base URL

```
http://localhost:8000
```

## Authentication

Currently using API key authentication. Include in headers:

```
Authorization: Bearer <your-api-key>
```

## Endpoints

### Health Check

#### GET /health

Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-01-30T22:00:00Z",
  "components": {
    "api": "healthy",
    "vector_store": "healthy",
    "analytics": "healthy"
  }
}
```

---

### Feedback Endpoints

#### POST /api/feedback

Submit new feedback.

**Request Body:**
```json
{
  "content": "Found a bug in the authentication flow",
  "source": "github",
  "user_id": "user123",
  "metadata": {
    "version": "1.0.0",
    "platform": "linux"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "01HN8X7Z9C2M5YPQR4TGBJKFXW",
  "content": "Found a bug in the authentication flow",
  "category": "bug",
  "sentiment": {
    "label": "negative",
    "score": 0.85
  },
  "source": "github",
  "status": "processed",
  "submitted_at": "2026-01-30T22:00:00Z",
  "updated_at": "2026-01-30T22:00:00Z",
  "related_patterns": []
}
```

#### GET /api/feedback/{id}

Get feedback by ID.

**Response:** `200 OK`

#### GET /api/feedback

List all feedback with pagination.

**Query Parameters:**
- `skip` (int, default=0): Number of items to skip
- `limit` (int, default=100, max=1000): Number of items to return
- `category` (string, optional): Filter by category

**Response:** `200 OK`
```json
{
  "items": [...],
  "total": 150,
  "skip": 0,
  "limit": 100
}
```

#### GET /api/feedback/{id}/similar

Find similar feedback using HNSW vector search (150x faster).

**Query Parameters:**
- `limit` (int, default=10, max=100): Number of similar items

**Response:** `200 OK`

---

### Pattern Endpoints

#### GET /api/patterns

List all detected patterns.

**Query Parameters:**
- `skip` (int, default=0)
- `limit` (int, default=100, max=1000)

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "01HN8XA2B3C4D5E6F7G8H9J0K1",
      "pattern": {
        "category": "bug",
        "keywords": ["auth", "login", "token"],
        "avg_sentiment_score": 0.25
      },
      "frequency": 45,
      "severity": "high",
      "priority": 2,
      "related_feedback": [...],
      "detected_at": "2026-01-28T10:00:00Z",
      "updated_at": "2026-01-30T22:00:00Z"
    }
  ],
  "total": 12,
  "skip": 0,
  "limit": 100
}
```

#### GET /api/patterns/{id}

Get pattern details by ID.

**Response:** `200 OK`

---

### GDPR Compliance Endpoints

#### POST /api/consent

Give consent for data processing.

**Request Body:**
```json
{
  "user_id": "user123",
  "purpose": "analytics"
}
```

**Available purposes:**
- `feedback-collection`
- `analytics`
- `communication`

**Response:** `200 OK`
```json
{
  "status": "success",
  "message": "Consent given"
}
```

#### DELETE /api/consent/{purpose}

Revoke consent for a specific purpose.

**Query Parameters:**
- `user_id` (string, required)

**Response:** `200 OK`

#### GET /api/data/export

Export all user data (GDPR Right to Access).

**Query Parameters:**
- `user_id` (string, required)

**Response:** `200 OK`
```json
{
  "user_id": "user123",
  "feedback": [...],
  "consents": {...},
  "exported_at": "2026-01-30T22:00:00Z"
}
```

#### DELETE /api/data

Request data deletion (GDPR Right to Erasure).

**Query Parameters:**
- `user_id` (string, required)

**Response:** `200 OK`
```json
{
  "user_id": "user123",
  "status": "scheduled",
  "scheduled_deletion": "2026-02-29T22:00:00Z"
}
```

---

### Analytics Endpoints

#### GET /api/analytics/dashboard

Get dashboard analytics.

**Response:** `200 OK`
```json
{
  "total_feedback": 1250,
  "total_patterns": 24,
  "time_series": [...],
  "top_issues": [
    {
      "category": "bug",
      "count": 340,
      "avg_sentiment": 0.35,
      "severity": "high"
    }
  ],
  "sentiment_distribution": {
    "positive": 450,
    "neutral": 320,
    "negative": 480,
    "avg_score": 0.48
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid request format"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "detail": "Rate limit exceeded. Try again in 60 seconds."
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limits

- **Per User**: 100 requests/minute
- **Global**: 1000 requests/minute

Rate limit headers included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1738275600
```

---

## Webhook Endpoints

### POST /webhooks/github

GitHub webhook endpoint for issues and discussions.

**Headers:**
- `X-Hub-Signature-256`: HMAC signature for verification

**Payload:** GitHub webhook payload (see GitHub docs)

### POST /webhooks/discord

Discord webhook endpoint for feedback.

**Payload:** Discord webhook payload

---

## OpenAPI Documentation

Interactive API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
