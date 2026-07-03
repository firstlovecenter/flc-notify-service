import { Request, Response } from 'express'
import * as admin from 'firebase-admin'
import { loadSecrets } from './secrets'

// Cache the initialized Firebase Admin app across warm Lambda invocations so we
// don't re-init (and re-parse the service-account credential) on every request.
let firebaseApp: admin.app.App | null = null

const getFirebaseApp = async (): Promise<admin.app.App> => {
  if (firebaseApp) {
    return firebaseApp
  }

  // A previous invocation on this warm container may already have an app.
  if (admin.apps.length > 0) {
    firebaseApp = admin.app()
    return firebaseApp
  }

  const SECRETS = await loadSecrets()
  const rawServiceAccount = SECRETS.FIREBASE_SERVICE_ACCOUNT

  if (!rawServiceAccount) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT secret')
  }

  // The secret may be stored as a JSON string or an already-parsed object.
  const serviceAccount =
    typeof rawServiceAccount === 'string'
      ? JSON.parse(rawServiceAccount)
      : rawServiceAccount

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  })

  console.log('[PUSH] Firebase Admin initialized')

  return firebaseApp
}

export const sendPush = async (request: Request, response: Response) => {
  const { tokens, topic, notification, data } = request.body

  console.log('[PUSH] Validating request...')

  const hasTokens = Array.isArray(tokens) && tokens.length > 0
  const hasTopic = typeof topic === 'string' && topic.trim().length > 0

  // Exactly one of tokens or topic is required.
  if (!hasTokens && !hasTopic) {
    console.log('[PUSH] ❌ Validation failed: Missing tokens or topic')
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'You must provide either a non-empty tokens array or a topic',
    })
  }

  if (hasTokens && hasTopic) {
    console.log('[PUSH] ❌ Validation failed: Both tokens and topic provided')
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Provide exactly one of tokens or topic, not both',
    })
  }

  if (!notification || (!notification.title && !notification.body)) {
    console.log('[PUSH] ❌ Validation failed: Missing notification content')
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'You must provide a notification with a title or body',
    })
  }

  console.log('[PUSH] ✓ Validation passed')
  // PII-safe: log counts and target type only — never tokens, topic, or body.
  console.log('[PUSH] Target:', hasTopic ? 'topic' : 'tokens')
  if (hasTokens) {
    console.log('[PUSH] Recipient count:', tokens.length)
  }

  try {
    const app = await getFirebaseApp()
    const messaging = app.messaging()

    // Topic send: one message fans out to all topic subscribers.
    if (hasTopic) {
      console.log('[PUSH] Sending to topic via FCM...')
      const messageId = await messaging.send({
        topic,
        notification,
        ...(data && { data }),
      })

      console.log('[PUSH] ✓ Topic push sent successfully')
      return response.status(200).json({
        success: true,
        message: 'Push sent successfully',
        data: {
          messageId,
          successCount: 1,
          failureCount: 0,
        },
      })
    }

    // Multicast send: one bad token must not fail the whole batch.
    console.log('[PUSH] Sending to tokens via FCM...')
    const res = await messaging.sendEachForMulticast({
      tokens,
      notification,
      ...(data && { data }),
    })

    // Report which tokens failed so callers can prune dead tokens. The token is
    // echoed back to the caller (who supplied it) but never written to a log.
    const failures = res.responses.reduce(
      (acc: Array<{ index: number; token: string; error: string }>, r, i) => {
        if (!r.success) {
          acc.push({
            index: i,
            token: tokens[i],
            error: r.error?.code || 'unknown',
          })
        }
        return acc
      },
      []
    )

    console.log(
      '[PUSH] ✓ FCM multicast complete. success:',
      res.successCount,
      'failure:',
      res.failureCount
    )

    // A partial failure is not a total failure — return 200 with per-token
    // results so the caller can retry or prune individually.
    return response.status(200).json({
      success: true,
      message: 'Push processed',
      data: {
        successCount: res.successCount,
        failureCount: res.failureCount,
        failures,
      },
    })
  } catch (error) {
    console.error(
      '[PUSH] ❌ Push send error:',
      error instanceof Error ? error.message : 'Unknown error'
    )

    return response.status(502).json({
      success: false,
      error: 'Push provider error',
      message:
        error instanceof Error
          ? error.message
          : 'Unknown error occurred while sending push',
    })
  }
}

export default sendPush
