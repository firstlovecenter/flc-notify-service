# FLC Notify Service

A serverless microservice for sending SMS and email notifications via AWS Lambda.

> 🚀 **New to this service?** Check out the [Quick Start Guide](QUICK_START.md) to get started in minutes!
>
> 📖 **Looking for detailed documentation?** See the [Usage Guide](USAGE_GUIDE.md) for comprehensive examples and best practices.

## Overview

FLC Notify Service is a notification microservice built for First Love Center projects. It provides a secure, RESTful API to send SMS messages and emails through a unified interface. The service is deployed as an AWS Lambda function with Express.js, providing reliable message delivery through integrated providers.

## Features

- 📱 **SMS Notifications** - Send SMS via MNotify with support for single or multiple recipients
- 📧 **Email Notifications** - Send emails via Resend with HTML and plain text support
- 🔔 **Push Notifications** - Send push via Firebase Cloud Messaging (FCM HTTP v1) to device tokens or topics
- 🔒 **Secure Authentication** - API key-based authentication for all requests
- ⚡ **Serverless Deployment** - Deployed as AWS Lambda function for auto-scaling
- 🔄 **Automated CI/CD** - GitHub Actions workflow for continuous deployment
- 📝 **Comprehensive Logging** - Detailed logging for debugging and monitoring
- ✅ **Input Validation** - Robust request validation with clear error messages
- 🌐 **CORS Enabled** - Cross-origin resource sharing support

## Architecture

This service is deployed as an AWS Lambda function behind AWS API Gateway and provides the following endpoints:

### Endpoints

- **GET** `/` - Health check endpoint
- **POST** `/send-sms` - Send SMS messages via MNotify
- **POST** `/send-email` - Send emails via Resend
- **POST** `/send-push` - Send push notifications via Firebase Cloud Messaging

### Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js with serverless-http
- **Language**: TypeScript
- **SMS Provider**: MNotify
- **Email Provider**: Resend
- **Push Provider**: Firebase Cloud Messaging (FCM HTTP v1, via `firebase-admin`)
- **Secrets Management**: AWS Secrets Manager
- **Deployment**: AWS Lambda + API Gateway
- **CI/CD**: GitHub Actions

## Environment Setup

### Prerequisites

