# FLC Notify Service - Quick Start

Get up and running with the FLC Notify Service in minutes!

## 🚀 Quick Setup

### 1. Get Your API Key

Contact your system administrator to obtain:

- API Key (`FLC_NOTIFY_KEY`)
- Service URL

### 2. Make Your First Request

**Send an SMS:**

```bash
curl -X POST https://your-api-url.amazonaws.com/send-sms \
  -H "Content-Type: application/json" \
  -H "x-secret-key: YOUR_API_KEY" \
  -d '{
    "recipient": "+233244000000",
    "message": "Hello from FLC!"
  }'
```

**Send an Email:**

```bash
curl -X POST https://your-api-url.amazonaws.com/send-email \
  -H "Content-Type: application/json" \
  -H "x-secret-key: YOUR_API_KEY" \
  -d '{
    "from": "no-reply@firstlovecenter.com",
    "to": "user@example.com",
    "subject": "Welcome!",
    "html": "<h1>Welcome to FLC!</h1>"
  }'
```

## 📱 JavaScript Example

```javascript
const axios = require('axios')

const API_URL = 'https://your-api-url.amazonaws.com'
const API_KEY = process.env.FLC_NOTIFY_KEY

// Send SMS
async function sendSMS(phone, message) {
  const response = await axios.post(
    `${API_URL}/send-sms`,
    { recipient: phone, message },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': API_KEY,
      },
    }
  )
  return response.data
}

// Send Email
async function sendEmail(to, subject, html) {
  const response = await axios.post(
    `${API_URL}/send-email`,
    {
      from: 'no-reply@firstlovecenter.com',
      to,
      subject,
      html,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': API_KEY,
      },
    }
  )
  return response.data
}

// Usage
sendSMS('+233244000000', 'Test message')
  .then((res) => console.log('SMS sent:', res))
  .catch((err) => console.error('Error:', err.response?.data))
```

## 🐍 Python Example

```python
import requests
import os

API_URL = 'https://your-api-url.amazonaws.com'
API_KEY = os.getenv('FLC_NOTIFY_KEY')

def send_sms(recipient, message):
    response = requests.post(
        f'{API_URL}/send-sms',
        json={'recipient': recipient, 'message': message},
        headers={
            'Content-Type': 'application/json',
            'x-secret-key': API_KEY
        }
    )
    return response.json()

def send_email(to, subject, html):
    response = requests.post(
        f'{API_URL}/send-email',
        json={
            'from': 'no-reply@firstlovecenter.com',
            'to': to,
            'subject': subject,
            'html': html
        },
        headers={
            'Content-Type': 'application/json',
            'x-secret-key': API_KEY
        }
    )
    return response.json()

# Usage
result = send_sms('+233244000000', 'Test message')
print(result)
```

## ✅ Required Fields

### SMS

- ✓ `recipient` - Phone number with country code (+233...)
- ✓ `message` - Your SMS text
- ✓ `x-secret-key` header

### Email

- ✓ `from` - Sender email (verified domain)
- ✓ `to` - Recipient email
- ✓ `subject` - Email subject
- ✓ `html` or `text` - Email content
- ✓ `x-secret-key` header

## 🔒 Security Best Practices

```javascript
// ✅ DO: Store API key in environment variables
const apiKey = process.env.FLC_NOTIFY_KEY

// ❌ DON'T: Hardcode API key
const apiKey = 'sk_live_123456789'

// ✅ DO: Use from backend only
// ❌ DON'T: Call API from client-side JavaScript
```

## 📊 Response Codes

| Code | Meaning           | Action                   |
| ---- | ----------------- | ------------------------ |
| 200  | ✅ Success        | Message sent             |
| 400  | ❌ Bad Request    | Fix your request         |
| 403  | ❌ Unauthorized   | Check API key            |
| 502  | ⚠️ Provider Error | Retry or contact support |

## 🆘 Common Issues

**Problem:** "Invalid or missing API key"

```bash
# Solution: Check header name
x-secret-key: YOUR_KEY  # ✅ Correct
X-Secret-Key: YOUR_KEY  # ❌ Wrong (case sensitive)
```

**Problem:** "Missing recipient field"

```json
// ✅ Correct
{"recipient": "+233244000000", "message": "Hi"}

// ❌ Wrong
{"to": "+233244000000", "message": "Hi"}
```

**Problem:** SMS not received

```javascript
// ✅ Include country code
recipient: '+233244000000'

// ❌ Missing country code
recipient: '0244000000'
```

## 📚 Next Steps

- Read the full [Usage Guide](USAGE_GUIDE.md) for detailed examples
- Check [README.md](README.md) for deployment and architecture
- See API reference in the [Usage Guide](USAGE_GUIDE.md#api-reference-summary)

## 💡 Pro Tips

1. **Validate phone numbers** before sending (include country code)
2. **Handle errors gracefully** - check response status codes
3. **Use templates** for consistent messaging
4. **Log all requests** for debugging
5. **Implement retry logic** for transient failures

---

**Need Help?** See [USAGE_GUIDE.md](USAGE_GUIDE.md) for comprehensive documentation.
