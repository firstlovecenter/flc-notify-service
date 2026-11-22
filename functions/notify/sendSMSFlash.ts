import { randomUUID } from 'crypto'
import { Response } from 'express'
import { normaliseRecipients } from './smsRecipients'

const { default: axios } = require('axios')

const FLASHSMS_SEND_URL = 'https://app.flashsms.africa/api/v2/sms/send'

// Messages for the error codes a caller (or whoever reads the logs) can act on.
// Everything else falls through to a generic provider error carrying the code.
const KNOWN_ERRORS: Record<string, string> = {
  INSUFFICIENT_CREDITS: 'SMS provider account is out of credit',
  INVALID_SENDER_ID: 'Sender ID is not approved on the SMS provider account',
  UNAUTHENTICATED: 'SMS provider rejected the API key',
  PERMISSION_DENIED:
    'SMS provider API key lacks permission (needs a v2 key with messages:send)',
  RATE_LIMITED: 'SMS provider rate limit reached, retry later',
}

/**
 * Which fields FlashSMS's `error.details` names, so the next INVALID_REQUEST
 * says what it rejected. Field names only — never the values, which can be
 * phone numbers or message text.
 */
const detailFieldNames = (details: unknown): string[] | undefined => {
  if (!details || typeof details !== 'object') return undefined
  if (Array.isArray(details)) {
    return details
      .map((d) => d?.field ?? d?.path)
      .filter((f) => typeof f === 'string' || Array.isArray(f))
      .map((f) => (Array.isArray(f) ? f.join('.') : f))
  }
  return Object.keys(details)
}

/**
 * Send SMS through FlashSMS Africa API v2 (POST /sms/send) — the default
 * provider since SYN-257.
 *
 * The v2 API key is `SMS_NOTIFY_KEY` in the notify service's AWS Secrets
 * Manager secret, added alongside the deprecated provider's `MNOTIFY_KEY`
 * (which stays, for switching back).
 *
 * Logging rule: never log the axios request config, headers, URL, the
 * Authorization key, phone numbers or message text. Log the HTTP status,
 * FlashSMS `error.code` and `meta.requestId` only.
 */
export const sendSMSFlash = async (
  recipients: string[],
  message: string,
  sender: string,
  SECRETS: Record<string, string>,
  response: Response
) => {
  if (!SECRETS.SMS_NOTIFY_KEY) {
    console.error(
      '[SMS] ❌ SMS_NOTIFY_KEY (FlashSMS API key) is not set in the AWS Secrets Manager secret'
    )
    return response.status(500).json({
      success: false,
      error: 'SMS provider not configured',
      message: 'FlashSMS API key is missing from the service configuration',
    })
  }

  // SYN-274: one malformed number makes FlashSMS reject the whole send with
  // INVALID_REQUEST, so normalise first and drop what cannot be a phone.
  const { valid, invalidCount } = normaliseRecipients(
    SECRETS.TEST_PHONE_NUMBER ? [SECRETS.TEST_PHONE_NUMBER] : recipients
  )

  if (!valid.length) {
    // A bad number on the caller's record, not a service failure.
    console.warn('[SMS] ⚠️ No valid recipient phone number, not sending', {
      invalidCount,
    })
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'No valid recipient phone number',
      data: { provider: 'flashsms', invalidRecipientCount: invalidCount },
    })
  }

  // A fresh key per logical send; FlashSMS replays the original response for
  // a repeated key within 24h instead of sending twice.
  const idempotencyKey = randomUUID()

  console.log('[SMS] Sending SMS via FlashSMS...', {
    recipientCount: valid.length,
    droppedInvalid: invalidCount,
    testNumber: !!SECRETS.TEST_PHONE_NUMBER,
    idempotencyKey,
  })

  try {
    const res = await axios({
      method: 'post',
      url: FLASHSMS_SEND_URL,
      headers: {
        Authorization: `Bearer ${SECRETS.SMS_NOTIFY_KEY}`,
        'Idempotency-Key': idempotencyKey,
        'content-type': 'application/json',
      },
      data: {
        phones: valid,
        message,
        senderId: sender,
      },
      timeout: 15000,
    })

    const data = res.data?.data ?? {}
    const requestId = res.data?.meta?.requestId
    const flashInvalidCount = Array.isArray(data.invalidRecipients)
      ? data.invalidRecipients.length
      : 0

    console.log('[SMS] ✓ FlashSMS accepted the send:', {
      httpStatus: res.status,
      status: data.status,
      requestId,
    })

    // Response shape matches the mNotify path so callers need no change.
    // Recipient numbers (incl. invalidRecipients) are deliberately not echoed.
    return response.status(200).json({
      success: true,
      message: 'SMS sent successfully',
      data: {
        provider: 'flashsms',
        id: data.id,
        status: data.status,
        recipientCount: data.recipientCount,
        invalidRecipientCount: invalidCount + flashInvalidCount,
        requestId,
      },
    })
  } catch (error) {
    if (axios.isAxiosError(error) && (error as any).response) {
      const { status, data: body } = (error as any).response
      const code: string = body?.error?.code || 'UNKNOWN'
      const requestId = body?.meta?.requestId

      const known = KNOWN_ERRORS[code]
      if (known) {
        console.error(`[SMS] ❌ FlashSMS ${code}: ${known}`, {
          status,
          requestId,
        })
      } else {
        console.error('[SMS] ❌ FlashSMS error:', {
          status,
          code,
          requestId,
          detailFields: detailFieldNames(body?.error?.details),
        })
      }

      return response.status(502).json({
        success: false,
        error: 'SMS provider error',
        message: `Failed to send SMS: ${known || code}`,
        data: { provider: 'flashsms', code, requestId },
      })
    }

    if (axios.isAxiosError(error)) {
      // No response: network failure or timeout.
      console.error('[SMS] ❌ FlashSMS unreachable:', {
        code: (error as any).code,
      })
      return response.status(502).json({
        success: false,
        error: 'SMS provider connection error',
        message: 'Failed to connect to SMS provider',
      })
    }

    console.error(
      '[SMS] ❌ SMS send error:',
      error instanceof Error ? error.name : 'Unknown error'
    )
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unknown error occurred while sending SMS',
    })
  }
}

export default sendSMSFlash
