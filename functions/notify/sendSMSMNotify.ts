/**
 * @deprecated SYN-257 — mNotify is no longer the default SMS provider.
 * FlashSMS Africa (sendSMSFlash.ts) is. This path is kept so SMS can be
 * switched back without a code change: set `SMS_PROVIDER` to `mnotify` in the
 * notify secret (or the Lambda env). It still reads `MNOTIFY_KEY` from the
 * secret, which must be left in place for that to work.
 */
import { Response } from 'express'

const { default: axios } = require('axios')

export const sendSMSMNotify = async (
  recipients: string[],
  message: string,
  sender: string,
  SECRETS: Record<string, string>,
  response: Response
) => {
  const sendMessage = {
    method: 'post',
    url: `https://api.mnotify.com/api/sms/quick?key=${SECRETS.MNOTIFY_KEY}`,
    headers: {
      'content-type': 'application/json',
    },
    data: {
      recipient: SECRETS.TEST_PHONE_NUMBER
        ? [SECRETS.TEST_PHONE_NUMBER, '0594760323']
        : recipients,
      sender,
      message,
      is_schedule: 'false',
      schedule_date: '',
    },
  }

  console.log('[SMS] Sending SMS via MNotify (deprecated provider)...')

  try {
    const res = await axios(sendMessage)

    console.log('[SMS] MNotify response code:', res.data.code)

    if (res.data.code === '2000') {
      console.log('[SMS] ✓ SMS sent successfully')
      return response.status(200).json({
        success: true,
        message: 'SMS sent successfully',
        data: res.data,
      })
    }

    // API returned an error code
    console.log('[SMS] ❌ MNotify error:', res.data.message)
    return response.status(502).json({
      success: false,
      error: 'SMS provider error',
      message: `Failed to send SMS: ${
        res.data.message || 'Unknown provider error'
      }`,
      data: res.data,
    })
  } catch (error) {
    // Never log the axios error itself: its config carries the request URL,
    // which has the mNotify key in the query string (SYN-237).
    if (axios.isAxiosError(error)) {
      console.error('[SMS] ❌ MNotify request failed:', {
        status: (error as any).response?.status,
        code: (error as any).code,
      })
      return response.status(502).json({
        success: false,
        error: 'SMS provider connection error',
        message: `Failed to reach SMS provider${
          (error as any).response?.status
            ? ` (status ${(error as any).response.status})`
            : ''
        }`,
        data: (error as any).response?.data,
      })
    }

    console.error(
      '[SMS] ❌ SMS send error:',
      error instanceof Error ? error.name : 'Unknown error'
    )
    // Handle other unexpected errors
    return response.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unknown error occurred while sending SMS',
    })
  }
}

export default sendSMSMNotify
