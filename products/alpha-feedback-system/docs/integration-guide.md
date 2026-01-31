# Integration Guide - Alpha Feedback System

## Overview

This guide shows how to integrate the Alpha Feedback System into your applications.

## Table of Contents

1. [In-App SDK](#in-app-sdk)
2. [GitHub Integration](#github-integration)
3. [npm Integration](#npm-integration)
4. [Discord Integration](#discord-integration)
5. [API Integration](#api-integration)

---

## In-App SDK

### JavaScript/TypeScript

```typescript
// Install
// npm install @your-org/feedback-sdk

import { FeedbackClient } from '@your-org/feedback-sdk';

const client = new FeedbackClient({
  apiUrl: 'https://api.yourapp.com',
  apiKey: 'your-api-key'
});

// Submit feedback
await client.submitFeedback({
  content: 'Great feature, but needs dark mode!',
  metadata: {
    version: '1.0.0',
    platform: navigator.platform,
    userAgent: navigator.userAgent
  }
});

// With consent management
const consent = await client.requestConsent({
  purposes: ['feedback-collection', 'analytics']
});

if (consent.accepted) {
  await client.submitFeedback({ ... });
}
```

### React Widget

```jsx
import { FeedbackWidget } from '@your-org/feedback-sdk/react';

function App() {
  return (
    <>
      <YourApp />
      <FeedbackWidget
        apiUrl="https://api.yourapp.com"
        apiKey="your-api-key"
        position="bottom-right"
        gdprCompliant={true}
      />
    </>
  );
}
```

---

## GitHub Integration

### Setup Webhook

1. Go to your repository Settings > Webhooks
2. Add webhook:
   - **Payload URL**: `https://your-api.com/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: Your webhook secret
   - **Events**: Issues, Issue comments, Discussions

### Add Feedback Label

Create labels in your repository:
- `alpha-feedback`
- `user-feedback`

Issues/discussions with these labels will be automatically collected.

### Example Issue

```markdown
## Title: Authentication bug in v1.0.0

**Labels**: alpha-feedback, bug

### Description
Found an issue with the login flow when using OAuth...

### Environment
- Version: 1.0.0
- Platform: Linux
- Browser: Chrome 120
```

---

## npm Integration

### Track Download Metrics

The system automatically tracks npm download statistics. Configure in your settings:

```python
NPM_PACKAGES = ["@your-org/package1", "@your-org/package2"]
NPM_TRACKING_INTERVAL = 3600  # 1 hour
NPM_SPIKE_THRESHOLD = 1000  # Trigger feedback for >1000 change
```

### Custom npm Feedback

Submit feedback based on npm events:

```typescript
import { NpmIntegration } from './src/integrations/npm';

const npm = new NpmIntegration();

// Fetch downloads
const downloads = await npm.fetch_downloads(
  '@your-org/package',
  new Date('2026-01-01'),
  new Date('2026-01-30')
);

// Transform to feedback
const feedbackItems = npm.transform_downloads_to_feedback(downloads, 1000);

// Submit to API
for (const item of feedbackItems) {
  await fetch('https://your-api.com/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
}
```

---

## Discord Integration

### Create Discord Bot

1. Create bot at https://discord.com/developers/applications
2. Add bot to your server
3. Configure webhook URL

### Bot Commands

```
!feedback <message>
Example: !feedback Love the new feature but needs more docs
```

### Webhook Configuration

```typescript
// Discord webhook handler
app.post('/webhooks/discord', async (req, res) => {
  const { content, author, channel } = req.body;

  await submitFeedback({
    content,
    source: 'discord',
    user_id: author.id,
    metadata: {
      channel: channel.name,
      server: channel.guild_id
    }
  });

  res.json({ success: true });
});
```

---

## API Integration

### Direct HTTP Requests

```bash
# Submit feedback
curl -X POST https://your-api.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Found a performance issue",
    "source": "in-app",
    "user_id": "user123",
    "metadata": {
      "version": "1.0.0",
      "platform": "linux"
    }
  }'

# Get similar feedback
curl https://your-api.com/api/feedback/{id}/similar?limit=10

# Export user data (GDPR)
curl https://your-api.com/api/data/export?user_id=user123
```

### Python SDK

```python
import httpx

class FeedbackClient:
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url
        self.api_key = api_key
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {api_key}"}
        )

    async def submit_feedback(self, content: str, **kwargs):
        response = await self.client.post(
            f"{self.api_url}/api/feedback",
            json={"content": content, **kwargs}
        )
        return response.json()

    async def get_analytics(self):
        response = await self.client.get(
            f"{self.api_url}/api/analytics/dashboard"
        )
        return response.json()

# Usage
client = FeedbackClient("https://your-api.com", "your-api-key")
await client.submit_feedback("Great feature!")
```

---

## GDPR Compliance

### Consent Management

```typescript
// Request consent
const consent = await fetch('https://your-api.com/api/consent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user123',
    purpose: 'analytics'
  })
});

// Revoke consent
await fetch('https://your-api.com/api/consent/analytics?user_id=user123', {
  method: 'DELETE'
});

// Export data
const data = await fetch(
  'https://your-api.com/api/data/export?user_id=user123'
);

// Request deletion
await fetch('https://your-api.com/api/data?user_id=user123', {
  method: 'DELETE'
});
```

### Privacy by Design

```typescript
// Anonymous user IDs
const anonymousId = crypto
  .createHash('sha256')
  .update(rawUserId)
  .digest('hex');

// No PII in feedback content
const sanitized = sanitizeContent(rawContent);

// Minimal metadata
const metadata = {
  version: packageJson.version,
  platform: process.platform,
  // NO: email, name, ip, location
};
```

---

## Testing

### Test Feedback Submission

```bash
# Test endpoint
curl -X POST https://your-api.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"content": "Test feedback", "source": "test"}'
```

### Verify HNSW Search

```bash
# Submit 3+ similar feedback items
# Then search for similar
curl https://your-api.com/api/feedback/{id}/similar?limit=10
# Should return similar items in <100ms
```

### Load Testing

```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 \
  https://your-api.com/api/feedback
```

---

## Monitoring

### Health Checks

```bash
# Check system health
curl https://your-api.com/health

# Expected response:
{
  "status": "healthy",
  "components": {
    "api": "healthy",
    "vector_store": "healthy",
    "analytics": "healthy"
  }
}
```

### Metrics

Monitor these metrics:
- **Latency**: p50, p95, p99 for all endpoints
- **Throughput**: Requests per second
- **Error Rate**: 4xx and 5xx responses
- **HNSW Search**: Query latency (<100ms target)
- **Classification Accuracy**: >85% target

---

## Support

- Documentation: https://docs.yourapp.com
- Issues: https://github.com/your-org/feedback-system/issues
- Email: support@yourapp.com
