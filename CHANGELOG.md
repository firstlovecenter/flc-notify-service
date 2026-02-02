# Changelog

All notable changes to the FLC Notify Service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-02

### Added

- Initial release of FLC Notify Service
- SMS notification support via MNotify
  - Single and multiple recipient support
  - Custom sender name option
  - Comprehensive error handling
- Email notification support via Resend
  - HTML and plain text email support
  - Multiple recipient support
  - Reply-to functionality
  - Verified sender domain support
- API key authentication via `x-secret-key` header
- AWS Secrets Manager integration for secure credential storage
- Express.js REST API with serverless-http
- Health check endpoint (`GET /`)
- Comprehensive input validation
- Detailed logging with contextual information
- CORS support for cross-origin requests
- TypeScript implementation with full type safety
- Automated CI/CD pipeline with GitHub Actions
  - Automatic deployment on push to main
  - Build and package automation
  - Slack notifications for deployments
- AWS Lambda deployment with Node.js 20.x runtime
- Comprehensive documentation
  - README.md with setup and architecture
  - USAGE_GUIDE.md with detailed API documentation
  - QUICK_START.md for rapid onboarding
  - Code examples in JavaScript, TypeScript, Python, and cURL

### Security

- Secure API key authentication
- AWS Secrets Manager for credential management
- Input validation to prevent injection attacks
- CORS configuration for controlled access

### Infrastructure

- AWS Lambda function deployment
- AWS API Gateway integration
- AWS Secrets Manager for secrets
- GitHub Actions for CI/CD
- CloudWatch for logging and monitoring

## [Unreleased]

### Planned

- Rate limiting implementation
- Webhook support for delivery status
- Template management system
- Batch sending optimization
- Message scheduling functionality
- Additional notification channels (Push notifications, WhatsApp)
- Enhanced monitoring and analytics
- Unit and integration test suite

---

For more details on each release, see the [GitHub Releases](https://github.com/firstlovecenter/flc-notify-service/releases) page.