- Node.js 20.x or higher
- npm 8.x or higher
- AWS CLI (configured with appropriate credentials)
- AWS Account with Lambda and Secrets Manager access

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/firstlovecenter/flc-notify-service.git
   cd flc-notify-service
   ```

2. Install root dependencies

   ```bash
   npm ci
   ```

3. Install function dependencies

   ```bash
   cd functions/notify
   npm ci
   ```

4. Set up AWS Secrets Manager

   The service uses AWS Secrets Manager for secure credential storage. Create a secret with the following keys:

   ```json
   {
     "FLC_NOTIFY_KEY": "your-api-authentication-key",
     "MNOTIFY_KEY": "your-mnotify-api-key",
     "RESEND_API_KEY": "your-resend-api-key",
     "TEST_PHONE_NUMBER": "optional-test-number",
     "FIREBASE_SERVICE_ACCOUNT": "{\"type\":\"service_account\",\"project_id\":\"flc-platform-dev\", ...}"
   }
   ```

   `FIREBASE_SERVICE_ACCOUNT` holds the **entire Firebase service-account JSON as a
   single stringified value** (the code reads `SECRETS.FIREBASE_SERVICE_ACCOUNT`
   and `JSON.parse`s it). Use the **dev** project's key in the dev secret and the
   **prod** project's key in the prod secret. This value is a credential — never
   commit it, hardcode it, or log it. See [Push Notification Setup](#push-notification-setup-firebase)
   for how to generate it.

5. Configure environment variables

   Create a `.env` file in `functions/notify/`:

   ```bash
   AWS_SECRET_NAME=your-secret-name
   ```

6. Build the TypeScript code
   ```bash
   npm run build
   ```

## API Documentation

> 📖 **For detailed usage instructions, code examples, and best practices, see [USAGE_GUIDE.md](USAGE_GUIDE.md)**

### Authentication

All API endpoints (except health check) require the `x-secret-key` header for authentication.

```
x-secret-key: YOUR_FLC_NOTIFY_KEY
```

### Health Check

**Endpoint:** `GET /`

**Response:**

```json
{
  "success": true,
  "message": "Service is healthy"
}
```

### Send SMS

**Endpoint:** `POST /send-sms`

**Headers:**

```
Content-Type: application/json
x-secret-key: YOUR_SECRET_KEY
```

**Request Body:**

```json
{
  "recipient": "+233244000000",
  "message": "Your message here",
  "sender": "FLC Admin"
}
```

**Parameters:**

- `recipient` (required): Phone number or array of phone numbers
- `message` (required): SMS message content
- `sender` (optional): Sender name (defaults to "FLC Admin")

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "SMS sent successfully",
  "data": {
    "code": "2000"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Missing or invalid parameters
- `403 Forbidden` - Invalid or missing API key
- `502 Bad Gateway` - SMS provider error

### Send Email

**Endpoint:** `POST /send-email`

**Headers:**

```
Content-Type: application/json
x-secret-key: YOUR_SECRET_KEY
```

**Request Body:**

```json
{
  "from": "FL Accra Admin<no-reply@updates.firstlovecenter.com>",
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<p>Email content</p>",
  "text": "Email content",
  "replyTo": "support@firstlovecenter.com"
}
```

**Parameters:**

- `from` (required): Sender email address
- `to` (required): Recipient email or array of emails
- `subject` (required): Email subject line
- `html` (optional\*): HTML email body
- `text` (optional\*): Plain text email body
- `replyTo` (optional): Reply-to email address

\*Note: Must provide either `html` or `text` (or both)

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "id": "unique-email-id"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Missing or invalid parameters
- `403 Forbidden` - Invalid or missing API key
- `502 Bad Gateway` - Email provider error

### Send Push

Sends a push notification via Firebase Cloud Messaging (FCM HTTP v1). Phase 1 is a
**stateless relay**: the caller passes explicit device tokens (and/or an FCM topic)
plus the payload, and the service forwards to FCM and returns per-token results.

**Endpoint:** `POST /send-push`

**Headers:**

```
Content-Type: application/json
x-secret-key: YOUR_SECRET_KEY
```

**Request Body:**

```json
{
  "tokens": ["<fcm-device-token>", "..."],
  "topic": null,
  "notification": { "title": "Cycle summary", "body": "3 supervisors need review" },
  "data": { "route": "/cycle-summary" }
}
```

**Parameters:**

- `tokens` (required\*): Array of FCM device tokens (non-empty)
- `topic` (required\*): FCM topic name to broadcast to
- `notification` (required): Object with `title` and/or `body`
- `data` (optional): Flat key/value map of string data delivered with the message
  (FCM requires all `data` values to be strings)

\*Note: Provide **exactly one** of `tokens` or `topic` — not both, not neither.

**Success Response — token multicast (200 OK):**

A partial failure is **not** a total failure. The call returns `200` as long as FCM
processed the batch; inspect `failureCount`/`failures` for dead tokens to prune.

```json
{
  "success": true,
  "message": "Push processed",
  "data": {
    "successCount": 2,
    "failureCount": 1,
    "failures": [
      {
        "index": 2,
        "token": "<the-failed-token>",
        "error": "messaging/registration-token-not-registered"
      }
    ]
  }
}
```

**Success Response — topic broadcast (200 OK):**

```json
{
  "success": true,
  "message": "Push sent successfully",
  "data": { "messageId": "projects/flc-platform-dev/messages/1234567890", "successCount": 1, "failureCount": 0 }
}
```

**Error Responses:**

- `400 Bad Request` - Missing/invalid parameters (no target, both targets, or no notification content)
- `403 Forbidden` - Invalid or missing API key
- `502 Bad Gateway` - FCM / Firebase Admin error (e.g. bad service-account credential)

> **Phase 2 (not built):** a centralized token registry (token ↔ user ↔ app) so
> callers could target a `userId` instead of raw tokens. For now each app stores its
> own FCM tokens (e.g. Poimen stores them on `Member`) and passes them explicitly.

## Push Notification Setup (Firebase)

The push channel uses **one Firebase project per environment**, shared by all FLC
apps (not one project per app):

| Environment | Firebase Project ID | Secrets Manager secret       |
| ----------- | ------------------- | ---------------------------- |
| dev         | `flc-platform-dev`  | the dev notify secret        |
| prod        | `flc-platform-prod` | the prod notify secret       |

Both projects use the display name **"First Love Center"**. Each app (Poimen,
fl-admin-portal, Synago, …) is registered as a separate Android / iOS / web app
_within_ the environment's project.

### One-time setup (per environment) — manual prerequisites

These steps require Firebase Console / Google Cloud access and are **not performed by
this codebase**. Do them once per project (`flc-platform-dev`, then `flc-platform-prod`):

1. **Create the Firebase project** (`flc-platform-dev` / `flc-platform-prod`) if it
   does not already exist, display name "First Love Center".
2. **Register each client app** (Android/iOS/web) that will receive push.
3. **iOS:** upload the **APNs auth key** (`.p8`) under
   _Project settings → Cloud Messaging → Apple app configuration_.
4. **Web:** generate the **VAPID key pair** under
   _Project settings → Cloud Messaging → Web configuration_ (clients use the public
   key; this service does not need it).
5. **Generate a service-account key:** _Project settings → Service accounts →
   Generate new private key_. This downloads a JSON file.

   > ⚠️ **If you see "Key creation is not allowed on this service account"**, your
   > GCP organization enforces the `iam.disableServiceAccountKeyCreation` org policy
   > (a common secure default). To create the key: Google Cloud Console → _IAM &
   > Admin → Organization Policies → Disable service account key creation_, scope to
   > the project, **Manage policy → Override parent's policy → Enforcement Off**,
   > save, wait ~1 min, then retry. **Re-lock it afterward** (set back to _Inherit
   > parent's policy_) — re-enabling the block does not revoke keys already created.
6. **Store the service account in Secrets Manager:** put the **entire JSON**, stringified,
   as `FIREBASE_SERVICE_ACCOUNT` in that environment's notify secret (dev JSON → dev
   secret, prod JSON → prod secret). Do **not** commit or log this file. The code reads
   `SECRETS.FIREBASE_SERVICE_ACCOUNT` and `JSON.parse`s it on cold start.

> If you don't have console access for any of the above, treat it as a blocking
> prerequisite and hand it to whoever owns the FLC Firebase org — don't fake or
> commit a placeholder credential.

### Testing push in dev

With a real dev device token and the dev secret populated:

```bash
curl -X POST https://your-dev-url/send-push \
  -H "Content-Type: application/json" \
  -H "x-secret-key: YOUR_DEV_FLC_NOTIFY_KEY" \
  -d '{
        "tokens": ["<real-dev-device-token>"],
        "notification": { "title": "FLC test", "body": "Push works 🎉" },
        "data": { "route": "/cycle-summary" }
      }'
