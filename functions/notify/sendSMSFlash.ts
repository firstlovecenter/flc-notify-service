import { randomUUID } from 'crypto'
import { Response } from 'express'

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
 * Send SMS through FlashSMS Africa API v2 (POST /sms/send) — the default
 * provider since SYN-257.
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
  if (!SECRETS.FLASHSMS_API_KEY) {
    console.error('[SMS] ❌ FLASHSMS_API_KEY is not set in the notify secret')
    return response.status(500).json({
      success: false,
      error: 'SMS provider not configured',
      message: 'FlashSMS API key is missing from the service configuration',
    })
  }

  // A fresh key per logical send; FlashSMS replays the original response for
  // a repeated key within 24h instead of sending twice.
  const idempotencyKey = randomUUID()

  console.log('[SMS] Sending SMS via FlashSMS...', {
    recipientCount: SECRETS.TEST_PHONE_NUMBER ? 1 : recipients.length,
    testNumber: !!SECRETS.TEST_PHONE_NUMBER,
    idempotencyKey,
  })

  try {
    const res = await axios({
      method: 'post',
      url: FLASHSMS_SEND_URL,
      headers: {
        Authorization: `Bearer ${SECRETS.FLASHSMS_API_KEY}`,
        'Idempotency-Key': idempotencyKey,
        'content-type': 'application/json',
      },
      data: {
        phones: SECRETS.TEST_PHONE_NUMBER
          ? [SECRETS.TEST_PHONE_NUMBER]
          : recipients,
        message,
        senderId: sender,
      },
      timeout: 15000,
    })

    const data = res.data?.data ?? {}
    const requestId = res.data?.meta?.requestId

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
        invalidRecipientCount: Array.isArray(data.invalidRecipients)
          ? data.invalidRecipients.length
          : 0,
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
        console.error('[SMS] ❌ FlashSMS error:', { status, code, requestId })
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
