# API Specifications - Alpha Feedback System

## Overview

RESTful API with OpenAPI 3.1 specification for the Alpha Testing Feedback System.

## Base URL

```
Production: https://api.alpha-feedback.example.com/v1
Staging: https://api-staging.alpha-feedback.example.com/v1
Development: http://localhost:3000/v1
```

## Authentication

### GitHub OAuth

```http
GET /auth/github
→ Redirects to GitHub authorization

GET /auth/github/callback?code=xxx
→ Returns access token

Response:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "user": {
    "id": "usr_01HQRW7ZJXKQG9...",
    "githubLogin": "alice",
    "name": "Alice Smith"
  }
}
```

### API Token

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Endpoints

### 1. Feedback Collection

#### Submit Feedback

```http
POST /feedback
Content-Type: application/json
Authorization: Bearer {token}

Request:
{
  "content": "The new CLI is much faster than v2!",
  "source": "in-app",
  "metadata": {
    "version": "3.0.0-alpha.1",
    "platform": "linux",
    "userAgent": "Mozilla/5.0..."
  }
}

Response: 201 Created
{
  "id": "fb_01HQRW8JKXQG9...",
  "status": "pending",
  "createdAt": "2026-01-30T12:34:56Z",
  "estimatedProcessingTime": 5000
}
```

#### Get Feedback

```http
GET /feedback/{id}
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "fb_01HQRW8JKXQG9...",
  "content": "The new CLI is much faster than v2!",
  "category": "performance",
  "sentiment": {
    "label": "positive",
    "score": 0.92
  },
  "source": "in-app",
  "submittedAt": "2026-01-30T12:34:56Z",
  "processedAt": "2026-01-30T12:35:01Z",
  "status": "processed",
  "relatedPatterns": ["pat_01HQRX...", "pat_01HQRY..."]
}
```

#### List Feedback

```http
GET /feedback?source=github&category=bug&limit=20&offset=0
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [
    {
      "id": "fb_01HQRW8JKXQG9...",
      "content": "Memory leak in swarm coordination...",
      "category": "bug",
      "sentiment": { "label": "negative", "score": 0.85 },
      "submittedAt": "2026-01-30T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### 2. Analytics

#### Dashboard Metrics

```http
GET /analytics/dashboard
Authorization: Bearer {token}

Response: 200 OK
{
  "timeSeries": {
    "granularity": "day",
    "data": [
      {
        "date": "2026-01-29",
        "totalFeedback": 45,
        "byCategory": {
          "bug": 12,
          "feature": 20,
          "performance": 8,
          "ux": 5
        },
        "bySentiment": {
          "positive": 25,
          "neutral": 10,
          "negative": 10
        }
      }
    ]
  },
  "topIssues": [
    {
      "pattern": "Memory leak in swarm coordination",
      "frequency": 8,
      "severity": "high",
      "affectedUsers": 6,
      "trend": "increasing"
    }
  ],
  "summary": {
    "totalFeedback": 1234,
    "averageSentiment": 0.72,
    "topCategory": "feature",
    "responseRate": 0.85
  }
}
```

#### Similar Feedback

```http
GET /feedback/{id}/similar?limit=10
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [
    {
      "id": "fb_01HQRW9KXQG9...",
      "content": "Also seeing memory issues...",
      "similarity": 0.89,
      "category": "bug",
      "submittedAt": "2026-01-29T15:00:00Z"
    }
  ],
  "searchTime": 23 // milliseconds (HNSW search)
}
```

#### Search Feedback

```http
GET /feedback/search?q=memory+leak&filters[category]=bug
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [...],
  "total": 8,
  "searchTime": 45
}
```

### 3. Patterns

#### List Patterns

```http
GET /patterns?severity=high&limit=10
Authorization: Bearer {token}

Response: 200 OK
{
  "data": [
    {
      "id": "pat_01HQRX...",
      "pattern": "Memory leak in swarm coordination",
      "frequency": 8,
      "severity": "high",
      "category": "bug",
      "detectedAt": "2026-01-28T10:00:00Z",
      "relatedFeedback": ["fb_01HQRW...", "fb_01HQRX..."],
      "predictions": [
        {
          "likelyIssue": "Increased crash reports",
          "probability": 0.73,
          "suggestedAction": "Prioritize for next sprint"
        }
      ]
    }
  ]
}
```

### 4. Predictions

#### Get Predictions

```http
GET /predictions?horizon=week
Authorization: Bearer {token}

Response: 200 OK
{
  "predictions": [
    {
      "issue": "Performance degradation in v3.0.0-alpha.2",
      "probability": 0.68,
      "severity": "medium",
      "confidence": 0.82,
      "basedOn": [
        "Increasing performance complaints",
        "Similar issues in v2 releases"
      ],
      "suggestedActions": [
        "Run performance benchmarks before release",
        "Review recent performance PRs"
      ]
    }
  ],
  "modelVersion": "3.2.1",
  "generatedAt": "2026-01-30T12:00:00Z"
}
```

### 5. Reports

#### Generate Weekly Report

```http
POST /reports/weekly
Authorization: Bearer {token}

Request:
{
  "weekOf": "2026-01-27",
  "format": "pdf",
  "recipients": ["team@example.com"]
}

Response: 202 Accepted
{
  "reportId": "rep_01HQRY...",
  "status": "generating",
  "estimatedTime": 60 // seconds
}
```

#### Get Report

```http
GET /reports/{id}
Authorization: Bearer {token}