```

A successful delivery returns `successCount: 1, failureCount: 0` and the notification
appears on the device. A dead/invalid token comes back in `failures[]` with an
`error` code (e.g. `messaging/registration-token-not-registered`) so the caller can
prune it — the rest of the batch still succeeds.

## Deployment

The service is automatically deployed to AWS Lambda when changes are pushed to the `main` branch that affect files in the `functions/notify` directory.

### Automated Deployment (GitHub Actions)

The CI/CD pipeline automatically:

1. Triggers on pushes to `main` branch affecting `functions/notify/**`
2. Installs dependencies
3. Builds TypeScript code
4. Packages the Lambda function with dependencies
5. Deploys to AWS Lambda
6. Sends deployment notification to Slack

### Manual Deployment

If you need to deploy manually:

1. **Build the TypeScript code:**

   ```bash
   cd functions/notify
   npm run build
   ```

2. **Package the Lambda function:**

   ```bash
   # From repository root
   mkdir -p lambda-package

   # Copy compiled JavaScript files
   cp functions/notify/*.js lambda-package/

   # Copy lib folder
   mkdir -p lambda-package/lib
   cp lib/secrets.js lambda-package/lib/

   # Copy package.json (production dependencies only)
   cp functions/notify/package.json lambda-package/

   # Install production dependencies
   cd lambda-package
   npm ci --production --omit=dev
   ```

3. **Create deployment ZIP:**

   ```bash
   # From lambda-package directory
   zip -r ../notify-lambda.zip .
   cd ..
   ```

4. **Deploy to AWS Lambda:**
   ```bash
   aws lambda update-function-code \
     --function-name flc-notify-service \
     --zip-file fileb://notify-lambda.zip \
     --region eu-west-2
   ```

### Verifying Deployment

After deployment, test the service:

```bash
# Health check
curl https://your-lambda-url.amazonaws.com/

# Test SMS (requires valid API key)
curl -X POST https://your-lambda-url.amazonaws.com/send-sms \
  -H "Content-Type: application/json" \
  -H "x-secret-key: YOUR_KEY" \
  -d '{"recipient": "+233244000000", "message": "Test"}'
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment.

### Workflow Triggers

- Push to `main` branch
- Changes to files in `functions/notify/**` directory

### Pipeline Steps

1. **Checkout** - Checks out the repository code
2. **Setup Node.js** - Configures Node.js 20.x environment
3. **Install Dependencies** - Installs npm packages
4. **Build** - Compiles TypeScript to JavaScript
5. **Package** - Creates Lambda deployment package
6. **Deploy** - Updates AWS Lambda function code
7. **Notify** - Sends deployment status to Slack

### Environment Variables Required

The GitHub Actions workflow requires the following secrets:

- `AWS_ACCESS_KEY_ID` - AWS credentials for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS credentials for deployment
- `AWS_REGION` - AWS region (default: eu-west-2)
- `SLACK_WEBHOOK_URL` - For deployment notifications

## Development

### Project Structure

```
flc-notify-service/
├── .github/
│   └── workflows/          # GitHub Actions CI/CD
├── functions/
│   └── notify/
│       ├── index.ts        # Main Lambda handler & routing
│       ├── sendEmail.ts    # Email sending logic (Resend)
│       ├── sendSMS.ts      # SMS sending logic (MNotify)
│       ├── sendPush.ts     # Push sending logic (Firebase Cloud Messaging)
│       ├── secrets.ts      # AWS Secrets Manager integration
│       ├── utils.ts        # Utility functions
│       ├── package.json    # Function dependencies
│       └── tsconfig.json   # TypeScript configuration
├── lib/
│   └── secrets.js          # Compiled secrets module
├── package.json            # Root dependencies
├── README.md              # This file
└── USAGE_GUIDE.md         # Detailed usage documentation
```

### Key Files Explained

- **index.ts**: Express.js application with routes, authentication middleware, and error handling
- **sendSMS.ts**: MNotify integration with validation and error handling
- **sendEmail.ts**: Resend integration with support for HTML/text emails
- **sendPush.ts**: Firebase Cloud Messaging integration; initializes `firebase-admin` once per warm Lambda and uses `sendEachForMulticast` for token batches
- **secrets.ts**: AWS Secrets Manager client for secure credential management
- **utils.ts**: Helper functions for validation and common operations

### Local Development

1. **Start development mode:**

   ```bash
   cd functions/notify
   npm run build:watch
   ```

2. **Run locally with serverless offline (optional):**

   ```bash
   # Install serverless framework
   npm install -g serverless

   # Run locally
   serverless offline start
   ```

3. **Test endpoints:**

   ```bash
   # Health check
   curl http://localhost:3000/

   # Send SMS
   curl -X POST http://localhost:3000/send-sms \
     -H "Content-Type: application/json" \
     -H "x-secret-key: YOUR_KEY" \
     -d '{"recipient": "+233244000000", "message": "Test"}'
   ```

### Development Workflow

1. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes and test locally

3. Build and verify no TypeScript errors:

   ```bash
   npm run build
   ```

4. Commit and push changes:

   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

5. Create a Pull Request to `main`

6. After PR approval and merge, automatic deployment will trigger

## Testing

### Manual Testing

Use the provided examples in [USAGE_GUIDE.md](USAGE_GUIDE.md) to test the API endpoints.

### Common Test Scenarios

1. **Test Authentication:**

   ```bash
   # Should return 403
   curl -X POST https://your-url/send-sms \
     -H "Content-Type: application/json" \
     -d '{"recipient": "+233244000000", "message": "Test"}'
   ```

2. **Test Validation:**

   ```bash
   # Should return 400 - missing message
   curl -X POST https://your-url/send-sms \
     -H "Content-Type: application/json" \
     -H "x-secret-key: YOUR_KEY" \
     -d '{"recipient": "+233244000000"}'
   ```

3. **Test Success Case:**
   ```bash
   # Should return 200
   curl -X POST https://your-url/send-sms \
     -H "Content-Type: application/json" \
     -H "x-secret-key: YOUR_KEY" \
     -d '{"recipient": "+233244000000", "message": "Hello!"}'
   ```

### Monitoring

Monitor Lambda function logs in AWS CloudWatch:

```bash
# View recent logs
aws logs tail /aws/lambda/flc-notify-service --follow
```

## Troubleshooting

### Common Issues

1. **"Unauthorized access" error**
   - Verify your API key in AWS Secrets Manager
   - Check the `x-secret-key` header is correctly set
2. **"Missing [field] field" error**

   - Ensure all required fields are included in request body
   - Check field names match exactly (case-sensitive)

3. **SMS/Email not received**

   - Check CloudWatch logs for detailed error messages
   - Verify phone number format includes country code (+233...)
   - For emails, check spam folder
   - Verify sender email domain is verified with Resend

4. **Deployment failures**
   - Check GitHub Actions logs
   - Verify AWS credentials are correctly configured
   - Ensure Lambda function exists in AWS

For detailed troubleshooting, see the [USAGE_GUIDE.md](USAGE_GUIDE.md).

## Security Considerations

- **API Keys**: Never commit API keys to version control. Always use AWS Secrets Manager or environment variables.
- **HTTPS Only**: The service should only be accessed via HTTPS in production.
- **Rate Limiting**: Consider implementing rate limiting at the API Gateway level to prevent abuse.
- **Input Validation**: All inputs are validated before processing to prevent injection attacks.
- **CORS**: CORS is enabled but should be configured to allow only trusted domains in production.

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create a feature branch

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following the existing code style

3. **Test your changes** thoroughly

4. **Commit your changes** with clear, descriptive messages

   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your branch**

   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request** to the `main` branch

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex logic
- Update documentation for API changes

## License

ISC License

Copyright (c) 2026 First Love Center

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

## Support & Contact

- **Repository**: [github.com/firstlovecenter/flc-notify-service](https://github.com/firstlovecenter/flc-notify-service)
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Author**: John-Dag Addy

## Acknowledgments

- MNotify for SMS delivery services
- Resend for email delivery services
- AWS Lambda for serverless hosting

---

**Quick Links:**

- � [Quick Start Guide](QUICK_START.md) - Get started in minutes
- 📖 [Detailed Usage Guide](USAGE_GUIDE.md) - Comprehensive documentation
- 📝 [API Documentation](#api-documentation) - API reference
- 📋 [Changelog](CHANGELOG.md) - Version history
- 🔗 [GitHub Repository](https://github.com/firstlovecenter/flc-notify-service)
