import { Request, Response } from 'express'
import { loadSecrets } from './secrets'
import { sendSMSFlash } from './sendSMSFlash'
import { sendSMSMNotify } from './sendSMSMNotify'

const DEFAULT_SENDER = 'FLC Admin'

/**
 * Which SMS provider to use. FlashSMS is the default (SYN-257); mNotify is
 * deprecated and only used when `SMS_PROVIDER` is explicitly `mnotify`, read
 * from the notify secret first, then the Lambda env.
 */
const resolveProvider = (SECRETS: Record<string, string>) => {
  const setting = (SECRETS.SMS_PROVIDER || process.env.SMS_PROVIDER || '')
    .trim()
    .toLowerCase()

  if (setting === 'mnotify') return 'mnotify'
  if (setting && setting !== 'flashsms') {
    console.warn(`[SMS] ⚠️ Unknown SMS_PROVIDER "${setting}", using flashsms`)
  }
  return 'flashsms'
}

export const sendSMS = async (request: Request, response: Response) => {
  const { recipient, message, sender } = request.body

  console.log('[SMS] Validating request...')

  // Validate required fields
  if (!recipient) {
    console.log('[SMS] ❌ Validation failed: Missing recipient')
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Missing recipient field',
    })
  }

  if (!message) {
    console.log('[SMS] ❌ Validation failed: Missing message')
    return response.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Missing message field',
    })
  }

  console.log('[SMS] ✓ Validation passed')

  const recipients: string[] = Array.isArray(recipient)
    ? recipient
    : [recipient]

  // PII-safe: log counts, never the numbers or the message text.
  console.log('[SMS] Recipient count:', recipients.length)
  console.log('[SMS] Message length:', message.length)

  const SECRETS = await loadSecrets()
  const provider = resolveProvider(SECRETS)
  console.log('[SMS] Provider:', provider)

  if (provider === 'mnotify') {
    return sendSMSMNotify(
      recipients,
      message,
      sender || DEFAULT_SENDER,
      SECRETS,
      response
    )
  }

  // The sender ID must be approved on the FlashSMS account, so the configured
  // one wins over whatever the caller passed.
  const senderId = SECRETS.FLASHSMS_SENDER_ID || sender || DEFAULT_SENDER
  console.log('[SMS] Sender:', senderId)

  return sendSMSFlash(recipients, message, senderId, SECRETS, response)
}

export default sendSMS