Response: 200 OK
{
  "id": "rep_01HQRY...",
  "status": "completed",
  "format": "pdf",
  "downloadUrl": "https://cdn.example.com/reports/...",
  "generatedAt": "2026-01-30T13:00:00Z",
  "summary": {
    "period": "2026-01-20 to 2026-01-27",
    "totalFeedback": 156,
    "topCategory": "feature",
    "sentiment": "positive",
    "criticalIssues": 2
  }
}
```

### 6. Privacy (GDPR)

#### Export User Data

```http
GET /privacy/export
Authorization: Bearer {token}

Response: 200 OK
{
  "exportId": "exp_01HQRZ...",
  "status": "ready",
  "downloadUrl": "https://cdn.example.com/exports/...",
  "format": "json",
  "expiresAt": "2026-02-06T12:00:00Z"
}
```

#### Delete User Data

```http
DELETE /privacy/data
Authorization: Bearer {token}

Response: 202 Accepted
{
  "requestId": "del_01HQS0...",
  "status": "scheduled",
  "gracePeriod": 30, // days
  "permanentDeletionDate": "2026-03-01T00:00:00Z"
}
```

#### Manage Consent

```http
GET /privacy/consent
Authorization: Bearer {token}

Response: 200 OK
{
  "consents": {
    "feedback-collection": {
      "granted": true,
      "grantedAt": "2026-01-15T10:00:00Z",
      "expiresAt": "2028-01-15T10:00:00Z"
    },
    "analytics": {
      "granted": true,
      "grantedAt": "2026-01-15T10:00:00Z"
    },
    "communication": {
      "granted": false
    }
  }
}

PUT /privacy/consent
Authorization: Bearer {token}

Request:
{
  "analytics": false
}

Response: 200 OK
{
  "consents": {
    "analytics": {
      "granted": false,
      "revokedAt": "2026-01-30T14:00:00Z"
    }
  }
}
```

### 7. Webhooks

#### GitHub Webhook

```http
POST /webhooks/github
X-Hub-Signature-256: sha256=...
X-GitHub-Event: issues

Request:
{
  "action": "opened",
  "issue": {
    "id": 123456,
    "title": "Memory leak in swarm",
    "body": "When running hierarchical-mesh...",
    "labels": [{"name": "alpha-feedback"}]
  }
}

Response: 200 OK
{
  "received": true,
  "feedbackId": "fb_01HQS1..."
}
```

#### Discord Webhook

```http
POST /webhooks/discord
X-Signature-Ed25519: ...
X-Signature-Timestamp: ...

Request:
{
  "type": 1,
  "data": {
    "name": "feedback",
    "options": [
      {
        "name": "message",
        "value": "Great alpha release!"
      }
    ]
  }
}

Response: 200 OK
{
  "type": 4,
  "data": {
    "content": "Thanks for your feedback! We've recorded it."
  }
}
```

## Error Responses

### Standard Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Content exceeds maximum length",
    "details": {
      "field": "content",
      "maxLength": 10000,
      "actualLength": 15000
    },
    "requestId": "req_01HQS2..."
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary outage |

## Rate Limiting

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1706623200
```

| Endpoint | Limit |
|----------|-------|
| `POST /feedback` | 100/min per user |
| `GET /feedback/*` | 1000/min per user |
| `GET /analytics/*` | 500/min per user |
| `GET /feedback/search` | 50/min per user |

## Pagination

```http
GET /feedback?limit=20&offset=40

Response:
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasMore": true,
    "nextOffset": 60
  }
}
```

## Webhooks (Outbound)

Register webhook URLs to receive events:

```http
POST /webhooks/register
Authorization: Bearer {token}

Request:
{
  "url": "https://your-app.com/webhooks",
  "events": ["feedback.submitted", "pattern.detected"],
  "secret": "your-webhook-secret"
}

Response: 201 Created
{
  "webhookId": "wh_01HQS3...",
  "url": "https://your-app.com/webhooks",
  "events": ["feedback.submitted", "pattern.detected"],
  "active": true
}
```

### Event Payloads

```json
// feedback.submitted
{
  "event": "feedback.submitted",
  "timestamp": "2026-01-30T15:00:00Z",
  "data": {
    "id": "fb_01HQS4...",
    "category": "bug",
    "sentiment": "negative",
    "source": "github"
  }
}

// pattern.detected
{
  "event": "pattern.detected",
  "timestamp": "2026-01-30T15:05:00Z",
  "data": {
    "patternId": "pat_01HQS5...",
    "pattern": "Memory leak in swarm",
    "frequency": 8,
    "severity": "high"
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { AlphaFeedbackClient } from '@alpha-feedback/sdk';

const client = new AlphaFeedbackClient({
  apiKey: process.env.ALPHA_FEEDBACK_API_KEY
});

// Submit feedback
const feedback = await client.feedback.submit({
  content: 'Great alpha release!',
  source: 'in-app',
  metadata: {
    version: '3.0.0-alpha.1',
    platform: 'linux'
  }
});

// Get similar feedback
const similar = await client.feedback.findSimilar(feedback.id, {
  limit: 10
});

// Get dashboard metrics
const metrics = await client.analytics.getDashboard();
```

### Python

```python
from alpha_feedback import Client

client = Client(api_key=os.environ['ALPHA_FEEDBACK_API_KEY'])

# Submit feedback
feedback = client.feedback.submit(
    content='Great alpha release!',
    source='in-app',
    metadata={
        'version': '3.0.0-alpha.1',
        'platform': 'linux'
    }
)

# Get dashboard
dashboard = client.analytics.get_dashboard()
```

---

**Version**: 1.0 | **Date**: 2026-01-30
