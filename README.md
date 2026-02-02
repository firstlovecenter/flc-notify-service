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

### Technology Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js with serverless-http
- **Language**: TypeScript
- **SMS Provider**: MNotify
- **Email Provider**: Resend
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
     "TEST_PHONE_NUMBER": "optional-test-number"
   }
   ```

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
