import { Request, Response } from 'express'
// import rateLimit from 'express-rate-limit'
import { sendSMS } from './sendSMS'
import { sendEmail } from './sendEmail'
import { sendPush } from './sendPush'
import { loadSecrets } from './secrets'

const express = require('express')
const serverless = require('serverless-http')
const cors = require('cors')

const app = express()
const router = express.Router()

// Configure middleware
app.use(cors({ origin: true }))
app.use(express.json())

// Set trusted proxy
app.set('trust proxy', '127.0.0.1')

// Health check endpoint
router.get('/', (request: Request, response: Response) => {
  response.status(200).json({
    success: true,
    message: 'Service is healthy',
  })
})

// SMS endpoint
router.post('/send-sms', async (request: Request, response: Response) => {
  console.log('\n[SMS] Incoming request')
  console.log('[SMS] Headers:', request.headers)
  console.log('[SMS] Body:', { ...request.body, message: request.body.message ? `${request.body.message.substring(0, 50)}...` : undefined })
  
  const secretKey = request.headers['x-secret-key']
  const SECRETS = await loadSecrets()
  
  if (!secretKey || secretKey !== SECRETS.FLC_NOTIFY_KEY) {
    console.log('[SMS] ❌ Authorization failed')
    return response.status(403).json({
      success: false,
      error: 'Unauthorized access',
      message: 'Invalid or missing API key',
    })
  }
  
  console.log('[SMS] ✓ Authorization passed')

  try {
    const result = await sendSMS(request, response)
    console.log('[SMS] ✓ SMS function completed')
    return result
  } catch (error) {
    console.log('[SMS] ❌ Error:', error instanceof Error ? error.message : 'Unknown error')
    return response.status(502).json({
      success: false,
      error: 'SMS delivery failed',
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
})

// Push endpoint
router.post('/send-push', async (request: Request, response: Response) => {
  console.log('\n[PUSH] Incoming request')
  // PII-safe: never log headers (they carry the secret key) or the payload
  // (device tokens / message body). Log only the shape of the request.
  console.log('[PUSH] Body:', {
    hasTokens: Array.isArray(request.body.tokens),
    tokenCount: Array.isArray(request.body.tokens)
      ? request.body.tokens.length
      : 0,
    hasTopic: !!request.body.topic,
    hasNotification: !!request.body.notification,
    hasData: !!request.body.data,
  })

  const secretKey = request.headers['x-secret-key']
  const SECRETS = await loadSecrets()

  if (!secretKey || secretKey !== SECRETS.FLC_NOTIFY_KEY) {
    console.log('[PUSH] ❌ Authorization failed')
    return response.status(403).json({
      success: false,
      error: 'Unauthorized access',
      message: 'Invalid or missing API key',
    })
  }

  console.log('[PUSH] ✓ Authorization passed')

  try {
    const result = await sendPush(request, response)
    console.log('[PUSH] ✓ Push function completed')
    return result
  } catch (error) {
    console.log(
      '[PUSH] ❌ Error:',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return response.status(502).json({
      success: false,
      error: 'Push delivery failed',
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
})

// Email endpoint
router.post('/send-email', async (request: Request, response: Response) => {
  console.log('\n[EMAIL] Incoming request')
  console.log('[EMAIL] Headers:', request.headers)
  console.log('[EMAIL] Body:', { ...request.body, html: request.body.html ? `${request.body.html.substring(0, 50)}...` : undefined, text: request.body.text ? `${request.body.text.substring(0, 50)}...` : undefined })
  
  const secretKey = request.headers['x-secret-key']
  const SECRETS = await loadSecrets()
  
  if (!secretKey || secretKey !== SECRETS.FLC_NOTIFY_KEY) {
    console.log('[EMAIL] ❌ Authorization failed')
    return response.status(403).json({
      success: false,
      error: 'Unauthorized access',
      message: 'Invalid or missing API key',
    })
  }
  
  console.log('[EMAIL] ✓ Authorization passed')

  try {
    const result = await sendEmail(request, response)
    console.log('[EMAIL] ✓ Email function completed')
    return result
  } catch (error) {
    console.log('[EMAIL] ❌ Error:', error instanceof Error ? error.message : 'Unknown error')
    return response.status(502).json({
      success: false,
      error: 'Email delivery failed',
      message:
        error instanceof Error ? error.message : 'Unknown error occurred',
    })
  }
})

// Register the router
app.use('/', router)

// Catch-all route
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
  })
})

// Create serverless handler with more flexible configuration
// eslint-disable-next-line import/prefer-default-export
export const handler = serverless(app)
