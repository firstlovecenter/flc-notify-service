# FLC Notify Service - Usage Guide

This guide will help you integrate and use the FLC Notify Service in your applications.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Sending SMS Messages](#sending-sms-messages)
- [Sending Emails](#sending-emails)
- [Error Handling](#error-handling)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

Before using the FLC Notify Service, you'll need:

1. **API Key**: Contact your system administrator to obtain your `FLC_NOTIFY_KEY`
2. **Service URL**: The base URL for the notification service (e.g., `https://your-api-url.amazonaws.com/`)

### Quick Start

The FLC Notify Service provides a RESTful API with two main endpoints:

- **POST** `/send-sms` - Send SMS messages
- **POST** `/send-email` - Send email messages
- **GET** `/` - Health check endpoint

## Authentication

All API requests (except the health check) require authentication using the `x-secret-key` header.

**Header Format:**

```
x-secret-key: YOUR_FLC_NOTIFY_KEY
```

**Security Note:** Never expose your API key in client-side code or commit it to version control. Always store it securely as an environment variable.

## Sending SMS Messages

### Endpoint

```
POST /send-sms
```

### Request Headers

```
Content-Type: application/json
x-secret-key: YOUR_FLC_NOTIFY_KEY
```

### Request Body Parameters

| Parameter   | Type               | Required | Description                                                                |
| ----------- | ------------------ | -------- | -------------------------------------------------------------------------- |
| `recipient` | string or string[] | Yes      | Phone number(s) to send SMS to. Can be a single number or array of numbers |
| `message`   | string             | Yes      | The SMS message content                                                    |
| `sender`    | string             | No       | Sender name (defaults to "FLC Admin")                                      |

### Example Request

**Single Recipient:**

```json
{
  "recipient": "+233244000000",
  "message": "Your verification code is 123456",
  "sender": "MyApp"
}
```

**Multiple Recipients:**

```json
{
  "recipient": ["+233244000000", "+233201234567"],
  "message": "Meeting reminder: Team standup at 10 AM",
  "sender": "FLC Events"
}
```

### Response

**Success (200 OK):**

```json
{
  "success": true,
  "message": "SMS sent successfully",
  "data": {
    "code": "2000"
    // Additional provider response data
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing required fields

  ```json
  {
    "success": false,
    "error": "Validation error",
    "message": "Missing recipient field"
  }
  ```

- **403 Forbidden** - Invalid or missing API key

  ```json
  {
    "success": false,
    "error": "Unauthorized access",
    "message": "Invalid or missing API key"
  }
  ```

- **502 Bad Gateway** - SMS provider error
  ```json
  {
    "success": false,
    "error": "SMS provider error",
    "message": "Failed to send SMS: [error details]"
  }
  ```

## Sending Emails

### Endpoint

```
POST /send-email
```

### Request Headers

```
Content-Type: application/json
x-secret-key: YOUR_FLC_NOTIFY_KEY
```

### Request Body Parameters

| Parameter | Type               | Required | Description                                    |
| --------- | ------------------ | -------- | ---------------------------------------------- |
| `from`    | string             | Yes      | Sender email address (must be verified domain) |
| `to`      | string or string[] | Yes      | Recipient email address(es)                    |
| `subject` | string             | Yes      | Email subject line                             |
| `text`    | string             | No\*     | Plain text email body                          |
| `html`    | string             | No\*     | HTML email body                                |
| `replyTo` | string             | No       | Reply-to email address                         |

**Note:\*** You must provide either `text` or `html` (or both)

### Example Requests

**Simple Text Email:**

```json
{
  "from": "no-reply@firstlovecenter.com",
  "to": "user@example.com",
  "subject": "Welcome to FLC!",
  "text": "Thank you for joining First Love Center. We're excited to have you!"
}
```

**HTML Email:**

```json
{
  "from": "FL Accra Admin<no-reply@updates.firstlovecenter.com>",
  "to": "user@example.com",
  "subject": "Your Weekly Update",
  "html": "<h1>Welcome!</h1><p>Here's your weekly update...</p>",
  "text": "Welcome! Here's your weekly update...",
  "replyTo": "support@firstlovecenter.com"
}
```

**Multiple Recipients:**

```json
{
  "from": "events@firstlovecenter.com",
  "to": ["user1@example.com", "user2@example.com"],
  "subject": "Event Reminder",
  "html": "<h2>Upcoming Event</h2><p>Don't forget our meeting tomorrow!</p>"
}
```

### Response

**Success (200 OK):**

```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "id": "unique-email-id-from-provider"
  }
}
```

**Error Responses:**

- **400 Bad Request** - Missing required fields

  ```json
  {
    "success": false,
    "error": "Validation error",
    "message": "Missing from field"
  }
  ```

- **403 Forbidden** - Invalid or missing API key

  ```json
  {
    "success": false,
    "error": "Unauthorized access",
    "message": "Invalid or missing API key"
  }
  ```

- **502 Bad Gateway** - Email provider error
  ```json
  {
    "success": false,
    "error": "Email provider error",
    "message": "Failed to send email"
  }
  ```

## Error Handling

The service uses standard HTTP status codes:

| Status Code | Meaning               | Action                                        |
| ----------- | --------------------- | --------------------------------------------- |
| 200         | Success               | Message sent successfully                     |
| 400         | Bad Request           | Check request body for missing/invalid fields |
| 403         | Forbidden             | Verify your API key is correct                |
| 404         | Not Found             | Check the endpoint URL                        |
| 500         | Internal Server Error | Contact support                               |
| 502         | Bad Gateway           | Provider error, retry or contact support      |

### Recommended Error Handling Strategy

1. **Validate input** before making the request
2. **Check HTTP status codes** in your response handler
3. **Log errors** for debugging
4. **Implement retry logic** for transient failures (502, 500)
5. **Handle validation errors** (400) by fixing the request
6. **Never retry** authentication errors (403)

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios')

const API_URL = 'https://your-api-url.amazonaws.com'
const API_KEY = process.env.FLC_NOTIFY_KEY

// Send SMS
async function sendSMS(recipient, message) {
  try {
    const response = await axios.post(
      `${API_URL}/send-sms`,
      {
        recipient: recipient,
        message: message,
        sender: 'MyApp',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': API_KEY,
        },
      }
    )

    console.log('SMS sent:', response.data)
    return response.data
  } catch (error) {
    console.error('Failed to send SMS:', error.response?.data || error.message)
    throw error
  }
}

// Send Email
async function sendEmail(to, subject, htmlContent) {
  try {
    const response = await axios.post(
      `${API_URL}/send-email`,
      {
        from: 'no-reply@firstlovecenter.com',
        to: to,
        subject: subject,
        html: htmlContent,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-secret-key': API_KEY,
        },
      }
    )

    console.log('Email sent:', response.data)
    return response.data
  } catch (error) {
    console.error(
      'Failed to send email:',
      error.response?.data || error.message
    )
    throw error
  }
}

// Usage
sendSMS('+233244000000', 'Hello from FLC!')
  .then((result) => console.log('Success:', result))
  .catch((err) => console.error('Error:', err))
```

### TypeScript

```typescript
import axios, { AxiosError } from 'axios'

interface SMSRequest {
  recipient: string | string[]
  message: string
  sender?: string
}

interface EmailRequest {
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
}

interface NotifyResponse {
  success: boolean
  message: string
  data?: any
  error?: string
}

class NotifyService {
  private apiUrl: string
  private apiKey: string

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl
    this.apiKey = apiKey
  }

  async sendSMS(params: SMSRequest): Promise<NotifyResponse> {
    try {
      const { data } = await axios.post<NotifyResponse>(
        `${this.apiUrl}/send-sms`,
        params,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-secret-key': this.apiKey,
          },
        }
      )
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to send SMS')
      }
      throw error
    }
  }

  async sendEmail(params: EmailRequest): Promise<NotifyResponse> {
    try {
      const { data } = await axios.post<NotifyResponse>(
        `${this.apiUrl}/send-email`,
        params,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-secret-key': this.apiKey,
          },
        }
      )
      return data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to send email')
      }
      throw error
    }
  }
}

// Usage
const notifyService = new NotifyService(
  process.env.API_URL!,
  process.env.FLC_NOTIFY_KEY!
)

// Send SMS
await notifyService.sendSMS({
  recipient: '+233244000000',
  message: 'Your order has been confirmed!',
  sender: 'FLC Shop',
})

// Send Email
await notifyService.sendEmail({
  from: 'orders@firstlovecenter.com',
  to: 'customer@example.com',
  subject: 'Order Confirmation',
  html: '<h1>Thank you for your order!</h1>',
})
```

### Python

```python
import requests
import os
from typing import Union, List, Optional

class NotifyService:
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url
        self.api_key = api_key
        self.headers = {
            'Content-Type': 'application/json',
            'x-secret-key': api_key
        }

    def send_sms(
        self,
        recipient: Union[str, List[str]],
        message: str,
        sender: Optional[str] = None
    ) -> dict:
        """Send an SMS message"""
        payload = {
            'recipient': recipient,
            'message': message
        }
        if sender:
            payload['sender'] = sender

        response = requests.post(
            f'{self.api_url}/send-sms',
            json=payload,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def send_email(
        self,
        from_email: str,
        to: Union[str, List[str]],
        subject: str,
        text: Optional[str] = None,
        html: Optional[str] = None,
        reply_to: Optional[str] = None
    ) -> dict:
        """Send an email"""
        payload = {
            'from': from_email,
            'to': to,
            'subject': subject
        }
        if text:
            payload['text'] = text
        if html:
            payload['html'] = html
        if reply_to:
            payload['replyTo'] = reply_to

        response = requests.post(
            f'{self.api_url}/send-email',
            json=payload,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
notify = NotifyService(
    api_url=os.getenv('API_URL'),
    api_key=os.getenv('FLC_NOTIFY_KEY')
)

# Send SMS
try:
    result = notify.send_sms(
        recipient='+233244000000',
        message='Hello from Python!',
        sender='MyApp'
    )
    print(f"SMS sent: {result}")
except requests.exceptions.HTTPError as e:
    print(f"Error: {e.response.json()}")
```

### cURL

```bash
# Send SMS
curl -X POST https://your-api-url.amazonaws.com/send-sms \
  -H "Content-Type: application/json" \
  -H "x-secret-key: YOUR_FLC_NOTIFY_KEY" \
  -d '{
    "recipient": "+233244000000",
    "message": "Test message from cURL",
    "sender": "TestApp"
  }'

# Send Email
curl -X POST https://your-api-url.amazonaws.com/send-email \
  -H "Content-Type: application/json" \
  -H "x-secret-key: YOUR_FLC_NOTIFY_KEY" \
  -d '{
    "from": "no-reply@firstlovecenter.com",
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello World</h1>",
    "text": "Hello World"
  }'

# Health Check
curl -X GET https://your-api-url.amazonaws.com/
```

## Best Practices

### 1. Environment Variables

Always store your API credentials in environment variables:

```javascript
// ✅ Good
const API_KEY = process.env.FLC_NOTIFY_KEY

// ❌ Bad - Never hardcode credentials
const API_KEY = 'your-secret-key-here'
```

### 2. Input Validation

Validate user input before sending to the API:

```javascript
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

function validatePhoneNumber(phone) {
  // Adjust regex based on your requirements
  const re = /^\+\d{10,15}$/
  return re.test(phone)
}
```

### 3. Error Handling

Implement comprehensive error handling:

```javascript
async function sendNotification(params) {
  try {
    const response = await notifyService.sendSMS(params)
    return { success: true, data: response }
  } catch (error) {
    if (error.response?.status === 403) {
      // Auth error - check API key
      console.error('Authentication failed')
    } else if (error.response?.status === 400) {
      // Validation error - check input
      console.error('Invalid request:', error.response.data.message)
    } else if (error.response?.status === 502) {
      // Provider error - might be temporary, can retry
      console.error('Provider error, retrying...')
      // Implement retry logic
    }
    return { success: false, error: error.message }
  }
}
```

### 4. Rate Limiting

Be mindful of rate limits. Implement queuing for bulk operations:

```javascript
async function sendBulkSMS(recipients, message) {
  const batchSize = 10
  const delay = 1000 // 1 second between batches

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    await notifyService.sendSMS({
      recipient: batch,
      message: message,
    })

    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}
```

### 5. Logging

Log important events for debugging and monitoring:

```javascript
function logNotification(type, recipient, status) {
  console.log({
    timestamp: new Date().toISOString(),
    type,
    recipient,
    status,
  })
}
```

### 6. Template Management

Use templates for consistent messaging:

```javascript
const EMAIL_TEMPLATES = {
  welcome: (name) => ({
    subject: `Welcome to FLC, ${name}!`,
    html: `<h1>Welcome ${name}!</h1><p>We're excited to have you...</p>`,
  }),
  passwordReset: (resetLink) => ({
    subject: 'Password Reset Request',
    html: `<p>Click here to reset your password: <a href="${resetLink}">Reset</a></p>`,
  }),
}
```

## Troubleshooting

### Common Issues

#### 1. Authentication Failed (403)

**Problem:** `Invalid or missing API key`

**Solutions:**

- Verify your API key is correct
- Check that the `x-secret-key` header is included
- Ensure there are no extra spaces in the header value

#### 2. Validation Error (400)

**Problem:** `Missing [field] field`

**Solutions:**

- Check all required fields are present
- Verify field names match exactly (case-sensitive)
- Ensure data types are correct (string vs array)

#### 3. SMS/Email Not Received

**Problem:** API returns success but message not received

**Solutions:**

- For SMS: Verify phone number format (include country code with +)
- For Email: Check spam/junk folders
- Verify the sender email is from a verified domain
- Check recipient address is correct

#### 4. Provider Error (502)

**Problem:** `SMS provider error` or `Email provider error`

**Solutions:**

- Retry the request after a short delay
- Check provider status (MNotify for SMS, Resend for email)
- Contact support if issue persists

#### 5. CORS Error

**Problem:** Request blocked by CORS policy (browser only)

**Solutions:**

- Ensure your domain is whitelisted
- Never call the API directly from browser - use a backend proxy
- Store API keys on the server, not in client-side code

### Getting Help

If you encounter issues not covered here:

1. Check the API response for detailed error messages
2. Review your request format against the examples
3. Check the service logs (if you have access)
4. Contact your system administrator or support team

## API Reference Summary

| Endpoint      | Method | Auth Required | Purpose            |
| ------------- | ------ | ------------- | ------------------ |
| `/`           | GET    | No            | Health check       |
| `/send-sms`   | POST   | Yes           | Send SMS message   |
| `/send-email` | POST   | Yes           | Send email message |

## Changelog

### Version 1.0.0

- Initial release
- SMS sending via MNotify
- Email sending via Resend
- API key authentication
- Comprehensive error handling
- Support for single and multiple recipients

---

**Need Help?** Contact the FLC development team or your system administrator.
